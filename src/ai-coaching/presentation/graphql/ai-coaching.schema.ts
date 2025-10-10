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

@ObjectType({ description: 'AI-generated coaching insight with tactical analysis' })
export class CoachingInsightType {
  @Field({ description: 'Unique identifier for the insight' })
  id!: string;

  @Field({ description: 'Type of insight (tactical, formation, player, etc.)' })
  type!: string;

  @Field({ description: 'Insight content in English' })
  content!: string;

  @Field({ description: 'Insight content in Hebrew' })
  hebrewContent!: string;

  @Field(() => CoachingUrgency, { description: 'Urgency level of the insight' })
  urgency!: CoachingUrgency;

  @Field(() => Float, { description: 'Confidence score (0-1)' })
  confidence!: number;

  @Field({ description: 'Timestamp when insight was generated' })
  timestamp!: Date;

  @Field(() => MatchContextType, { description: 'Match context at time of insight' })
  matchContext!: MatchContextType;

  @Field(() => [ActionableItemType], { description: 'Actionable recommendations' })
  actionableItems!: ActionableItemType[];

  @Field(() => [String], { description: 'Related insight IDs' })
  relatedInsights!: string[];

  @Field(() => [SourceType], { description: 'Sources used for insight generation' })
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

@InputType({ description: 'Input for creating a new coaching session' })
export class CreateSessionInput {
  @Field({ description: 'Coach identifier' })
  coachId!: string;

  @Field({ description: 'Match identifier' })
  matchId!: string;

  @Field({ description: 'Home team identifier' })
  homeTeamId!: string;

  @Field({ description: 'Away team identifier' })
  awayTeamId!: string;

  @Field({ description: 'Preferred language (he/en/mixed)' })
  language!: string;

  @Field(() => SessionPreferencesInput, { nullable: true, description: 'Session preferences and settings' })
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

@InputType({ description: 'Input for processing a coaching query' })
export class CoachingQueryInput {
  @Field({ description: 'Session identifier' })
  sessionId!: string;

  @Field({ description: 'Query text in Hebrew or English' })
  query!: string;

  @Field({ nullable: true, description: 'Query language (he/en/auto)' })
  language?: string;

  @Field(() => CoachingUrgency, { nullable: true, description: 'Query urgency level' })
  urgency?: CoachingUrgency;

  @Field(() => QueryContextInput, { nullable: true, description: 'Additional query context' })
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