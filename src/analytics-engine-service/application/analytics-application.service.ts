/**
 * Main application service orchestrating CQRS operations
 */

import { EventStore } from '../infrastructure/event-store/event-store.interface';
import { Pool } from 'pg';
import { Logger } from '@nestjs/common';
import {
  CreateMatchAnalyticsCommandHandler,
  UpdateXGCommandHandler,
  UpdatePossessionCommandHandler,
  ProcessMLPipelineOutputCommandHandler,
  CreateSnapshotCommandHandler
} from './commands/analytics-command-handlers';
import {
  GetMatchAnalyticsQueryHandler,
  GetTeamAnalyticsQueryHandler,
  GetTimeSeriesAnalyticsQueryHandler,
  AnalyticsResult
} from './queries/analytics-query-handlers';
import {
  CreateMatchAnalyticsCommand,
  UpdateXGCommand,
  UpdatePossessionCommand,
  ProcessMLPipelineOutputCommand,
  CreateSnapshotCommand,
  AnalyticsCommand,
  ProcessMLPipelineOutputData,
  ShotDataCommand
} from './commands/analytics-commands';
import {
  GetMatchAnalyticsQuery,
  GetTeamAnalyticsQuery,
  GetTimeSeriesAnalyticsQuery,
  AnalyticsQuery
} from './queries/analytics-queries';
import { ProjectionManager } from '../infrastructure/projections/projection-manager';
import { matchAnalyticsProjection } from '../infrastructure/projections/match-analytics-projection';

// Command and Query Handler interfaces
interface CommandHandler<T extends AnalyticsCommand> {
  handle(command: T): Promise<void>;
}

interface QueryHandler<T extends AnalyticsQuery, R> {
  handle(query: T): Promise<R>;
}

// Application Service Response Types
export interface MatchAnalyticsResponse {
  matchId: string;
  homeTeam: TeamAnalyticsResponse;
  awayTeam: TeamAnalyticsResponse;
  matchDuration: number;
  lastUpdated: Date;
  status: string;
}

export interface TeamAnalyticsResponse {
  teamId: string;
  xG: number;
  xA: number;
  possession: number;
  passAccuracy: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  formation?: string;
}

export interface TimeSeriesAnalyticsResponse {
  entityType: 'team' | 'player' | 'match';
  entityId: string;
  metric: string;
  data: Array<{
    timestamp: Date;
    value: number;
  }>;
  interval: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export class AnalyticsApplicationService {
  private readonly logger = new Logger(AnalyticsApplicationService.name);
  private commandHandlers: Map<string, CommandHandler<AnalyticsCommand>> = new Map();
  private queryHandlers: Map<string, QueryHandler<AnalyticsQuery, unknown>> = new Map();
  private projectionManager!: ProjectionManager;

  constructor(
    private readonly eventStore: EventStore,
    private readonly readDb: Pool
  ) {
    this.initializeCommandHandlers();
    this.initializeQueryHandlers();
    this.initializeProjections();
  }

  // Command operations (Write side)
  async executeCommand(command: AnalyticsCommand): Promise<void> {
    const commandType = command.constructor.name;
    const handler = this.commandHandlers.get(commandType);
    
    if (!handler) {
      throw new Error(`No handler found for command type: ${commandType}`);
    }

    try {
      await handler.handle(command);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error executing command ${commandType}: ${errorMessage}`);
      throw error;
    }
  }

  // Query operations (Read side)
  async executeQuery<T>(query: AnalyticsQuery): Promise<AnalyticsResult<T>> {
    const queryType = query.constructor.name;
    const handler = this.queryHandlers.get(queryType);

    if (!handler) {
      throw new Error(`No handler found for query type: ${queryType}`);
    }

    try {
      return await handler.handle(query) as AnalyticsResult<T>;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error executing query ${queryType}: ${errorMessage}`);
      throw error;
    }
  }

  // High-level business operations
  async createMatchAnalytics(
    matchId: string,
    homeTeamId: string,
    awayTeamId: string,
    matchDuration: number = 0
  ): Promise<void> {
    const command = new CreateMatchAnalyticsCommand(
      matchId,
      homeTeamId,
      awayTeamId,
      matchDuration
    );
    
    await this.executeCommand(command);
  }

  async updateMatchXG(
    matchId: string,
    teamId: string,
    newXG: number,
    shotData?: ShotDataCommand
  ): Promise<void> {
    const command = new UpdateXGCommand(matchId, teamId, newXG, shotData);
    await this.executeCommand(command);
  }

