import { DomainEvent } from './domain-event.interface';
import { VideoId } from '../value-objects/video-id.value-object';
import { VideoMetadata } from '../value-objects/video-metadata.value-object';
import { v4 as uuidv4 } from 'uuid';

export interface VideoValidatedEventProps {
  videoId: VideoId;
  metadata: VideoMetadata;
  validationResults: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  correlationId?: string | undefined;
  causationId?: string | undefined;
}

export class VideoValidatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType: string = 'VideoValidated';
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly version: number = 1;
  readonly correlationId?: string | undefined;
  readonly causationId?: string | undefined;

  readonly videoId: VideoId;
  readonly metadata: VideoMetadata;
  readonly validationResults: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };

  constructor(props: VideoValidatedEventProps) {
    this.eventId = uuidv4();
    this.aggregateId = props.videoId.value;
    this.occurredOn = new Date();
    this.correlationId = props.correlationId;
    this.causationId = props.causationId;

    this.videoId = props.videoId;
    this.metadata = props.metadata;
    this.validationResults = {
      isValid: props.validationResults.isValid,
      errors: [...props.validationResults.errors],
      warnings: [...props.validationResults.warnings],
    };
  }
}
