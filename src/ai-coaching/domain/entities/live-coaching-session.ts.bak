/**
 * Live Coaching Session Entity
 * Domain entity for managing real-time coaching sessions with live match context
 */

import { AggregateRoot } from '@nestjs/cqrs';
import { CoachingSessionId } from '../value-objects/coaching-session-id';
import { MatchContext } from '../value-objects/match-context';
import { CoachProfile } from '../value-objects/coach-profile';
import { TacticalInsight } from './tactical-insight';

export enum LiveSessionStatus {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
  ERROR = 'error',
}

export enum MatchPhase {
  PRE_MATCH = 'pre_match',
  FIRST_HALF = 'first_half',
  HALF_TIME = 'half_time',
  SECOND_HALF = 'second_half',
  EXTRA_TIME = 'extra_time',
  PENALTY_SHOOTOUT = 'penalty_shootout',
  POST_MATCH = 'post_match',
}

export enum CoachingUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface LiveMatchEvent {
  id: string;
  type:
    | 'goal'
    | 'substitution'
    | 'card'
    | 'tactical_change'
    | 'injury'
    | 'formation_change'
    | 'momentum_shift';
  timestamp: Date;
  matchMinute: number;
  description: string;
  hebrewDescription: string;
  teamId?: string;
  playerId?: string;
  metadata: Record<string, any>;
  coachingOpportunity?: {
    urgency: CoachingUrgency;
    suggestedActions: string[];
    hebrewSuggestedActions: string[];
  };
}

export interface CoachingInsight {
  id: string;
  type:
    | 'tactical_adjustment'
    | 'player_instruction'
    | 'formation_change'
    | 'substitution_advice'
    | 'motivational';
  content: string;
  hebrewContent: string;
  urgency: CoachingUrgency;
  confidence: number;
  timestamp: Date;
  matchContext: {
    phase: MatchPhase;
    matchMinute: number;
    scoreline: string;
    momentum: 'home' | 'away' | 'neutral';
  };
  triggerEvent?: LiveMatchEvent;
  actionableItems: Array<{
    action: string;
    hebrewAction: string;
    priority: 'immediate' | 'next_break' | 'half_time' | 'next_match';
    estimatedImpact: number; // 0-1
  }>;
  relatedInsights: string[];
  sources: Array<{
    type:
      | 'live_analysis'
      | 'tactical_knowledge'
      | 'historical_pattern'
      | 'performance_data';
    source: string;
    confidence: number;
  }>;
}

export interface SessionMetrics {
  totalInsights: number;
  insightsByUrgency: Record<CoachingUrgency, number>;
  insightsByType: Record<string, number>;
  averageResponseTime: number;
  accuracyScore: number;
  coachSatisfaction?: number;
  sessionsEventsProcessed: number;
  hebrewQueryRatio: number;
}

export interface LiveCoachingSessionProps {
  sessionId: CoachingSessionId;
  coachProfile: CoachProfile;
  matchContext: MatchContext;
  status: LiveSessionStatus;
  startTime: Date;
  endTime?: Date;
  connectedClients: string[];
  activeInsights: CoachingInsight[];
  matchEvents: LiveMatchEvent[];
  sessionMetrics: SessionMetrics;
  preferences: {
    language: 'he' | 'en' | 'mixed';
    urgencyThreshold: CoachingUrgency;
    insightTypes: string[];
    autoNotifications: boolean;
    culturalAdaptation: boolean;
  };
  contextData: {
    currentFormation?: string;
    recentSubstitutions: string[];
    keyPlayers: string[];
    tacticalFocus: string[];
    oppositionAnalysis?: string;
  };
}

export class LiveCoachingSessionStartedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly coachId: string,
    public readonly matchId: string,
    public readonly timestamp: Date
  ) {}
}

export class CoachingInsightGeneratedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly insight: CoachingInsight,
    public readonly timestamp: Date
  ) {}
}

export class MatchEventProcessedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly event: LiveMatchEvent,
    public readonly generatedInsights: string[],
    public readonly timestamp: Date
  ) {}
}

export class LiveCoachingSessionEndedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly duration: number,
    public readonly finalMetrics: SessionMetrics,
    public readonly timestamp: Date
  ) {}
}

