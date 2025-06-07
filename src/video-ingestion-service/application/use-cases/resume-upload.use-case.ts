import { Injectable } from '@nestjs/common';
import { VideoRepository } from '../../domain/ports/video.repository';
import { StorageService } from '../../domain/ports/storage.service';
import { EventPublisher } from '../../domain/ports/event.publisher';

export interface ResumeUploadCommand {
  uploadId: string;
  stream: ReadableStream;
  offset: number;
}

export interface ResumeUploadResult {
  videoId: string;
  uploadId: string;
  progress: number;
  isComplete: boolean;
  uploadUrl?: string;
}

@Injectable()
export class ResumeUploadUseCase {
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly storageService: StorageService,
    private readonly eventPublisher: EventPublisher
  ) {}

  async execute(command: ResumeUploadCommand): Promise<ResumeUploadResult> {
    try {
      // Find video by upload ID
      const video = await this.videoRepository.findByUploadId(command.uploadId);
      if (!video) {
        throw new Error(`Video with upload ID ${command.uploadId} not found`);
      }

      // Validate that video is in uploading state
      if (video.status !== 'UPLOADING') {
        throw new Error(`Cannot resume upload. Video status: ${video.status}`);
      }

      // Get current upload progress from storage
      const currentProgress = await this.storageService.getUploadProgress(command.uploadId);
      
      // Validate offset
      if (command.offset !== Math.floor((currentProgress / 100) * video.uploadMetadata.size)) {
        throw new Error('Invalid offset for resume upload');
      }

      // Resume upload to storage
      const storageResult = await this.storageService.resumeUpload(
        command.uploadId,
        command.stream,
        command.offset
      );

      // Calculate new progress
      const newProgress = Math.floor((storageResult.size / video.uploadMetadata.size) * 100);
      const isComplete = newProgress >= 100;

      if (isComplete) {
        // Mark video as uploaded
        video.markAsUploaded(storageResult);
      } else {
        // Update progress
        video.updateUploadProgress(newProgress);
      }

      // Update video entity
      await this.videoRepository.update(video);

      // Publish domain events if upload is complete
      if (isComplete) {
        await this.publishDomainEvents(video);
      }

      return {
        videoId: video.id.value,
        uploadId: command.uploadId,
        progress: newProgress,
        isComplete,
        uploadUrl: isComplete ? storageResult.url : undefined
      };

    } catch (error) {
      throw new Error(`Failed to resume upload: ${error.message}`);
    }
  }

  private async publishDomainEvents(video: any): Promise<void> {
    const events = video.domainEvents;
    
    if (events.length > 0) {
      await this.eventPublisher.publishBatch(events);
      video.clearDomainEvents();
    }
  }
}
