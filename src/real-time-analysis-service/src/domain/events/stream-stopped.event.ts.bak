import { DomainEvent } from './domain-event';

/**
 * Event fired when a live stream is stopped
 */
export class StreamStoppedEvent extends DomainEvent {
  public readonly stoppedAt: Date;
  public readonly totalFrames: number;
  public readonly durationMs: number;

  constructor(
    streamId: string,
    stoppedAt: Date,
    totalFrames: number,
    durationMs: number,
    correlationId?: string,
    causationId?: string
  ) {
    super('StreamStopped', streamId, 1, correlationId, causationId);
    this.stoppedAt = stoppedAt;
    this.totalFrames = totalFrames;
    this.durationMs = durationMs;
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
      stoppedAt: this.stoppedAt.toISOString(),
      totalFrames: this.totalFrames,
      durationMs: this.durationMs,
    };
  }

  getPayload(): Record<string, any> {
    return {
      stoppedAt: this.stoppedAt.toISOString(),
      totalFrames: this.totalFrames,
      durationMs: this.durationMs,
      averageFrameRate:
        this.durationMs > 0 ? (this.totalFrames / this.durationMs) * 1000 : 0,
    };
  }

  static override fromJSON(data: Record<string, any>): StreamStoppedEvent {
    const event = new StreamStoppedEvent(
      data.aggregateId,
      new Date(data.stoppedAt),
      data.totalFrames,
      data.durationMs,
      data.correlationId,
      data.causationId
    );

    // Override generated values with persisted ones
    (event as any).eventId = data.eventId;
    (event as any).occurredOn = new Date(data.occurredOn);

    return event;
  }
}