export class LiveCoachingSession extends AggregateRoot {
  constructor(private readonly props: LiveCoachingSessionProps) {
    super();
  }

  // Factory method
  public static create(
    sessionId: CoachingSessionId,
    coachProfile: CoachProfile,
    matchContext: MatchContext,
    preferences?: Partial<LiveCoachingSessionProps['preferences']>
  ): LiveCoachingSession {
    const session = new LiveCoachingSession({
      sessionId,
      coachProfile,
      matchContext,
      status: LiveSessionStatus.INITIALIZING,
      startTime: new Date(),
      connectedClients: [],
      activeInsights: [],
      matchEvents: [],
      sessionMetrics: {
        totalInsights: 0,
        insightsByUrgency: {
          [CoachingUrgency.LOW]: 0,
          [CoachingUrgency.MEDIUM]: 0,
          [CoachingUrgency.HIGH]: 0,
          [CoachingUrgency.CRITICAL]: 0,
        },
        insightsByType: {},
        averageResponseTime: 0,
        accuracyScore: 0,
        sessionsEventsProcessed: 0,
        hebrewQueryRatio: 0,
      },
      preferences: {
        language: 'he',
        urgencyThreshold: CoachingUrgency.MEDIUM,
        insightTypes: [
          'tactical_adjustment',
          'player_instruction',
          'formation_change',
        ],
        autoNotifications: true,
        culturalAdaptation: true,
        ...preferences,
      },
      contextData: {
        recentSubstitutions: [],
        keyPlayers: [],
        tacticalFocus: [],
      },
    });

    session.apply(
      new LiveCoachingSessionStartedEvent(
        sessionId.value,
        coachProfile.id,
        matchContext.matchId,
        new Date()
      )
    );

    return session;
  }

  // Business methods

  public startSession(): void {
    if (this.props.status !== LiveSessionStatus.INITIALIZING) {
      throw new Error('Session can only be started from initializing state');
    }

    this.props.status = LiveSessionStatus.ACTIVE;
    this.props.startTime = new Date();
  }

  public pauseSession(): void {
    if (this.props.status !== LiveSessionStatus.ACTIVE) {
      throw new Error('Can only pause active sessions');
    }

    this.props.status = LiveSessionStatus.PAUSED;
  }

  public resumeSession(): void {
    if (this.props.status !== LiveSessionStatus.PAUSED) {
      throw new Error('Can only resume paused sessions');
    }

    this.props.status = LiveSessionStatus.ACTIVE;
  }

  public endSession(): void {
    if (
      ![LiveSessionStatus.ACTIVE, LiveSessionStatus.PAUSED].includes(
        this.props.status
      )
    ) {
      throw new Error('Can only end active or paused sessions');
    }

    this.props.status = LiveSessionStatus.ENDED;
    this.props.endTime = new Date();

    const duration =
      this.props.endTime.getTime() - this.props.startTime.getTime();

    this.apply(
      new LiveCoachingSessionEndedEvent(
        this.props.sessionId.value,
        duration,
        this.props.sessionMetrics,
        new Date()
      )
    );
  }

  public addClient(clientId: string): void {
    if (!this.props.connectedClients.includes(clientId)) {
      this.props.connectedClients.push(clientId);
    }
  }

  public removeClient(clientId: string): void {
    const index = this.props.connectedClients.indexOf(clientId);
    if (index > -1) {
      this.props.connectedClients.splice(index, 1);
    }
  }

  public processMatchEvent(event: LiveMatchEvent): CoachingInsight[] {
    if (this.props.status !== LiveSessionStatus.ACTIVE) {
      return [];
    }

    this.props.matchEvents.push(event);
    this.props.sessionMetrics.sessionsEventsProcessed++;

    // Generate coaching insights based on event
    const insights = this.generateInsightsForEvent(event);

    for (const insight of insights) {
      this.addInsight(insight);
    }

    this.apply(
      new MatchEventProcessedEvent(
        this.props.sessionId.value,
        event,
        insights.map(i => i.id),
        new Date()
      )
    );

    return insights;
  }

