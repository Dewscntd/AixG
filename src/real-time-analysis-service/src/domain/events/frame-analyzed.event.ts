import { DomainEvent } from './domain-event';

/**
 * Event fired when a frame has been analyzed by the pipeline
 */
export class FrameAnalyzedEvent extends DomainEvent {
  public readonly frameNumber: number;
  public readonly timestamp: number;
  public readonly analysisResult: Record<string, any>;

  constructor(
    streamId: string,
    frameNumber: number,
    timestamp: number,
    analysisResult: Record<string, any>,
    correlationId?: string,
    causationId?: string
  ) {
    super('FrameAnalyzed', streamId, 1, correlationId, causationId);
    this.frameNumber = frameNumber;
    this.timestamp = timestamp;
    this.analysisResult = analysisResult;
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
      analysisResult: this.analysisResult
    };
  }

  getPayload(): Record<string, any> {
    return {
      frameNumber: this.frameNumber,
      timestamp: this.timestamp,
      analysisResult: this.analysisResult
    };
  }

  static fromJSON(data: Record<string, any>): FrameAnalyzedEvent {
    const event = new FrameAnalyzedEvent(
      data.aggregateId,
      data.frameNumber,
      data.timestamp,
      data.analysisResult,
      data.correlationId,
      data.causationId
    );
    
    // Override generated values with persisted ones
    (event as any).eventId = data.eventId;
    (event as any).occurredOn = new Date(data.occurredOn);
    
    return event;
  }
}
