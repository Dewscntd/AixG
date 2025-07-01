import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Domain Ports
import { VIDEO_REPOSITORY } from './domain/ports/video.repository';
import { STORAGE_SERVICE } from './domain/ports/storage.service';
import { EVENT_PUBLISHER } from './domain/ports/event.publisher';

// Domain Services
import {
  VIDEO_VALIDATION_SERVICE,
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
      provide: VIDEO_VALIDATION_SERVICE,
      useClass: DefaultVideoValidationService,
    },

    // Infrastructure Services - Use environment variable to choose implementation
    {
      provide: VIDEO_REPOSITORY,
      useFactory: () => {
        const useInMemory = process.env.USE_IN_MEMORY_REPOSITORY === 'true';
        return useInMemory
          ? new InMemoryVideoRepository()
          : new PostgreSQLVideoRepository();
      },
    },
    {
      provide: STORAGE_SERVICE,
      useClass: S3StorageService,
    },
    {
      provide: EVENT_PUBLISHER,
      useClass: PulsarEventPublisher,
    },
  ],
  exports: [
    // Export use cases for potential use by other modules
    UploadVideoUseCase,
    ResumeUploadUseCase,
    GetUploadProgressUseCase,

    // Export repositories for testing
    VIDEO_REPOSITORY,
  ],
})
export class VideoIngestionModule {}
