/**
 * AI Coaching GraphQL Resolver
 * Main resolver for AI coaching service with comprehensive Hebrew support
 */

import { 
  Resolver, 
  Query, 
  Mutation, 
  Subscription, 
  Args, 
  Context,
  ID 
} from '@nestjs/graphql';
import { UseGuards, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { RealTimeCoachingService } from '../../application/services/real-time-coaching.service';
import { CoachProfile } from '../../domain/value-objects/coach-profile';
import { MatchContext } from '../../domain/value-objects/match-context';
import { CoachingUrgency } from '../../domain/entities/live-coaching-session';
import {
  CoachingInsightType,
  CoachingSessionType,
  ServiceMetricsType,
  CreateSessionResponseType,
  CoachingQueryResponseType,
  InstantInsightsResponseType,
  CreateSessionInput,
  CoachingQueryInput,
  InstantInsightsInput,
  SessionSubscriptionInput
} from './ai-coaching.schema';

@Resolver()
export class AICoachingResolver {
  private readonly logger = new Logger(AICoachingResolver.name);
  private readonly pubSub = new PubSub();

  constructor(
    private readonly realTimeCoachingService: RealTimeCoachingService
  ) {}

  // Queries

  /**
   * Get coaching session details
   */
  @Query(() => CoachingSessionType, {
    nullable: true,
    description: 'Retrieve detailed information about a coaching session including status, insights, and match context'
  })
  async coachingSession(
    @Args('sessionId', { type: () => ID, description: 'Unique session identifier' }) sessionId: string
  ): Promise<CoachingSessionType | null> {
    try {
      const status = this.realTimeCoachingService.getSessionStatus(sessionId);
      
      if (!status) {
        return null;
      }

      return {
        sessionId: status.sessionId,
        status: status.status,
        duration: status.duration,
        connectedClients: status.connectedClients,
        totalInsights: status.totalInsights,
        recentInsights: status.recentInsights,
        currentPhase: status.currentPhase,
        matchContext: status.matchContext
      };
    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}: ${error.message}`);
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
  }

  /**
   * Get all active coaching sessions
   */
  @Query(() => [String])
  async activeCoachingSessions(): Promise<string[]> {
    try {
      // This would need to be implemented in the service
      return [];
    } catch (error) {
      this.logger.error(`Failed to get active sessions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get service metrics and statistics
   */
  @Query(() => ServiceMetricsType)
  async coachingServiceMetrics(): Promise<ServiceMetricsType> {
    try {
      const metrics = this.realTimeCoachingService.getServiceMetrics();
      return {
        totalSessions: metrics.totalSessions,
        activeSessions: metrics.activeSessions,
        totalInsights: metrics.totalInsights,
        averageResponseTime: metrics.averageResponseTime,
        hebrewQueryRatio: metrics.hebrewQueryRatio,
        successRate: metrics.successRate
      };
    } catch (error) {
      this.logger.error(`Failed to get service metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent insights for a session
   */
  @Query(() => [CoachingInsightType])
  async recentCoachingInsights(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('count', { type: () => Number, defaultValue: 10 }) count: number
  ): Promise<CoachingInsightType[]> {
    try {
      const status = this.realTimeCoachingService.getSessionStatus(sessionId);
      
      if (!status) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      return status.recentInsights.slice(0, count);
    } catch (error) {
      this.logger.error(`Failed to get recent insights: ${error.message}`);
      throw error;
    }
  }

  // Mutations

  /**
   * Create a new coaching session
   */
  @Mutation(() => CreateSessionResponseType, {
    description: 'Create a new real-time coaching session with Hebrew language support for tactical analysis'
  })
  async createCoachingSession(
    @Args('input', { description: 'Session creation parameters including coach, match, and language preferences' }) input: CreateSessionInput,
    @Context() context: any
  ): Promise<CreateSessionResponseType> {
    try {
      // Create coach profile
      const coachProfile = new CoachProfile({
        id: input.coachId,
        name: `Coach ${input.coachId}`,
        hebrewName: `מאמן ${input.coachId}`,
        language: input.language as 'he' | 'en' | 'mixed',
        certifications: [],
        specializations: [],
        experienceLevel: 'intermediate'
      });

      // Create match context
      const matchContext = new MatchContext({
        matchId: input.matchId,
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        venue: 'unknown',
        startTime: new Date(),
        matchMinute: 0,
        scoreline: '0-0'
      });

      // Create session
      const sessionId = await this.realTimeCoachingService.createSession(
        coachProfile,
        matchContext,
        input.preferences
      );

      const response = {
        sessionId,
        matchId: input.matchId,
        coachId: input.coachId,
        message: 'Coaching session created successfully',
        hebrewMessage: 'מפגש אימון נוצר בהצלחה',
        timestamp: new Date()
      };

      // Publish session created event
      this.pubSub.publish('sessionCreated', {
        sessionCreated: response
      });

      this.logger.log(`Created coaching session: ${sessionId} for coach: ${input.coachId}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      throw new BadRequestException(`Failed to create coaching session: ${error.message}`);
    }
  }

  /**
   * Process a coaching query
   */
  @Mutation(() => CoachingQueryResponseType, {
    description: 'Process a coaching query in Hebrew or English and receive AI-powered tactical insights'
  })
  async processCoachingQuery(
    @Args('input', { description: 'Query parameters including text, language, and context' }) input: CoachingQueryInput,
    @Context() context: any
  ): Promise<CoachingQueryResponseType> {
    const startTime = Date.now();

    try {
      const query = {
        sessionId: input.sessionId,
        query: input.query,
        language: (input.language || 'auto') as 'he' | 'en' | 'auto',
        urgency: input.urgency || CoachingUrgency.MEDIUM,
        context: input.context ? {
          matchPhase: input.context.matchPhase,
          specificPlayers: input.context.specificPlayers
        } : undefined
      };

      const insight = await this.realTimeCoachingService.processCoachingQuery(query);

      const response = {
        queryId: `query_${Date.now()}`,
        sessionId: input.sessionId,
        insight,
        processingTime: Date.now() - startTime,
        language: query.language,
        timestamp: new Date()
      };

      // Publish coaching response event
      this.pubSub.publish('coachingResponse', {
        coachingResponse: response
      });

      this.logger.log(`Processed coaching query for session ${input.sessionId} in ${query.language}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to process coaching query: ${error.message}`);
      throw new BadRequestException(`Failed to process coaching query: ${error.message}`);
    }
  }

  /**
   * Get instant tactical insights
   */
  @Mutation(() => InstantInsightsResponseType)
  async getInstantInsights(
    @Args('input') input: InstantInsightsInput,
    @Context() context: any
  ): Promise<InstantInsightsResponseType> {
    try {
      const insights = await this.realTimeCoachingService.getInstantInsights(
        input.sessionId,
        input.situation,
        input.urgency || CoachingUrgency.MEDIUM
      );

      const response = {
        sessionId: input.sessionId,
        situation: input.situation,
        insights,
        count: insights.length,
        message: 'Instant insights generated',
        hebrewMessage: 'תובנות מיידיות נוצרו',
        timestamp: new Date()
      };

      // Publish instant insights event
      this.pubSub.publish('instantInsights', {
        instantInsights: response
      });

      this.logger.log(`Generated ${insights.length} instant insights for session ${input.sessionId}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to generate instant insights: ${error.message}`);
      throw new BadRequestException(`Failed to generate instant insights: ${error.message}`);
    }
  }

  /**
   * End a coaching session
   */
  @Mutation(() => Boolean)
  async endCoachingSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Context() context: any
  ): Promise<boolean> {
    try {
      await this.realTimeCoachingService.endSession(sessionId);

      // Publish session ended event
      this.pubSub.publish('sessionEnded', {
        sessionEnded: {
          sessionId,
          timestamp: new Date(),
          message: 'Coaching session ended',
          hebrewMessage: 'מפגש האימון הסתיים'
        }
      });

      this.logger.log(`Ended coaching session: ${sessionId}`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to end session: ${error.message}`);
      throw new BadRequestException(`Failed to end session: ${error.message}`);
    }
  }

  /**
   * Subscribe to session updates
   */
  @Mutation(() => Boolean)
  async subscribeToSession(
    @Args('input') input: SessionSubscriptionInput,
    @Args('clientId', { type: () => ID }) clientId: string,
    @Context() context: any
  ): Promise<boolean> {
    try {
      this.realTimeCoachingService.subscribeToSession(
        input.sessionId,
        clientId,
        {
          subscriptionType: input.subscriptionType as 'insights' | 'events' | 'metrics' | 'all',
          language: (input.language || 'he') as 'he' | 'en' | 'mixed',
          filters: input.filters ? {
            urgencyLevel: input.filters.urgencyLevel,
            insightTypes: input.filters.insightTypes,
            matchPhases: input.filters.matchPhases
          } : undefined
        }
      );

      this.logger.log(`Client ${clientId} subscribed to session ${input.sessionId}`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to subscribe to session: ${error.message}`);
      throw new BadRequestException(`Failed to subscribe to session: ${error.message}`);
    }
  }

  /**
   * Unsubscribe from session updates
   */
  @Mutation(() => Boolean)
  async unsubscribeFromSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('clientId', { type: () => ID }) clientId: string,
    @Context() context: any
  ): Promise<boolean> {
    try {
      this.realTimeCoachingService.unsubscribeFromSession(sessionId, clientId);

      this.logger.log(`Client ${clientId} unsubscribed from session ${sessionId}`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from session: ${error.message}`);
      throw new BadRequestException(`Failed to unsubscribe from session: ${error.message}`);
    }
  }

  // Subscriptions

  /**
   * Subscribe to session creation events
   */
  @Subscription(() => CreateSessionResponseType)
  sessionCreated() {
    return this.pubSub.asyncIterator('sessionCreated');
  }

  /**
   * Subscribe to coaching responses
   */
  @Subscription(() => CoachingQueryResponseType, {
    description: 'Subscribe to real-time coaching query responses and insights'
  })
  coachingResponse(
    @Args('sessionId', { type: () => ID, nullable: true, description: 'Optional session ID filter' }) sessionId?: string
  ) {
    return this.pubSub.asyncIterator('coachingResponse');
  }

  /**
   * Subscribe to instant insights
   */
  @Subscription(() => InstantInsightsResponseType)
  instantInsights(
    @Args('sessionId', { type: () => ID, nullable: true }) sessionId?: string
  ) {
    return this.pubSub.asyncIterator('instantInsights');
  }

  /**
   * Subscribe to session ended events
   */
  @Subscription(() => String)
  sessionEnded(
    @Args('sessionId', { type: () => ID, nullable: true }) sessionId?: string
  ) {
    return this.pubSub.asyncIterator('sessionEnded');
  }

  /**
   * Subscribe to all coaching insights for a session
   */
  @Subscription(() => CoachingInsightType)
  coachingInsight(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('urgencyFilter', { type: () => CoachingUrgency, nullable: true }) urgencyFilter?: CoachingUrgency
  ) {
    return this.pubSub.asyncIterator(`coachingInsight_${sessionId}`);
  }

  /**
   * Subscribe to service metrics updates
   */
  @Subscription(() => ServiceMetricsType)
  serviceMetricsUpdated() {
    return this.pubSub.asyncIterator('serviceMetricsUpdated');
  }
}