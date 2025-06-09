import { Injectable } from '@nestjs/common';
import { VideoRepository } from '../../domain/ports/video.repository';
import { StorageService } from '../../domain/ports/storage.service';

export interface GetUploadProgressQuery {
  uploadId: string;
}

export interface UploadProgressResult {
  videoId: string;
  uploadId: string;
  progress: number;
  status: string;
  filename: string;
  fileSize: number;
  uploadedBytes: number;
  estimatedTimeRemaining?: number;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class GetUploadProgressUseCase {
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly storageService: StorageService
  ) {}

  async execute(query: GetUploadProgressQuery): Promise<UploadProgressResult> {
    try {
      // Find video by upload ID
      const video = await this.videoRepository.findByUploadId(query.uploadId);
      if (!video) {
        throw new Error(`Video with upload ID ${query.uploadId} not found`);
      }

      // Get current progress from storage service
      let storageProgress = 0;
      try {
        storageProgress = await this.storageService.getUploadProgress(
          query.uploadId
        );
      } catch (error) {
        // If storage service fails, use video entity progress
        storageProgress = video.uploadProgress;
      }

      // Calculate uploaded bytes
      const uploadedBytes = Math.floor(
        (storageProgress / 100) * video.uploadMetadata.size
      );

      // Estimate time remaining (simple calculation)
      let estimatedTimeRemaining: number | undefined;
      if (storageProgress > 0 && storageProgress < 100) {
        const elapsedTime = Date.now() - video.createdAt.getTime();
        const uploadRate = uploadedBytes / (elapsedTime / 1000); // bytes per second
        const remainingBytes = video.uploadMetadata.size - uploadedBytes;
        estimatedTimeRemaining = Math.ceil(remainingBytes / uploadRate);
      }

      return {
        videoId: video.id.value,
        uploadId: query.uploadId,
        progress: storageProgress,
        status: video.status,
        filename: video.uploadMetadata.filename,
        fileSize: video.uploadMetadata.size,
        uploadedBytes,
        estimatedTimeRemaining,
        errors: video.validationErrors,
        warnings: video.validationWarnings,
      };
    } catch (error) {
      throw new Error(`Failed to get upload progress: ${error.message}`);
    }
  }
}
