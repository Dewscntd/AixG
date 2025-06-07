/**
 * Command definitions for analytics operations
 */

export interface AnalyticsCommand {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;
}

export class CreateMatchAnalyticsCommand implements AnalyticsCommand {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;

  constructor(
    public readonly matchId: string,
    public readonly homeTeamId: string,
    public readonly awayTeamId: string,
    public readonly matchDuration: number = 0,
    correlationId?: string
  ) {
    this.commandId = `create-match-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
    this.correlationId = correlationId;
  }
}

export class UpdateXGCommand implements AnalyticsCommand {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;

  constructor(
    public readonly matchId: string,
    public readonly teamId: string,
    public readonly newXG: number,
    public readonly shotData?: any,
    correlationId?: string
  ) {
    this.commandId = `update-xg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
    this.correlationId = correlationId;
  }
}

export class UpdatePossessionCommand implements AnalyticsCommand {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;

  constructor(
    public readonly matchId: string,
    public readonly homeTeamPossession: number,
    public readonly awayTeamPossession: number,
    public readonly calculationMethod: string = 'time_based',
    correlationId?: string
  ) {
    this.commandId = `update-possession-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
    this.correlationId = correlationId;
  }
}

export class UpdateFormationCommand implements AnalyticsCommand {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;

  constructor(
    public readonly matchId: string,
    public readonly teamId: string,
    public readonly formation: string,
    public readonly confidence: number,
    public readonly playerPositions: Array<{
      playerId: string;
      position: { x: number; y: number };
      role: string;
    }>,
    public readonly detectionTimestamp: number,
    correlationId?: string
  ) {
    this.commandId = `update-formation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
    this.correlationId = correlationId;
  }
}

export class ProcessMLPipelineOutputCommand implements AnalyticsCommand {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;

  constructor(
    public readonly matchId: string,
    public readonly pipelineOutput: {
      shots?: Array<{
        teamId: string;
        position: { x: number; y: number };
        targetPosition: { x: number; y: number };
        timestamp: number;
        bodyPart: string;
        situation: string;
      }>;
      possessionSequences?: Array<{
        teamId: string;
        startTime: number;
        endTime: number;
        events: Array<any>;
      }>;
      formations?: Array<{
        teamId: string;
        formation: string;
        confidence: number;
        timestamp: number;
        playerPositions: Array<any>;
      }>;
    },
    correlationId?: string
  ) {
    this.commandId = `process-ml-output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
    this.correlationId = correlationId;
  }
}

export class RecalculateAnalyticsCommand implements AnalyticsCommand {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;

  constructor(
    public readonly matchId: string,
    public readonly recalculateXG: boolean = true,
    public readonly recalculatePossession: boolean = true,
    public readonly recalculateFormations: boolean = true,
    correlationId?: string
  ) {
    this.commandId = `recalculate-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
    this.correlationId = correlationId;
  }
}

export class CreateSnapshotCommand implements AnalyticsCommand {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;

  constructor(
    public readonly matchId: string,
    correlationId?: string
  ) {
    this.commandId = `create-snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
    this.correlationId = correlationId;
  }
}
