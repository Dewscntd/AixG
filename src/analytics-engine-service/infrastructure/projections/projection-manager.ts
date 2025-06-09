/**
 * Projection manager for maintaining materialized views from event streams
 */

import { Pool } from 'pg';
import { Logger } from '@nestjs/common';
import { DomainEvent } from '../../domain/events/domain-event';
import { EventStore } from '../event-store/event-store.interface';

// Database client interface for type safety
export interface DatabaseClient {
  query(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: unknown[]; rowCount: number }>;
  release?(): void;
}

// Projection state can be any JSON-serializable object
export type ProjectionState = Record<string, unknown> | null;

export interface ProjectionHandler {
  eventType: string;
  handle(event: DomainEvent, client: DatabaseClient): Promise<void>;
}

export interface ProjectionDefinition {
  name: string;
  handlers: ProjectionHandler[];
  initialState?: ProjectionState;
  snapshotFrequency?: number;
}

export class ProjectionManager {
  private readonly logger = new Logger(ProjectionManager.name);
  private projections: Map<string, ProjectionDefinition> = new Map();
  private isRunning = false;
  private subscriptions: Array<() => void> = [];

  constructor(
    private readonly eventStore: EventStore,
    private readonly readDb: Pool
  ) {}

  registerProjection(projection: ProjectionDefinition): void {
    this.projections.set(projection.name, projection);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    // Initialize projection tables
    await this.initializeProjectionTables();

    // Start event subscriptions for each projection
    for (const [name, projection] of this.projections) {
      await this.startProjection(name, projection);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Stop all subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }

  async rebuildProjection(projectionName: string): Promise<void> {
    const projection = this.projections.get(projectionName);
    if (!projection) {
      throw new Error(`Projection ${projectionName} not found`);
    }

    const client = await this.readDb.connect();
    try {
      await client.query('BEGIN');

      // Clear existing projection data
      await this.clearProjectionData(projectionName, client);

      // Replay all events
      const events = await this.eventStore.readByEventType('*');

      for (const event of events) {
        await this.processEvent(event, projection, client);
      }

      // Update projection metadata
      const lastEvent = events.length > 0 ? events[events.length - 1] : null;
      await client.query(
        `
        UPDATE projection_metadata
        SET last_processed_event = $1, last_updated = NOW(), status = 'active'
        WHERE projection_name = $2
      `,
        [lastEvent?.eventId || null, projectionName]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async initializeProjectionTables(): Promise<void> {
    const client = await this.readDb.connect();
    try {
      // Create projection metadata table
      await client.query(`
        CREATE TABLE IF NOT EXISTS projection_metadata (
          projection_name VARCHAR(255) PRIMARY KEY,
          last_processed_event VARCHAR(255),
          last_updated TIMESTAMPTZ DEFAULT NOW(),
          status VARCHAR(50) DEFAULT 'active',
          error_message TEXT
        );
      `);

      // Create match analytics materialized view
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS match_analytics_view AS
        SELECT 
          match_id,
          home_xg,
          home_xa,
          home_possession,
          home_pass_accuracy,
          home_shots_on_target,
          home_shots_off_target,
          home_formation,
          away_xg,
          away_xa,
          away_possession,
          away_pass_accuracy,
          away_shots_on_target,
          away_shots_off_target,
          away_formation,
          last_updated
        FROM match_analytics_projection;
      `);

      // Create match analytics projection table
      await client.query(`
        CREATE TABLE IF NOT EXISTS match_analytics_projection (
          match_id VARCHAR(255) PRIMARY KEY,
          home_team_id VARCHAR(255),
          away_team_id VARCHAR(255),
          home_xg DECIMAL(5,4) DEFAULT 0,
          home_xa DECIMAL(5,4) DEFAULT 0,
          home_possession DECIMAL(5,2) DEFAULT 0,
          home_pass_accuracy DECIMAL(5,2) DEFAULT 0,
          home_shots_on_target INTEGER DEFAULT 0,
          home_shots_off_target INTEGER DEFAULT 0,
          home_formation VARCHAR(20),
          away_xg DECIMAL(5,4) DEFAULT 0,
          away_xa DECIMAL(5,4) DEFAULT 0,
          away_possession DECIMAL(5,2) DEFAULT 0,
          away_pass_accuracy DECIMAL(5,2) DEFAULT 0,
          away_shots_on_target INTEGER DEFAULT 0,
          away_shots_off_target INTEGER DEFAULT 0,
          away_formation VARCHAR(20),
          last_updated TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Create team analytics projection table
      await client.query(`
        CREATE TABLE IF NOT EXISTS team_analytics_projection (
          team_id VARCHAR(255) PRIMARY KEY,
          team_name VARCHAR(255),
          matches_played INTEGER DEFAULT 0,
          wins INTEGER DEFAULT 0,
          draws INTEGER DEFAULT 0,
          losses INTEGER DEFAULT 0,
          goals_for INTEGER DEFAULT 0,
          goals_against INTEGER DEFAULT 0,
          xg_for DECIMAL(8,4) DEFAULT 0,
          xg_against DECIMAL(8,4) DEFAULT 0,
          avg_possession DECIMAL(5,2) DEFAULT 0,
          avg_pass_accuracy DECIMAL(5,2) DEFAULT 0,
          last_updated TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Create time series table for historical analytics
      await client.query(`
        CREATE TABLE IF NOT EXISTS match_analytics_history (
          id BIGSERIAL,
          match_id VARCHAR(255) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          home_xg DECIMAL(5,4),
          away_xg DECIMAL(5,4),
          home_possession DECIMAL(5,2),
          away_possession DECIMAL(5,2),
          home_formation VARCHAR(20),
          away_formation VARCHAR(20),
          PRIMARY KEY (match_id, timestamp)
        );
      `);

      // Create hypertable for time series data
      await client.query(`
        SELECT create_hypertable('match_analytics_history', 'timestamp', if_not_exists => TRUE);
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_match_analytics_projection_home_team 
        ON match_analytics_projection(home_team_id);
        
        CREATE INDEX IF NOT EXISTS idx_match_analytics_projection_away_team 
        ON match_analytics_projection(away_team_id);
        
        CREATE INDEX IF NOT EXISTS idx_match_analytics_history_match_id 
        ON match_analytics_history(match_id);
      `);
    } finally {
      client.release();
    }
  }

  private async startProjection(
    name: string,
    projection: ProjectionDefinition
  ): Promise<void> {
    // Get last processed event for this projection
    const client = await this.readDb.connect();
    let lastProcessedEvent: string | null = null;

    try {
      const result = await client.query(
        'SELECT last_processed_event FROM projection_metadata WHERE projection_name = $1',
        [name]
      );

      if (result.rows.length > 0) {
        lastProcessedEvent = result.rows[0].last_processed_event;
      } else {
        // Initialize projection metadata
        await client.query(
          'INSERT INTO projection_metadata (projection_name) VALUES ($1)',
          [name]
        );
      }
    } finally {
      client.release();
    }

    // Subscribe to new events
    const unsubscribe = await this.subscribeToEvents(
      name,
      projection,
      lastProcessedEvent
    );
    this.subscriptions.push(unsubscribe);
  }

  private async subscribeToEvents(
    projectionName: string,
    projection: ProjectionDefinition,
    _fromEventId: string | null
  ): Promise<() => void> {
    // This is a simplified subscription - in a real implementation,
    // you'd use the EventStore's subscription capabilities

    const processNewEvent = async (event: DomainEvent) => {
      const client = await this.readDb.connect();
      try {
        await client.query('BEGIN');

        await this.processEvent(event, projection, client);

        // Update last processed event
        await client.query(
          `
          UPDATE projection_metadata 
          SET last_processed_event = $1, last_updated = NOW()
          WHERE projection_name = $2
        `,
          [event.eventId, projectionName]
        );

        await client.query('COMMIT');

        // Refresh materialized view if needed
        if (projectionName === 'match_analytics') {
          await this.refreshMaterializedView('match_analytics_view');
        }
      } catch (error) {
        await client.query('ROLLBACK');
        this.logger.error(
          `Error processing event in projection ${projectionName}:`,
          error
        );

        // Update projection metadata with error
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await client.query(
          `
          UPDATE projection_metadata
          SET error_message = $1, status = 'error'
          WHERE projection_name = $2
        `,
          [errorMessage, projectionName]
        );
      } finally {
        client.release();
      }
    };

    // Subscribe to all events (in a real implementation, you'd filter by event types)
    return (
      (await this.eventStore.subscribeToAll?.(processNewEvent)) || (() => {})
    );
  }

  private async processEvent(
    event: DomainEvent,
    projection: ProjectionDefinition,
    client: DatabaseClient
  ): Promise<void> {
    const handler = projection.handlers.find(
      h => h.eventType === event.eventType
    );
    if (handler) {
      await handler.handle(event, client);
    }
  }

  private async clearProjectionData(
    projectionName: string,
    client: DatabaseClient
  ): Promise<void> {
    switch (projectionName) {
      case 'match_analytics':
        await client.query('DELETE FROM match_analytics_projection');
        await client.query('DELETE FROM match_analytics_history');
        break;
      case 'team_analytics':
        await client.query('DELETE FROM team_analytics_projection');
        break;
    }
  }

  private async refreshMaterializedView(viewName: string): Promise<void> {
    const client = await this.readDb.connect();
    try {
      await client.query(`REFRESH MATERIALIZED VIEW ${viewName}`);
    } finally {
      client.release();
    }
  }
}
