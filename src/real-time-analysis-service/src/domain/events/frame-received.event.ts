import { DomainEvent } from './domain-event';

/**
 * Event fired when a new frame is received in a live stream
 */
export class FrameReceivedEvent extends DomainEvent {
  public readonly frameNumber: number;
  public readonly timestamp: number;
  public readonly width: number;
  public readonly height: number;
  public readonly sizeBytes: number;

  constructor(
    streamId: string,
    frameNumber: number,
    timestamp: number,
    width: number,
    height: number,
    sizeBytes: number,
    correlationId?: string,
    causationId?: string
  ) {
    super('FrameReceived', streamId, 1, correlationId, causationId);
    this.frameNumber = frameNumber;
    this.timestamp = timestamp;
    this.width = width;
    this.height = height;
    this.sizeBytes = sizeBytes;
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
      frameNumber: this.frameNumber,
      timestamp: this.timestamp,
      width: this.width,
      height: this.height,
      sizeBytes: this.sizeBytes
    };
  }

  getPayload(): Record<string, any> {
    return {
      frameNumber: this.frameNumber,
      timestamp: this.timestamp,
      width: this.width,
      height: this.height,
      sizeBytes: this.sizeBytes,
      resolution: `${this.width}x${this.height}`,
      aspectRatio: this.width / this.height
    };
  }

  static fromJSON(data: Record<string, any>): FrameReceivedEvent {
    const event = new FrameReceivedEvent(
      data.aggregateId,
      data.frameNumber,
      data.timestamp,
      data.width,
      data.height,
      data.sizeBytes,
      data.correlationId,
      data.causationId
    );
    
    // Override generated values with persisted ones
    (event as any).eventId = data.eventId;
    (event as any).occurredOn = new Date(data.occurredOn);
    
    return event;
  }
}
