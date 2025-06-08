import { Controller, Get, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AsyncValidationService } from '../application/services/async-validation.service';

export interface ValidationProgressResponse {
  videoId: string;
  stage: 'downloading' | 'validating' | 'extracting_metadata' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  queueStatus?: {
    queueLength: number;
    activeJobs: number;
    maxConcurrent: number;
  };
}

/**
 * Controller for tracking video validation progress
 */
@Controller('validation')
export class ValidationProgressController {
  private readonly logger = new Logger(ValidationProgressController.name);

  constructor(
    private readonly asyncValidationService: AsyncValidationService
  ) {}

  /**
   * Get validation progress for a specific video
   */
  @Get('progress/:videoId')
  async getValidationProgress(@Param('videoId') videoId: string): Promise<ValidationProgressResponse> {
    try {
      this.logger.log(`Getting validation progress for video: ${videoId}`);

      const progress = this.asyncValidationService.getValidationProgress(videoId);
      
      if (!progress) {
        throw new HttpException(
          `No validation progress found for video ${videoId}`,
          HttpStatus.NOT_FOUND
        );
      }

      const queueStatus = this.asyncValidationService.getQueueStatus();

      return {
        ...progress,
        queueStatus
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to get validation progress for video ${videoId}:`, error);
      throw new HttpException(
        'Failed to get validation progress',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get overall validation queue status
   */
  @Get('queue/status')
  async getQueueStatus() {
    try {
      this.logger.log('Getting validation queue status');

      const status = this.asyncValidationService.getQueueStatus();

      return {
        ...status,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to get queue status:', error);
      throw new HttpException(
        'Failed to get queue status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
