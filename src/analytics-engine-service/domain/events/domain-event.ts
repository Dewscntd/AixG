/**
 * Base domain event interface for event sourcing
 */

export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly correlationId?: string | undefined;
  readonly causationId?: string | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  toJSON?(): Record<string, unknown>;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly version: number;
  public readonly timestamp: Date;
  public readonly correlationId?: string | undefined;
  public readonly causationId?: string | undefined;
  public readonly metadata?: Record<string, unknown> | undefined;

  constructor(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    version: number,
    correlationId?: string,
    causationId?: string,
    metadata?: Record<string, unknown>
  ) {
    this.eventId = this.generateEventId();
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.version = version;
    this.timestamp = new Date();
    this.correlationId = correlationId ?? undefined;
    this.causationId = causationId ?? undefined;
    this.metadata = metadata ?? undefined;
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      version: this.version,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
      metadata: this.metadata,
      ...this.getEventData()
    };
  }

  abstract getEventData(): Record<string, unknown>;
}
