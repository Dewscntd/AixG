/**
 * Video Ingestion Service Barrel Exports
 * Provides centralized access to video ingestion service components
 */

// Main Module
export { VideoIngestionModule } from './video.module';

// Controllers
export { VideoUploadController } from './controllers/upload.controller';

// Application Layer - Use Cases
export { UploadVideoUseCase } from './application/use-cases/upload-video.use-case';
export { ResumeUploadUseCase } from './application/use-cases/resume-upload.use-case';
export { GetUploadProgressUseCase } from './application/use-cases/get-upload-progress.use-case';

// Application Layer - Services
export { AsyncValidationService } from './application/services/async-validation.service';

// Application Layer - DTOs
export { UploadVideoDto } from './application/dto/upload-video.dto';

// Domain Layer - Entities
export { Video } from './domain/entities/video.entity';

// Domain Layer - Value Objects
export { VideoId } from './domain/value-objects/video-id.value-object';
export { UploadMetadata } from './domain/value-objects/upload-metadata.value-object';
export { VideoMetadata } from './domain/value-objects/video-metadata.value-object';
export { StorageResult } from './domain/value-objects/storage-result.value-object';

// Domain Layer - Events
export { VideoUploadedEvent } from './domain/events/video-uploaded.event';
export { VideoValidatedEvent } from './domain/events/video-validated.event';
export { VideoProcessingStartedEvent } from './domain/events/video-processing-started.event';

// Domain Layer - Services & Interfaces (Ports)
export { VideoValidationService } from './domain/services/video-validation.service';
export { VideoRepository } from './domain/ports/video.repository';
export { StorageService } from './domain/ports/storage.service';
export { EventPublisher } from './domain/ports/event.publisher';

// Infrastructure Layer - Implementations
export { PostgreSQLVideoRepository } from './infrastructure/repositories/postgresql-video.repository';
export { InMemoryVideoRepository } from './infrastructure/repositories/in-memory-video.repository';
export { S3StorageService } from './infrastructure/s3-storage.service';
export { PulsarEventPublisher } from './infrastructure/pulsar-event.publisher';
