import { v4 as uuidv4 } from 'uuid';

/**
 * Base domain event interface
 * All domain events must implement this interface
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly occurredOn: Date;
  public readonly version: number;
  public readonly correlationId?: string;
  public readonly causationId?: string;

  protected constructor(
    eventType: string,
    aggregateId: string,
    version: number = 1,
    correlationId?: string,
    causationId?: string
  ) {
    this.eventId = uuidv4();
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.version = version;
    this.correlationId = correlationId;
    this.causationId = causationId;
  }

  /**
   * Convert event to dictionary for serialization
   */
  abstract toDict(): Record<string, any>;

  /**
   * Get event payload (event-specific data)
   */
  abstract getPayload(): Record<string, any>;

  /**
   * Convert to JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      version: this.version,
      correlationId: this.correlationId,
      causationId: this.causationId,
      payload: this.getPayload()
    };
  }

  /**
   * Create event from JSON
   */
  static fromJSON(data: Record<string, any>): DomainEvent {
    throw new Error('fromJSON must be implemented by concrete event classes');
  }
}
