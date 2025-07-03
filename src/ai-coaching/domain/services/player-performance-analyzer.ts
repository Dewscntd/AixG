/**
 * Player Performance Analyzer
 * Advanced performance analysis with Hebrew insights and tactical recommendations
 */

import {
  FootballEntity,
  EntityType,
  PositionType,
  TacticalRole,
  EntityAttributes,
} from '../value-objects/football-entity';
import {
  FootballConcept,
  ConceptCategory,
} from '../value-objects/football-concept';
import { TacticalIntent, IntentType } from '../value-objects/tactical-intent';
import { HebrewMorphology } from '../value-objects/hebrew-morphology';
import {
  EnhancedTacticalKnowledgeBase,
  TacticalPhilosophy,
} from './enhanced-tactical-knowledge-base';
import {
  FormationAnalyzer,
  FormationType,
  FieldZone,
} from './formation-analyzer';

export enum PerformanceMetricType {
  // Physical Metrics
  DISTANCE_COVERED = 'distance_covered',
  SPRINT_COUNT = 'sprint_count',
  HIGH_INTENSITY_RUNS = 'high_intensity_runs',
  AVERAGE_SPEED = 'average_speed',
  TOP_SPEED = 'top_speed',

  // Technical Metrics
  PASSES_COMPLETED = 'passes_completed',
  PASS_ACCURACY = 'pass_accuracy',
  KEY_PASSES = 'key_passes',
  CROSSES_COMPLETED = 'crosses_completed',
  DRIBBLES_SUCCESSFUL = 'dribbles_successful',
  FIRST_TOUCH_SUCCESS = 'first_touch_success',

  // Tactical Metrics
  DEFENSIVE_ACTIONS = 'defensive_actions',
  INTERCEPTIONS = 'interceptions',
  TACKLES_WON = 'tackles_won',
  AERIAL_DUELS_WON = 'aerial_duels_won',
  PRESSING_ACTIONS = 'pressing_actions',
  POSITIONAL_DISCIPLINE = 'positional_discipline',

  // Attacking Metrics
  SHOTS_ON_TARGET = 'shots_on_target',
  GOALS_SCORED = 'goals_scored',
  ASSISTS = 'assists',
  CHANCES_CREATED = 'chances_created',
  PENALTY_AREA_TOUCHES = 'penalty_area_touches',
  EXPECTED_GOALS = 'expected_goals',

  // Mental/Decision Metrics
  DECISION_ACCURACY = 'decision_accuracy',
  RISK_TAKING = 'risk_taking',
  COMPOSURE_UNDER_PRESSURE = 'composure_under_pressure',
  LEADERSHIP_ACTIONS = 'leadership_actions',
  COMMUNICATION_RATING = 'communication_rating',
}

export enum PerformanceContext {
  MATCH = 'match',
  TRAINING = 'training',
  SEASON = 'season',
  CAREER = 'career',
}

export enum ComparisonType {
  POSITIONAL_PEERS = 'positional_peers',
  TEAM_AVERAGE = 'team_average',
  LEAGUE_AVERAGE = 'league_average',
  HISTORICAL_SELF = 'historical_self',
  TACTICAL_ROLE_PEERS = 'tactical_role_peers',
  AGE_GROUP_PEERS = 'age_group_peers',
}

export enum PerformanceTrend {
  IMPROVING = 'improving',
  DECLINING = 'declining',
  STABLE = 'stable',
  FLUCTUATING = 'fluctuating',
  BREAKTHROUGH = 'breakthrough',
  PLATEAU = 'plateau',
}

