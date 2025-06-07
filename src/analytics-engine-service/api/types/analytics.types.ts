/**
 * GraphQL types and input types for analytics API
 */

import { ObjectType, Field, InputType, ID, Float, Int, registerEnumType } from '@nestjs/graphql';

// Enums
export enum EntityType {
  TEAM = 'team',
  PLAYER = 'player',
  MATCH = 'match'
}

export enum TimeInterval {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

registerEnumType(EntityType, {
  name: 'EntityType',
});

registerEnumType(TimeInterval, {
  name: 'TimeInterval',
});

// Team Analytics Types
@ObjectType()
export class TeamMetricsType {
  @Field(() => ID)
  teamId: string;

  @Field()
  teamName: string;

  @Field(() => Float)
  xG: number;

  @Field(() => Float)
  xA: number;

  @Field(() => Float)
  possession: number;

  @Field(() => Float)
  passAccuracy: number;

  @Field(() => Int)
  shotsOnTarget: number;

  @Field(() => Int)
  shotsOffTarget: number;

  @Field({ nullable: true })
  formation?: string;
}

@ObjectType()
export class TeamAnalyticsType {
  @Field(() => ID)
  teamId: string;

  @Field()
  teamName: string;

  @Field(() => Int)
  matches: number;

  @Field(() => Int)
  wins: number;

  @Field(() => Int)
  draws: number;

  @Field(() => Int)
  losses: number;

  @Field(() => Int)
  goalsFor: number;

  @Field(() => Int)
  goalsAgainst: number;

  @Field(() => Float)
  xGFor: number;

  @Field(() => Float)
  xGAgainst: number;

  @Field(() => Float)
  avgPossession: number;

  @Field(() => Float)
  avgPassAccuracy: number;

  @Field(() => [String])
  form: string[];

  @Field()
  lastUpdated: Date;
}

// Match Analytics Types
@ObjectType()
export class MatchAnalyticsType {
  @Field(() => ID)
  matchId: string;

  @Field(() => TeamMetricsType)
  homeTeam: TeamMetricsType;

  @Field(() => TeamMetricsType)
  awayTeam: TeamMetricsType;

  @Field(() => Int)
  matchDuration: number;

  @Field()
  lastUpdated: Date;

  @Field()
  status: string;
}

// Time Series Types
@ObjectType()
export class TimeSeriesDataType {
  @Field()
  timestamp: Date;

  @Field(() => Float)
  value: number;
}

// Position and Shot Data Types
@ObjectType()
export class PositionType {
  @Field(() => Float)
  x: number;

  @Field(() => Float)
  y: number;
}

@ObjectType()
export class ShotDataType {
  @Field(() => PositionType)
  position: PositionType;

  @Field(() => PositionType)
  targetPosition: PositionType;

  @Field(() => Float)
  distanceToGoal: number;

  @Field(() => Float)
  angle: number;

  @Field()
  bodyPart: string;

  @Field()
  situation: string;

  @Field(() => Int)
  defenderCount: number;
}

// Formation Types
@ObjectType()
export class PlayerPositionType {
  @Field(() => ID)
  playerId: string;

  @Field(() => PositionType)
  position: PositionType;

  @Field()
  role: string;
}

@ObjectType()
export class FormationType {
  @Field()
  formation: string;

  @Field(() => Float)
  confidence: number;

  @Field(() => [PlayerPositionType])
  playerPositions: PlayerPositionType[];

  @Field(() => Int)
  timestamp: number;
}

// Input Types
@InputType()
export class CreateMatchAnalyticsInput {
  @Field(() => ID)
  matchId: string;

  @Field(() => ID)
  homeTeamId: string;

  @Field(() => ID)
  awayTeamId: string;

  @Field(() => Int, { defaultValue: 0 })
  matchDuration: number;
}

@InputType()
export class UpdateXGInput {
  @Field(() => ID)
  matchId: string;

  @Field(() => ID)
  teamId: string;

  @Field(() => Float)
  newXG: number;

  @Field(() => String, { nullable: true })
  shotData?: string; // JSON string
}

@InputType()
export class UpdatePossessionInput {
  @Field(() => ID)
  matchId: string;

