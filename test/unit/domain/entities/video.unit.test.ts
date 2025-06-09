/**
 * Unit Tests for Video Entity
 * Tests domain behavior, state transitions, and business rules
 */

import {
  Video,
  VideoStatus,
} from '@video-ingestion/domain/entities/video.entity';
import { VideoId } from '@video-ingestion/domain/value-objects/video-id.value-object';
import { UploadMetadata } from '@video-ingestion/domain/value-objects/upload-metadata.value-object';
import { VideoMetadata } from '@video-ingestion/domain/value-objects/video-metadata.value-object';
import { StorageResult } from '@video-ingestion/domain/value-objects/storage-result.value-object';
// TestDataFactory import removed as it's not used
import * as fc from 'fast-check';

describe('Video Entity', () => {
  let uploadMetadata: UploadMetadata;
  let videoMetadata: VideoMetadata;
  let storageResult: StorageResult;

  beforeEach(() => {
    uploadMetadata = new UploadMetadata({
      filename: 'test-match.mp4',
      mimeType: 'video/mp4',
      size: 1024 * 1024 * 100, // 100MB
      uploadedBy: 'user-123',
      matchId: 'match-456',
      teamId: 'team-789',
      tags: ['match', 'highlights'],
    });

    videoMetadata = new VideoMetadata({
      duration: 1800, // 30 minutes
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrate: 5000000,
      codec: 'h264',
      format: 'mp4',
      fileSize: uploadMetadata.size,
      checksum: 'abc123def456',
    });

    storageResult = new StorageResult({
      uploadId: uploadMetadata.uploadId,
      key: 'videos/test-match.mp4',
      bucket: 'footanalytics-videos',
      url: 'https://cdn.example.com/videos/test-match.mp4',
      size: uploadMetadata.size,
    });
  });

  describe('Creation', () => {
    it('should create video for upload with correct initial state', () => {
      const video = Video.createForUpload(uploadMetadata);

      expect(video.id).toBeValidVideoId();
      expect(video.status).toBe(VideoStatus.UPLOADING);
      expect(video.uploadProgress).toBe(0);
      expect(video.validationErrors).toHaveLength(0);
      expect(video.validationWarnings).toHaveLength(0);
      expect(video.domainEvents).toHaveLength(0);
      expect(video.createdAt).toBeInstanceOf(Date);
      expect(video.updatedAt).toBeInstanceOf(Date);
    });

    it('should create video from snapshot with all properties', () => {
      const snapshot = {
        id: VideoId.generate().value,
        uploadMetadata: uploadMetadata.toSnapshot(),
        storageResult: storageResult.toSnapshot(),
        videoMetadata: videoMetadata.toSnapshot(),
        status: VideoStatus.PROCESSED,
        uploadProgress: 100,
        validationErrors: [],
        validationWarnings: ['Low bitrate detected'],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      const video = Video.fromSnapshot(snapshot);

      expect(video.id.value).toBe(snapshot.id);
      expect(video.status).toBe(VideoStatus.PROCESSED);
      expect(video.uploadProgress).toBe(100);
      expect(video.validationWarnings).toContain('Low bitrate detected');
    });
  });

  describe('State Transitions', () => {
    let video: Video;

    beforeEach(() => {
      video = Video.createForUpload(uploadMetadata);
    });

    describe('Upload Flow', () => {
      it('should transition from UPLOADING to UPLOADED when marked as uploaded', () => {
        video.markAsUploaded(storageResult);

        expect(video.status).toBe(VideoStatus.UPLOADED);
        expect(video.uploadProgress).toBe(100);
        expect(video.storageResult).toBeDefined();
        expect(video.domainEvents).toHaveLength(1);
        expect(video.domainEvents[0]).toHaveValidDomainEvent();
      });

      it('should throw error when marking as uploaded from invalid state', () => {
        video.markAsUploaded(storageResult);

        expect(() => video.markAsUploaded(storageResult)).toThrow(
          'Cannot mark video as uploaded. Current status: UPLOADED'
        );
      });

      it('should update progress during upload', () => {
        video.updateUploadProgress(50);
        expect(video.uploadProgress).toBe(50);

        video.updateUploadProgress(75);
        expect(video.uploadProgress).toBe(75);
      });

      it('should not allow progress to exceed 100', () => {
        expect(() => video.updateUploadProgress(150)).toThrow(
          'Upload progress cannot exceed 100%'
        );
      });

      it('should not allow negative progress', () => {
        expect(() => video.updateUploadProgress(-10)).toThrow(
          'Upload progress cannot be negative'
        );
      });
    });

    describe('Validation Flow', () => {
      beforeEach(() => {
        video.markAsUploaded(storageResult);
      });

      it('should transition from UPLOADED to VALIDATING when validation starts', () => {
        video.startValidation();

        expect(video.status).toBe(VideoStatus.VALIDATING);
      });

      it('should transition from VALIDATING to VALIDATED when validation completes', () => {
        video.startValidation();
        video.completeValidation(videoMetadata);

        expect(video.status).toBe(VideoStatus.VALIDATED);
        expect(video.videoMetadata).toBeDefined();
      });

      it('should add validation warnings without changing status', () => {
        video.startValidation();
        video.addValidationWarning('Low bitrate detected');

        expect(video.status).toBe(VideoStatus.VALIDATING);
        expect(video.validationWarnings).toContain('Low bitrate detected');
      });

      it('should transition to FAILED when validation fails', () => {
        video.startValidation();
        video.markAsFailed('Invalid video format');

        expect(video.status).toBe(VideoStatus.FAILED);
        expect(video.validationErrors).toContain('Invalid video format');
      });
    });

    describe('Processing Flow', () => {
      beforeEach(() => {
        video.markAsUploaded(storageResult);
        video.startValidation();
        video.completeValidation(videoMetadata);
      });

      it('should transition from VALIDATED to PROCESSING when processing starts', () => {
        video.startProcessing();

        expect(video.status).toBe(VideoStatus.PROCESSING);
      });

      it('should transition from PROCESSING to PROCESSED when processing completes', () => {
        video.startProcessing();
        video.completeProcessing();

        expect(video.status).toBe(VideoStatus.PROCESSED);
      });
    });
  });

  describe('Business Rules', () => {
    let video: Video;

    beforeEach(() => {
      video = Video.createForUpload(uploadMetadata);
      video.markAsUploaded(storageResult);
      video.startValidation();
      video.completeValidation(videoMetadata);
    });

    it('should identify video as ready for processing when validated', () => {
      expect(video.isReadyForProcessing()).toBe(true);
    });

    it('should not be ready for processing when validation failed', () => {
      video.markAsFailed('Invalid format');
      expect(video.isReadyForProcessing()).toBe(false);
    });

    it('should identify high definition videos correctly', () => {
      expect(video.isHighDefinition()).toBe(true);
    });

    it('should calculate duration in minutes correctly', () => {
      expect(video.getDurationInMinutes()).toBe(30); // 1800 seconds = 30 minutes
    });
  });

  describe('Domain Events', () => {
    it('should publish VideoUploadedEvent when marked as uploaded', () => {
      const video = Video.createForUpload(uploadMetadata);
      video.markAsUploaded(storageResult);

      const events = video.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('VideoUploaded');
      expect(events[0]).toHaveValidDomainEvent();
    });

    it('should clear domain events when requested', () => {
      const video = Video.createForUpload(uploadMetadata);
      video.markAsUploaded(storageResult);

      expect(video.domainEvents).toHaveLength(1);

      video.clearDomainEvents();
      expect(video.domainEvents).toHaveLength(0);
    });
  });

  describe('Snapshots', () => {
    it('should create complete snapshot of video state', () => {
      const video = Video.createForUpload(uploadMetadata);
      video.markAsUploaded(storageResult);
      video.startValidation();
      video.completeValidation(videoMetadata);

      const snapshot = video.toSnapshot();

      expect(snapshot.id).toBe(video.id.value);
      expect(snapshot.status).toBe(video.status);
      expect(snapshot.uploadProgress).toBe(video.uploadProgress);
      expect(snapshot.uploadMetadata).toBeDefined();
      expect(snapshot.storageResult).toBeDefined();
      expect(snapshot.videoMetadata).toBeDefined();
    });

    it('should restore video from snapshot correctly', () => {
      const originalVideo = Video.createForUpload(uploadMetadata);
      originalVideo.markAsUploaded(storageResult);
      originalVideo.startValidation();
      originalVideo.completeValidation(videoMetadata);

      const snapshot = originalVideo.toSnapshot();
      const restoredVideo = Video.fromSnapshot(snapshot);

      expect(restoredVideo.id.value).toBe(originalVideo.id.value);
      expect(restoredVideo.status).toBe(originalVideo.status);
      expect(restoredVideo.uploadProgress).toBe(originalVideo.uploadProgress);
    });
  });

  describe('Property-Based Tests', () => {
    it('should maintain valid state through all transitions', () => {
      fc.assert(
        fc.property(
          fc.record({
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            size: fc.integer({ min: 1024, max: 10 * 1024 * 1024 * 1024 }),
            uploadedBy: fc.uuid(),
          }),
          props => {
            const metadata = new UploadMetadata({
              filename: `${props.filename}.mp4`,
              mimeType: 'video/mp4',
              size: props.size,
              uploadedBy: props.uploadedBy,
              tags: [],
            });

            const video = Video.createForUpload(metadata);

            // Video should always start in valid state
            expect(video.status).toBe(VideoStatus.UPLOADING);
            expect(video.uploadProgress).toBe(0);
            expect(video.validationErrors).toHaveLength(0);
          }
        )
      );
    });

    it('should always maintain progress between 0 and 100', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), progress => {
          const video = Video.createForUpload(uploadMetadata);
          video.updateUploadProgress(progress);

          expect(video.uploadProgress).toBeGreaterThanOrEqual(0);
          expect(video.uploadProgress).toBeLessThanOrEqual(100);
        })
      );
    });
  });

  describe('Performance', () => {
    it('should create videos efficiently', () => {
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          Video.createForUpload(uploadMetadata);
        }
      }).toHavePerformanceWithin(100);
    });

    it('should handle state transitions efficiently', () => {
      const video = Video.createForUpload(uploadMetadata);

      expect(() => {
        for (let i = 0; i < 1000; i++) {
          video.updateUploadProgress(Math.floor(Math.random() * 101));
        }
      }).toHavePerformanceWithin(50);
    });
  });
});
