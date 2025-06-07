import { DomainEvent } from './domain-event.interface';
import { VideoId } from '../value-objects/video-id.value-object';
import { v4 as uuidv4 } from 'uuid';

export interface VideoUploadedEventProps {
  videoId: VideoId;
  uploadId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  storageBucket: string;
  uploadedBy: string;
  matchId?: string;
  teamId?: string;
  correlationId?: string;
  causationId?: string;
}

export class VideoUploadedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType: string = 'VideoUploaded';
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly version: number = 1;
  readonly correlationId?: string;
  readonly causationId?: string;

  readonly videoId: VideoId;
  readonly uploadId: string;
  readonly filename: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly storageKey: string;
  readonly storageBucket: string;
  readonly uploadedBy: string;
  readonly matchId?: string;
  readonly teamId?: string;

  constructor(props: VideoUploadedEventProps) {
    this.eventId = uuidv4();
    this.aggregateId = props.videoId.value;
    this.occurredOn = new Date();
    this.correlationId = props.correlationId;
    this.causationId = props.causationId;

    this.videoId = props.videoId;
    this.uploadId = props.uploadId;
    this.filename = props.filename;
    this.fileSize = props.fileSize;
    this.mimeType = props.mimeType;
    this.storageKey = props.storageKey;
    this.storageBucket = props.storageBucket;
    this.uploadedBy = props.uploadedBy;
    this.matchId = props.matchId;
    this.teamId = props.teamId;
  }
}
