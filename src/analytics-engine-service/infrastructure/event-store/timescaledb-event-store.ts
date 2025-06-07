import { Pool, PoolClient } from 'pg';
import { DomainEvent } from '../../domain/events/domain-event';
import { 
  EventStore, 
  EventStoreOptions, 
  OptimisticConcurrencyError, 
  StreamNotFoundError,
  EventStoreConnectionError 
} from './event-store.interface';

export class TimescaleDBEventStore implements EventStore {
  private pool: Pool;
  private readonly options: EventStoreOptions;

  constructor(options: EventStoreOptions) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      snapshotFrequency: 100,
      batchSize: 1000,
      ...options
    };

    this.pool = new Pool({
      connectionString: this.options.connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create events table with TimescaleDB hypertable
      await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id BIGSERIAL,
          stream_id VARCHAR(255) NOT NULL,
          event_id VARCHAR(255) NOT NULL UNIQUE,
          event_type VARCHAR(255) NOT NULL,
          aggregate_id VARCHAR(255) NOT NULL,
          aggregate_type VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          correlation_id VARCHAR(255),
          causation_id VARCHAR(255),
          metadata JSONB,
          event_data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (stream_id, version)
        );
      `);

      // Create hypertable for time-series optimization
      await client.query(`
        SELECT create_hypertable('events', 'timestamp', if_not_exists => TRUE);
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_events_stream_id ON events (stream_id);
        CREATE INDEX IF NOT EXISTS idx_events_event_type ON events (event_type);
        CREATE INDEX IF NOT EXISTS idx_events_aggregate_id ON events (aggregate_id);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_correlation_id ON events (correlation_id) WHERE correlation_id IS NOT NULL;
      `);

      // Create snapshots table
      await client.query(`
        CREATE TABLE IF NOT EXISTS snapshots (
          stream_id VARCHAR(255) PRIMARY KEY,
          version INTEGER NOT NULL,
          snapshot_data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Create stream metadata table
      await client.query(`
        CREATE TABLE IF NOT EXISTS stream_metadata (
          stream_id VARCHAR(255) PRIMARY KEY,
          version INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_modified TIMESTAMPTZ DEFAULT NOW(),
          event_count INTEGER NOT NULL DEFAULT 0,
          is_deleted BOOLEAN DEFAULT FALSE
        );
      `);

    } finally {
      client.release();
    }
  }

  async append(streamId: string, events: DomainEvent[], expectedVersion?: number): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check current version if expectedVersion is provided
      if (expectedVersion !== undefined) {
        const versionResult = await client.query(
          'SELECT version FROM stream_metadata WHERE stream_id = $1',
          [streamId]
        );

        const currentVersion = versionResult.rows[0]?.version || 0;
        if (currentVersion !== expectedVersion) {
          throw new OptimisticConcurrencyError(streamId, expectedVersion, currentVersion);
        }
      }

      // Get current version
      const currentVersionResult = await client.query(
        'SELECT COALESCE(MAX(version), 0) as version FROM events WHERE stream_id = $1',
        [streamId]
      );
      let currentVersion = currentVersionResult.rows[0].version;

      // Insert events
      for (const event of events) {
        currentVersion++;
        
        await client.query(`
          INSERT INTO events (
            stream_id, event_id, event_type, aggregate_id, aggregate_type,
            version, timestamp, correlation_id, causation_id, metadata, event_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          streamId,
          event.eventId,
          event.eventType,
          event.aggregateId,
          event.aggregateType,
          currentVersion,
          event.timestamp,
          event.correlationId,
          event.causationId,
          event.metadata ? JSON.stringify(event.metadata) : null,
          JSON.stringify(event.toJSON())
        ]);
      }

      // Update stream metadata
      await client.query(`
        INSERT INTO stream_metadata (stream_id, version, event_count, last_modified)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (stream_id) DO UPDATE SET
          version = $2,
          event_count = stream_metadata.event_count + $4,
          last_modified = NOW()
      `, [streamId, currentVersion, events.length, events.length]);

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async read(streamId: string, fromVersion: number = 0): Promise<DomainEvent[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT event_data, timestamp
        FROM events 
        WHERE stream_id = $1 AND version > $2
        ORDER BY version ASC
      `, [streamId, fromVersion]);

      return result.rows.map(row => this.deserializeEvent(row.event_data, row.timestamp));

    } finally {
      client.release();
    }
  }

  async readPaginated(
    streamId: string, 
    fromVersion: number = 0, 
    maxCount: number = 1000
  ): Promise<{ events: DomainEvent[]; hasMore: boolean }> {
    const client = await this.pool.connect();
    try {
      // Get one more than requested to check if there are more
      const result = await client.query(`
        SELECT event_data, timestamp
        FROM events 
        WHERE stream_id = $1 AND version > $2
        ORDER BY version ASC
        LIMIT $3
      `, [streamId, fromVersion, maxCount + 1]);

      const hasMore = result.rows.length > maxCount;
      const events = result.rows
        .slice(0, maxCount)
        .map(row => this.deserializeEvent(row.event_data, row.timestamp));

      return { events, hasMore };

    } finally {
      client.release();
    }
  }

  async readByEventType(eventType: string, fromTimestamp?: Date): Promise<DomainEvent[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT event_data, timestamp
        FROM events 
        WHERE event_type = $1
      `;
      const params: any[] = [eventType];

      if (fromTimestamp) {
        query += ' AND timestamp >= $2';
        params.push(fromTimestamp);
      }

      query += ' ORDER BY timestamp ASC';

      const result = await client.query(query, params);
      return result.rows.map(row => this.deserializeEvent(row.event_data, row.timestamp));

    } finally {
      client.release();
    }
  }

  async getStreamVersion(streamId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT version FROM stream_metadata WHERE stream_id = $1',
        [streamId]
      );

      return result.rows[0]?.version || 0;

    } finally {
      client.release();
    }
  }

  async streamExists(streamId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT 1 FROM stream_metadata WHERE stream_id = $1 AND is_deleted = FALSE',
        [streamId]
      );

      return result.rows.length > 0;

    } finally {
      client.release();
    }
  }

  async deleteStream(streamId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE stream_metadata SET is_deleted = TRUE, last_modified = NOW() WHERE stream_id = $1',
        [streamId]
      );

    } finally {
      client.release();
    }
  }

  async createSnapshot<T>(streamId: string, snapshot: T, version: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO snapshots (stream_id, version, snapshot_data)
        VALUES ($1, $2, $3)
        ON CONFLICT (stream_id) DO UPDATE SET
          version = $2,
          snapshot_data = $3,
          created_at = NOW()
      `, [streamId, version, JSON.stringify(snapshot)]);

    } finally {
      client.release();
    }
  }

  async getSnapshot<T>(streamId: string): Promise<{ snapshot: T; version: number } | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT snapshot_data, version FROM snapshots WHERE stream_id = $1',
        [streamId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        snapshot: JSON.parse(row.snapshot_data),
        version: row.version
      };

    } finally {
      client.release();
    }
  }

  private deserializeEvent(eventData: any, timestamp: Date): DomainEvent {
    // This is a simplified deserialization
    // In a real implementation, you'd have a proper event registry
    const data = typeof eventData === 'string' ? JSON.parse(eventData) : eventData;
    
    return {
      ...data,
      timestamp: new Date(timestamp)
    } as DomainEvent;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