  public addInsight(insight: CoachingInsight): void {
    // Only add if urgency meets threshold
    if (this.meetsUrgencyThreshold(insight.urgency)) {
      this.props.activeInsights.push(insight);

      // Update metrics
      this.props.sessionMetrics.totalInsights++;
      this.props.sessionMetrics.insightsByUrgency[insight.urgency]++;

      const insightType = insight.type;
      this.props.sessionMetrics.insightsByType[insightType] =
        (this.props.sessionMetrics.insightsByType[insightType] || 0) + 1;

      // Keep only recent insights (last 50)
      if (this.props.activeInsights.length > 50) {
        this.props.activeInsights = this.props.activeInsights.slice(-50);
      }

      this.apply(
        new CoachingInsightGeneratedEvent(
          this.props.sessionId.value,
          insight,
          new Date()
        )
      );
    }
  }

  public updateMatchContext(context: Partial<MatchContext>): void {
    Object.assign(this.props.matchContext, context);
  }

  public updatePreferences(
    preferences: Partial<LiveCoachingSessionProps['preferences']>
  ): void {
    Object.assign(this.props.preferences, preferences);
  }

  public updateContextData(
    data: Partial<LiveCoachingSessionProps['contextData']>
  ): void {
    Object.assign(this.props.contextData, data);
  }

  public getCurrentPhase(): MatchPhase {
    const matchMinute = this.props.matchContext.matchMinute || 0;

    if (matchMinute === 0) return MatchPhase.PRE_MATCH;
    if (matchMinute <= 45) return MatchPhase.FIRST_HALF;
    if (matchMinute <= 47) return MatchPhase.HALF_TIME;
    if (matchMinute <= 90) return MatchPhase.SECOND_HALF;
    if (matchMinute <= 120) return MatchPhase.EXTRA_TIME;
    if (matchMinute > 120) return MatchPhase.PENALTY_SHOOTOUT;

    return MatchPhase.POST_MATCH;
  }

