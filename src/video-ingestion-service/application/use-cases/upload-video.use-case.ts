import { Injectable } from '@nestjs/common';
import { VideoRepository } from '../../domain/ports/video.repository';
import { StorageService } from '../../domain/ports/storage.service';
import { EventPublisher } from '../../domain/ports/event.publisher';
import { Video } from '../../domain/entities/video.entity';
import { UploadMetadata } from '../../domain/value-objects/upload-metadata.value-object';
import { VideoValidationService } from '../../domain/services/video-validation.service';

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
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly storageService: StorageService,
    private readonly eventPublisher: EventPublisher,
    private readonly validationService: VideoValidationService
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
        tags: command.tags
      });

      // Create video entity
      const video = Video.createForUpload(uploadMetadata);

      // Save video entity (in uploading state)
      await this.videoRepository.save(video);

      // Upload to storage
      const storageResult = await this.storageService.upload(command.stream, uploadMetadata);

      // Mark video as uploaded
      video.markAsUploaded(storageResult);

      // Update video entity
      await this.videoRepository.update(video);

      // Publish domain events
      await this.publishDomainEvents(video);

      // Start validation asynchronously (fire and forget)
      this.startValidationAsync(video.id.value, storageResult.key);

      return {
        videoId: video.id.value,
        uploadId: uploadMetadata.uploadId,
        uploadUrl: storageResult.url
      };

    } catch (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  private async publishDomainEvents(video: Video): Promise<void> {
    const events = video.domainEvents;
    
    if (events.length > 0) {
      await this.eventPublisher.publishBatch(events);
      video.clearDomainEvents();
    }
  }

  private async startValidationAsync(videoId: string, storageKey: string): Promise<void> {
    // This would typically be handled by a separate validation service
    // For now, we'll simulate async validation
    setTimeout(async () => {
      try {
        const video = await this.videoRepository.findById({ value: videoId } as any);
        if (!video) return;

        video.startValidation();
        await this.videoRepository.update(video);

        // In real implementation, this would download the file temporarily for validation
        const validationResult = await this.validationService.validateVideo(storageKey);
        
        if (validationResult.isValid) {
          const metadata = await this.validationService.extractMetadata(storageKey);
          video.completeValidation(metadata, validationResult.errors, validationResult.warnings);
        } else {
          video.completeValidation(
            null as any, // Would need a default metadata or handle this case
            validationResult.errors,
            validationResult.warnings
          );
        }

        await this.videoRepository.update(video);
        await this.publishDomainEvents(video);

      } catch (error) {
        console.error('Validation failed:', error);
        // Handle validation failure
      }
    }, 1000); // Start validation after 1 second
  }
}
