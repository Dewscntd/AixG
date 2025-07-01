import { Injectable, Logger } from '@nestjs/common';
import { VideoRepository } from '../../domain/ports/video.repository';
import { VideoValidationService } from '../../domain/services/video-validation.service';
import { EventPublisher } from '../../domain/ports/event.publisher';
import { StorageService } from '../../domain/ports/storage.service';
import { VideoMetadata } from '../../domain/value-objects/video-metadata.value-object';

export interface ValidationJob {
  videoId: string;
  storageKey: string;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

export interface ValidationProgress {
  videoId: string;
  stage:
    | 'downloading'
    | 'validating'
    | 'extracting_metadata'
    | 'completed'
    | 'failed';
  progress: number; // 0-100
  message: string;
  error?: string;
}

/**
 * Async Video Validation Service
 * Handles video validation in background with proper queue management
 */
@Injectable()
export class AsyncValidationService {
  private readonly logger = new Logger(AsyncValidationService.name);
  private readonly validationQueue: ValidationJob[] = [];
  private readonly progressMap = new Map<string, ValidationProgress>();
  private isProcessing = false;
  private readonly maxConcurrentJobs = 3;
  private readonly activeJobs = new Set<string>();

  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly validationService: VideoValidationService,
    private readonly eventPublisher: EventPublisher,
    private readonly storageService: StorageService
  ) {
    // Start processing queue
    this.startQueueProcessor();
  }

  /**
   * Add validation job to queue
   */
  async addValidationJob(
    videoId: string,
    storageKey: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    const job: ValidationJob = {
      videoId,
      storageKey,
      priority,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
    };

    // Add to queue with priority ordering
    this.insertJobByPriority(job);

    // Initialize progress tracking
    this.progressMap.set(videoId, {
      videoId,
      stage: 'downloading',
      progress: 0,
      message: 'Queued for validation',
    });

    this.logger.log(
      `Added validation job for video ${videoId} with priority ${priority}`
    );
  }

