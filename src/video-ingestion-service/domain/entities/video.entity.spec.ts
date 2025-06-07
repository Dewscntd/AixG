import { Video, VideoStatus } from './video.entity';
import { UploadMetadata } from '../value-objects/upload-metadata.value-object';
import { VideoMetadata } from '../value-objects/video-metadata.value-object';
import { StorageResult } from '../value-objects/storage-result.value-object';
import { VideoUploadedEvent } from '../events/video-uploaded.event';

describe('Video Entity', () => {
  let uploadMetadata: UploadMetadata;

  beforeEach(() => {
    uploadMetadata = new UploadMetadata({
      filename: 'test-match.mp4',
      mimeType: 'video/mp4',
      size: 1024 * 1024 * 100, // 100MB
      uploadedBy: 'test-user',
      matchId: 'match-123',
      teamId: 'team-456',
      tags: ['training', 'defense']
    });
  });

  describe('createForUpload', () => {
    it('should create a new video in uploading state', () => {
      const video = Video.createForUpload(uploadMetadata);

      expect(video.id).toBeDefined();
      expect(video.status).toBe(VideoStatus.UPLOADING);
      expect(video.uploadProgress).toBe(0);
      expect(video.uploadMetadata).toBe(uploadMetadata);
      expect(video.validationErrors).toEqual([]);
      expect(video.validationWarnings).toEqual([]);
      expect(video.domainEvents).toEqual([]);
    });
  });

  describe('markAsUploaded', () => {
    it('should mark video as uploaded and emit domain event', () => {
      const video = Video.createForUpload(uploadMetadata);
      const storageResult = new StorageResult({
        uploadId: uploadMetadata.uploadId,
        key: 'videos/2023-12-01/abc123/video.mp4',
        bucket: 'test-bucket',
        url: 'https://test-bucket.s3.amazonaws.com/videos/2023-12-01/abc123/video.mp4',
        size: uploadMetadata.size,
        etag: 'test-etag'
      });

      video.markAsUploaded(storageResult);

      expect(video.status).toBe(VideoStatus.UPLOADED);
      expect(video.uploadProgress).toBe(100);
      expect(video.storageResult).toBe(storageResult);
      expect(video.domainEvents).toHaveLength(1);
      expect(video.domainEvents[0]).toBeInstanceOf(VideoUploadedEvent);
    });

    it('should throw error if video is not in uploading state', () => {
      const video = Video.createForUpload(uploadMetadata);
      const storageResult = new StorageResult({
        uploadId: uploadMetadata.uploadId,
        key: 'test-key',
        bucket: 'test-bucket',
        url: 'test-url',
        size: 1000
      });

      video.markAsUploaded(storageResult);

      expect(() => video.markAsUploaded(storageResult)).toThrow(
        'Cannot mark video as uploaded. Current status: UPLOADED'
      );
    });
  });

  describe('updateUploadProgress', () => {
    it('should update upload progress', () => {
      const video = Video.createForUpload(uploadMetadata);

      video.updateUploadProgress(50);

      expect(video.uploadProgress).toBe(50);
    });

    it('should throw error for invalid progress values', () => {
      const video = Video.createForUpload(uploadMetadata);

      expect(() => video.updateUploadProgress(-1)).toThrow(
        'Upload progress must be between 0 and 100'
      );
      expect(() => video.updateUploadProgress(101)).toThrow(
        'Upload progress must be between 0 and 100'
      );
    });

    it('should throw error if video is not in uploading state', () => {
      const video = Video.createForUpload(uploadMetadata);
      const storageResult = new StorageResult({
        uploadId: uploadMetadata.uploadId,
        key: 'test-key',
        bucket: 'test-bucket',
        url: 'test-url',
        size: 1000
      });

      video.markAsUploaded(storageResult);

      expect(() => video.updateUploadProgress(75)).toThrow(
        'Cannot update upload progress. Current status: UPLOADED'
      );
    });
  });

  describe('validation workflow', () => {
    it('should complete validation workflow successfully', () => {
      const video = Video.createForUpload(uploadMetadata);
      const storageResult = new StorageResult({
        uploadId: uploadMetadata.uploadId,
        key: 'test-key',
        bucket: 'test-bucket',
        url: 'test-url',
        size: 1000
      });

      video.markAsUploaded(storageResult);
      video.startValidation();

      expect(video.status).toBe(VideoStatus.VALIDATING);

      const videoMetadata = new VideoMetadata({
        duration: 1800,
        resolution: { width: 1920, height: 1080 },
        frameRate: 30,
        bitrate: 5000000,
        codec: 'h264',
        format: 'mp4',
        fileSize: uploadMetadata.size,
        checksum: 'test-checksum'
      });

      video.completeValidation(videoMetadata, [], ['Low bitrate detected']);

      expect(video.status).toBe(VideoStatus.VALIDATED);
      expect(video.videoMetadata).toBe(videoMetadata);
      expect(video.validationErrors).toEqual([]);
      expect(video.validationWarnings).toEqual(['Low bitrate detected']);
      expect(video.isReadyForProcessing()).toBe(true);
    });

    it('should mark as failed when validation has errors', () => {
      const video = Video.createForUpload(uploadMetadata);
      const storageResult = new StorageResult({
        uploadId: uploadMetadata.uploadId,
        key: 'test-key',
        bucket: 'test-bucket',
        url: 'test-url',
        size: 1000
      });

      video.markAsUploaded(storageResult);
      video.startValidation();

      const videoMetadata = new VideoMetadata({
        duration: 10, // Too short
        resolution: { width: 320, height: 240 }, // Too low resolution
        frameRate: 30,
        bitrate: 5000000,
        codec: 'h264',
        format: 'mp4',
        fileSize: uploadMetadata.size,
        checksum: 'test-checksum'
      });

      video.completeValidation(videoMetadata, ['Video too short', 'Resolution too low'], []);

      expect(video.status).toBe(VideoStatus.FAILED);
      expect(video.validationErrors).toEqual(['Video too short', 'Resolution too low']);
      expect(video.isReadyForProcessing()).toBe(false);
    });
  });

  describe('domain behavior', () => {
    it('should identify high definition videos', () => {
      const video = Video.createForUpload(uploadMetadata);
      const videoMetadata = new VideoMetadata({
        duration: 1800,
        resolution: { width: 1920, height: 1080 },
        frameRate: 30,
        bitrate: 5000000,
        codec: 'h264',
        format: 'mp4',
        fileSize: uploadMetadata.size,
        checksum: 'test-checksum'
      });

      const storageResult = new StorageResult({
        uploadId: uploadMetadata.uploadId,
        key: 'test-key',
        bucket: 'test-bucket',
        url: 'test-url',
        size: 1000
      });

      video.markAsUploaded(storageResult);
      video.startValidation();
      video.completeValidation(videoMetadata);

      expect(video.isHighDefinition()).toBe(true);
      expect(video.getDurationInMinutes()).toBe(30);
    });

    it('should clear domain events', () => {
      const video = Video.createForUpload(uploadMetadata);
      const storageResult = new StorageResult({
        uploadId: uploadMetadata.uploadId,
        key: 'test-key',
        bucket: 'test-bucket',
        url: 'test-url',
        size: 1000
      });

      video.markAsUploaded(storageResult);
      expect(video.domainEvents).toHaveLength(1);

      video.clearDomainEvents();
      expect(video.domainEvents).toHaveLength(0);
    });
  });
});
