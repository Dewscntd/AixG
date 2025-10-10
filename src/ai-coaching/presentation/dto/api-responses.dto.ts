/**
 * API Response DTOs
 * Data Transfer Objects for AI Coaching API responses with Hebrew support
 */

import { ApiProperty } from '@nestjs/swagger';
import { CoachingUrgency, MatchPhase } from '../../domain/entities/live-coaching-session';

export class ActionableItemDto {
  @ApiProperty({ description: 'Action to take in English' })
  action!: string;

  @ApiProperty({ description: 'Action to take in Hebrew' })
  hebrewAction!: string;

  @ApiProperty({ 
    description: 'Priority level', 
    enum: ['immediate', 'next_break', 'half_time', 'next_match'] 
  })
  priority!: string;

  @ApiProperty({ description: 'Estimated impact (0-1)', minimum: 0, maximum: 1 })
  estimatedImpact!: number;
}

export class SourceDto {
  @ApiProperty({ 
    description: 'Source type',
    enum: ['live_analysis', 'tactical_knowledge', 'historical_pattern', 'performance_data', 'vector_search']
  })
  type!: string;

  @ApiProperty({ description: 'Source identifier' })
  source!: string;

  @ApiProperty({ description: 'Confidence level (0-1)', minimum: 0, maximum: 1 })
  confidence!: number;
}

export class MatchContextDto {
  @ApiProperty({ description: 'Current match phase', enum: MatchPhase })
  phase!: MatchPhase;

  @ApiProperty({ description: 'Match minute' })
  matchMinute!: number;

  @ApiProperty({ description: 'Current scoreline' })
  scoreline!: string;

  @ApiProperty({ description: 'Match momentum', enum: ['home', 'away', 'neutral'] })
  momentum!: string;
}

export class CoachingInsightDto {
  @ApiProperty({ description: 'Unique insight identifier' })
  id!: string;

  @ApiProperty({ 
    description: 'Type of insight',
    enum: ['tactical_adjustment', 'player_instruction', 'formation_change', 'substitution_advice', 'motivational']
  })
  type!: string;

  @ApiProperty({ description: 'Insight content in English' })
  content!: string;

  @ApiProperty({ description: 'Insight content in Hebrew' })
  hebrewContent!: string;

  @ApiProperty({ description: 'Urgency level', enum: CoachingUrgency })
  urgency!: CoachingUrgency;

  @ApiProperty({ description: 'Confidence score (0-1)', minimum: 0, maximum: 1 })
  confidence!: number;

  @ApiProperty({ description: 'Timestamp when insight was generated' })
  timestamp!: Date;

  @ApiProperty({ description: 'Match context when insight was generated' })
  matchContext!: MatchContextDto;

  @ApiProperty({ description: 'Actionable items for the coach', type: [ActionableItemDto] })
  actionableItems!: ActionableItemDto[];

  @ApiProperty({ description: 'Related insight IDs', type: [String] })
  relatedInsights!: string[];

  @ApiProperty({ description: 'Sources used to generate insight', type: [SourceDto] })
  sources!: SourceDto[];
}

export class SessionMetricsDto {
  @ApiProperty({ description: 'Total insights generated in session' })
  totalInsights!: number;

  @ApiProperty({ description: 'Average response time in milliseconds' })
  averageResponseTime!: number;

  @ApiProperty({ description: 'Accuracy score (0-1)', minimum: 0, maximum: 1 })
  accuracyScore!: number;

  @ApiProperty({ description: 'Number of match events processed' })
  sessionsEventsProcessed!: number;

  @ApiProperty({ description: 'Ratio of Hebrew queries (0-1)', minimum: 0, maximum: 1 })
  hebrewQueryRatio!: number;
}

export class CoachingSessionDto {
  @ApiProperty({ description: 'Session identifier' })
  sessionId!: string;

  @ApiProperty({ description: 'Current session status' })
  status!: string;

  @ApiProperty({ description: 'Session duration in milliseconds' })
  duration!: number;

  @ApiProperty({ description: 'Number of connected clients' })
  connectedClients!: number;

  @ApiProperty({ description: 'Total insights generated' })
  totalInsights!: number;