  /**
   * Get validation progress for a video
   */
  getValidationProgress(videoId: string): ValidationProgress | null {
    return this.progressMap.get(videoId) || null;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    activeJobs: number;
    maxConcurrent: number;
  } {
    return {
      queueLength: this.validationQueue.length,
      activeJobs: this.activeJobs.size,
      maxConcurrent: this.maxConcurrentJobs,
    };
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (
        !this.isProcessing &&
        this.validationQueue.length > 0 &&
        this.activeJobs.size < this.maxConcurrentJobs
      ) {
        await this.processNextJob();
      }
    }, 1000); // Check every second
  }

  /**
   * Process the next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (
      this.validationQueue.length === 0 ||
      this.activeJobs.size >= this.maxConcurrentJobs
    ) {
      return;
    }

    const job = this.validationQueue.shift();
    if (!job) return;

    this.activeJobs.add(job.videoId);
    this.logger.log(`Starting validation for video ${job.videoId}`);

    try {
      await this.processValidationJob(job);
    } catch (error) {
      this.logger.error(
        `Validation job failed for video ${job.videoId}:`,
        error
      );
      await this.handleJobFailure(job, error);
    } finally {
      this.activeJobs.delete(job.videoId);
    }
  }

  /**
   * Process a single validation job
   */
  private async processValidationJob(job: ValidationJob): Promise<void> {
    const { videoId, storageKey } = job;

    try {
      // Update progress: downloading
      this.updateProgress(videoId, 'downloading', 10, 'Downloading video file');

      // Get video entity
      const video = await this.videoRepository.findById({
        value: videoId,
      } as any);
      if (!video) {
        throw new Error(`Video ${videoId} not found`);
      }

      // Start validation in video entity
      video.startValidation();
      await this.videoRepository.update(video);

      // Update progress: validating
      this.updateProgress(videoId, 'validating', 30, 'Validating video file');

      // Download file temporarily for validation (in real implementation)
      const tempFilePath = await this.downloadFileTemporarily(storageKey);

      try {
        // Validate video
        const validationResult = await this.validationService.validateVideo(
          tempFilePath
        );

        // Update progress: extracting metadata
        this.updateProgress(
          videoId,
          'extracting_metadata',
          70,
          'Extracting video metadata'
        );

        let metadata = null;
        if (validationResult.isValid) {
          metadata = await this.validationService.extractMetadata(tempFilePath);
        }

        // Complete validation
        const finalMetadata = metadata || this.createDefaultMetadata();
        video.completeValidation(
          finalMetadata,
          validationResult.errors,
          validationResult.warnings
        );
        await this.videoRepository.update(video);

        // Publish domain events
        await this.publishDomainEvents(video);

        // Update progress: completed
        this.updateProgress(
          videoId,
          'completed',
          100,
          'Validation completed successfully'
        );

        this.logger.log(`Validation completed for video ${videoId}`);
      } finally {
        // Clean up temporary file
        await this.cleanupTempFile(tempFilePath);
      }
    } catch (error) {
      // Let the error bubble up to be handled by processNextJob
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Validation job failed for video ${videoId}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(
    job: ValidationJob,
    error: any
  ): Promise<void> {
    const { videoId } = job;

    if (job.retryCount < job.maxRetries) {
      // Retry the job
      job.retryCount++;
      this.insertJobByPriority(job);

      this.updateProgress(
        videoId,
        'downloading',
        0,
        `Retrying validation (attempt ${job.retryCount + 1})`
      );
      this.logger.warn(
        `Retrying validation for video ${videoId} (attempt ${
          job.retryCount + 1
        })`
      );
    } else {
      // Mark as failed
      try {
        const video = await this.videoRepository.findById({
          value: videoId,
        } as any);
        if (video) {
          video.markAsFailed(
            `Validation failed after ${job.maxRetries} attempts: ${error.message}`
          );
          await this.videoRepository.update(video);
          await this.publishDomainEvents(video);
        }
      } catch (updateError) {
        this.logger.error(
          `Failed to update video ${videoId} as failed:`,
          updateError
        );
      }

      this.updateProgress(
        videoId,
        'failed',
        0,
        `Validation failed: ${error.message}`,
        error.message
      );
      this.logger.error(
        `Validation permanently failed for video ${videoId}:`,
        error
      );
    }
  }

  /**
   * Insert job into queue by priority
   */
  private insertJobByPriority(job: ValidationJob): void {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const jobPriority = priorityOrder[job.priority];

    let insertIndex = this.validationQueue.length;
    for (let i = 0; i < this.validationQueue.length; i++) {
      const existingPriority = priorityOrder[this.validationQueue[i]?.priority || 'low'];
      if (jobPriority < existingPriority) {
        insertIndex = i;
        break;
      }
    }

    this.validationQueue.splice(insertIndex, 0, job);
  }

  /**
   * Update validation progress
   */
  private updateProgress(
    videoId: string,
    stage: ValidationProgress['stage'],
    progress: number,
    message: string,
    error?: string
  ): void {
    const progressData: ValidationProgress = {
      videoId,
      stage,
      progress,
      message,
    };

    if (error !== undefined) {
      progressData.error = error;
    }

    this.progressMap.set(videoId, progressData);
  }

  /**
   * Download file temporarily for validation
   */
  private async downloadFileTemporarily(storageKey: string): Promise<string> {
    // In real implementation, this would download from S3 to a temporary location
    // For now, return the storage key as if it's a local path
    return `/tmp/validation/${storageKey}`;
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    // In real implementation, this would delete the temporary file
    this.logger.debug(`Cleaning up temporary file: ${filePath}`);
  }

  /**
   * Create default metadata when extraction fails
   */
  private createDefaultMetadata(): VideoMetadata {
    return new VideoMetadata({
      duration: 0,
      resolution: { width: 0, height: 0 },
      frameRate: 0,
      bitrate: 0,
      codec: 'unknown',
      format: 'unknown',
      fileSize: 0,
      checksum: 'unknown',
    });
  }

  /**
   * Publish domain events from video entity
   */
  private async publishDomainEvents(video: any): Promise<void> {
    const events = video.domainEvents || [];
    for (const event of events) {
      await this.eventPublisher.publish(event);
    }
    video.clearDomainEvents();
  }
}
