import { DomainEvent } from '../events/domain-event';

/**
 * Base Aggregate Root implementing DDD patterns
 * 
 * Provides event collection and management for domain events.
 * Follows the pattern where aggregates are the only entry points to modify state.
 */
export abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = [];

  /**
   * Add domain event to be published
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Get all uncommitted domain events
   */
  getUncommittedEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  /**
   * Clear all uncommitted events (called after successful persistence)
   */
  clearEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Check if aggregate has uncommitted events
   */
  hasUncommittedEvents(): boolean {
    return this._domainEvents.length > 0;
  }
}