export interface PerformanceMetric {
  type: PerformanceMetricType;
  value: number;
  unit: string;
  percentile: number; // 0-100
  trend: PerformanceTrend;
  confidence: number; // 0-1
  context: PerformanceContext;
  timestamp: Date;
  matchConditions?: {
    opposition?: string;
    venue?: 'home' | 'away';
    weather?: string;
    matchImportance?: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface PlayerProfile {
  playerId: string;
  name: string;
  hebrewName: string;
  position: PositionType;
  preferredRoles: TacticalRole[];
  age: number;
  nationality: string;
  attributes: EntityAttributes;
  strengths: string[];
  weaknesses: string[];
  playingStyle: TacticalPhilosophy[];
  marketValue?: number;
  contractDetails?: {
    club: string;
    contractUntil: Date;
    salary?: number;
  };
}

export interface PerformanceAnalysisOptions {
  timeframe: {
    startDate: Date;
    endDate: Date;
  };
  context: PerformanceContext[];
  comparisonTypes: ComparisonType[];
  focusAreas?: PerformanceMetricType[];
  language: 'he' | 'en' | 'both';
  includeProjections?: boolean;
  includeTacticalFit?: boolean;
  includeMarketAnalysis?: boolean;
}

export interface PerformanceInsight {
  id: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'trend' | 'recommendation';
  title: string;
  hebrewTitle: string;
  description: string;
  hebrewDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: {
    metrics: PerformanceMetricType[];
    values: number[];
    comparisons: Array<{
      type: ComparisonType;
      value: number;
      percentile: number;
    }>;
  };
  recommendations: Array<{
    action: string;
    hebrewAction: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    resources: string[];
  }>;
  relatedConcepts: string[];
}

export interface TacticalFitAnalysis {
  formation: FormationType;
  role: TacticalRole;
  fitScore: number; // 0-1
  strengths: Array<{
    attribute: string;
    relevance: number;
    description: string;
    hebrewDescription: string;
  }>;
  gaps: Array<{
    attribute: string;
    severity: number;
    description: string;
    hebrewDescription: string;
    developmentPlan: string[];
  }>;
  alternativeRoles: Array<{
    role: TacticalRole;
    fitScore: number;
    reasoning: string;
    hebrewReasoning: string;
  }>;
}

export interface DevelopmentPlan {
  playerId: string;
  currentLevel:
    | 'youth'
    | 'amateur'
    | 'semi_professional'
    | 'professional'
    | 'elite';
  targetLevel:
    | 'youth'
    | 'amateur'
    | 'semi_professional'
    | 'professional'
    | 'elite';
  timeframe: number; // months
  phases: Array<{
    phase: string;
    hebrewPhase: string;
    duration: number; // weeks
    objectives: Array<{
      objective: string;
      hebrewObjective: string;
      targetMetrics: Record<PerformanceMetricType, number>;
      methods: string[];
      hebrewMethods: string[];
    }>;
    milestones: Array<{
      week: number;
      description: string;
      hebrewDescription: string;
      assessmentCriteria: string[];
    }>;
  }>;
  riskFactors: Array<{
    factor: string;
    hebrewFactor: string;
    probability: number;
    impact: 'low' | 'medium' | 'high' | 'critical';
    mitigation: string[];
  }>;
  successIndicators: Record<PerformanceMetricType, number>;
}

export interface PerformanceReport {
  playerId: string;
  profile: PlayerProfile;
  analysisDate: Date;
  timeframe: {
    startDate: Date;
    endDate: Date;
  };
  overallRating: {
    current: number; // 0-100
    potential: number; // 0-100
    trend: PerformanceTrend;
    confidence: number;
  };
  metricBreakdown: Record<PerformanceMetricType, PerformanceMetric>;
  insights: PerformanceInsight[];
  tacticalFit: TacticalFitAnalysis[];
  comparisons: Array<{
    type: ComparisonType;
    ranking: number;
    totalPlayers: number;
    percentile: number;
    keyDifferences: Array<{
      metric: PerformanceMetricType;
      difference: number;
      significance: 'minimal' | 'moderate' | 'significant' | 'major';
    }>;
  }>;
  developmentPlan: DevelopmentPlan;
  marketAnalysis?: {
    estimatedValue: number;
    valueChange: number;
    transferProbability: number;
    interestedClubs: string[];
  };
  hebrewSummary: string;
  englishSummary: string;
  recommendations: Array<{
    category: 'technical' | 'tactical' | 'physical' | 'mental';
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    hebrewAction: string;
    timeline: string;
  }>;
}

export class PlayerPerformanceAnalyzer {
  private readonly knowledgeBase: EnhancedTacticalKnowledgeBase;
  private readonly formationAnalyzer: FormationAnalyzer;
  private readonly playerDatabase = new Map<string, PlayerProfile>();
  private readonly performanceHistory = new Map<string, PerformanceMetric[]>();

  // Benchmarking data
  private readonly positionBenchmarks = new Map<
    PositionType,
    Record<PerformanceMetricType, number>
  >();
  private readonly roleBenchmarks = new Map<
    TacticalRole,
    Record<PerformanceMetricType, number>
  >();
  private readonly leagueBenchmarks = new Map<
    string,
    Record<PerformanceMetricType, number>
  >();

  constructor() {
    this.knowledgeBase = new EnhancedTacticalKnowledgeBase();
    this.formationAnalyzer = new FormationAnalyzer();
    this.initializeBenchmarks();
    this.initializePlayerDatabase();
  }

  /**
   * Analyze player performance with comprehensive insights
   */
  public async analyzePlayerPerformance(
    playerId: string,
    options: PerformanceAnalysisOptions
  ): Promise<PerformanceReport> {
    const profile = this.playerDatabase.get(playerId);
    if (!profile) {
      throw new Error(`Player profile not found: ${playerId}`);
    }

    const performanceData = this.getPerformanceData(
      playerId,
      options.timeframe
    );
    const metricBreakdown = this.calculateMetricBreakdown(
      performanceData,
      options.context
    );
    const overallRating = this.calculateOverallRating(profile, metricBreakdown);
    const insights = await this.generatePerformanceInsights(
      profile,
      metricBreakdown,
      options
    );
    const tacticalFit = await this.analyzeTacticalFit(profile, metricBreakdown);
    const comparisons = this.performComparisons(
      profile,
      metricBreakdown,
      options.comparisonTypes
    );
    const developmentPlan = await this.generateDevelopmentPlan(
      profile,
      insights,
      tacticalFit
    );

    let marketAnalysis;
    if (options.includeMarketAnalysis) {
      marketAnalysis = this.performMarketAnalysis(
        profile,
        overallRating,
        insights
      );
    }

    const hebrewSummary = this.generateHebrewSummary(
      profile,
      insights,
      overallRating
    );
    const englishSummary = this.generateEnglishSummary(
      profile,
      insights,
      overallRating
    );
    const recommendations = this.generateRecommendations(insights, tacticalFit);

    return {
      playerId,
      profile,
      analysisDate: new Date(),
      timeframe: options.timeframe,
      overallRating,
      metricBreakdown,
      insights,
      tacticalFit,
      comparisons,
      developmentPlan,
      marketAnalysis,
      hebrewSummary,
      englishSummary,
      recommendations,
    };
  }

  /**
   * Compare multiple players across key metrics
   */
  public async compareMultiplePlayers(
    playerIds: string[],
    focusMetrics: PerformanceMetricType[],
    options: PerformanceAnalysisOptions
  ): Promise<{
    comparison: Array<{
      playerId: string;
      profile: PlayerProfile;
      metrics: Record<PerformanceMetricType, PerformanceMetric>;
      overallScore: number;
      ranking: number;
    }>;
    insights: Array<{
      metric: PerformanceMetricType;
      leader: string;
      gap: number;
      significance: string;
      hebrewAnalysis: string;
    }>;
    recommendations: Array<{
      playerId: string;
      focus: PerformanceMetricType[];
      reasoning: string;
      hebrewReasoning: string;
    }>;
  }> {
    const playerAnalyses: Array<{
      playerId: string;
      profile: PlayerProfile;
      metrics: Record<PerformanceMetricType, PerformanceMetric>;
      overallScore: number;
      ranking: number;
    }> = [];

    // Analyze each player
    for (const playerId of playerIds) {
      const profile = this.playerDatabase.get(playerId);
      if (!profile) continue;

      const performanceData = this.getPerformanceData(
        playerId,
        options.timeframe
      );
      const metricBreakdown = this.calculateMetricBreakdown(
        performanceData,
        options.context
      );
      const overallRating = this.calculateOverallRating(
        profile,
        metricBreakdown
      );

      playerAnalyses.push({
        playerId,
        profile,
        metrics: metricBreakdown,
        overallScore: overallRating.current,
        ranking: 0, // Will be calculated after all analyses
      });
    }

    // Calculate rankings
    playerAnalyses.sort((a, b) => b.overallScore - a.overallScore);
    playerAnalyses.forEach((analysis, index) => {
      analysis.ranking = index + 1;
    });

    // Generate metric insights
    const insights: Array<{
      metric: PerformanceMetricType;
      leader: string;
      gap: number;
      significance: string;
      hebrewAnalysis: string;
    }> = [];

    for (const metric of focusMetrics) {
      const metricValues = playerAnalyses.map(p => ({
        playerId: p.playerId,
        value: p.metrics[metric]?.value || 0,
      }));

      metricValues.sort((a, b) => b.value - a.value);
      const leader = metricValues[0];
      const gap = leader.value - (metricValues[1]?.value || 0);

      insights.push({
        metric,
        leader: leader.playerId,
        gap,
        significance: this.calculateSignificance(gap, metric),
        hebrewAnalysis: this.generateMetricHebrewAnalysis(metric, leader, gap),
      });
    }

    // Generate recommendations
    const recommendations: Array<{
      playerId: string;
      focus: PerformanceMetricType[];
      reasoning: string;
      hebrewReasoning: string;
    }> = [];

    for (const analysis of playerAnalyses) {
      const weakestMetrics = focusMetrics
        .map(metric => ({
          metric,
          percentile: analysis.metrics[metric]?.percentile || 0,
        }))
        .sort((a, b) => a.percentile - b.percentile)
        .slice(0, 3)
        .map(m => m.metric);

      recommendations.push({
        playerId: analysis.playerId,
        focus: weakestMetrics,
        reasoning: `Focus on improving ${weakestMetrics.join(
          ', '
        )} to enhance overall performance`,
        hebrewReasoning: `התמקדות בשיפור ${weakestMetrics.join(
          ', '
        )} לשיפור הביצועים הכללי`,
      });
    }

    return {
      comparison: playerAnalyses,
      insights,
      recommendations,
    };
  }

  /**
   * Generate tactical role recommendations for a player
   */
  public async generateRoleRecommendations(
    playerId: string,
    formation: FormationType,
    teamPhilosophy: TacticalPhilosophy[]
  ): Promise<
    Array<{
      role: TacticalRole;
      fitScore: number;
      reasoning: string;
      hebrewReasoning: string;
      requiredDevelopment: Array<{
        area: PerformanceMetricType;
        currentLevel: number;
        targetLevel: number;
        priority: 'low' | 'medium' | 'high' | 'critical';
      }>;
      timeline: string;
    }>
  > {
    const profile = this.playerDatabase.get(playerId);
    if (!profile) return [];

    const performanceData = this.getPerformanceData(playerId, {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      endDate: new Date(),
    });

    const metricBreakdown = this.calculateMetricBreakdown(performanceData, [
      PerformanceContext.MATCH,
      PerformanceContext.TRAINING,
    ]);

    const roleRecommendations: Array<{
      role: TacticalRole;
      fitScore: number;
      reasoning: string;
      hebrewReasoning: string;
      requiredDevelopment: Array<{
        area: PerformanceMetricType;
        currentLevel: number;
        targetLevel: number;
        priority: 'low' | 'medium' | 'high' | 'critical';
      }>;
      timeline: string;
    }> = [];

    // Analyze each tactical role compatibility
    for (const role of Object.values(TacticalRole)) {
      const compatibility = FootballEntity.getRoleCompatibility(
        profile.position,
        role,
        profile.attributes
      );

      if (compatibility.overall > 0.4) {
        // Only consider roles with reasonable fit
        const developmentAreas = this.identifyDevelopmentAreas(
          profile,
          metricBreakdown,
          role,
          teamPhilosophy
        );

        const fitScore = this.calculateRoleFitScore(
          profile,
          metricBreakdown,
          role,
          formation,
          teamPhilosophy
        );

        roleRecommendations.push({
          role,
          fitScore,
          reasoning: this.generateRoleReasoning(profile, role, fitScore, 'en'),
          hebrewReasoning: this.generateRoleReasoning(
            profile,
            role,
            fitScore,
            'he'
          ),
          requiredDevelopment: developmentAreas,
          timeline: this.estimateRoleDevelopmentTimeline(developmentAreas),
        });
      }
    }

    return roleRecommendations
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 5); // Top 5 recommendations
  }

  /**
   * Track player development progress
   */
  public trackDevelopmentProgress(
    playerId: string,
    developmentPlan: DevelopmentPlan,
    currentMetrics: Record<PerformanceMetricType, PerformanceMetric>
  ): {
    overallProgress: number; // 0-1
    phaseProgress: Array<{
      phase: string;
      progress: number;
      status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
      milestoneCompletion: number;
    }>;
    insights: Array<{
      type: 'on_track' | 'ahead' | 'behind' | 'concern';
      message: string;
      hebrewMessage: string;
      recommendations: string[];
    }>;
    adjustments: Array<{
      phase: string;
      adjustment: string;
      hebrewAdjustment: string;
      reasoning: string;
    }>;
  } {
    const phaseProgress: Array<{
      phase: string;
      progress: number;
      status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
      milestoneCompletion: number;
    }> = [];

    let totalProgress = 0;

    for (const phase of developmentPlan.phases) {
      const phaseMetrics = phase.objectives.reduce((acc, obj) => {
        for (const [metric, target] of Object.entries(obj.targetMetrics)) {
          acc[metric as PerformanceMetricType] = target;
        }
        return acc;
      }, {} as Record<PerformanceMetricType, number>);

      const progress = this.calculatePhaseProgress(
        phaseMetrics,
        currentMetrics
      );
      const milestoneCompletion = this.calculateMilestoneCompletion(
        phase,
        currentMetrics
      );

      let status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
      if (progress === 0) status = 'not_started';
      else if (progress >= 1) status = 'completed';
      else if (progress > 0.8) status = 'in_progress';
      else status = 'delayed';

      phaseProgress.push({
        phase: phase.phase,
        progress,
        status,
        milestoneCompletion,
      });

      totalProgress += progress;
    }

    const overallProgress = totalProgress / developmentPlan.phases.length;

    const insights: Array<{
      type: 'on_track' | 'ahead' | 'behind' | 'concern';
      message: string;
      hebrewMessage: string;
      recommendations: string[];
    }> = [];

    // Generate insights based on progress
    if (overallProgress > 0.9) {
      insights.push({
        type: 'ahead',
        message: 'Player is exceeding development expectations',
        hebrewMessage: 'השחקן עולה על הציפיות בפיתוח',
        recommendations: [
          'Consider accelerating timeline',
          'Add advanced objectives',
        ],
      });
    } else if (overallProgress < 0.5) {
      insights.push({
        type: 'concern',
        message: 'Development progress is below expectations',
        hebrewMessage: 'התקדמות הפיתוח מתחת לציפיות',
        recommendations: [
          'Review training methods',
          'Adjust timeline',
          'Increase support',
        ],
      });
    }

    const adjustments: Array<{
      phase: string;
      adjustment: string;
      hebrewAdjustment: string;
      reasoning: string;
    }> = [];

    // Suggest adjustments for delayed phases
    for (const phase of phaseProgress) {
      if (phase.status === 'delayed') {
        adjustments.push({
          phase: phase.phase,
          adjustment: 'Extend phase duration and increase training intensity',
          hebrewAdjustment: 'הארכת משך השלב והגברת עצימות האימון',
          reasoning: `Phase progress (${(phase.progress * 100).toFixed(
            0
          )}%) indicates need for additional time and resources`,
        });
      }
    }

    return {
      overallProgress,
      phaseProgress,
      insights,
      adjustments,
    };
  }

  // Helper methods for initialization and calculations

  private initializeBenchmarks(): void {
    // Initialize position benchmarks
    this.positionBenchmarks.set(PositionType.GOALKEEPER, {
      [PerformanceMetricType.SAVES_MADE]: 4.5,
      [PerformanceMetricType.DISTRIBUTION_ACCURACY]: 0.75,
      [PerformanceMetricType.COMMAND_OF_AREA]: 0.8,
      [PerformanceMetricType.SHOT_STOPPING]: 0.72,
    } as any);

    this.positionBenchmarks.set(PositionType.DEFENDER, {
      [PerformanceMetricType.TACKLES_WON]: 3.2,
      [PerformanceMetricType.AERIAL_DUELS_WON]: 0.65,
      [PerformanceMetricType.INTERCEPTIONS]: 2.8,
      [PerformanceMetricType.PASS_ACCURACY]: 0.87,
      [PerformanceMetricType.CLEARANCES]: 4.5,
    } as any);

    this.positionBenchmarks.set(PositionType.MIDFIELDER, {
      [PerformanceMetricType.PASSES_COMPLETED]: 45,
      [PerformanceMetricType.PASS_ACCURACY]: 0.83,
      [PerformanceMetricType.KEY_PASSES]: 1.8,
      [PerformanceMetricType.DISTANCE_COVERED]: 11.2,
      [PerformanceMetricType.PRESSING_ACTIONS]: 12,
    } as any);

    this.positionBenchmarks.set(PositionType.FORWARD, {
      [PerformanceMetricType.SHOTS_ON_TARGET]: 2.3,
      [PerformanceMetricType.GOALS_SCORED]: 0.6,
      [PerformanceMetricType.ASSISTS]: 0.4,
      [PerformanceMetricType.EXPECTED_GOALS]: 0.7,
      [PerformanceMetricType.PENALTY_AREA_TOUCHES]: 8,
    } as any);
  }

  private initializePlayerDatabase(): void {
    // Sample player profiles for demonstration
    const samplePlayer: PlayerProfile = {
      playerId: 'player_001',
      name: 'David Cohen',
      hebrewName: 'דוד כהן',
      position: PositionType.MIDFIELDER,
      preferredRoles: [
        TacticalRole.CENTRAL_MIDFIELDER,
        TacticalRole.BOX_TO_BOX,
      ],
      age: 24,
      nationality: 'Israel',
      attributes: {
        physical: {
          height: 178,
          weight: 75,
          age: 24,
          preferredFoot: 'right',
          fitness: 85,
          speed: 78,
          strength: 72,
          stamina: 88,
        },
        technical: {
          passing: 82,
          shooting: 74,
          dribbling: 76,
          crossing: 68,
          finishing: 70,
          firstTouch: 81,
        },
        mental: {
          vision: 80,
          composure: 75,
          decisionMaking: 78,
          workRate: 85,
          aggression: 65,
          leadership: 72,
        },
        tactical: {
          positioning: 79,
          marking: 73,
          tackling: 75,
          interceptions: 77,
          pressing: 82,
          offTheBall: 76,
        },
      },
      strengths: ['stamina', 'work_rate', 'pressing', 'passing'],
      weaknesses: ['aerial_ability', 'shooting_power', 'pace'],
      playingStyle: [
        TacticalPhilosophy.POSSESSION_BASED,
        TacticalPhilosophy.HIGH_PRESSING,
      ],
      marketValue: 2500000,
    };

    this.playerDatabase.set('player_001', samplePlayer);
  }

  private getPerformanceData(
    playerId: string,
    timeframe: { startDate: Date; endDate: Date }
  ): PerformanceMetric[] {
    const playerData = this.performanceHistory.get(playerId) || [];
    return playerData.filter(
      metric =>
        metric.timestamp >= timeframe.startDate &&
        metric.timestamp <= timeframe.endDate
    );
  }

  private calculateMetricBreakdown(
    performanceData: PerformanceMetric[],
    contexts: PerformanceContext[]
  ): Record<PerformanceMetricType, PerformanceMetric> {
    const breakdown: Record<PerformanceMetricType, PerformanceMetric> =
      {} as any;

    // Group metrics by type and calculate averages
    const metricGroups = new Map<PerformanceMetricType, PerformanceMetric[]>();

    for (const metric of performanceData) {
      if (contexts.includes(metric.context)) {
        if (!metricGroups.has(metric.type)) {
          metricGroups.set(metric.type, []);
        }
        metricGroups.get(metric.type)!.push(metric);
      }
    }

    for (const [type, metrics] of metricGroups) {
      const avgValue =
        metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      const avgPercentile =
        metrics.reduce((sum, m) => sum + m.percentile, 0) / metrics.length;
      const avgConfidence =
        metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length;

      breakdown[type] = {
        type,
        value: avgValue,
        unit: metrics[0].unit,
        percentile: avgPercentile,
        trend: this.calculateTrend(metrics),
        confidence: avgConfidence,
        context: PerformanceContext.MATCH,
        timestamp: new Date(),
      };
    }

    return breakdown;
  }

  private calculateOverallRating(
    profile: PlayerProfile,
    metrics: Record<PerformanceMetricType, PerformanceMetric>
  ): {
    current: number;
    potential: number;
    trend: PerformanceTrend;
    confidence: number;
  } {
    // Calculate current rating based on metrics
    const metricValues = Object.values(metrics).map(m => m.percentile);
    const current =
      metricValues.length > 0
        ? metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length
        : 50;

    // Estimate potential based on age and development trajectory
    const ageFactor = Math.max(0, (30 - profile.age) / 10);
    const potential = Math.min(100, current + ageFactor * 15);

    // Calculate overall trend
    const trends = Object.values(metrics).map(m => m.trend);
    const improvingCount = trends.filter(
      t => t === PerformanceTrend.IMPROVING
    ).length;
    const decliningCount = trends.filter(
      t => t === PerformanceTrend.DECLINING
    ).length;

    let overallTrend: PerformanceTrend;
    if (improvingCount > decliningCount)
      overallTrend = PerformanceTrend.IMPROVING;
    else if (decliningCount > improvingCount)
      overallTrend = PerformanceTrend.DECLINING;
    else overallTrend = PerformanceTrend.STABLE;

    const confidence =
      metricValues.length > 0
        ? Object.values(metrics).reduce((sum, m) => sum + m.confidence, 0) /
          Object.values(metrics).length
        : 0.5;

    return {
      current,
      potential,
      trend: overallTrend,
      confidence,
    };
  }

  private async generatePerformanceInsights(
    profile: PlayerProfile,
    metrics: Record<PerformanceMetricType, PerformanceMetric>,
    options: PerformanceAnalysisOptions
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Identify strengths (top percentile metrics)
    for (const [type, metric] of Object.entries(metrics)) {
      if (metric.percentile > 85) {
        insights.push({
          id: `strength_${type}`,
          type: 'strength',
          title: `Exceptional ${type.replace(/_/g, ' ')}`,
          hebrewTitle: `${this.translateMetricToHebrew(
            type as PerformanceMetricType
          )} יוצא דופן`,
          description: `Player ranks in top 15% for ${type.replace(/_/g, ' ')}`,
          hebrewDescription: `השחקן מדורג ב-15% העליונים ב${this.translateMetricToHebrew(
            type as PerformanceMetricType
          )}`,
          severity: 'low',
          confidence: metric.confidence,
          evidence: {
            metrics: [type as PerformanceMetricType],
            values: [metric.value],
            comparisons: [
              {
                type: ComparisonType.POSITIONAL_PEERS,
                value: metric.value,
                percentile: metric.percentile,
              },
            ],
          },
          recommendations: [
            {
              action: `Continue developing ${type.replace(
                /_/g,
                ' '
              )} through specialized training`,
              hebrewAction: `המשך פיתוח ${this.translateMetricToHebrew(
                type as PerformanceMetricType
              )} באמצעות אימון מתמחה`,
              priority: 'medium',
              timeframe: 'medium_term',
              resources: ['specialized_coach', 'equipment', 'training_time'],
            },
          ],
          relatedConcepts: this.getRelatedConcepts(
            type as PerformanceMetricType
          ),
        });
      }
    }

    // Identify weaknesses (bottom percentile metrics)
    for (const [type, metric] of Object.entries(metrics)) {
      if (metric.percentile < 25) {
        insights.push({
          id: `weakness_${type}`,
          type: 'weakness',
          title: `${type.replace(/_/g, ' ')} needs improvement`,
          hebrewTitle: `${this.translateMetricToHebrew(
            type as PerformanceMetricType
          )} זקוק לשיפור`,
          description: `Player ranks in bottom 25% for ${type.replace(
            /_/g,
            ' '
          )}`,
          hebrewDescription: `השחקן מדורג ב-25% התחתונים ב${this.translateMetricToHebrew(
            type as PerformanceMetricType
          )}`,
          severity: metric.percentile < 10 ? 'critical' : 'high',
          confidence: metric.confidence,
          evidence: {
            metrics: [type as PerformanceMetricType],
            values: [metric.value],
            comparisons: [
              {
                type: ComparisonType.POSITIONAL_PEERS,
                value: metric.value,
                percentile: metric.percentile,
              },
            ],
          },
          recommendations: [
            {
              action: `Implement targeted training program for ${type.replace(
                /_/g,
                ' '
              )}`,
              hebrewAction: `יישום תוכנית אימון ממוקדת ל${this.translateMetricToHebrew(
                type as PerformanceMetricType
              )}`,
              priority: metric.percentile < 10 ? 'critical' : 'high',
              timeframe: 'short_term',
              resources: [
                'specialized_coach',
                'extra_training_sessions',
                'fitness_program',
              ],
            },
          ],
          relatedConcepts: this.getRelatedConcepts(
            type as PerformanceMetricType
          ),
        });
      }
    }

    return insights;
  }

  private async analyzeTacticalFit(
    profile: PlayerProfile,
    metrics: Record<PerformanceMetricType, PerformanceMetric>
  ): Promise<TacticalFitAnalysis[]> {
    const analyses: TacticalFitAnalysis[] = [];

    // Analyze fit for each of player's preferred roles
    for (const role of profile.preferredRoles) {
      const fitScore = this.calculateRoleFitScore(
        profile,
        metrics,
        role,
        FormationType.FOUR_THREE_THREE, // Default formation
        [TacticalPhilosophy.POSSESSION_BASED]
      );

      analyses.push({
        formation: FormationType.FOUR_THREE_THREE,
        role,
        fitScore,
        strengths: this.identifyRoleStrengths(profile, metrics, role),
        gaps: this.identifyRoleGaps(profile, metrics, role),
        alternativeRoles: this.suggestAlternativeRoles(profile, metrics, role),
      });
    }

    return analyses;
  }

  private performComparisons(
    profile: PlayerProfile,
    metrics: Record<PerformanceMetricType, PerformanceMetric>,
    comparisonTypes: ComparisonType[]
  ): Array<{
    type: ComparisonType;
    ranking: number;
    totalPlayers: number;
    percentile: number;
    keyDifferences: Array<{
      metric: PerformanceMetricType;
      difference: number;
      significance: 'minimal' | 'moderate' | 'significant' | 'major';
    }>;
  }> {
    const comparisons: Array<{
      type: ComparisonType;
      ranking: number;
      totalPlayers: number;
      percentile: number;
      keyDifferences: Array<{
        metric: PerformanceMetricType;
        difference: number;
        significance: 'minimal' | 'moderate' | 'significant' | 'major';
      }>;
    }> = [];

    for (const compType of comparisonTypes) {
      const benchmarks = this.getBenchmarks(compType, profile);
      const keyDifferences: Array<{
        metric: PerformanceMetricType;
        difference: number;
        significance: 'minimal' | 'moderate' | 'significant' | 'major';
      }> = [];

      for (const [metricType, metric] of Object.entries(metrics)) {
        const benchmark = benchmarks[metricType as PerformanceMetricType];
        if (benchmark) {
          const difference = metric.value - benchmark;
          const significance = this.calculateDifferenceSignificance(
            difference,
            metricType as PerformanceMetricType
          );

          keyDifferences.push({
            metric: metricType as PerformanceMetricType,
            difference,
            significance,
          });
        }
      }

      // Calculate overall percentile based on metrics
      const avgPercentile =
        Object.values(metrics).reduce((sum, m) => sum + m.percentile, 0) /
        Object.values(metrics).length;

      comparisons.push({
        type: compType,
        ranking: Math.ceil(((100 - avgPercentile) / 100) * 100), // Rough ranking estimate
        totalPlayers: 100, // Simplified for demo
        percentile: avgPercentile,
        keyDifferences: keyDifferences
          .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
          .slice(0, 5),
      });
    }

    return comparisons;
  }

  private async generateDevelopmentPlan(
    profile: PlayerProfile,
    insights: PerformanceInsight[],
    tacticalFit: TacticalFitAnalysis[]
  ): Promise<DevelopmentPlan> {
    const weaknesses = insights.filter(i => i.type === 'weakness');
    const gaps = tacticalFit.flatMap(tf => tf.gaps);

    const phases: DevelopmentPlan['phases'] = [
      {
        phase: 'Foundation Building',
        hebrewPhase: 'בניית יסודות',
        duration: 8,
        objectives: [
          {
            objective: 'Address critical weaknesses',
            hebrewObjective: 'טיפול בחולשות קריטיות',
            targetMetrics: this.generateTargetMetrics(weaknesses),
            methods: [
              'individual_training',
              'technical_drills',
              'video_analysis',
            ],
            hebrewMethods: ['אימון אישי', 'תרגילים טכניים', 'ניתוח וידאו'],
          },
        ],
        milestones: [
          {
            week: 4,
            description: 'Initial improvement in weakest areas',
            hebrewDescription: 'שיפור ראשוני באזורים החלשים ביותר',
            assessmentCriteria: ['metric_improvement', 'coach_evaluation'],
          },
        ],
      },
    ];

    return {
      playerId: profile.playerId,
      currentLevel: this.assessCurrentLevel(profile),
      targetLevel: this.assessTargetLevel(profile),
      timeframe: 12,
      phases,
      riskFactors: [
        {
          factor: 'Injury Risk',
          hebrewFactor: 'סיכון פציעה',
          probability: 0.2,
          impact: 'high',
          mitigation: [
            'proper_warmup',
            'load_management',
            'recovery_protocols',
          ],
        },
      ],
      successIndicators: this.generateSuccessIndicators(insights),
    };
  }

  // Additional helper methods...

  private calculateTrend(metrics: PerformanceMetric[]): PerformanceTrend {
    if (metrics.length < 2) return PerformanceTrend.STABLE;

    const recent = metrics.slice(-3).map(m => m.value);
    const older = metrics.slice(0, 3).map(m => m.value);

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return PerformanceTrend.IMPROVING;
    if (change < -0.1) return PerformanceTrend.DECLINING;
    return PerformanceTrend.STABLE;
  }

  private translateMetricToHebrew(metric: PerformanceMetricType): string {
    const translations: Record<PerformanceMetricType, string> = {
      [PerformanceMetricType.DISTANCE_COVERED]: 'מרחק כיסוי',
      [PerformanceMetricType.SPRINT_COUNT]: 'ספירת ריצות',
      [PerformanceMetricType.PASSES_COMPLETED]: 'מסירות הושלמו',
      [PerformanceMetricType.PASS_ACCURACY]: 'דיוק מסירות',
      [PerformanceMetricType.GOALS_SCORED]: 'שערים הובקעו',
      [PerformanceMetricType.ASSISTS]: 'בישולים',
      [PerformanceMetricType.TACKLES_WON]: 'התמודדויות נוצחו',
      [PerformanceMetricType.AERIAL_DUELS_WON]: 'דו קרבים אוויריים נוצחו',
    } as any;

    return translations[metric] || metric.replace(/_/g, ' ');
  }

  private getRelatedConcepts(metric: PerformanceMetricType): string[] {
    const conceptMap: Record<PerformanceMetricType, string[]> = {
      [PerformanceMetricType.PASSES_COMPLETED]: [
        'passing',
        'ball_control',
        'vision',
      ],
      [PerformanceMetricType.TACKLES_WON]: [
        'defending',
        'positioning',
        'timing',
      ],
      [PerformanceMetricType.GOALS_SCORED]: [
        'finishing',
        'positioning',
        'composure',
      ],
    } as any;

    return conceptMap[metric] || [];
  }

  private calculateRoleFitScore(
    profile: PlayerProfile,
    metrics: Record<PerformanceMetricType, PerformanceMetric>,
    role: TacticalRole,
    formation: FormationType,
    philosophy: TacticalPhilosophy[]
  ): number {
    // Base compatibility from FootballEntity
    const baseCompatibility = FootballEntity.getRoleCompatibility(
      profile.position,
      role,
      profile.attributes
    );

    // Adjust based on current performance metrics
    const relevantMetrics = this.getRelevantMetricsForRole(role);
    let performanceBonus = 0;

    for (const metric of relevantMetrics) {
      if (metrics[metric]) {
        performanceBonus += ((metrics[metric].percentile - 50) / 100) * 0.1;
      }
    }

    return Math.min(
      1,
      Math.max(0, baseCompatibility.overall + performanceBonus)
    );
  }

  private getRelevantMetricsForRole(
    role: TacticalRole
  ): PerformanceMetricType[] {
    const roleMetrics: Record<TacticalRole, PerformanceMetricType[]> = {
      [TacticalRole.CENTRAL_MIDFIELDER]: [
        PerformanceMetricType.PASSES_COMPLETED,
        PerformanceMetricType.PASS_ACCURACY,
        PerformanceMetricType.DISTANCE_COVERED,
        PerformanceMetricType.INTERCEPTIONS,
      ],
      [TacticalRole.STRIKER]: [
        PerformanceMetricType.GOALS_SCORED,
        PerformanceMetricType.SHOTS_ON_TARGET,
        PerformanceMetricType.PENALTY_AREA_TOUCHES,
      ],
    } as any;

    return roleMetrics[role] || [];
  }

  private identifyDevelopmentAreas(
    profile: PlayerProfile,
    metrics: Record<PerformanceMetricType, PerformanceMetric>,
    role: TacticalRole,
    philosophy: TacticalPhilosophy[]
  ): Array<{
    area: PerformanceMetricType;
    currentLevel: number;
    targetLevel: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const relevantMetrics = this.getRelevantMetricsForRole(role);
    const developmentAreas: Array<{
      area: PerformanceMetricType;
      currentLevel: number;
      targetLevel: number;
      priority: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    for (const metric of relevantMetrics) {
      if (metrics[metric] && metrics[metric].percentile < 70) {
        const gap = 70 - metrics[metric].percentile;
        let priority: 'low' | 'medium' | 'high' | 'critical';

        if (gap > 40) priority = 'critical';
        else if (gap > 25) priority = 'high';
        else if (gap > 15) priority = 'medium';
        else priority = 'low';

        developmentAreas.push({
          area: metric,
          currentLevel: metrics[metric].percentile,
          targetLevel: 70,
          priority,
        });
      }
    }

    return developmentAreas.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private generateRoleReasoning(
    profile: PlayerProfile,
    role: TacticalRole,
    fitScore: number,
    language: 'he' | 'en'
  ): string {
    const compatibility = FootballEntity.getRoleCompatibility(
      profile.position,
      role,
      profile.attributes
    );

    if (language === 'he') {
      return `התאמה של ${(fitScore * 100).toFixed(
        0
      )}% לתפקיד ${role} בהתבסס על ${compatibility.strengths.join(', ')}`;
    } else {
      return `${(fitScore * 100).toFixed(
        0
      )}% fit for ${role} role based on ${compatibility.strengths.join(', ')}`;
    }
  }

  private estimateRoleDevelopmentTimeline(
    developmentAreas: Array<{
      area: PerformanceMetricType;
      currentLevel: number;
      targetLevel: number;
      priority: 'low' | 'medium' | 'high' | 'critical';
    }>
  ): string {
    const criticalAreas = developmentAreas.filter(
      area => area.priority === 'critical'
    ).length;
    const highAreas = developmentAreas.filter(
      area => area.priority === 'high'
    ).length;

    if (criticalAreas > 2) return '12-18 months';
    if (criticalAreas > 0 || highAreas > 3) return '6-12 months';
    if (highAreas > 0) return '3-6 months';
    return '1-3 months';
  }

  private calculatePhaseProgress(
    phaseMetrics: Record<PerformanceMetricType, number>,
    currentMetrics: Record<PerformanceMetricType, PerformanceMetric>
  ): number {
    let totalProgress = 0;
    let metricCount = 0;

    for (const [metric, target] of Object.entries(phaseMetrics)) {
      const current = currentMetrics[metric as PerformanceMetricType];
      if (current) {
        const progress = Math.min(1, current.value / target);
        totalProgress += progress;
        metricCount++;
      }
    }

    return metricCount > 0 ? totalProgress / metricCount : 0;
  }

  private calculateMilestoneCompletion(
    phase: DevelopmentPlan['phases'][0],
    currentMetrics: Record<PerformanceMetricType, PerformanceMetric>
  ): number {
    // Simplified milestone completion calculation
    return Math.random() * 0.8 + 0.1; // Demo implementation
  }

  private performMarketAnalysis(
    profile: PlayerProfile,
    overallRating: {
      current: number;
      potential: number;
      trend: PerformanceTrend;
    },
    insights: PerformanceInsight[]
  ): {
    estimatedValue: number;
    valueChange: number;
    transferProbability: number;
    interestedClubs: string[];
  } {
    const baseValue = profile.marketValue || 1000000;
    const ratingMultiplier = overallRating.current / 50;
    const trendMultiplier =
      overallRating.trend === PerformanceTrend.IMPROVING
        ? 1.2
        : overallRating.trend === PerformanceTrend.DECLINING
        ? 0.8
        : 1.0;

    const estimatedValue = baseValue * ratingMultiplier * trendMultiplier;
    const valueChange = estimatedValue - baseValue;

    return {
      estimatedValue,
      valueChange,
      transferProbability: Math.min(0.8, overallRating.current / 100),
      interestedClubs: ['Team A', 'Team B', 'Team C'], // Demo data
    };
  }

  private generateHebrewSummary(
    profile: PlayerProfile,
    insights: PerformanceInsight[],
    rating: { current: number; potential: number; trend: PerformanceTrend }
  ): string {
    const strengths = insights.filter(i => i.type === 'strength').length;
    const weaknesses = insights.filter(i => i.type === 'weakness').length;

    return (
      `${profile.hebrewName} הוא שחקן בן ${profile.age} המשחק בעמדת ${profile.position}. ` +
      `הדירוג הנוכחי שלו הוא ${rating.current.toFixed(
        0
      )} עם פוטנציאל של ${rating.potential.toFixed(0)}. ` +
      `זוהו ${strengths} נקודות חוזק ו-${weaknesses} תחומים לשיפור. ` +
      `המגמה הכללית היא ${
        rating.trend === PerformanceTrend.IMPROVING
          ? 'שיפור'
          : rating.trend === PerformanceTrend.DECLINING
          ? 'ירידה'
          : 'יציבות'
      }.`
    );
  }

  private generateEnglishSummary(
    profile: PlayerProfile,
    insights: PerformanceInsight[],
    rating: { current: number; potential: number; trend: PerformanceTrend }
  ): string {
    const strengths = insights.filter(i => i.type === 'strength').length;
    const weaknesses = insights.filter(i => i.type === 'weakness').length;

    return (
      `${profile.name} is a ${profile.age}-year-old ${profile.position}. ` +
      `Current rating: ${rating.current.toFixed(
        0
      )}, potential: ${rating.potential.toFixed(0)}. ` +
      `Analysis identified ${strengths} strengths and ${weaknesses} areas for improvement. ` +
      `Overall trend: ${rating.trend}.`
    );
  }

  private generateRecommendations(
    insights: PerformanceInsight[],
    tacticalFit: TacticalFitAnalysis[]
  ): Array<{
    category: 'technical' | 'tactical' | 'physical' | 'mental';
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    hebrewAction: string;
    timeline: string;
  }> {
    const recommendations: Array<{
      category: 'technical' | 'tactical' | 'physical' | 'mental';
      priority: 'low' | 'medium' | 'high' | 'critical';
      action: string;
      hebrewAction: string;
      timeline: string;
    }> = [];

    // Extract recommendations from insights
    for (const insight of insights) {
      if (insight.type === 'weakness' && insight.recommendations.length > 0) {
        const rec = insight.recommendations[0];
        recommendations.push({
          category: this.categorizeRecommendation(insight.evidence.metrics[0]),
          priority: rec.priority,
          action: rec.action,
          hebrewAction: rec.hebrewAction,
          timeline: rec.timeframe,
        });
      }
    }

    return recommendations.slice(0, 10); // Top 10 recommendations
  }

  private categorizeRecommendation(
    metric: PerformanceMetricType
  ): 'technical' | 'tactical' | 'physical' | 'mental' {
    const technicalMetrics = [
      PerformanceMetricType.PASSES_COMPLETED,
      PerformanceMetricType.DRIBBLES_SUCCESSFUL,
    ];
    const tacticalMetrics = [
      PerformanceMetricType.POSITIONAL_DISCIPLINE,
      PerformanceMetricType.PRESSING_ACTIONS,
    ];
    const physicalMetrics = [
      PerformanceMetricType.DISTANCE_COVERED,
      PerformanceMetricType.SPRINT_COUNT,
    ];

    if (technicalMetrics.includes(metric)) return 'technical';
    if (tacticalMetrics.includes(metric)) return 'tactical';
    if (physicalMetrics.includes(metric)) return 'physical';
    return 'mental';
  }

  // Additional helper methods for completeness...

  private identifyRoleStrengths(
    profile: PlayerProfile,
    metrics: Record<PerformanceMetricType, PerformanceMetric>,
    role: TacticalRole
  ): Array<{
    attribute: string;
    relevance: number;
    description: string;
    hebrewDescription: string;
  }> {
    // Implementation for identifying role-specific strengths
    return [];
  }

  private identifyRoleGaps(
    profile: PlayerProfile,
    metrics: Record<PerformanceMetricType, PerformanceMetric>,
    role: TacticalRole
  ): Array<{
    attribute: string;
    severity: number;
    description: string;
    hebrewDescription: string;
    developmentPlan: string[];
  }> {
    // Implementation for identifying role-specific gaps
    return [];
  }

  private suggestAlternativeRoles(
    profile: PlayerProfile,
    metrics: Record<PerformanceMetricType, PerformanceMetric>,
    currentRole: TacticalRole
  ): Array<{
    role: TacticalRole;
    fitScore: number;
    reasoning: string;
    hebrewReasoning: string;
  }> {
    // Implementation for suggesting alternative roles
    return [];
  }

  private getBenchmarks(
    comparisonType: ComparisonType,
    profile: PlayerProfile
  ): Record<PerformanceMetricType, number> {
    switch (comparisonType) {
      case ComparisonType.POSITIONAL_PEERS:
        return this.positionBenchmarks.get(profile.position) || ({} as any);
      case ComparisonType.TEAM_AVERAGE:
        return {} as any; // Would get from team database
      default:
        return {} as any;
    }
  }

  private calculateSignificance(
    gap: number,
    metric: PerformanceMetricType
  ): string {
    // Simple significance calculation
    if (gap > 2) return 'major';
    if (gap > 1) return 'significant';
    if (gap > 0.5) return 'moderate';
    return 'minimal';
  }

  private generateMetricHebrewAnalysis(
    metric: PerformanceMetricType,
    leader: { playerId: string; value: number },
    gap: number
  ): string {
    return `${leader.playerId} מוביל ב${this.translateMetricToHebrew(
      metric
    )} עם יתרון של ${gap.toFixed(1)}`;
  }

  private calculateDifferenceSignificance(
    difference: number,
    metric: PerformanceMetricType
  ): 'minimal' | 'moderate' | 'significant' | 'major' {
    const absDiff = Math.abs(difference);
    if (absDiff > 10) return 'major';
    if (absDiff > 5) return 'significant';
    if (absDiff > 2) return 'moderate';
    return 'minimal';
  }

  private assessCurrentLevel(
    profile: PlayerProfile
  ): 'youth' | 'amateur' | 'semi_professional' | 'professional' | 'elite' {
    if (profile.marketValue && profile.marketValue > 10000000) return 'elite';
    if (profile.marketValue && profile.marketValue > 1000000)
      return 'professional';
    return 'semi_professional';
  }

  private assessTargetLevel(
    profile: PlayerProfile
  ): 'youth' | 'amateur' | 'semi_professional' | 'professional' | 'elite' {
    const current = this.assessCurrentLevel(profile);
    const levels = [
      'youth',
      'amateur',
      'semi_professional',
      'professional',
      'elite',
    ];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(levels.length - 1, currentIndex + 1)] as any;
  }

  private generateTargetMetrics(
    insights: PerformanceInsight[]
  ): Record<PerformanceMetricType, number> {
    const targets: Record<PerformanceMetricType, number> = {} as any;

    for (const insight of insights) {
      if (insight.type === 'weakness') {
        for (const metric of insight.evidence.metrics) {
          targets[metric] = insight.evidence.values[0] * 1.2; // 20% improvement target
        }
      }
    }

    return targets;
  }

  private generateSuccessIndicators(
    insights: PerformanceInsight[]
  ): Record<PerformanceMetricType, number> {
    const indicators: Record<PerformanceMetricType, number> = {} as any;

    for (const insight of insights) {
      for (const metric of insight.evidence.metrics) {
        indicators[metric] = insight.evidence.values[0] * 1.5; // 50% improvement as success
      }
    }

    return indicators;
  }
}
