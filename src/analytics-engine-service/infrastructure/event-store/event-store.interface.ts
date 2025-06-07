import { DomainEvent } from '../../domain/events/domain-event';

export interface EventStore {
  /**
   * Append events to a stream
   */
  append(streamId: string, events: DomainEvent[], expectedVersion?: number): Promise<void>;

  /**
   * Read events from a stream
   */
  read(streamId: string, fromVersion?: number): Promise<DomainEvent[]>;

  /**
   * Read events from a stream with pagination
   */
  readPaginated(
    streamId: string, 
    fromVersion?: number, 
    maxCount?: number
  ): Promise<{ events: DomainEvent[]; hasMore: boolean }>;

  /**
   * Read all events of a specific type
   */
  readByEventType(eventType: string, fromTimestamp?: Date): Promise<DomainEvent[]>;

  /**
   * Get the current version of a stream
   */
  getStreamVersion(streamId: string): Promise<number>;

  /**
   * Check if a stream exists
   */
  streamExists(streamId: string): Promise<boolean>;

  /**
   * Delete a stream (soft delete)
   */
  deleteStream(streamId: string): Promise<void>;

  /**
   * Create a snapshot of the current state
   */
  createSnapshot<T>(streamId: string, snapshot: T, version: number): Promise<void>;

  /**
   * Get the latest snapshot for a stream
   */
  getSnapshot<T>(streamId: string): Promise<{ snapshot: T; version: number } | null>;
}

export interface EventStoreSubscription {
  /**
   * Subscribe to all events
   */
  subscribeToAll(
    onEvent: (event: DomainEvent) => Promise<void>,
    onError?: (error: Error) => void
  ): Promise<() => void>;

  /**
   * Subscribe to events from a specific stream
   */
  subscribeToStream(
    streamId: string,
    onEvent: (event: DomainEvent) => Promise<void>,
    onError?: (error: Error) => void
  ): Promise<() => void>;

  /**
   * Subscribe to events of a specific type
   */
  subscribeToEventType(
    eventType: string,
    onEvent: (event: DomainEvent) => Promise<void>,
    onError?: (error: Error) => void
  ): Promise<() => void>;
}

export interface EventStoreProjection {
  /**
   * Create a projection from events
   */
  createProjection<T>(
    projectionName: string,
    eventHandlers: Record<string, (state: T, event: DomainEvent) => T>,
    initialState: T
  ): Promise<void>;

  /**
   * Get projection state
   */
  getProjectionState<T>(projectionName: string): Promise<T | null>;

  /**
   * Reset projection to initial state
   */
  resetProjection(projectionName: string): Promise<void>;

  /**
   * Delete projection
   */
  deleteProjection(projectionName: string): Promise<void>;
}

export interface EventStoreOptions {
  connectionString: string;
  maxRetries?: number;
  retryDelay?: number;
  snapshotFrequency?: number;
  batchSize?: number;
}

export interface StreamMetadata {
  streamId: string;
  version: number;
  created: Date;
  lastModified: Date;
  eventCount: number;
  isDeleted: boolean;
}

export class OptimisticConcurrencyError extends Error {
  constructor(streamId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Optimistic concurrency violation for stream ${streamId}. ` +
      `Expected version ${expectedVersion}, but actual version is ${actualVersion}`
    );
    this.name = 'OptimisticConcurrencyError';
  }
}

export class StreamNotFoundError extends Error {
  constructor(streamId: string) {
    super(`Stream ${streamId} not found`);
    this.name = 'StreamNotFoundError';
  }
}

export class EventStoreConnectionError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'EventStoreConnectionError';
    this.cause = cause;
  }
}
