/**
 * Domain Layer Barrel Exports
 * Provides centralized access to domain models and shared domain concepts
 */

// Domain Models
export * from './models';

// Common Domain Interfaces
export interface DomainEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValueObject<T> {
  equals(other: T): boolean;
  getValue(): any;
}

export interface AggregateRoot extends DomainEntity {
  getUncommittedEvents(): DomainEvent[];
  markEventsAsCommitted(): void;
  loadFromHistory(events: DomainEvent[]): void;
}

export interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, any>;
  eventVersion: number;
  occurredAt: Date;
  metadata?: Record<string, any> | undefined;
}

export interface Repository<T extends DomainEntity> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface EventStore {
  saveEvents(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  getAllEvents(fromPosition?: number): Promise<DomainEvent[]>;
}

// Domain Service Interface
export interface DomainService {
  // Marker interface for domain services
}

// Common Value Objects
export abstract class BaseValueObject<T> implements ValueObject<T> {
  abstract equals(other: T): boolean;
  abstract getValue(): any;
}

// Common Entity Base Class
export abstract class BaseEntity implements DomainEntity {
  public readonly id: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(id: string, createdAt?: Date, updatedAt?: Date) {
    this.id = id;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}

// Common Aggregate Root Base Class
export abstract class BaseAggregateRoot
  extends BaseEntity
  implements AggregateRoot
{
  private _uncommittedEvents: DomainEvent[] = [];

  getUncommittedEvents(): DomainEvent[] {
    return [...this._uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this._uncommittedEvents = [];
  }

  protected addEvent(event: DomainEvent): void {
    this._uncommittedEvents.push(event);
  }

  abstract loadFromHistory(events: DomainEvent[]): void;
}

// Domain Errors
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id ${id} not found`, 'NOT_FOUND', {
      entityType,
      id,
    });
    this.name = 'NotFoundError';
  }
}

export class ConcurrencyError extends DomainError {
  constructor(
    aggregateId: string,
    expectedVersion: number,
    actualVersion: number
  ) {
    super(
      `Concurrency conflict for aggregate ${aggregateId}. Expected version ${expectedVersion}, but was ${actualVersion}`,
      'CONCURRENCY_ERROR',
      { aggregateId, expectedVersion, actualVersion }
    );
    this.name = 'ConcurrencyError';
  }
}
