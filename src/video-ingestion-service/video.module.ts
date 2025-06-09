import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Domain Ports
import { VideoRepository } from './domain/ports/video.repository';
import { StorageService } from './domain/ports/storage.service';
import { EventPublisher } from './domain/ports/event.publisher';

// Domain Services
import {
  VideoValidationService,
  DefaultVideoValidationService,
} from './domain/services/video-validation.service';

// Application Use Cases
import { UploadVideoUseCase } from './application/use-cases/upload-video.use-case';
import { ResumeUploadUseCase } from './application/use-cases/resume-upload.use-case';
import { GetUploadProgressUseCase } from './application/use-cases/get-upload-progress.use-case';

// Infrastructure Implementations
import { PostgreSQLVideoRepository } from './infrastructure/repositories/postgresql-video.repository';
import { InMemoryVideoRepository } from './infrastructure/repositories/in-memory-video.repository';
import { S3StorageService } from './infrastructure/s3-storage.service';
import { PulsarEventPublisher } from './infrastructure/pulsar-event.publisher';

// Controllers
import { VideoUploadController } from './controllers/upload.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [VideoUploadController],
  providers: [
    // Use Cases
    UploadVideoUseCase,
    ResumeUploadUseCase,
    GetUploadProgressUseCase,

    // Domain Services
    {
      provide: VideoValidationService,
      useClass: DefaultVideoValidationService,
    },

    // Infrastructure Services - Use environment variable to choose implementation
    {
      provide: VideoRepository,
      useFactory: () => {
        const useInMemory = process.env.USE_IN_MEMORY_REPOSITORY === 'true';
        return useInMemory
          ? new InMemoryVideoRepository()
          : new PostgreSQLVideoRepository();
      },
    },
    {
      provide: StorageService,
      useClass: S3StorageService,
    },
    {
      provide: EventPublisher,
      useClass: PulsarEventPublisher,
    },
  ],
  exports: [
    // Export use cases for potential use by other modules
    UploadVideoUseCase,
    ResumeUploadUseCase,
    GetUploadProgressUseCase,

    // Export repositories for testing
    VideoRepository,
  ],
})
export class VideoIngestionModule {}