  async updateMatchPossession(
    matchId: string,
    homeTeamPossession: number,
    awayTeamPossession: number
  ): Promise<void> {
    const command = new UpdatePossessionCommand(
      matchId,
      homeTeamPossession,
      awayTeamPossession
    );
    await this.executeCommand(command);
  }

  async processMLPipelineOutput(
    matchId: string,
    pipelineOutput: ProcessMLPipelineOutputData
  ): Promise<void> {
    const command = new ProcessMLPipelineOutputCommand(matchId, pipelineOutput);
    await this.executeCommand(command);
  }

  async getMatchAnalytics(
    matchId: string,
    includeHistorical: boolean = false
  ): Promise<MatchAnalyticsResponse> {
    const query = new GetMatchAnalyticsQuery(matchId, includeHistorical);
    const result = await this.executeQuery<MatchAnalyticsResponse>(query);
    return result.data;
  }

  async getTeamAnalytics(
    teamId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<TeamAnalyticsResponse> {
    const query = new GetTeamAnalyticsQuery(teamId, fromDate, toDate);
    const result = await this.executeQuery<TeamAnalyticsResponse>(query);
    return result.data;
  }

  async getTimeSeriesAnalytics(
    entityType: 'team' | 'player' | 'match',
    entityId: string,
    metric: string,
    fromDate: Date,
    toDate: Date,
    interval: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<TimeSeriesAnalyticsResponse> {
    const query = new GetTimeSeriesAnalyticsQuery(
      entityType,
      entityId,
      metric,
      fromDate,
      toDate,
      interval
    );
    const result = await this.executeQuery<TimeSeriesAnalyticsResponse>(query);
    return result.data;
  }

  // Projection management
  async startProjections(): Promise<void> {
    await this.projectionManager.start();
  }

  async stopProjections(): Promise<void> {
    await this.projectionManager.stop();
  }

  async rebuildProjection(projectionName: string): Promise<void> {
    await this.projectionManager.rebuildProjection(projectionName);
  }

  // Snapshot management
  async createSnapshot(matchId: string): Promise<void> {
    const command = new CreateSnapshotCommand(matchId);
    await this.executeCommand(command);
  }

  // Health check
  async healthCheck(): Promise<{
    eventStore: boolean;
    readDatabase: boolean;
    projections: boolean;
  }> {
    const health = {
      eventStore: false,
      readDatabase: false,
      projections: false
    };

    try {
      // Check event store
      await this.eventStore.streamExists('health-check');
      health.eventStore = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Event store health check failed: ${errorMessage}`);
    }

    try {
      // Check read database
      const client = await this.readDb.connect();
      await client.query('SELECT 1');
      client.release();
      health.readDatabase = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Read database health check failed: ${errorMessage}`);
    }

    try {
      // Check projections (simplified)
      health.projections = true; // Would check projection status in real implementation
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Projections health check failed: ${errorMessage}`);
    }

    return health;
  }

  private initializeCommandHandlers(): void {
    this.commandHandlers.set(
      'CreateMatchAnalyticsCommand',
      new CreateMatchAnalyticsCommandHandler(this.eventStore)
    );
    this.commandHandlers.set(
      'UpdateXGCommand',
      new UpdateXGCommandHandler(this.eventStore)
    );
    this.commandHandlers.set(
      'UpdatePossessionCommand',
      new UpdatePossessionCommandHandler(this.eventStore)
    );
    this.commandHandlers.set(
      'ProcessMLPipelineOutputCommand',
      new ProcessMLPipelineOutputCommandHandler(this.eventStore)
    );
    this.commandHandlers.set(
      'CreateSnapshotCommand',
      new CreateSnapshotCommandHandler(this.eventStore)
    );
  }

  private initializeQueryHandlers(): void {
    this.queryHandlers.set(
      'GetMatchAnalyticsQuery',
      new GetMatchAnalyticsQueryHandler(this.readDb)
    );
    this.queryHandlers.set(
      'GetTeamAnalyticsQuery',
      new GetTeamAnalyticsQueryHandler(this.readDb)
    );
    this.queryHandlers.set(
      'GetTimeSeriesAnalyticsQuery',
      new GetTimeSeriesAnalyticsQueryHandler(this.readDb)
    );
  }

  private initializeProjections(): void {
    this.projectionManager = new ProjectionManager(this.eventStore, this.readDb);
    this.projectionManager.registerProjection(matchAnalyticsProjection);
  }

  async close(): Promise<void> {
    await this.stopProjections();
    await this.readDb.end();
    
    if (this.eventStore && typeof this.eventStore.close === 'function') {
      await this.eventStore.close();
    }
  }
}