  public getRecentInsights(count: number = 10): CoachingInsight[] {
    return this.props.activeInsights
      .slice(-count)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getInsightsByUrgency(urgency: CoachingUrgency): CoachingInsight[] {
    return this.props.activeInsights.filter(
      insight => insight.urgency === urgency
    );
  }

  public getCriticalInsights(): CoachingInsight[] {
    return this.getInsightsByUrgency(CoachingUrgency.CRITICAL);
  }

  public getSessionDuration(): number {
    const endTime = this.props.endTime || new Date();
    return endTime.getTime() - this.props.startTime.getTime();
  }

  public updateMetrics(updates: Partial<SessionMetrics>): void {
    Object.assign(this.props.sessionMetrics, updates);
  }

  // Private helper methods

  private meetsUrgencyThreshold(urgency: CoachingUrgency): boolean {
    const urgencyLevels = {
      [CoachingUrgency.LOW]: 1,
      [CoachingUrgency.MEDIUM]: 2,
      [CoachingUrgency.HIGH]: 3,
      [CoachingUrgency.CRITICAL]: 4,
    };

    return (
      urgencyLevels[urgency] >=
      urgencyLevels[this.props.preferences.urgencyThreshold]
    );
  }

  private generateInsightsForEvent(event: LiveMatchEvent): CoachingInsight[] {
    const insights: CoachingInsight[] = [];
    const currentPhase = this.getCurrentPhase();
    const matchMinute = this.props.matchContext.matchMinute || 0;

    // Generate event-specific insights
    switch (event.type) {
      case 'goal':
        insights.push(this.createGoalInsight(event, currentPhase, matchMinute));
        break;
      case 'formation_change':
        insights.push(
          this.createFormationChangeInsight(event, currentPhase, matchMinute)
        );
        break;
      case 'substitution':
        insights.push(
          this.createSubstitutionInsight(event, currentPhase, matchMinute)
        );
        break;
      case 'tactical_change':
        insights.push(
          this.createTacticalInsight(event, currentPhase, matchMinute)
        );
        break;
      case 'momentum_shift':
        insights.push(
          this.createMomentumInsight(event, currentPhase, matchMinute)
        );
        break;
    }

    return insights.filter(insight => insight !== null);
  }

  private createGoalInsight(
    event: LiveMatchEvent,
    phase: MatchPhase,
    minute: number
  ): CoachingInsight {
    const isOwnGoal = event.teamId === this.props.matchContext.homeTeamId;
    const urgency =
      minute > 80 ? CoachingUrgency.CRITICAL : CoachingUrgency.HIGH;

    return {
      id: `goal_insight_${event.id}`,
      type: 'tactical_adjustment',
      content: isOwnGoal
        ? 'Goal scored! Consider tactical adjustments to maintain momentum and prevent immediate response.'
        : 'Goal conceded. Immediate tactical response needed to regain control and equalize.',
      hebrewContent: isOwnGoal
        ? 'שער הובקע! שקול התאמות טקטיות לשמירת המומנטום ומניעת תגובה מיידית.'
        : 'שער נספג. נדרשת תגובה טקטית מיידית להשבת השליטה והשוואה.',
      urgency,
      confidence: 0.9,
      timestamp: new Date(),
      matchContext: {
        phase,
        matchMinute: minute,
        scoreline: this.props.matchContext.scoreline || '0-0',
        momentum: isOwnGoal ? 'home' : 'away',
      },
      triggerEvent: event,
      actionableItems: isOwnGoal
        ? [
            {
              action: 'Maintain formation stability',
              hebrewAction: 'שמור על יציבות המערך',
              priority: 'immediate',
              estimatedImpact: 0.7,
            },
            {
              action: 'Control game tempo',
              hebrewAction: 'שלוט בקצב המשחק',
              priority: 'immediate',
              estimatedImpact: 0.8,
            },
          ]
        : [
            {
              action: 'Consider formation change to more attacking setup',
              hebrewAction: 'שקול שינוי מערך למערך התקפי יותר',
              priority: 'immediate',
              estimatedImpact: 0.8,
            },
            {
              action: 'Increase pressing intensity',
              hebrewAction: 'הגבר עצימות לחץ',
              priority: 'immediate',
              estimatedImpact: 0.7,
            },
          ],
      relatedInsights: [],
      sources: [
        {
          type: 'live_analysis',
          source: 'match_event_processor',
          confidence: 0.95,
        },
      ],
    };
  }

  private createFormationChangeInsight(
    event: LiveMatchEvent,
    phase: MatchPhase,
    minute: number
  ): CoachingInsight {
    return {
      id: `formation_insight_${event.id}`,
      type: 'formation_change',
      content:
        'Opposition formation change detected. Analyze and prepare counter-tactical response.',
      hebrewContent: 'זוהה שינוי מערך ביריב. נתח והכן תגובה טקטית נגדית.',
      urgency: CoachingUrgency.HIGH,
      confidence: 0.85,
      timestamp: new Date(),
      matchContext: {
        phase,
        matchMinute: minute,
        scoreline: this.props.matchContext.scoreline || '0-0',
        momentum: 'neutral',
      },
      triggerEvent: event,
      actionableItems: [
        {
          action: 'Assess new formation vulnerabilities',
          hebrewAction: 'העריך חולשות במערך החדש',
          priority: 'immediate',
          estimatedImpact: 0.8,
        },
        {
          action: 'Consider tactical adjustment',
          hebrewAction: 'שקול התאמה טקטית',
          priority: 'next_break',
          estimatedImpact: 0.7,
        },
      ],
      relatedInsights: [],
      sources: [
        {
          type: 'tactical_knowledge',
          source: 'formation_analyzer',
          confidence: 0.8,
        },
      ],
    };
  }

  private createSubstitutionInsight(
    event: LiveMatchEvent,
    phase: MatchPhase,
    minute: number
  ): CoachingInsight {
    return {
      id: `substitution_insight_${event.id}`,
      type: 'substitution_advice',
      content:
        'Opposition substitution made. Consider your own substitution strategy and tactical adjustments.',
      hebrewContent:
        'בוצע חילוף ביריב. שקול אסטרטגיית חילופים והתאמות טקטיות משלך.',
      urgency: CoachingUrgency.MEDIUM,
      confidence: 0.75,
      timestamp: new Date(),
      matchContext: {
        phase,
        matchMinute: minute,
        scoreline: this.props.matchContext.scoreline || '0-0',
        momentum: 'neutral',
      },
      triggerEvent: event,
      actionableItems: [
        {
          action: 'Evaluate substitution impact',
          hebrewAction: 'העריך השפעת החילוף',
          priority: 'immediate',
          estimatedImpact: 0.6,
        },
        {
          action: 'Prepare counter-substitution',
          hebrewAction: 'הכן חילוף נגדי',
          priority: 'next_break',
          estimatedImpact: 0.7,
        },
      ],
      relatedInsights: [],
      sources: [
        {
          type: 'performance_data',
          source: 'player_analyzer',
          confidence: 0.7,
        },
      ],
    };
  }

  private createTacticalInsight(
    event: LiveMatchEvent,
    phase: MatchPhase,
    minute: number
  ): CoachingInsight {
    return {
      id: `tactical_insight_${event.id}`,
      type: 'tactical_adjustment',
      content:
        "Tactical pattern change detected. Adapt your team's approach accordingly.",
      hebrewContent: 'זוהה שינוי בתבנית טקטית. התאם את גישת הקבוצה בהתאם.',
      urgency: CoachingUrgency.MEDIUM,
      confidence: 0.8,
      timestamp: new Date(),
      matchContext: {
        phase,
        matchMinute: minute,
        scoreline: this.props.matchContext.scoreline || '0-0',
        momentum: 'neutral',
      },
      triggerEvent: event,
      actionableItems: [
        {
          action: 'Communicate tactical adjustment to players',
          hebrewAction: 'העבר התאמה טקטית לשחקנים',
          priority: 'immediate',
          estimatedImpact: 0.7,
        },
      ],
      relatedInsights: [],
      sources: [
        {
          type: 'tactical_knowledge',
          source: 'pattern_matcher',
          confidence: 0.8,
        },
      ],
    };
  }

  private createMomentumInsight(
    event: LiveMatchEvent,
    phase: MatchPhase,
    minute: number
  ): CoachingInsight {
    return {
      id: `momentum_insight_${event.id}`,
      type: 'motivational',
      content:
        'Momentum shift detected. Use this opportunity to motivate players and build on the advantage.',
      hebrewContent:
        'זוהה שינוי מומנטום. נצל את ההזדמנות לעודד שחקנים ולבנות על היתרון.',
      urgency: CoachingUrgency.MEDIUM,
      confidence: 0.7,
      timestamp: new Date(),
      matchContext: {
        phase,
        matchMinute: minute,
        scoreline: this.props.matchContext.scoreline || '0-0',
        momentum: event.metadata.momentum || 'neutral',
      },
      triggerEvent: event,
      actionableItems: [
        {
          action: 'Motivate players to capitalize on momentum',
          hebrewAction: 'עודד שחקנים לנצל את המומנטום',
          priority: 'immediate',
          estimatedImpact: 0.6,
        },
      ],
      relatedInsights: [],
      sources: [
        {
          type: 'live_analysis',
          source: 'momentum_analyzer',
          confidence: 0.7,
        },
      ],
    };
  }

  // Getters for accessing properties
  public get sessionId(): CoachingSessionId {
    return this.props.sessionId;
  }

  public get status(): LiveSessionStatus {
    return this.props.status;
  }

  public get coachProfile(): CoachProfile {
    return this.props.coachProfile;
  }

  public get matchContext(): MatchContext {
    return this.props.matchContext;
  }

  public get connectedClients(): string[] {
    return [...this.props.connectedClients];
  }

  public get activeInsights(): CoachingInsight[] {
    return [...this.props.activeInsights];
  }

  public get matchEvents(): LiveMatchEvent[] {
    return [...this.props.matchEvents];
  }

  public get sessionMetrics(): SessionMetrics {
    return { ...this.props.sessionMetrics };
  }

  public get preferences(): LiveCoachingSessionProps['preferences'] {
    return { ...this.props.preferences };
  }

  public get contextData(): LiveCoachingSessionProps['contextData'] {
    return { ...this.props.contextData };
  }

  public get startTime(): Date {
    return this.props.startTime;
  }

  public get endTime(): Date | undefined {
    return this.props.endTime;
  }
}
