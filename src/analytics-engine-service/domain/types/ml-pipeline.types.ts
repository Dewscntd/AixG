/**
 * Type definitions for ML Pipeline data structures
 */

export interface Position {
  x: number;
  y: number;
}

export interface ShotData {
  teamId: string;
  playerId: string;
  timestamp: number;
  position: Position;
  targetPosition: Position;
  bodyPart: 'foot' | 'head' | 'other';
  situation: 'open_play' | 'corner' | 'free_kick' | 'penalty' | 'counter_attack';
  defenderCount: number;
  distanceToGoal?: number;
  angle?: number;
}

export interface PossessionSequence {
  teamId: string;
  startTime: number;
  endTime: number;
  events: PossessionEvent[];
  endReason: 'lost_ball' | 'shot' | 'foul' | 'out_of_bounds' | 'half_time' | 'full_time';
}

export interface PossessionEvent {
  timestamp: number;
  playerId: string;
  eventType: 'pass' | 'dribble' | 'shot' | 'tackle' | 'interception' | 'clearance';
  position: Position;
  successful: boolean;
  duration?: number;
}

export interface FormationData {
  teamId: string;
  timestamp: number;
  formation: string; // e.g., "4-4-2", "3-5-2"
  playerPositions: PlayerPosition[];
}

export interface PlayerPosition {
  playerId: string;
  position: Position;
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
}

export interface MLPipelineOutput {
  shots?: ShotData[];
  possessionSequences?: PossessionSequence[];
  formations?: FormationData[];
  playerTracking?: PlayerTrackingData[];
  events?: MatchEvent[];
}

export interface PlayerTrackingData {
  playerId: string;
  teamId: string;
  timestamp: number;
  position: Position;
  velocity: number;
  acceleration: number;
}

export interface MatchEvent {
  timestamp: number;
  eventType: string;
  teamId: string;
  playerId?: string;
  position?: Position;
  metadata?: Record<string, unknown>;
}

export interface MatchAnalyticsSnapshot {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamXG: number;
  awayTeamXG: number;
  homeTeamPossession: number;
  awayTeamPossession: number;
  matchDuration: number;
  lastUpdated: Date;
  version: number;
}
