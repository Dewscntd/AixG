/**
 * Real-time Coaching Service
 * Core orchestration service connecting live analysis with AI coaching
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  LiveCoachingSession,
  LiveSessionStatus,
  LiveMatchEvent,
  CoachingInsight,
  CoachingUrgency,
  MatchPhase,
} from '../../domain/entities/live-coaching-session';
import { CoachingSessionId } from '../../domain/value-objects/coaching-session-id';
import { MatchContext } from '../../domain/value-objects/match-context';
import { CoachProfile } from '../../domain/value-objects/coach-profile';
import {
  LLMOrchestrationService,
  CoachingRequest,
  CoachingTaskType,
} from '../../infrastructure/llm/llm-orchestration-service';
import { VectorDatabaseService } from '../../infrastructure/vector-database/vector-database-service';
import { TacticalQueryAnalysis } from '../../domain/services/tactical-query-analysis';
import { EnhancedTacticalKnowledgeBase } from '../../domain/services/enhanced-tactical-knowledge-base';

export interface RealTimeCoachingConfig {
  maxConcurrentSessions: number;
  insightGenerationThreshold: number;
  maxResponseTime: number;
  enableAutoInsights: boolean;
  hebrewPriority: boolean;
  culturalAdaptation: boolean;
}

export interface SessionSubscription {
  sessionId: string;
  clientId: string;
  subscriptionType: 'insights' | 'events' | 'metrics' | 'all';
  language: 'he' | 'en' | 'mixed';
  filters?: {
    urgencyLevel?: CoachingUrgency;
    insightTypes?: string[];
    matchPhases?: MatchPhase[];
  };
}

export interface LiveAnalysisEvent {
  streamId: string;
  matchId: string;
  eventType:
    | 'goal'
    | 'substitution'
    | 'card'
    | 'formation_change'
    | 'momentum_shift'
    | 'tactical_change';
  timestamp: Date;
  matchMinute: number;
  data: any;
  confidence: number;
}

export interface CoachingQuery {
  sessionId: string;
  query: string;
  language: 'he' | 'en' | 'auto';
  urgency: CoachingUrgency;
  context?: {
    matchPhase?: MatchPhase;
    recentEvents?: LiveMatchEvent[];
    specificPlayers?: string[];
  };
}

@Injectable()
export class RealTimeCoachingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealTimeCoachingService.name);

  // Session management
  private activeSessions = new Map<string, LiveCoachingSession>();
  private sessionSubscriptions = new Map<string, SessionSubscription[]>();

  // Service dependencies
  private llmOrchestration: LLMOrchestrationService;
  private vectorDatabase: VectorDatabaseService;
  private queryAnalyzer: TacticalQueryAnalysis;
  private knowledgeBase: EnhancedTacticalKnowledgeBase;

  // Configuration and monitoring
  private config: RealTimeCoachingConfig = {
    maxConcurrentSessions: 50,
    insightGenerationThreshold: 0.7,
    maxResponseTime: 2000,
    enableAutoInsights: true,
    hebrewPriority: true,
    culturalAdaptation: true,
  };

  private metrics = {
    totalSessions: 0,
    activeSessions: 0,
    totalInsights: 0,
    averageResponseTime: 0,
    hebrewQueryRatio: 0,
    successRate: 0.95,
  };

  constructor(private readonly eventEmitter: EventEmitter2) {
    // Dependencies will be injected through DI in a real implementation
    this.initializeServices();
  }

  async onModuleInit() {
    this.logger.log('Real-time Coaching Service initialized');
    await this.startBackgroundProcessing();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Real-time Coaching Service');
    await this.cleanupSessions();
  }

  /**
   * Create and start a new live coaching session
   */
  public async createSession(
    coachProfile: CoachProfile,
    matchContext: MatchContext,
    preferences?: any
  ): Promise<string> {
    if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
      throw new Error('Maximum concurrent sessions reached');
    }

    const sessionId = CoachingSessionId.generate();
    const session = LiveCoachingSession.create(
      sessionId,
      coachProfile,
      matchContext,
      preferences
    );

    this.activeSessions.set(sessionId.value, session);
    this.sessionSubscriptions.set(sessionId.value, []);

    session.startSession();

    this.metrics.totalSessions++;
    this.metrics.activeSessions = this.activeSessions.size;

    this.logger.log(
      `Created coaching session: ${sessionId.value} for match: ${matchContext.matchId}`
    );

    // Emit session started event
    this.eventEmitter.emit('coaching.session.started', {
      sessionId: sessionId.value,
      coachId: coachProfile.id,
      matchId: matchContext.matchId,
      timestamp: new Date(),
    });

    return sessionId.value;
  }

  /**
   * End a coaching session
   */
  public async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.endSession();

    // Archive session data before removing
    await this.archiveSession(session);

    this.activeSessions.delete(sessionId);
    this.sessionSubscriptions.delete(sessionId);

    this.metrics.activeSessions = this.activeSessions.size;

    this.logger.log(`Ended coaching session: ${sessionId}`);

    this.eventEmitter.emit('coaching.session.ended', {
      sessionId,
      duration: session.getSessionDuration(),
      metrics: session.sessionMetrics,
      timestamp: new Date(),
    });
  }

  /**
   * Subscribe a client to session updates
   */
  public subscribeToSession(
    sessionId: string,
    clientId: string,
    subscription: Omit<SessionSubscription, 'sessionId' | 'clientId'>
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const subscriptions = this.sessionSubscriptions.get(sessionId) || [];

    // Remove existing subscription for this client
    const filtered = subscriptions.filter(sub => sub.clientId !== clientId);

    // Add new subscription
    filtered.push({
      sessionId,
      clientId,
      ...subscription,
    });

    this.sessionSubscriptions.set(sessionId, filtered);
    session.addClient(clientId);

    this.logger.log(`Client ${clientId} subscribed to session ${sessionId}`);
  }

  /**
   * Unsubscribe a client from session updates
   */
  public unsubscribeFromSession(sessionId: string, clientId: string): void {
    const subscriptions = this.sessionSubscriptions.get(sessionId) || [];
    const filtered = subscriptions.filter(sub => sub.clientId !== clientId);
    this.sessionSubscriptions.set(sessionId, filtered);

    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.removeClient(clientId);
    }

    this.logger.log(
      `Client ${clientId} unsubscribed from session ${sessionId}`
    );
  }

  /**
   * Process a coaching query in real-time
   */
  public async processCoachingQuery(
    query: CoachingQuery
  ): Promise<CoachingInsight> {
    const startTime = Date.now();

    const session = this.activeSessions.get(query.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${query.sessionId}`);
    }

    try {
      // Build coaching request
      const coachingRequest: CoachingRequest = {
        query: query.query,
        language:
          query.language === 'auto'
            ? this.detectLanguage(query.query)
            : query.language,
        taskType: this.inferTaskType(query),
        context: {
          sessionId: query.sessionId,
          matchPhase: query.context?.matchPhase || session.getCurrentPhase(),
          urgency: query.urgency,
        },
        preferences: {
          responseFormat:
            session.preferences.language === 'he'
              ? 'hebrew_narrative'
              : 'conversational',
          culturalAdaptation: session.preferences.culturalAdaptation,
          maxResponseLength: 200, // Keep responses concise for real-time
        },
        constraints: {
          maxLatency: this.config.maxResponseTime,
          requireRealTime: true,
        },
      };

      // Get LLM response
      const llmResponse = await this.llmOrchestration.processCoachingQuery(
        coachingRequest
      );

      // Create coaching insight
      const insight: CoachingInsight = {
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: this.mapResponseToInsightType(llmResponse),
        content: llmResponse.response,
        hebrewContent:
          llmResponse.hebrewResponse ||
          this.translateToHebrew(llmResponse.response),
        urgency: query.urgency,
        confidence: llmResponse.confidence,
        timestamp: new Date(),
        matchContext: {
          phase: session.getCurrentPhase(),
          matchMinute: session.matchContext.matchMinute || 0,
          scoreline: session.matchContext.scoreline || '0-0',
          momentum: 'neutral',
        },
        actionableItems: llmResponse.actionableInsights.map(item => ({
          action: item.action,
          hebrewAction: item.hebrewAction,
          priority: this.mapTimelineToPriority(item.timeline),
          estimatedImpact: 0.7, // Default impact
        })),
        relatedInsights: [],
        sources: llmResponse.sources.map(source => ({
          type: source.type as any,
          source: source.source,
          confidence: source.relevance,
        })),
      };

      // Add insight to session
      session.addInsight(insight);

      // Update metrics
      this.updateQueryMetrics(startTime, query.language);

      // Broadcast to subscribers
      await this.broadcastInsight(query.sessionId, insight);

      return insight;
    } catch (error) {
      this.logger.error(`Failed to process coaching query: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get real-time coaching insights for a match situation
   */
  public async getInstantInsights(
    sessionId: string,
    situation: string,
    urgency: CoachingUrgency = CoachingUrgency.MEDIUM
  ): Promise<CoachingInsight[]> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Search for relevant knowledge
    const vectorResults = await this.vectorDatabase.findTacticalPatterns(
      situation,
      {
        formation: session.contextData.currentFormation,
        phase: session.getCurrentPhase(),
        scoreline: session.matchContext.scoreline,
      }
    );

    const insights: CoachingInsight[] = [];

    // Generate insights from vector search results
    for (const result of vectorResults.recommendedPatterns.slice(0, 3)) {
      const insight: CoachingInsight = {
        id: `instant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'tactical_adjustment',
        content: result.document.text,
        hebrewContent:
          result.document.hebrewText ||
          this.translateToHebrew(result.document.text),
        urgency,
        confidence: result.score,
        timestamp: new Date(),
        matchContext: {
          phase: session.getCurrentPhase(),
          matchMinute: session.matchContext.matchMinute || 0,
          scoreline: session.matchContext.scoreline || '0-0',
          momentum: 'neutral',
        },
        actionableItems: result.actionableInsights || [],
        relatedInsights: [],
        sources: [
          {
            type: 'vector_search',
            source: 'tactical_patterns',
            confidence: result.score,
          },
        ],
      };

      insights.push(insight);
      session.addInsight(insight);
    }

    // Broadcast insights
    for (const insight of insights) {
      await this.broadcastInsight(sessionId, insight);
    }

    return insights;
  }

  /**
   * Get session status and metrics
   */
  public getSessionStatus(sessionId: string): any {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId,
      status: session.status,
      duration: session.getSessionDuration(),
      connectedClients: session.connectedClients.length,
      totalInsights: session.sessionMetrics.totalInsights,
      recentInsights: session.getRecentInsights(5),
      currentPhase: session.getCurrentPhase(),
      matchContext: session.matchContext,
    };
  }

  /**
   * Get service metrics
   */
  public getServiceMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  // Event handlers for live analysis events

  @OnEvent('live.analysis.goal')
  async handleGoalEvent(event: LiveAnalysisEvent): Promise<void> {
    await this.processLiveAnalysisEvent(event, 'goal');
  }

  @OnEvent('live.analysis.substitution')
  async handleSubstitutionEvent(event: LiveAnalysisEvent): Promise<void> {
    await this.processLiveAnalysisEvent(event, 'substitution');
  }

  @OnEvent('live.analysis.formation_change')
  async handleFormationChangeEvent(event: LiveAnalysisEvent): Promise<void> {
    await this.processLiveAnalysisEvent(event, 'formation_change');
  }

  @OnEvent('live.analysis.momentum_shift')
  async handleMomentumShiftEvent(event: LiveAnalysisEvent): Promise<void> {
    await this.processLiveAnalysisEvent(event, 'momentum_shift');
  }

  @OnEvent('live.analysis.tactical_change')
  async handleTacticalChangeEvent(event: LiveAnalysisEvent): Promise<void> {
    await this.processLiveAnalysisEvent(event, 'tactical_change');
  }

  // Private helper methods

  private initializeServices(): void {
    // In a real implementation, these would be injected via DI
    this.vectorDatabase = new VectorDatabaseService({
      apiKey: 'mock_key',
      environment: 'mock_env',
      indexName: 'mock_index',
      dimension: 1536,
      metric: 'cosine',
      embeddingModel: 'text-embedding-ada-002' as any,
    });

    this.knowledgeBase = new EnhancedTacticalKnowledgeBase();
    this.queryAnalyzer = new TacticalQueryAnalysis();
    this.llmOrchestration = new LLMOrchestrationService(
      this.vectorDatabase,
      this.knowledgeBase,
      {} as any // PlayerPerformanceAnalyzer would be injected
    );
  }

  private async startBackgroundProcessing(): Promise<void> {
    // Start periodic cleanup and optimization
    setInterval(() => {
      this.cleanupInactiveSessions();
      this.optimizeSessionPerformance();
    }, 60000); // Every minute

    // Start metrics collection
    setInterval(() => {
      this.updateServiceMetrics();
    }, 10000); // Every 10 seconds
  }

  private async processLiveAnalysisEvent(
    event: LiveAnalysisEvent,
    eventType: string
  ): Promise<void> {
    // Find sessions for this match
    const matchSessions = Array.from(this.activeSessions.values()).filter(
      session => session.matchContext.matchId === event.matchId
    );

    for (const session of matchSessions) {
      if (session.status === LiveSessionStatus.ACTIVE) {
        const matchEvent: LiveMatchEvent = {
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: eventType as any,
          timestamp: event.timestamp,
          matchMinute: event.matchMinute,
          description: this.generateEventDescription(event, 'en'),
          hebrewDescription: this.generateEventDescription(event, 'he'),
          metadata: event.data,
        };

        // Process event and generate insights
        const insights = session.processMatchEvent(matchEvent);

        // Broadcast insights to subscribers
        for (const insight of insights) {
          await this.broadcastInsight(session.sessionId.value, insight);
        }
      }
    }
  }

  private async broadcastInsight(
    sessionId: string,
    insight: CoachingInsight
  ): Promise<void> {
    const subscriptions = this.sessionSubscriptions.get(sessionId) || [];

    for (const subscription of subscriptions) {
      // Apply filters
      if (this.shouldSendInsight(insight, subscription)) {
        this.eventEmitter.emit('coaching.insight.generated', {
          sessionId,
          clientId: subscription.clientId,
          insight,
          language: subscription.language,
          timestamp: new Date(),
        });
      }
    }

    this.metrics.totalInsights++;
  }

  private shouldSendInsight(
    insight: CoachingInsight,
    subscription: SessionSubscription
  ): boolean {
    if (
      subscription.subscriptionType !== 'insights' &&
      subscription.subscriptionType !== 'all'
    ) {
      return false;
    }

    if (subscription.filters) {
      if (subscription.filters.urgencyLevel) {
        const urgencyLevels = {
          [CoachingUrgency.LOW]: 1,
          [CoachingUrgency.MEDIUM]: 2,
          [CoachingUrgency.HIGH]: 3,
          [CoachingUrgency.CRITICAL]: 4,
        };

        if (
          urgencyLevels[insight.urgency] <
          urgencyLevels[subscription.filters.urgencyLevel]
        ) {
          return false;
        }
      }

      if (
        subscription.filters.insightTypes &&
        !subscription.filters.insightTypes.includes(insight.type)
      ) {
        return false;
      }

      if (
        subscription.filters.matchPhases &&
        !subscription.filters.matchPhases.includes(insight.matchContext.phase)
      ) {
        return false;
      }
    }

    return true;
  }

  private detectLanguage(text: string): 'he' | 'en' {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

    return hebrewChars > englishChars ? 'he' : 'en';
  }

  private inferTaskType(query: CoachingQuery): CoachingTaskType {
    const lowerQuery = query.query.toLowerCase();

    if (lowerQuery.includes('substitution') || lowerQuery.includes('חילוף')) {
      return CoachingTaskType.PLAYER_DEVELOPMENT;
    }

    if (lowerQuery.includes('formation') || lowerQuery.includes('מערך')) {
      return CoachingTaskType.FORMATION_ADVICE;
    }

    if (query.urgency === CoachingUrgency.CRITICAL) {
      return CoachingTaskType.REAL_TIME_COACHING;
    }

    return CoachingTaskType.TACTICAL_ANALYSIS;
  }

  private mapResponseToInsightType(response: any): string {
    // Map LLM response to insight type based on content analysis
    const content = response.response.toLowerCase();

    if (content.includes('formation') || content.includes('מערך')) {
      return 'formation_change';
    }

    if (content.includes('substitution') || content.includes('חילוף')) {
      return 'substitution_advice';
    }

    if (content.includes('motivat') || content.includes('עידוד')) {
      return 'motivational';
    }

    return 'tactical_adjustment';
  }

  private mapTimelineToPriority(
    timeline: string
  ): 'immediate' | 'next_break' | 'half_time' | 'next_match' {
    switch (timeline) {
      case 'immediate':
        return 'immediate';
      case 'short_term':
        return 'next_break';
      case 'medium_term':
        return 'half_time';
      case 'long_term':
        return 'next_match';
      default:
        return 'next_break';
    }
  }

  private translateToHebrew(text: string): string {
    // Simple translation mapping - in production would use proper translation service
    const translations: Record<string, string> = {
      formation: 'מערך',
      substitution: 'חילוף',
      tactical: 'טקטי',
      player: 'שחקן',
      defense: 'הגנה',
      attack: 'התקפה',
      midfield: 'קו אמצע',
    };

    let translated = text;
    for (const [eng, heb] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(eng, 'gi'), heb);
    }

    return translated;
  }

  private generateEventDescription(
    event: LiveAnalysisEvent,
    language: 'he' | 'en'
  ): string {
    if (language === 'he') {
      switch (event.eventType) {
        case 'goal':
          return 'שער הובקע';
        case 'substitution':
          return 'בוצע חילוף';
        case 'formation_change':
          return 'שונה המערך';
        case 'momentum_shift':
          return 'שינוי מומנטום';
        case 'tactical_change':
          return 'שינוי טקטי';
        default:
          return 'אירוע במשחק';
      }
    } else {
      switch (event.eventType) {
        case 'goal':
          return 'Goal scored';
        case 'substitution':
          return 'Substitution made';
        case 'formation_change':
          return 'Formation changed';
        case 'momentum_shift':
          return 'Momentum shift detected';
        case 'tactical_change':
          return 'Tactical change observed';
        default:
          return 'Match event occurred';
      }
    }
  }

  private updateQueryMetrics(
    startTime: number,
    language: 'he' | 'en' | 'auto'
  ): void {
    const responseTime = Date.now() - startTime;

    // Update average response time
    const totalQueries = this.metrics.totalInsights + 1;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * this.metrics.totalInsights +
        responseTime) /
      totalQueries;

    // Update Hebrew query ratio
    if (language === 'he') {
      this.metrics.hebrewQueryRatio =
        (this.metrics.hebrewQueryRatio * this.metrics.totalInsights + 1) /
        totalQueries;
    } else {
      this.metrics.hebrewQueryRatio =
        (this.metrics.hebrewQueryRatio * this.metrics.totalInsights) /
        totalQueries;
    }
  }

  private cleanupInactiveSessions(): void {
    const cutoffTime = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago

    for (const [sessionId, session] of this.activeSessions) {
      if (
        session.status === LiveSessionStatus.ENDED ||
        (session.status === LiveSessionStatus.PAUSED &&
          session.startTime < cutoffTime)
      ) {
        this.activeSessions.delete(sessionId);
        this.sessionSubscriptions.delete(sessionId);
      }
    }

    this.metrics.activeSessions = this.activeSessions.size;
  }

  private optimizeSessionPerformance(): void {
    // Cleanup old insights from active sessions
    for (const session of this.activeSessions.values()) {
      if (session.activeInsights.length > 100) {
        // Keep only the most recent 50 insights
        const recentInsights = session.getRecentInsights(50);
        // In a real implementation, we'd have a method to update insights
      }
    }
  }

  private updateServiceMetrics(): void {
    this.metrics.activeSessions = this.activeSessions.size;

    // Calculate success rate based on recent performance
    // This would be based on actual error tracking in production
    if (this.metrics.averageResponseTime < this.config.maxResponseTime) {
      this.metrics.successRate = Math.min(
        0.99,
        this.metrics.successRate + 0.001
      );
    } else {
      this.metrics.successRate = Math.max(
        0.8,
        this.metrics.successRate - 0.005
      );
    }
  }

  private async archiveSession(session: LiveCoachingSession): Promise<void> {
    // In production, this would save session data to permanent storage
    this.logger.log(
      `Archiving session: ${session.sessionId.value} with ${session.sessionMetrics.totalInsights} insights`
    );
  }

  private async cleanupSessions(): Promise<void> {
    // End all active sessions gracefully
    for (const session of this.activeSessions.values()) {
      if (session.status === LiveSessionStatus.ACTIVE) {
        session.endSession();
        await this.archiveSession(session);
      }
    }

    this.activeSessions.clear();
    this.sessionSubscriptions.clear();
  }
}
