import { VideoId } from '../value-objects/video-id.value-object';
import { UploadMetadata } from '../value-objects/upload-metadata.value-object';
import { VideoMetadata } from '../value-objects/video-metadata.value-object';
import { StorageResult } from '../value-objects/storage-result.value-object';
import { DomainEvent } from '../events/domain-event.interface';
import { VideoUploadedEvent } from '../events/video-uploaded.event';
import { VideoValidatedEvent } from '../events/video-validated.event';
import { VideoProcessingStartedEvent } from '../events/video-processing-started.event';

export enum VideoStatus {
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  VALIDATING = 'VALIDATING',
  VALIDATED = 'VALIDATED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED'
}

export interface VideoProps {
  id: VideoId;
  uploadMetadata: UploadMetadata;
  storageResult?: StorageResult;
  videoMetadata?: VideoMetadata;
  status: VideoStatus;
  uploadProgress: number;
  validationErrors: string[];
  validationWarnings: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Video {
  private readonly _id: VideoId;
  private _uploadMetadata: UploadMetadata;
  private _storageResult?: StorageResult;
  private _videoMetadata?: VideoMetadata;
  private _status: VideoStatus;
  private _uploadProgress: number;
  private _validationErrors: string[];
  private _validationWarnings: string[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _domainEvents: DomainEvent[] = [];

  constructor(props: VideoProps) {
    this._id = props.id;
    this._uploadMetadata = props.uploadMetadata;
    this._storageResult = props.storageResult;
    this._videoMetadata = props.videoMetadata;
    this._status = props.status;
    this._uploadProgress = props.uploadProgress;
    this._validationErrors = [...props.validationErrors];
    this._validationWarnings = [...props.validationWarnings];
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Factory method for creating new video upload
  static createForUpload(uploadMetadata: UploadMetadata): Video {
    const video = new Video({
      id: VideoId.generate(),
      uploadMetadata,
      status: VideoStatus.UPLOADING,
      uploadProgress: 0,
      validationErrors: [],
      validationWarnings: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return video;
  }

  // Getters
  get id(): VideoId {
    return this._id;
  }

  get uploadMetadata(): UploadMetadata {
    return this._uploadMetadata;
  }

  get storageResult(): StorageResult | undefined {
    return this._storageResult;
  }

  get videoMetadata(): VideoMetadata | undefined {
    return this._videoMetadata;
  }

  get status(): VideoStatus {
    return this._status;
  }

  get uploadProgress(): number {
    return this._uploadProgress;
  }

  get validationErrors(): string[] {
    return [...this._validationErrors];
  }

  get validationWarnings(): string[] {
    return [...this._validationWarnings];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  // Domain behavior methods
  markAsUploaded(storageResult: StorageResult): void {
    if (this._status !== VideoStatus.UPLOADING) {
      throw new Error(`Cannot mark video as uploaded. Current status: ${this._status}`);
    }

    this._storageResult = storageResult;
    this._status = VideoStatus.UPLOADED;
    this._uploadProgress = 100;
    this._updatedAt = new Date();

    this.addDomainEvent(new VideoUploadedEvent({
      videoId: this._id,
      uploadId: this._uploadMetadata.uploadId,
      filename: this._uploadMetadata.filename,
      fileSize: this._uploadMetadata.size,
      mimeType: this._uploadMetadata.mimeType,
      storageKey: storageResult.key,
      storageBucket: storageResult.bucket,
      uploadedBy: this._uploadMetadata.uploadedBy,
      matchId: this._uploadMetadata.matchId,
      teamId: this._uploadMetadata.teamId
    }));
  }

  updateUploadProgress(progress: number): void {
    if (this._status !== VideoStatus.UPLOADING) {
      throw new Error(`Cannot update upload progress. Current status: ${this._status}`);
    }

    if (progress < 0 || progress > 100) {
      throw new Error('Upload progress must be between 0 and 100');
    }

    this._uploadProgress = progress;
    this._updatedAt = new Date();
  }

  startValidation(): void {
    if (this._status !== VideoStatus.UPLOADED) {
      throw new Error(`Cannot start validation. Current status: ${this._status}`);
    }

    this._status = VideoStatus.VALIDATING;
    this._updatedAt = new Date();
  }

  completeValidation(
    videoMetadata: VideoMetadata,
    errors: string[] = [],
    warnings: string[] = []
  ): void {
    if (this._status !== VideoStatus.VALIDATING) {
      throw new Error(`Cannot complete validation. Current status: ${this._status}`);
    }

    this._videoMetadata = videoMetadata;
    this._validationErrors = [...errors];
    this._validationWarnings = [...warnings];
    this._status = errors.length > 0 ? VideoStatus.FAILED : VideoStatus.VALIDATED;
    this._updatedAt = new Date();

    this.addDomainEvent(new VideoValidatedEvent({
      videoId: this._id,
      metadata: videoMetadata,
      validationResults: {
        isValid: errors.length === 0,
        errors: [...errors],
        warnings: [...warnings]
      }
    }));
  }

  startProcessing(processingId: string): void {
    if (this._status !== VideoStatus.VALIDATED) {
      throw new Error(`Cannot start processing. Current status: ${this._status}`);
    }

    this._status = VideoStatus.PROCESSING;
    this._updatedAt = new Date();

    const estimatedDuration = this._videoMetadata 
      ? Math.ceil(this._videoMetadata.duration * 2) // Estimate 2x video duration for processing
      : 300; // Default 5 minutes

    this.addDomainEvent(new VideoProcessingStartedEvent({
      videoId: this._id,
      processingId,
      estimatedDuration
    }));
  }

  markAsProcessed(): void {
    if (this._status !== VideoStatus.PROCESSING) {
      throw new Error(`Cannot mark as processed. Current status: ${this._status}`);
    }

    this._status = VideoStatus.PROCESSED;
    this._updatedAt = new Date();
  }

  markAsFailed(error: string): void {
    this._status = VideoStatus.FAILED;
    this._validationErrors.push(error);
    this._updatedAt = new Date();
  }

  // Domain validation methods
  isReadyForProcessing(): boolean {
    return this._status === VideoStatus.VALIDATED && this._validationErrors.length === 0;
  }

  isHighDefinition(): boolean {
    return this._videoMetadata?.isHighDefinition() ?? false;
  }

  getDurationInMinutes(): number {
    return this._videoMetadata ? Math.ceil(this._videoMetadata.duration / 60) : 0;
  }

  // Event management
  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }
}
