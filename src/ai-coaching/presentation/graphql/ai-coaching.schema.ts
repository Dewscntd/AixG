/**
 * AI Coaching GraphQL Schema
 * Type definitions for AI coaching service with Hebrew language support
 */

import { Field, ObjectType, InputType, registerEnumType, Int, Float } from '@nestjs/graphql';
import { CoachingUrgency, MatchPhase } from '../../domain/entities/live-coaching-session';

// Register enums for GraphQL
registerEnumType(CoachingUrgency, {
  name: 'CoachingUrgency',
  description: 'Urgency level for coaching insights'
});

registerEnumType(MatchPhase, {
  name: 'MatchPhase',
  description: 'Current phase of the match'
});

// Object Types

@ObjectType()
export class CoachingInsightType {
  @Field()
  id!: string;

  @Field()
  type!: string;

  @Field()
  content!: string;

  @Field()
  hebrewContent!: string;

  @Field(() => CoachingUrgency)
  urgency!: CoachingUrgency;

  @Field(() => Float)
  confidence!: number;

  @Field()
  timestamp!: Date;

  @Field(() => MatchContextType)
  matchContext!: MatchContextType;

  @Field(() => [ActionableItemType])
  actionableItems!: ActionableItemType[];

  @Field(() => [String])
  relatedInsights!: string[];

  @Field(() => [SourceType])
  sources!: SourceType[];
}

@ObjectType()
export class MatchContextType {
  @Field(() => MatchPhase)
  phase!: MatchPhase;

  @Field(() => Int)
  matchMinute!: number;

  @Field()
  scoreline!: string;

  @Field()
  momentum!: string;
}

@ObjectType()
export class ActionableItemType {
  @Field()
  action!: string;

  @Field()
  hebrewAction!: string;

  @Field()
  priority!: string;

  @Field(() => Float)
  estimatedImpact!: number;
}

@ObjectType()
export class SourceType {
  @Field()
  type!: string;

  @Field()
  source!: string;

  @Field(() => Float)
  confidence!: number;
}

@ObjectType()
export class CoachingSessionType {
  @Field()
  sessionId!: string;

  @Field()
  status!: string;

  @Field(() => Int)
  duration!: number;

  @Field(() => Int)
  connectedClients!: number;

  @Field(() => Int)
  totalInsights!: number;

  @Field(() => [CoachingInsightType])
  recentInsights!: CoachingInsightType[];

  @Field(() => MatchPhase)
  currentPhase!: MatchPhase;

  @Field(() => MatchContextType)
  matchContext!: MatchContextType;
}

@ObjectType()
export class SessionMetricsType {
  @Field(() => Int)
  totalInsights!: number;

  @Field(() => Float)
  averageResponseTime!: number;

  @Field(() => Float)
  accuracyScore!: number;

  @Field(() => Int)
  sessionsEventsProcessed!: number;

  @Field(() => Float)
  hebrewQueryRatio!: number;
}

@ObjectType()
export class CoachProfileType {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  hebrewName!: string;

  @Field()
  language!: string;

  @Field(() => [String])
  certifications!: string[];

  @Field(() => [String])
  specializations!: string[];

  @Field()
  experienceLevel!: string;
}

@ObjectType()
export class ServiceMetricsType {
  @Field(() => Int)
  totalSessions!: number;

  @Field(() => Int)
  activeSessions!: number;

  @Field(() => Int)
  totalInsights!: number;

  @Field(() => Float)
  averageResponseTime!: number;

  @Field(() => Float)
  hebrewQueryRatio!: number;

  @Field(() => Float)
  successRate!: number;
}

@ObjectType()
export class CreateSessionResponseType {
  @Field()
  sessionId!: string;

  @Field()
  matchId!: string;

  @Field()
  coachId!: string;

  @Field()
  message!: string;

  @Field()
  hebrewMessage!: string;

  @Field()
  timestamp!: Date;
}

@ObjectType()
export class CoachingQueryResponseType {
  @Field()
  queryId!: string;

  @Field()
  sessionId!: string;

  @Field(() => CoachingInsightType)
  insight!: CoachingInsightType;

  @Field(() => Int)
  processingTime!: number;

  @Field()
  language!: string;

  @Field()
  timestamp!: Date;
}

@ObjectType()
export class InstantInsightsResponseType {
  @Field()
  sessionId!: string;

  @Field()
  situation!: string;

  @Field(() => [CoachingInsightType])
  insights!: CoachingInsightType[];

  @Field(() => Int)
  count!: number;

  @Field()
  message!: string;

  @Field()
  hebrewMessage!: string;

  @Field()
  timestamp!: Date;
}

// Input Types

@InputType()
export class CreateSessionInput {
  @Field()
  coachId!: string;

  @Field()
  matchId!: string;

  @Field()
  homeTeamId!: string;

  @Field()
  awayTeamId!: string;

  @Field()
  language!: string;

  @Field(() => SessionPreferencesInput, { nullable: true })
  preferences?: SessionPreferencesInput;
}

@InputType()
export class SessionPreferencesInput {
  @Field(() => CoachingUrgency, { nullable: true })
  urgencyThreshold?: CoachingUrgency;

  @Field(() => [String], { nullable: true })
  insightTypes?: string[];

  @Field({ nullable: true })
  autoNotifications?: boolean;

  @Field({ nullable: true })
  culturalAdaptation?: boolean;
}

@InputType()
export class CoachingQueryInput {
  @Field()
  sessionId!: string;

  @Field()
  query!: string;

  @Field({ nullable: true })
  language?: string;

  @Field(() => CoachingUrgency, { nullable: true })
  urgency?: CoachingUrgency;

  @Field(() => QueryContextInput, { nullable: true })
  context?: QueryContextInput;
}

@InputType()
export class QueryContextInput {
  @Field(() => MatchPhase, { nullable: true })
  matchPhase?: MatchPhase;

  @Field(() => [String], { nullable: true })
  specificPlayers?: string[];
}

@InputType()
export class InstantInsightsInput {
  @Field()
  sessionId!: string;

  @Field()
  situation!: string;

  @Field(() => CoachingUrgency, { nullable: true })
  urgency?: CoachingUrgency;
}

@InputType()
export class SubscriptionFiltersInput {
  @Field(() => CoachingUrgency, { nullable: true })
  urgencyLevel?: CoachingUrgency;

  @Field(() => [String], { nullable: true })
  insightTypes?: string[];

  @Field(() => [MatchPhase], { nullable: true })
  matchPhases?: MatchPhase[];
}

@InputType()
export class SessionSubscriptionInput {
  @Field()
  sessionId!: string;

  @Field()
  subscriptionType!: string;

  @Field({ nullable: true })
  language?: string;

  @Field(() => SubscriptionFiltersInput, { nullable: true })
  filters?: SubscriptionFiltersInput;
}