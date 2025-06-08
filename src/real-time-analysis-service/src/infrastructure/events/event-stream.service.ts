import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../../domain/events/domain-event';
import { EventStream } from '../../domain/entities/live-analysis-pipeline';

/**
 * Event Stream Service
 * Implements the EventStream interface for domain event publishing
 */
@Injectable()
export class EventStreamService implements EventStream {
  private readonly logger = new Logger(EventStreamService.name);
  private subscribers: Map<string, Array<(event: DomainEvent) => void>> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit a domain event
   */
  emit(event: DomainEvent): void {
    try {
      // Emit through NestJS event emitter for application-level handling
      this.eventEmitter.emit(`domain.${event.eventType}`, event.toJSON());
      
      // Emit to direct subscribers
      const subscribers = this.subscribers.get(event.eventType) || [];
      for (const handler of subscribers) {
        try {
          handler(event);
        } catch (error) {
          this.logger.error(`Error in event handler for ${event.eventType}:`, error);
        }
      }

      // Emit to wildcard subscribers
      const wildcardSubscribers = this.subscribers.get('*') || [];
      for (const handler of wildcardSubscribers) {
        try {
          handler(event);
        } catch (error) {
          this.logger.error(`Error in wildcard event handler:`, error);
        }
      }

    } catch (error) {
      this.logger.error(`Failed to emit event ${event.eventType}:`, error);
    }
  }

  /**
   * Subscribe to specific event type
   */
  subscribe(eventType: string, handler: (event: DomainEvent) => void): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    this.subscribers.get(eventType)!.push(handler);
  }

  /**
   * Unsubscribe from event type
   */
  unsubscribe(eventType: string, handler: (event: DomainEvent) => void): void {
    const subscribers = this.subscribers.get(eventType);
    if (subscribers) {
      const index = subscribers.indexOf(handler);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }
  }

  /**
   * Subscribe to all events (wildcard)
   */
  subscribeToAll(handler: (event: DomainEvent) => void): void {
    this.subscribe('*', handler);
  }

  /**
   * Get subscriber count for event type
   */
  getSubscriberCount(eventType: string): number {
    return this.subscribers.get(eventType)?.length || 0;
  }

  /**
   * Get all subscribed event types
   */
  getSubscribedEventTypes(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Clear all subscribers
   */
  clearAllSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Clear subscribers for specific event type
   */
  clearSubscribers(eventType: string): void {
    this.subscribers.delete(eventType);
  }
}
