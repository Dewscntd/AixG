import { DomainEvent } from './domain-event';
import { PlayerDetection, BallDetection, TeamClassification, EventDetection } from '../../infrastructure/ml/edge-ml-inference';

/**
 * Analysis result interface for type safety
 */
export interface AnalysisResult {
  frameNumber: number;
  timestamp: number;
  processingTimeMs: number;
  detections: PlayerDetection[];
  ballDetection: BallDetection | null;
  teamClassification: TeamClassification;
  eventDetection: EventDetection[];
  confidence: number;
  metadata: Record<string, unknown>;
}

/**
 * Event fired when a frame has been analyzed by the pipeline
 */
export class FrameAnalyzedEvent extends DomainEvent {
  public readonly frameNumber: number;
  public readonly timestamp: number;
  public readonly analysisResult: AnalysisResult;

  constructor(
    streamId: string,
    frameNumber: number,
    timestamp: number,
    analysisResult: AnalysisResult,
    correlationId?: string,
    causationId?: string
  ) {
    super('FrameAnalyzed', streamId, 1, correlationId, causationId);
    this.frameNumber = frameNumber;
    this.timestamp = timestamp;
    this.analysisResult = analysisResult;
  }

  toDict(): Record<string, unknown> {
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

  getPayload(): Record<string, unknown> {
    return {
      frameNumber: this.frameNumber,
      timestamp: this.timestamp,
      analysisResult: this.analysisResult
    };
  }

  static override fromJSON(data: Record<string, unknown>): FrameAnalyzedEvent {
    const event = new FrameAnalyzedEvent(
      data.aggregateId as string,
      data.frameNumber as number,
      data.timestamp as number,
      data.analysisResult as AnalysisResult,
      data.correlationId as string,
      data.causationId as string
    );

    // Override generated values with persisted ones
    (event as unknown as { eventId: string }).eventId = data.eventId as string;
    (event as unknown as { occurredOn: Date }).occurredOn = new Date(data.occurredOn as string);

    return event;
  }
}
