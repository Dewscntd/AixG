/**
 * Coaching WebSocket Gateway
 * Real-time communication layer for Hebrew coaching insights and live match guidance
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import {
  RealTimeCoachingService,
  CoachingQuery,
  SessionSubscription,
} from '../../application/services/real-time-coaching.service';
import {
  CoachingUrgency,
  MatchPhase,
  CoachingInsight,
} from '../../domain/entities/live-coaching-session';
import { CoachProfile } from '../../domain/value-objects/coach-profile';
import { MatchContext } from '../../domain/value-objects/match-context';

export interface CoachingClientInfo {
  clientId: string;
  coachId: string;
  language: 'he' | 'en' | 'mixed';
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  connectedAt: Date;
  lastActivity: Date;
  subscribedSessions: string[];
}

export interface CreateSessionRequest {
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

export interface SubscribeSessionRequest {
  sessionId: string;
  subscriptionType: 'insights' | 'events' | 'metrics' | 'all';
  language?: 'he' | 'en' | 'mixed';
  filters?: {
    urgencyLevel?: CoachingUrgency;
    insightTypes?: string[];
    matchPhases?: MatchPhase[];
  };
}

export interface CoachingQueryRequest {
  sessionId: string;
  query: string;
  language?: 'he' | 'en' | 'auto';
  urgency?: CoachingUrgency;
  context?: {
    matchPhase?: MatchPhase;
    specificPlayers?: string[];
  };
}

export interface InstantInsightsRequest {
  sessionId: string;
  situation: string;
  urgency?: CoachingUrgency;
}

/**
 * Real-time Coaching WebSocket Gateway
 * Handles real-time communication for Hebrew coaching insights
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/coaching',
})
@UsePipes(new ValidationPipe({ transform: true }))
export class CoachingWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(CoachingWebSocketGateway.name);

  // Client management
  private connectedClients = new Map<string, CoachingClientInfo>();
  private clientSockets = new Map<string, Socket>();

  // Session management
  private sessionClients = new Map<string, Set<string>>();

  // Performance monitoring
  private metrics = {
    totalConnections: 0,
    currentConnections: 0,
    totalQueries: 0,
    averageResponseTime: 0,
    hebrewQueryRatio: 0,
    sessionsCreated: 0,
  };

  constructor(
    private readonly realTimeCoachingService: RealTimeCoachingService
  ) {}

  /**
   * Gateway initialization
   */
  afterInit(server: Server) {
    this.logger.log('Coaching WebSocket Gateway initialized');
    this.startPerformanceMonitoring();
  }

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    this.metrics.totalConnections++;
    this.metrics.currentConnections++;

    const clientInfo: CoachingClientInfo = {
      clientId: client.id,
      coachId: '', // Will be set during authentication
      language: 'he', // Default to Hebrew
      expertiseLevel: 'intermediate',
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscribedSessions: [],
    };

    this.connectedClients.set(client.id, clientInfo);
    this.clientSockets.set(client.id, client);

    this.logger.log(`Coaching client connected: ${client.id}`);

    // Send welcome message with Hebrew support
    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
      message: 'Connected to AI Coaching service',
      hebrewMessage: 'מחובר לשירות האימון המבוסס בינה מלאכותית',
      supportedLanguages: ['he', 'en', 'mixed'],
      capabilities: [
        'real_time_insights',
        'hebrew_coaching',
        'tactical_analysis',
        'formation_advice',
        'player_guidance',
      ],
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.metrics.currentConnections--;

    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      // Unsubscribe from all sessions
      for (const sessionId of clientInfo.subscribedSessions) {
        this.realTimeCoachingService.unsubscribeFromSession(
          sessionId,
          client.id
        );

        const sessionClients = this.sessionClients.get(sessionId);
        if (sessionClients) {
          sessionClients.delete(client.id);
          if (sessionClients.size === 0) {
            this.sessionClients.delete(sessionId);
          }
        }
      }
    }

    this.connectedClients.delete(client.id);
    this.clientSockets.delete(client.id);

    this.logger.log(`Coaching client disconnected: ${client.id}`);
  }

  /**
   * Authenticate client and set coach profile
   */
  @SubscribeMessage('authenticate')
  handleAuthentication(
    @MessageBody()
    data: {
      coachId: string;
      token?: string;
      language?: 'he' | 'en' | 'mixed';
      expertiseLevel?:
        | 'beginner'
        | 'intermediate'
        | 'advanced'
        | 'professional';
    },
    @ConnectedSocket() client: Socket
  ) {
    try {
      // In production, validate the token here

      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.coachId = data.coachId;
        clientInfo.language = data.language || 'he';
        clientInfo.expertiseLevel = data.expertiseLevel || 'intermediate';
        clientInfo.lastActivity = new Date();
      }

      this.logger.log(
        `Coach authenticated: ${data.coachId} for client ${client.id}`
      );

      client.emit('authenticated', {
        coachId: data.coachId,
        language: data.language || 'he',
        message: 'Authentication successful',
        hebrewMessage: 'אימות הצליח',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}: ${error.message}`
      );
      client.emit('error', {
        message: 'Authentication failed',
        hebrewMessage: 'אימות נכשל',
        error: error.message,
      });
    }
  }

  /**
   * Create a new coaching session
   */
  @SubscribeMessage('create_session')
  async handleCreateSession(
    @MessageBody() data: CreateSessionRequest,
    @ConnectedSocket() client: Socket
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo || clientInfo.coachId !== data.coachId) {
        client.emit('error', {
          message: 'Unauthorized - please authenticate first',
          hebrewMessage: 'לא מורשה - אנא אמת זהות תחילה',
        });
        return;
      }

      // Create coach profile
      const coachProfile = new CoachProfile({
        id: data.coachId,
        name: `Coach ${data.coachId}`,
        hebrewName: `מאמן ${data.coachId}`,
        language: data.language,
        certifications: [],
        specializations: [],
        experienceLevel: clientInfo.expertiseLevel,
      });

      // Create match context
      const matchContext = new MatchContext({
        matchId: data.matchId,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        venue: 'unknown',
        startTime: new Date(),
        matchMinute: 0,
        scoreline: '0-0',
      });

      // Create session
      const sessionId = await this.realTimeCoachingService.createSession(
        coachProfile,
        matchContext,
        data.preferences
      );

      this.metrics.sessionsCreated++;
      clientInfo.lastActivity = new Date();

      this.logger.log(
        `Created coaching session: ${sessionId} for coach: ${data.coachId}`
      );

      client.emit('session_created', {
        sessionId,
        matchId: data.matchId,
        coachId: data.coachId,
        message: 'Coaching session created successfully',
        hebrewMessage: 'מפגש אימון נוצר בהצלחה',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to create session for client ${client.id}: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to create coaching session',
        hebrewMessage: 'יצירת מפגש אימון נכשלה',
        error: error.message,
      });
    }
  }

  /**
   * Subscribe to session updates
   */
  @SubscribeMessage('subscribe_session')
  handleSubscribeSession(
    @MessageBody() data: SubscribeSessionRequest,
    @ConnectedSocket() client: Socket
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        client.emit('error', {
          message: 'Client not authenticated',
          hebrewMessage: 'לקוח לא מאומת',
        });
        return;
      }

      // Subscribe to real-time coaching service
      this.realTimeCoachingService.subscribeToSession(
        data.sessionId,
        client.id,
        {
          subscriptionType: data.subscriptionType,
          language: data.language || clientInfo.language,
          filters: data.filters,
        }
      );

      // Track session subscription
      clientInfo.subscribedSessions.push(data.sessionId);
      clientInfo.lastActivity = new Date();

      let sessionClients = this.sessionClients.get(data.sessionId);
      if (!sessionClients) {
        sessionClients = new Set();
        this.sessionClients.set(data.sessionId, sessionClients);
      }
      sessionClients.add(client.id);

      this.logger.log(
        `Client ${client.id} subscribed to session ${data.sessionId}`
      );

      client.emit('subscribed', {
        sessionId: data.sessionId,
        subscriptionType: data.subscriptionType,
        message: 'Successfully subscribed to coaching session',
        hebrewMessage: 'נרשמת בהצלחה למפגש האימון',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to subscribe client ${client.id} to session: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to subscribe to session',
        hebrewMessage: 'הרשמה למפגש נכשלה',
        error: error.message,
      });
    }
  }

  /**
   * Unsubscribe from session updates
   */
  @SubscribeMessage('unsubscribe_session')
  handleUnsubscribeSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        const index = clientInfo.subscribedSessions.indexOf(data.sessionId);
        if (index > -1) {
          clientInfo.subscribedSessions.splice(index, 1);
        }
        clientInfo.lastActivity = new Date();
      }

      this.realTimeCoachingService.unsubscribeFromSession(
        data.sessionId,
        client.id
      );

      const sessionClients = this.sessionClients.get(data.sessionId);
      if (sessionClients) {
        sessionClients.delete(client.id);
        if (sessionClients.size === 0) {
          this.sessionClients.delete(data.sessionId);
        }
      }

      this.logger.log(
        `Client ${client.id} unsubscribed from session ${data.sessionId}`
      );

      client.emit('unsubscribed', {
        sessionId: data.sessionId,
        message: 'Successfully unsubscribed from session',
        hebrewMessage: 'בוטלה הרשמה למפגש בהצלחה',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe client ${client.id}: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to unsubscribe from session',
        hebrewMessage: 'ביטול הרשמה למפגש נכשל',
        error: error.message,
      });
    }
  }

  /**
   * Process coaching query in Hebrew or English
   */
  @SubscribeMessage('coaching_query')
  async handleCoachingQuery(
    @MessageBody() data: CoachingQueryRequest,
    @ConnectedSocket() client: Socket
  ) {
    const startTime = Date.now();

    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        client.emit('error', {
          message: 'Client not authenticated',
          hebrewMessage: 'לקוח לא מאומת',
        });
        return;
      }

      const query: CoachingQuery = {
        sessionId: data.sessionId,
        query: data.query,
        language: data.language || clientInfo.language,
        urgency: data.urgency || CoachingUrgency.MEDIUM,
        context: data.context,
      };

      // Process query
      const insight = await this.realTimeCoachingService.processCoachingQuery(
        query
      );

      this.metrics.totalQueries++;
      clientInfo.lastActivity = new Date();

      // Update metrics
      this.updateQueryMetrics(startTime, query.language);

      this.logger.log(
        `Processed coaching query for client ${client.id} in ${query.language}`
      );

      // Send response directly to client
      client.emit('coaching_response', {
        queryId: `query_${Date.now()}`,
        sessionId: data.sessionId,
        insight,
        processingTime: Date.now() - startTime,
        language: query.language,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to process coaching query for client ${client.id}: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to process coaching query',
        hebrewMessage: 'עיבוד שאלת אימון נכשל',
        error: error.message,
      });
    }
  }

  /**
   * Get instant tactical insights
   */
  @SubscribeMessage('get_instant_insights')
  async handleGetInstantInsights(
    @MessageBody() data: InstantInsightsRequest,
    @ConnectedSocket() client: Socket
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        client.emit('error', {
          message: 'Client not authenticated',
          hebrewMessage: 'לקוח לא מאומת',
        });
        return;
      }

      const insights = await this.realTimeCoachingService.getInstantInsights(
        data.sessionId,
        data.situation,
        data.urgency || CoachingUrgency.MEDIUM
      );

      clientInfo.lastActivity = new Date();

      client.emit('instant_insights', {
        sessionId: data.sessionId,
        situation: data.situation,
        insights,
        count: insights.length,
        message: 'Instant insights generated',
        hebrewMessage: 'תובנות מיידיות נוצרו',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate instant insights for client ${client.id}: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to generate instant insights',
        hebrewMessage: 'יצירת תובנות מיידיות נכשלה',
        error: error.message,
      });
    }
  }

  /**
   * Get session status
   */
  @SubscribeMessage('get_session_status')
  handleGetSessionStatus(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const status = this.realTimeCoachingService.getSessionStatus(
        data.sessionId
      );

      if (!status) {
        client.emit('error', {
          message: 'Session not found',
          hebrewMessage: 'מפגש לא נמצא',
        });
        return;
      }

      client.emit('session_status', {
        sessionId: data.sessionId,
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to get session status for client ${client.id}: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to get session status',
        hebrewMessage: 'קבלת סטטוס מפגש נכשלה',
        error: error.message,
      });
    }
  }

  /**
   * End coaching session
   */
  @SubscribeMessage('end_session')
  async handleEndSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      await this.realTimeCoachingService.endSession(data.sessionId);

      // Remove all clients from this session
      const sessionClients = this.sessionClients.get(data.sessionId);
      if (sessionClients) {
        for (const clientId of sessionClients) {
          const clientInfo = this.connectedClients.get(clientId);
          if (clientInfo) {
            const index = clientInfo.subscribedSessions.indexOf(data.sessionId);
            if (index > -1) {
              clientInfo.subscribedSessions.splice(index, 1);
            }
          }
        }
        this.sessionClients.delete(data.sessionId);
      }

      this.logger.log(`Ended coaching session: ${data.sessionId}`);

      // Broadcast to all session clients
      this.broadcastToSession(data.sessionId, 'session_ended', {
        sessionId: data.sessionId,
        message: 'Coaching session ended',
        hebrewMessage: 'מפגש האימון הסתיים',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to end session for client ${client.id}: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to end session',
        hebrewMessage: 'סיום מפגש נכשל',
        error: error.message,
      });
    }
  }

  // Event handlers for coaching service events

  /**
   * Handle coaching insight generated event
   */
  @OnEvent('coaching.insight.generated')
  handleInsightGenerated(payload: {
    sessionId: string;
    clientId: string;
    insight: CoachingInsight;
    language: 'he' | 'en' | 'mixed';
    timestamp: Date;
  }) {
    const client = this.clientSockets.get(payload.clientId);
    if (client) {
      client.emit('coaching_insight', {
        sessionId: payload.sessionId,
        insight: payload.insight,
        language: payload.language,
        timestamp: payload.timestamp.toISOString(),
      });
    }
  }

  /**
   * Handle session started event
   */
  @OnEvent('coaching.session.started')
  handleSessionStarted(payload: {
    sessionId: string;
    coachId: string;
    matchId: string;
    timestamp: Date;
  }) {
    this.logger.log(`Broadcasting session started: ${payload.sessionId}`);
    this.server.emit('session_started', {
      sessionId: payload.sessionId,
      matchId: payload.matchId,
      message: 'New coaching session started',
      hebrewMessage: 'מפגש אימון חדש החל',
      timestamp: payload.timestamp.toISOString(),
    });
  }

  /**
   * Handle session ended event
   */
  @OnEvent('coaching.session.ended')
  handleSessionEnded(payload: {
    sessionId: string;
    duration: number;
    metrics: any;
    timestamp: Date;
  }) {
    this.logger.log(`Broadcasting session ended: ${payload.sessionId}`);
    this.broadcastToSession(payload.sessionId, 'session_ended', {
      sessionId: payload.sessionId,
      duration: payload.duration,
      finalMetrics: payload.metrics,
      message: 'Coaching session ended',
      hebrewMessage: 'מפגש האימון הסתיים',
      timestamp: payload.timestamp.toISOString(),
    });
  }

  // Helper methods

  private broadcastToSession(
    sessionId: string,
    event: string,
    data: any
  ): void {
    const sessionClients = this.sessionClients.get(sessionId);
    if (sessionClients) {
      for (const clientId of sessionClients) {
        const client = this.clientSockets.get(clientId);
        if (client) {
          client.emit(event, data);
        }
      }
    }
  }

  private updateQueryMetrics(
    startTime: number,
    language: 'he' | 'en' | 'auto'
  ): void {
    const responseTime = Date.now() - startTime;

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalQueries - 1) +
        responseTime) /
      this.metrics.totalQueries;

    // Update Hebrew query ratio
    if (language === 'he') {
      this.metrics.hebrewQueryRatio =
        (this.metrics.hebrewQueryRatio * (this.metrics.totalQueries - 1) + 1) /
        this.metrics.totalQueries;
    } else {
      this.metrics.hebrewQueryRatio =
        (this.metrics.hebrewQueryRatio * (this.metrics.totalQueries - 1)) /
        this.metrics.totalQueries;
    }
  }

  private startPerformanceMonitoring(): void {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateConnectionMetrics();
      this.cleanupInactiveClients();
    }, 30000);

    // Log performance metrics every 5 minutes
    setInterval(() => {
      this.logger.log(
        `Performance Metrics: ${JSON.stringify(this.getPerformanceMetrics())}`
      );
    }, 300000);
  }

  private updateConnectionMetrics(): void {
    this.metrics.currentConnections = this.connectedClients.size;
  }

  private cleanupInactiveClients(): void {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    for (const [clientId, clientInfo] of this.connectedClients) {
      if (clientInfo.lastActivity < cutoffTime) {
        const client = this.clientSockets.get(clientId);
        if (client) {
          client.disconnect(true);
        }
      }
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): any {
    return {
      ...this.metrics,
      activeClients: this.connectedClients.size,
      activeSessions: this.sessionClients.size,
      clientsPerSession:
        this.sessionClients.size > 0
          ? Array.from(this.sessionClients.values()).reduce(
              (sum, clients) => sum + clients.size,
              0
            ) / this.sessionClients.size
          : 0,
    };
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): any {
    const stats = {
      totalSessions: this.sessionClients.size,
      clientDistribution: {} as Record<string, number>,
    };

    for (const [sessionId, clients] of this.sessionClients) {
      stats.clientDistribution[sessionId] = clients.size;
    }

    return stats;
  }
}