  @Field(() => Float)
  homeTeamPossession: number;

  @Field(() => Float)
  awayTeamPossession: number;
}

@InputType()
export class PositionInput {
  @Field(() => Float)
  x: number;

  @Field(() => Float)
  y: number;
}

@InputType()
export class ShotInput {
  @Field(() => ID)
  teamId: string;

  @Field(() => PositionInput)
  position: PositionInput;

  @Field(() => PositionInput)
  targetPosition: PositionInput;

  @Field(() => Int)
  timestamp: number;

  @Field({ defaultValue: 'foot' })
  bodyPart: string;

  @Field({ defaultValue: 'open_play' })
  situation: string;
}

@InputType()
export class PossessionSequenceInput {
  @Field(() => ID)
  teamId: string;

  @Field(() => Int)
  startTime: number;

  @Field(() => Int)
  endTime: number;

  @Field(() => String)
  events: string; // JSON string
}

@InputType()
export class FormationInput {
  @Field(() => ID)
  teamId: string;

  @Field()
  formation: string;

  @Field(() => Float)
  confidence: number;

  @Field(() => Int)
  timestamp: number;

  @Field(() => String)
  playerPositions: string; // JSON string
}

@InputType()
export class MLPipelineOutputInput {
  @Field(() => [ShotInput], { nullable: true })
  shots?: ShotInput[];

  @Field(() => [PossessionSequenceInput], { nullable: true })
  possessionSequences?: PossessionSequenceInput[];

  @Field(() => [FormationInput], { nullable: true })
  formations?: FormationInput[];
}

@InputType()
export class ProcessMLPipelineInput {
  @Field(() => ID)
  matchId: string;

  @Field(() => MLPipelineOutputInput)
  pipelineOutput: MLPipelineOutputInput;
}

@InputType()
export class GetTimeSeriesInput {
  @Field(() => EntityType)
  entityType: EntityType;

  @Field(() => ID)
  entityId: string;

  @Field()
  metric: string;

  @Field()
  fromDate: Date;

  @Field()
  toDate: Date;

  @Field(() => TimeInterval, { defaultValue: TimeInterval.DAY })
  interval: TimeInterval;
}

// Comparative Analytics Types
@ObjectType()
export class ComparativeMetricType {
  @Field(() => ID)
  entityId: string;

  @Field()
  entityName: string;

  @Field(() => Float)
  value: number;

  @Field(() => Float, { nullable: true })
  percentile?: number;

  @Field(() => Float, { nullable: true })
  rank?: number;
}

@ObjectType()
export class ComparativeAnalyticsType {
  @Field()
  metric: string;

  @Field(() => [ComparativeMetricType])
  entities: ComparativeMetricType[];

  @Field()
  fromDate: Date;

  @Field()
  toDate: Date;
}

// League Standings Types
@ObjectType()
export class LeagueStandingType {
  @Field(() => Int)
  position: number;

  @Field(() => ID)
  teamId: string;

  @Field()
  teamName: string;

  @Field(() => Int)
  points: number;

  @Field(() => Int)
  played: number;

  @Field(() => Int)
  won: number;

  @Field(() => Int)
  drawn: number;

  @Field(() => Int)
  lost: number;

  @Field(() => Int)
  goalsFor: number;

  @Field(() => Int)
  goalsAgainst: number;

  @Field(() => Int)
  goalDifference: number;

  @Field(() => Float)
  xGFor: number;

  @Field(() => Float)
  xGAgainst: number;

  @Field(() => Float)
  xGDifference: number;

  @Field(() => [String])
  form: string[];
}

// Match Prediction Types
@ObjectType()
export class MatchPredictionType {
  @Field(() => ID)
  homeTeamId: string;

  @Field(() => ID)
  awayTeamId: string;

  @Field(() => Float)
  homeWinProbability: number;

  @Field(() => Float)
  drawProbability: number;

  @Field(() => Float)
  awayWinProbability: number;

  @Field(() => Float)
  predictedHomeXG: number;

  @Field(() => Float)
  predictedAwayXG: number;

  @Field(() => Float)
  confidence: number;

  @Field()
  predictionDate: Date;
}
