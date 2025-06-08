import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UploadVideoUseCase } from '../../src/video-ingestion-service/application/use-cases/upload-video.use-case';
import { AsyncValidationService } from '../../src/video-ingestion-service/application/services/async-validation.service';
import { ValidationProgressController } from '../../src/video-ingestion-service/controllers/validation-progress.controller';
import { VideoRepository } from '../../src/video-ingestion-service/domain/ports/video.repository';
import { StorageService } from '../../src/video-ingestion-service/domain/ports/storage.service';
import { EventPublisher } from '../../src/video-ingestion-service/domain/ports/event.publisher';
import { VideoValidationService } from '../../src/video-ingestion-service/domain/services/video-validation.service';

describe('Video Ingestion Service Integration Tests', () => {
  let app: INestApplication;
  let uploadVideoUseCase: UploadVideoUseCase;
  let asyncValidationService: AsyncValidationService;

  // Mock implementations
  const mockVideoRepository = {
    save: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn(),
    generatePresignedUrl: jest.fn(),
  };

  const mockEventPublisher = {
    publish: jest.fn(),
    publishBatch: jest.fn(),
  };

  const mockVideoValidationService = {
    validateVideo: jest.fn(),
    extractMetadata: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValidationProgressController],
      providers: [
        UploadVideoUseCase,
        AsyncValidationService,
        {
          provide: VideoRepository,
          useValue: mockVideoRepository,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
        {
          provide: VideoValidationService,
          useValue: mockVideoValidationService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    uploadVideoUseCase = module.get<UploadVideoUseCase>(UploadVideoUseCase);
    asyncValidationService = module.get<AsyncValidationService>(AsyncValidationService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Video Upload Flow', () => {
    it('should successfully upload a video and start validation', async () => {
      // Arrange
      const mockVideo = {
        id: { value: 'test-video-id' },
        domainEvents: [],
        clearDomainEvents: jest.fn(),
      };

      const mockStorageResult = {
        uploadId: 'test-upload-id',
        key: 'test-storage-key',
        bucket: 'test-bucket',
        url: 'https://test-url.com/video.mp4',
        size: 1024 * 1024 * 100, // 100MB
        etag: 'test-etag',
        metadata: {},
      };

      mockVideoRepository.save.mockResolvedValue(mockVideo);
      mockStorageService.upload.mockResolvedValue(mockStorageResult);

      // Create a mock ReadableStream
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        }
      });

      // Act
      const result = await uploadVideoUseCase.execute({
        stream: mockStream,
        filename: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024 * 100,
        uploadedBy: 'test-user',
        matchId: 'test-match',
        teamId: 'test-team',
        tags: ['test', 'integration']
      });

      // Assert
      expect(result).toEqual({
        videoId: 'test-video-id',
        uploadId: 'test-upload-id',
        uploadUrl: 'https://test-url.com/video.mp4'
      });

      expect(mockVideoRepository.save).toHaveBeenCalledTimes(1);
      expect(mockStorageService.upload).toHaveBeenCalledTimes(1);
      expect(mockVideoRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should handle upload failures gracefully', async () => {
      // Arrange
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        }
      });

      mockStorageService.upload.mockRejectedValue(new Error('Storage service unavailable'));

      // Act & Assert
      await expect(uploadVideoUseCase.execute({
        stream: mockStream,
        filename: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024 * 100,
        uploadedBy: 'test-user'
      })).rejects.toThrow('Failed to upload video: Storage service unavailable');
    });
  });

  describe('Async Validation Service', () => {
    it('should add validation job to queue', async () => {
      // Act
      await asyncValidationService.addValidationJob('test-video-id', 'test-storage-key', 'high');

      // Assert
      const progress = asyncValidationService.getValidationProgress('test-video-id');
      expect(progress).toBeDefined();
      expect(progress?.videoId).toBe('test-video-id');
      expect(progress?.stage).toBe('downloading');
      expect(progress?.progress).toBe(0);
    });

    it('should track validation progress', async () => {
      // Arrange
      await asyncValidationService.addValidationJob('test-video-id', 'test-storage-key', 'medium');

      // Act
      const progress = asyncValidationService.getValidationProgress('test-video-id');

      // Assert
      expect(progress).toEqual({
        videoId: 'test-video-id',
        stage: 'downloading',
        progress: 0,
        message: 'Queued for validation'
      });
    });

    it('should return queue status', () => {
      // Act
      const status = asyncValidationService.getQueueStatus();

      // Assert
      expect(status).toEqual({
        queueLength: expect.any(Number),
        activeJobs: expect.any(Number),
        maxConcurrent: 3
      });
    });
  });

  describe('Validation Progress Controller', () => {
    it('should return validation progress for existing video', async () => {
      // Arrange
      await asyncValidationService.addValidationJob('test-video-id', 'test-storage-key', 'high');

      // Act
      const response = await request(app.getHttpServer())
        .get('/validation/progress/test-video-id')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        videoId: 'test-video-id',
        stage: 'downloading',
        progress: 0,
        message: 'Queued for validation',
        queueStatus: {
          queueLength: expect.any(Number),
          activeJobs: expect.any(Number),
          maxConcurrent: 3
        }
      });
    });

    it('should return 404 for non-existent video', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/validation/progress/non-existent-video')
        .expect(404);
    });

    it('should return queue status', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/validation/queue/status')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        queueLength: expect.any(Number),
        activeJobs: expect.any(Number),
        maxConcurrent: 3,
        timestamp: expect.any(String)
      });
    });
  });

  describe('Video Validation Service', () => {
    it('should validate video successfully', async () => {
      // Arrange
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const mockMetadata = {
        duration: 1800,
        resolution: { width: 1920, height: 1080 },
        frameRate: 30,
        bitrate: 5000000,
        codec: 'h264',
        format: 'mp4',
        fileSize: 1024 * 1024 * 100,
        checksum: 'test-checksum'
      };

      mockVideoValidationService.validateVideo.mockResolvedValue(mockValidationResult);
      mockVideoValidationService.extractMetadata.mockResolvedValue(mockMetadata);

      // Act
      const validationResult = await mockVideoValidationService.validateVideo('/test/path');
      const metadata = await mockVideoValidationService.extractMetadata('/test/path');

      // Assert
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(metadata.duration).toBe(1800);
      expect(metadata.resolution.width).toBe(1920);
    });

    it('should handle validation failures', async () => {
      // Arrange
      const mockValidationResult = {
        isValid: false,
        errors: ['Invalid video format', 'Corrupted file'],
        warnings: ['Low resolution']
      };

      mockVideoValidationService.validateVideo.mockResolvedValue(mockValidationResult);

      // Act
      const validationResult = await mockVideoValidationService.validateVideo('/test/path');

      // Assert
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(2);
      expect(validationResult.warnings).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        }
      });

      mockVideoRepository.save.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(uploadVideoUseCase.execute({
        stream: mockStream,
        filename: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024 * 100,
        uploadedBy: 'test-user'
      })).rejects.toThrow('Failed to upload video: Database connection failed');
    });

    it('should handle event publishing errors gracefully', async () => {
      // Arrange
      const mockVideo = {
        id: { value: 'test-video-id' },
        domainEvents: [{ type: 'VideoUploaded' }],
        clearDomainEvents: jest.fn(),
      };

      const mockStorageResult = {
        uploadId: 'test-upload-id',
        key: 'test-storage-key',
        bucket: 'test-bucket',
        url: 'https://test-url.com/video.mp4',
        size: 1024 * 1024 * 100,
        etag: 'test-etag',
        metadata: {},
      };

      mockVideoRepository.save.mockResolvedValue(mockVideo);
      mockStorageService.upload.mockResolvedValue(mockStorageResult);
      mockEventPublisher.publishBatch.mockRejectedValue(new Error('Event bus unavailable'));

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        }
      });

      // Act & Assert
      await expect(uploadVideoUseCase.execute({
        stream: mockStream,
        filename: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024 * 100,
        uploadedBy: 'test-user'
      })).rejects.toThrow('Failed to upload video: Event bus unavailable');
    });
  });
});
