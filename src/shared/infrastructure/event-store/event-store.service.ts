import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../../domain/base/aggregate-root';

export interface StoredEvent {
  id: string;
  aggregateId: string;
  eventType: string;
  eventData: any;
  eventVersion: number;
  occurredOn: Date;
  streamName: string;
}

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);
  private readonly events: StoredEvent[] = []; // In-memory store for demo

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async saveEvents(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    try {
      for (const event of events) {
        const storedEvent: StoredEvent = {
          id: this.generateEventId(),
          aggregateId,
          eventType: event.eventType,
          eventData: event,
          eventVersion: event.eventVersion,
          occurredOn: event.occurredOn,
          streamName: `${aggregateId}-stream`,
        };

        this.events.push(storedEvent);
        
        // Publish event for immediate processing
        await this.eventEmitter.emitAsync(event.eventType, event);
        
        this.logger.debug(`Saved event: ${event.eventType} for aggregate: ${aggregateId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to save events for aggregate ${aggregateId}:`, error);
      throw error;
    }
  }

  async getEventsForAggregate(aggregateId: string): Promise<StoredEvent[]> {
    return this.events
      .filter(event => event.aggregateId === aggregateId)
      .sort((a, b) => a.eventVersion - b.eventVersion);
  }

  async getAllEvents(limit: number = 100): Promise<StoredEvent[]> {
    return this.events
      .sort((a, b) => b.occurredOn.getTime() - a.occurredOn.getTime())
      .slice(0, limit);
  }

  async getEventsByType(eventType: string): Promise<StoredEvent[]> {
    return this.events.filter(event => event.eventType === eventType);
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}