import { Injectable, Logger } from '@nestjs/common';
import { VideoRepository } from '../../domain/ports/video.repository';
import { StorageService } from '../../domain/ports/storage.service';
import { EventPublisher } from '../../domain/ports/event.publisher';
import { Video } from '../../domain/entities/video.entity';
import { UploadMetadata } from '../../domain/value-objects/upload-metadata.value-object';
import { AsyncValidationService } from '../services/async-validation.service';

export interface UploadVideoCommand {
  stream: ReadableStream;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  matchId?: string;
  teamId?: string;
  tags?: string[];
}

export interface UploadVideoResult {
  videoId: string;
  uploadId: string;
  uploadUrl?: string;
}

@Injectable()
export class UploadVideoUseCase {
  private readonly logger = new Logger(UploadVideoUseCase.name);

  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly storageService: StorageService,
    private readonly eventPublisher: EventPublisher,
    private readonly asyncValidationService: AsyncValidationService
  ) {}

  async execute(command: UploadVideoCommand): Promise<UploadVideoResult> {
    try {
      // Create upload metadata
      const uploadMetadata = new UploadMetadata({
        filename: command.filename,
        mimeType: command.mimeType,
        size: command.size,
        uploadedBy: command.uploadedBy,
        matchId: command.matchId,
        teamId: command.teamId,
        tags: command.tags,
      });

      // Create video entity
      const video = Video.createForUpload(uploadMetadata);

      // Save video entity (in uploading state)
      await this.videoRepository.save(video);

      // Upload to storage
      const storageResult = await this.storageService.upload(
        command.stream,
        uploadMetadata
      );

      // Mark video as uploaded
      video.markAsUploaded(storageResult);

      // Update video entity
      await this.videoRepository.update(video);

      // Publish domain events
      await this.publishDomainEvents(video);

      // Start validation asynchronously using proper queue
      await this.asyncValidationService.addValidationJob(
        video.id.value,
        storageResult.key,
        'medium'
      );

      return {
        videoId: video.id.value,
        uploadId: uploadMetadata.uploadId,
        uploadUrl: storageResult.url,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload video: ${errorMessage}`);
    }
  }

  private async publishDomainEvents(video: Video): Promise<void> {
    const events = video.domainEvents;

    if (events.length > 0) {
      await this.eventPublisher.publishBatch(events);
      video.clearDomainEvents();
    }
  }
}
