import { UploadVideoUseCase } from './upload-video.use-case';
import { VideoRepository } from '../../domain/ports/video.repository';
import { StorageService } from '../../domain/ports/storage.service';
import { EventPublisher } from '../../domain/ports/event.publisher';
import { AsyncValidationService } from '../services/async-validation.service';
import { InMemoryVideoRepository } from '../../infrastructure/repositories/in-memory-video.repository';
import { StorageResult } from '../../domain/value-objects/storage-result.value-object';
import { VideoUploadedEvent } from '../../domain/events/video-uploaded.event';

describe('UploadVideoUseCase', () => {
  let useCase: UploadVideoUseCase;
  let videoRepository: VideoRepository;
  let storageService: jest.Mocked<StorageService>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let asyncValidationService: jest.Mocked<AsyncValidationService>;

  beforeEach(() => {
    videoRepository = new InMemoryVideoRepository();

    storageService = {
      upload: jest.fn(),
      resumeUpload: jest.fn(),
      getUploadProgress: jest.fn(),
      deleteUpload: jest.fn(),
      generatePresignedUrl: jest.fn(),
    };

    eventPublisher = {
      publish: jest.fn(),
      publishBatch: jest.fn(),
    };

    asyncValidationService = {
      addValidationJob: jest.fn(),
      getValidationProgress: jest.fn(),
      getQueueStatus: jest.fn(),
    } as any;

    useCase = new UploadVideoUseCase(
      videoRepository,
      storageService,
      eventPublisher,
      asyncValidationService
    );
  });

  describe('execute', () => {
    it('should successfully upload a video', async () => {
      // Arrange
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        },
      });

      const command = {
        stream,
        filename: 'test-match.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024 * 100, // 100MB
        uploadedBy: 'test-user',
        matchId: 'match-123',
        teamId: 'team-456',
        tags: ['training', 'defense'],
      };

      const expectedStorageResult = new StorageResult({
        uploadId: 'upload_123',
        key: 'videos/2023-12-01/abc123/video.mp4',
        bucket: 'test-bucket',
        url: 'https://test-bucket.s3.amazonaws.com/videos/2023-12-01/abc123/video.mp4',
        size: command.size,
        etag: 'test-etag',
      });

      storageService.upload.mockResolvedValue(expectedStorageResult);
      eventPublisher.publishBatch.mockResolvedValue();

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toEqual({
        videoId: expect.any(String),
        uploadId: expect.any(String),
        uploadUrl: expectedStorageResult.url,
      });

      expect(storageService.upload).toHaveBeenCalledWith(
        stream,
        expect.objectContaining({
          filename: command.filename,
          mimeType: command.mimeType,
          size: command.size,
          uploadedBy: command.uploadedBy,
          matchId: command.matchId,
          teamId: command.teamId,
          tags: command.tags,
        })
      );

      expect(eventPublisher.publishBatch).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(VideoUploadedEvent)])
      );

      // Verify video was saved to repository
      const savedVideo = await videoRepository.findByUploadId(result.uploadId);
      expect(savedVideo).toBeDefined();
      expect(savedVideo!.status).toBe('UPLOADED');
      expect(savedVideo!.uploadProgress).toBe(100);
    });

    it('should handle upload failure', async () => {
      // Arrange
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        },
      });

      const command = {
        stream,
        filename: 'test-match.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024 * 100,
        uploadedBy: 'test-user',
      };

      storageService.upload.mockRejectedValue(
        new Error('Storage service unavailable')
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Failed to upload video: Storage service unavailable'
      );

      expect(eventPublisher.publishBatch).not.toHaveBeenCalled();
    });

    it('should validate upload metadata', async () => {
      // Arrange
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const invalidCommand = {
        stream,
        filename: '', // Invalid filename
        mimeType: 'video/mp4',
        size: 1024 * 1024 * 100,
        uploadedBy: 'test-user',
      };

      // Act & Assert
      await expect(useCase.execute(invalidCommand)).rejects.toThrow(
        'Failed to upload video: Filename is required'
      );
    });

    it('should handle large file uploads', async () => {
      // Arrange
      const stream = new ReadableStream({
        start(controller) {
          // Simulate large file
          const chunk = new Uint8Array(1024 * 1024); // 1MB chunk
          for (let i = 0; i < 100; i++) {
            // 100MB total
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const command = {
        stream,
        filename: 'large-match.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024 * 100, // 100MB
        uploadedBy: 'test-user',
      };

      const expectedStorageResult = new StorageResult({
        uploadId: 'upload_large',
        key: 'videos/large/video.mp4',
        bucket: 'test-bucket',
        url: 'https://test-bucket.s3.amazonaws.com/videos/large/video.mp4',
        size: command.size,
      });

      storageService.upload.mockResolvedValue(expectedStorageResult);
      eventPublisher.publishBatch.mockResolvedValue();

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.videoId).toBeDefined();
      expect(result.uploadId).toBeDefined();
      expect(result.uploadUrl).toBe(expectedStorageResult.url);
    });

    it('should handle concurrent uploads', async () => {
      // Arrange
      const createUploadCommand = (index: number) => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([index]));
            controller.close();
          },
        }),
        filename: `test-match-${index}.mp4`,
        mimeType: 'video/mp4',
        size: 1024 * 1024,
        uploadedBy: `user-${index}`,
      });

      const commands = Array.from({ length: 5 }, (_, i) =>
        createUploadCommand(i)
      );

      storageService.upload.mockImplementation(
        async (stream, metadata) =>
          new StorageResult({
            uploadId: metadata.uploadId,
            key: `videos/${metadata.filename}`,
            bucket: 'test-bucket',
            url: `https://test-bucket.s3.amazonaws.com/videos/${metadata.filename}`,
            size: metadata.size,
          })
      );

      eventPublisher.publishBatch.mockResolvedValue();

      // Act
      const results = await Promise.all(
        commands.map(cmd => useCase.execute(cmd))
      );

      // Assert
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.videoId).toBeDefined();
        expect(result.uploadId).toBeDefined();
        expect(result.uploadUrl).toContain(`test-match-${index}.mp4`);
      });

      expect(storageService.upload).toHaveBeenCalledTimes(5);
      expect(eventPublisher.publishBatch).toHaveBeenCalledTimes(5);
    });
  });
});
