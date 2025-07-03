import { DomainEvent } from './domain-event.interface';
import { VideoId } from '../value-objects/video-id.value-object';
import { v4 as uuidv4 } from 'uuid';

export interface VideoProcessingStartedEventProps {
  videoId: VideoId;
  processingId: string;
  estimatedDuration: number;
  correlationId?: string | undefined;
  causationId?: string | undefined;
}

export class VideoProcessingStartedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType: string = 'VideoProcessingStarted';
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly version: number = 1;
  readonly correlationId?: string | undefined;
  readonly causationId?: string | undefined;

  readonly videoId: VideoId;
  readonly processingId: string;
  readonly estimatedDuration: number;

  constructor(props: VideoProcessingStartedEventProps) {
    this.eventId = uuidv4();
    this.aggregateId = props.videoId.value;
    this.occurredOn = new Date();
    this.correlationId = props.correlationId;
    this.causationId = props.causationId;

    this.videoId = props.videoId;
    this.processingId = props.processingId;
    this.estimatedDuration = props.estimatedDuration;
  }
}
