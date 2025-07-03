import { DomainEvent } from './domain-event';
import { StreamMetadata } from '../entities/live-stream';

/**
 * Event fired when a live stream is started
 */
export class StreamStartedEvent extends DomainEvent {
  public readonly startedAt: Date;
  public readonly metadata: StreamMetadata;

  constructor(
    streamId: string,
    startedAt: Date,
    metadata: StreamMetadata,
    correlationId?: string,
    causationId?: string
  ) {
    super('StreamStarted', streamId, 1, correlationId, causationId);
    this.startedAt = startedAt;
    this.metadata = metadata;
  }

  toDict(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      version: this.version,
      correlationId: this.correlationId,
      causationId: this.causationId,
      startedAt: this.startedAt.toISOString(),
      metadata: this.metadata,
    };
  }

  getPayload(): Record<string, any> {
    return {
      startedAt: this.startedAt.toISOString(),
      metadata: this.metadata,
    };
  }

  static override fromJSON(data: Record<string, any>): StreamStartedEvent {
    const event = new StreamStartedEvent(
      data.aggregateId,
      new Date(data.startedAt),
      data.metadata,
      data.correlationId,
      data.causationId
    );

    // Override generated values with persisted ones
    (event as any).eventId = data.eventId;
    (event as any).occurredOn = new Date(data.occurredOn);

    return event;
  }
}