  @ApiProperty({ description: 'Recent insights', type: [CoachingInsightDto] })
  recentInsights!: CoachingInsightDto[];

  @ApiProperty({ description: 'Current match phase', enum: MatchPhase })
  currentPhase!: MatchPhase;

  @ApiProperty({ description: 'Current match context' })
  matchContext!: MatchContextDto;
}

export class CreateSessionResponseDto {
  @ApiProperty({ description: 'Created session ID' })
  sessionId!: string;

  @ApiProperty({ description: 'Match ID' })
  matchId!: string;

  @ApiProperty({ description: 'Coach ID' })
  coachId!: string;

  @ApiProperty({ description: 'Session status' })
  status!: string;

  @ApiProperty({ description: 'Success message in English' })
  message!: string;

  @ApiProperty({ description: 'Success message in Hebrew' })
  hebrewMessage!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  timestamp!: string;

  @ApiProperty({ description: 'Available API endpoints' })
  endpoints!: {
    session: string;
    query: string;
    insights: string;
    websocket: string;
  };
}

export class CoachingQueryResponseDto {
  @ApiProperty({ description: 'Query identifier' })
  queryId!: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId!: string;

  @ApiProperty({ description: 'Original query text' })
  query!: string;

  @ApiProperty({ description: 'Generated coaching insight' })
  insight!: CoachingInsightDto;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTime!: number;

  @ApiProperty({ description: 'Query language' })
  language!: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: string;
}

export class InstantInsightsResponseDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId!: string;

  @ApiProperty({ description: 'Situation description' })
  situation!: string;

  @ApiProperty({ description: 'Generated insights', type: [CoachingInsightDto] })
  insights!: CoachingInsightDto[];

  @ApiProperty({ description: 'Number of insights generated' })
  count!: number;

  @ApiProperty({ description: 'Success message in English' })
  message!: string;

  @ApiProperty({ description: 'Success message in Hebrew' })
  hebrewMessage!: string;

  @ApiProperty({ description: 'Generation timestamp' })
  timestamp!: string;
}

export class SubscriptionResponseDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId!: string;

  @ApiProperty({ description: 'Client ID' })
  clientId!: string;

  @ApiProperty({ description: 'Subscription type' })
  subscriptionType!: string;

  @ApiProperty({ description: 'Success message in English' })
  message!: string;

  @ApiProperty({ description: 'Success message in Hebrew' })
  hebrewMessage!: string;

  @ApiProperty({ description: 'WebSocket endpoint for real-time updates' })
  websocketEndpoint!: string;

  @ApiProperty({ description: 'Subscription timestamp' })
  timestamp!: string;
}

export class ServiceMetricsDto {
  @ApiProperty({ description: 'Total sessions created' })
  totalSessions!: number;

  @ApiProperty({ description: 'Currently active sessions' })
  activeSessions!: number;

  @ApiProperty({ description: 'Total insights generated' })
  totalInsights!: number;

  @ApiProperty({ description: 'Average response time in milliseconds' })
  averageResponseTime!: number;

  @ApiProperty({ description: 'Ratio of Hebrew queries (0-1)', minimum: 0, maximum: 1 })
  hebrewQueryRatio!: number;

  @ApiProperty({ description: 'Service success rate (0-1)', minimum: 0, maximum: 1 })
  successRate!: number;
}

export class ServiceHealthDto {
  @ApiProperty({ description: 'Service status', enum: ['healthy', 'degraded', 'unhealthy'] })
  status!: string;

  @ApiProperty({ description: 'Health check timestamp' })
  timestamp!: string;

  @ApiProperty({ description: 'Service metrics' })
  metrics!: ServiceMetricsDto;

  @ApiProperty({ description: 'Service capabilities', type: [String] })
  capabilities!: string[];
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Error message' })
  message!: string;

  @ApiProperty({ description: 'Error code' })
  code!: string;

  @ApiProperty({ description: 'Error timestamp' })
  timestamp!: string;

  @ApiProperty({ description: 'Request path that caused the error' })
  path!: string;

  @ApiProperty({ description: 'Additional error details', required: false })
  details?: any;
}