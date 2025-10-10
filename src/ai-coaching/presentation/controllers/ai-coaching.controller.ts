/**
 * AI Coaching REST Controller
 * RESTful endpoints for AI coaching service with Hebrew language support
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBody 
} from '@nestjs/swagger';
import { 
  StandardRateLimit, 
  SessionRateLimit, 
  RealTimeRateLimit, 
  InsightsRateLimit,
  GenerousRateLimit 
} from '../decorators/rate-limit.decorator';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { Request } from 'express';
import { RealTimeCoachingService, CoachingQuery } from '../../application/services/real-time-coaching.service';
import { CoachProfile } from '../../domain/value-objects/coach-profile';
import { MatchContext } from '../../domain/value-objects/match-context';
import { CoachingUrgency } from '../../domain/entities/live-coaching-session';

// DTOs for API endpoints
export interface CreateSessionDto {
  coachId: string;
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  language: 'he' | 'en' | 'mixed';
  preferences?: {
    urgencyThreshold?: CoachingUrgency;
    insightTypes?: string[];
    autoNotifications?: boolean;
    culturalAdaptation?: boolean;
  };
}

export interface CoachingQueryDto {
  sessionId: string;
  query: string;
  language?: 'he' | 'en' | 'auto';
  urgency?: CoachingUrgency;
  context?: {
    matchPhase?: string;
    specificPlayers?: string[];
  };
}

export interface InstantInsightsDto {
  sessionId: string;
  situation: string;
  urgency?: CoachingUrgency;
}

export interface SubscriptionDto {
  sessionId: string;
  clientId: string;
  subscriptionType: 'insights' | 'events' | 'metrics' | 'all';
  language?: 'he' | 'en' | 'mixed';
  filters?: {
    urgencyLevel?: CoachingUrgency;
    insightTypes?: string[];
    matchPhases?: string[];
  };
}

@ApiTags('AI Coaching')
@Controller('api/v1/coaching')
@UseGuards(RateLimitGuard)
export class AICoachingController {
  private readonly logger = new Logger(AICoachingController.name);

  constructor(
    private readonly realTimeCoachingService: RealTimeCoachingService
  ) {}

  /**
   * Get service health and metrics
   */
  @Get('health')
  @GenerousRateLimit()
  @ApiOperation({ summary: 'Get AI coaching service health status' })
  @ApiResponse({ status: 200, description: 'Service health information' })
  getHealth() {
    try {
      const metrics = this.realTimeCoachingService.getServiceMetrics();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: {
          activeSessions: metrics.activeSessions,
          totalSessions: metrics.totalSessions,
          totalInsights: metrics.totalInsights,
          averageResponseTime: metrics.averageResponseTime,
          hebrewQueryRatio: metrics.hebrewQueryRatio,
          successRate: metrics.successRate
        },
        capabilities: [
          'real_time_coaching',
          'hebrew_support',
          'tactical_analysis',
          'formation_advice',
          'player_guidance',
          'instant_insights'
        ]
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      throw new HttpException('Service unhealthy', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Create a new coaching session
   */
  @Post('sessions')
  @SessionRateLimit()
  @ApiOperation({ summary: 'Create a new coaching session' })
  @ApiBody({ type: Object, description: 'Session creation parameters' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  async createSession(@Body() createSessionDto: CreateSessionDto, @Req() request: Request) {
    try {
      // Validate input
      if (!createSessionDto.coachId || !createSessionDto.matchId || 
          !createSessionDto.homeTeamId || !createSessionDto.awayTeamId) {
        throw new BadRequestException('Missing required fields: coachId, matchId, homeTeamId, awayTeamId');
      }

      // Create coach profile
      const coachProfile = new CoachProfile({
        id: createSessionDto.coachId,
        name: `Coach ${createSessionDto.coachId}`,
        hebrewName: `מאמן ${createSessionDto.coachId}`,
        language: createSessionDto.language,
        certifications: [],
        specializations: [],
        experienceLevel: 'intermediate'
      });

      // Create match context
      const matchContext = new MatchContext({
        matchId: createSessionDto.matchId,
        homeTeamId: createSessionDto.homeTeamId,
        awayTeamId: createSessionDto.awayTeamId,
        venue: 'unknown',
        startTime: new Date(),
        matchMinute: 0,
        scoreline: '0-0'
      });

      const sessionId = await this.realTimeCoachingService.createSession(
        coachProfile,
        matchContext,
        createSessionDto.preferences
      );

      this.logger.log(`Created coaching session: ${sessionId} for coach: ${createSessionDto.coachId}`);

      return {
        sessionId,
        matchId: createSessionDto.matchId,
        coachId: createSessionDto.coachId,
        status: 'created',
        message: 'Coaching session created successfully',
        hebrewMessage: 'מפגש אימון נוצר בהצלחה',
        timestamp: new Date().toISOString(),
        endpoints: {
          session: `/api/v1/coaching/sessions/${sessionId}`,
          query: `/api/v1/coaching/sessions/${sessionId}/query`,
          insights: `/api/v1/coaching/sessions/${sessionId}/insights`,
          websocket: `/coaching?sessionId=${sessionId}`
        }
      };
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        `Failed to create coaching session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get session details
   */
  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get coaching session details' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session details retrieved' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  getSession(@Param('sessionId') sessionId: string) {
    try {
      const status = this.realTimeCoachingService.getSessionStatus(sessionId);
      
      if (!status) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      return {
        sessionId: status.sessionId,
        status: status.status,
        duration: status.duration,
        connectedClients: status.connectedClients,
        totalInsights: status.totalInsights,
        currentPhase: status.currentPhase,
        matchContext: status.matchContext,
        recentInsights: status.recentInsights,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Process coaching query
   */
  @Post('sessions/:sessionId/query')
  @RealTimeRateLimit()
  @ApiOperation({ summary: 'Process a coaching query' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiBody({ type: Object, description: 'Coaching query parameters' })
  @ApiResponse({ status: 200, description: 'Query processed successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async processQuery(
    @Param('sessionId') sessionId: string,
    @Body() queryDto: Omit<CoachingQueryDto, 'sessionId'>
  ) {
    const startTime = Date.now();

    try {
      // Validate query
      if (!queryDto.query || queryDto.query.trim().length === 0) {
        throw new BadRequestException('Query text is required');
      }

      const query: CoachingQuery = {
        sessionId,
        query: queryDto.query,
        language: queryDto.language || 'auto',
        urgency: queryDto.urgency || CoachingUrgency.MEDIUM,
        context: queryDto.context
      };

      const insight = await this.realTimeCoachingService.processCoachingQuery(query);

      this.logger.log(`Processed coaching query for session ${sessionId} in ${query.language}`);

      return {
        queryId: `query_${Date.now()}`,
        sessionId,
        query: queryDto.query,
        insight,
        processingTime: Date.now() - startTime,
        language: query.language,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to process query for session ${sessionId}: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        `Failed to process coaching query: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get instant insights
   */
  @Post('sessions/:sessionId/insights/instant')
  @InsightsRateLimit()
  @ApiOperation({ summary: 'Get instant tactical insights' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiBody({ type: Object, description: 'Instant insights parameters' })
  @ApiResponse({ status: 200, description: 'Insights generated successfully' })
  async getInstantInsights(
    @Param('sessionId') sessionId: string,
    @Body() insightsDto: Omit<InstantInsightsDto, 'sessionId'>
  ) {
    try {
      if (!insightsDto.situation || insightsDto.situation.trim().length === 0) {
        throw new BadRequestException('Situation description is required');
      }

      const insights = await this.realTimeCoachingService.getInstantInsights(
        sessionId,
        insightsDto.situation,
        insightsDto.urgency || CoachingUrgency.MEDIUM
      );

      this.logger.log(`Generated ${insights.length} instant insights for session ${sessionId}`);

      return {
        sessionId,
        situation: insightsDto.situation,
        insights,
        count: insights.length,
        message: 'Instant insights generated',
        hebrewMessage: 'תובנות מיידיות נוצרו',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to generate instant insights for session ${sessionId}: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        `Failed to generate instant insights: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get recent insights
   */
  @Get('sessions/:sessionId/insights')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get recent coaching insights' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiQuery({ name: 'count', description: 'Number of insights to retrieve', required: false })
  @ApiQuery({ name: 'urgency', description: 'Filter by urgency level', required: false })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully' })
  getRecentInsights(
    @Param('sessionId') sessionId: string,
    @Query('count') count: string = '10',
    @Query('urgency') urgency?: CoachingUrgency
  ) {
    try {
      const status = this.realTimeCoachingService.getSessionStatus(sessionId);
      
      if (!status) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      let insights = status.recentInsights;
      
      // Filter by urgency if specified
      if (urgency) {
        insights = insights.filter(insight => insight.urgency === urgency);
      }

      // Limit results
      const countNum = parseInt(count, 10);
      if (!isNaN(countNum) && countNum > 0) {
        insights = insights.slice(0, countNum);
      }

      return {
        sessionId,
        insights,
        count: insights.length,
        filters: {
          urgency: urgency || 'all',
          maxCount: countNum || 10
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get insights for session ${sessionId}: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve insights: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Subscribe to session updates
   */
  @Post('sessions/:sessionId/subscribe')
  @ApiOperation({ summary: 'Subscribe to session updates' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiBody({ type: Object, description: 'Subscription parameters' })
  @ApiResponse({ status: 200, description: 'Subscription created successfully' })
  subscribeToSession(
    @Param('sessionId') sessionId: string,
    @Body() subscriptionDto: Omit<SubscriptionDto, 'sessionId'>
  ) {
    try {
      if (!subscriptionDto.clientId) {
        throw new BadRequestException('Client ID is required');
      }

      this.realTimeCoachingService.subscribeToSession(
        sessionId,
        subscriptionDto.clientId,
        {
          subscriptionType: subscriptionDto.subscriptionType,
          language: subscriptionDto.language || 'he',
          filters: subscriptionDto.filters
        }
      );

      this.logger.log(`Client ${subscriptionDto.clientId} subscribed to session ${sessionId}`);

      return {
        sessionId,
        clientId: subscriptionDto.clientId,
        subscriptionType: subscriptionDto.subscriptionType,
        message: 'Successfully subscribed to session updates',
        hebrewMessage: 'נרשמת בהצלחה לעדכוני המפגש',
        websocketEndpoint: `/coaching?sessionId=${sessionId}&clientId=${subscriptionDto.clientId}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to subscribe to session ${sessionId}: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        `Failed to subscribe to session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Unsubscribe from session updates
   */
  @Delete('sessions/:sessionId/subscribe/:clientId')
  @ApiOperation({ summary: 'Unsubscribe from session updates' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  unsubscribeFromSession(
    @Param('sessionId') sessionId: string,
    @Param('clientId') clientId: string
  ) {
    try {
      this.realTimeCoachingService.unsubscribeFromSession(sessionId, clientId);

      this.logger.log(`Client ${clientId} unsubscribed from session ${sessionId}`);

      return {
        sessionId,
        clientId,
        message: 'Successfully unsubscribed from session updates',
        hebrewMessage: 'בוטלה הרשמה לעדכוני המפגש בהצלחה',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from session ${sessionId}: ${error.message}`);
      throw new HttpException(
        `Failed to unsubscribe from session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * End coaching session
   */
  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'End a coaching session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  async endSession(@Param('sessionId') sessionId: string) {
    try {
      await this.realTimeCoachingService.endSession(sessionId);

      this.logger.log(`Ended coaching session: ${sessionId}`);

      return {
        sessionId,
        status: 'ended',
        message: 'Coaching session ended successfully',
        hebrewMessage: 'מפגש האימון הסתיים בהצלחה',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to end session ${sessionId}: ${error.message}`);
      throw new HttpException(
        `Failed to end session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get service metrics
   */
  @Get('metrics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get AI coaching service metrics' })
  @ApiResponse({ status: 200, description: 'Service metrics retrieved' })
  getServiceMetrics() {
    try {
      const metrics = this.realTimeCoachingService.getServiceMetrics();
      
      return {
        service: 'ai-coaching',
        metrics: {
          totalSessions: metrics.totalSessions,
          activeSessions: metrics.activeSessions,
          totalInsights: metrics.totalInsights,
          averageResponseTime: metrics.averageResponseTime,
          hebrewQueryRatio: metrics.hebrewQueryRatio,
          successRate: metrics.successRate
        },
        performance: {
          healthy: metrics.successRate > 0.9,
          responseTime: metrics.averageResponseTime < 2000 ? 'good' : 'slow',
          multilingualSupport: metrics.hebrewQueryRatio > 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get service metrics: ${error.message}`);
      throw new HttpException(
        `Failed to retrieve service metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}