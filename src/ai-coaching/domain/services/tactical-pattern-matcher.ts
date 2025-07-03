/**
 * Tactical Pattern Matcher Service
 * Identifies and analyzes tactical patterns and behaviors in football matches
 */

import {
  TacticalInsight,
  InsightType,
  InsightPriority,
  InsightConfidence,
} from '../entities/tactical-insight';
import {
  AnalysisScope,
  AnalysisType,
  MetricCategory,
} from '../value-objects/analysis-scope';
import { HebrewMorphology } from '../value-objects/hebrew-morphology';
import {
  FormationAnalyzer,
  FormationType,
  FieldZone,
  PlayerPosition,
} from './formation-analyzer';

export enum TacticalPattern {
  TIKI_TAKA = 'tiki_taka',
  GEGENPRESSING = 'gegenpressing',
  PARKING_BUS = 'parking_bus',
  WING_PLAY = 'wing_play',
  ROUTE_ONE = 'route_one',
  POSSESSION_GAME = 'possession_game',
  COUNTER_ATTACK = 'counter_attack',
  HIGH_PRESS = 'high_press',
  LOW_BLOCK = 'low_block',
  OVERLOAD_TO_ISOLATE = 'overload_to_isolate',
  TRIANGULATION = 'triangulation',
  THIRD_MAN_RUNS = 'third_man_runs',
  OVERLAPPING_RUNS = 'overlapping_runs',
  CUTBACK_ATTACKS = 'cutback_attacks',
  SET_PIECE_ROUTINE = 'set_piece_routine',
}

export enum PatternPhase {
  BUILD_UP = 'build_up',
  PROGRESSION = 'progression',
  FINAL_THIRD = 'final_third',
  DEFENSIVE_TRANSITION = 'defensive_transition',
  ATTACKING_TRANSITION = 'attacking_transition',
  SET_PIECE = 'set_piece',
  RESTART = 'restart',
}

export enum PatternTrigger {
  BALL_RECOVERY = 'ball_recovery',
  BALL_LOSS = 'ball_loss',
  WIDE_PROGRESSION = 'wide_progression',
  CENTRAL_PENETRATION = 'central_penetration',
  GOALKEEPER_DISTRIBUTION = 'goalkeeper_distribution',
  THROW_IN = 'throw_in',
  CORNER_KICK = 'corner_kick',
  FREE_KICK = 'free_kick',
  GOAL_KICK = 'goal_kick',
  SUBSTITUTION = 'substitution',
}

export interface PatternSequence {
  step: number;
  playerId: string;
  action: string;
  position: { x: number; y: number };
  timing: number; // relative to pattern start
  success: boolean;
  alternatives?: string[];
}

export interface PatternDefinition {
  pattern: TacticalPattern;
  name: string;
  hebrewName: string;
  description: string;
  hebrewDescription: string;
  minPlayers: number;
  typicalDuration: number; // seconds
  successCriteria: string[];
  failureCauses: string[];
  requiredFormations: FormationType[];
  preferredZones: FieldZone[];
  triggers: PatternTrigger[];
  sequences: PatternSequence[];
  variations: string[];
  counters: string[];
  effectiveness: {
    formation: Record<FormationType, number>;
    opposition: Record<TacticalPattern, number>;
    phase: Record<PatternPhase, number>;
  };
}

export interface PatternMatch {
  pattern: TacticalPattern;
  confidence: number;
  completeness: number; // 0-1, how much of pattern was executed
  startTime: number;
  endTime: number;
  participants: string[];
  keyEvents: Array<{
    playerId: string;
    action: string;
    timestamp: number;
    success: boolean;
  }>;
  outcome: 'successful' | 'failed' | 'interrupted';
  zone: FieldZone;
  variations?: string[];
  nextPossiblePatterns?: TacticalPattern[];
}

export interface PatternAnalysisResult {
  detectedPatterns: PatternMatch[];
  frequencyAnalysis: Record<TacticalPattern, number>;
  effectivenessAnalysis: Record<TacticalPattern, number>;
  zoneAnalysis: Record<FieldZone, TacticalPattern[]>;
  phaseAnalysis: Record<PatternPhase, TacticalPattern[]>;
  playerRoles: Record<
    string,
    {
      patterns: TacticalPattern[];
      frequency: number;
      effectiveness: number;
      preferredZones: FieldZone[];
    }
  >;
  recommendations: TacticalInsight[];
  hebrewSummary: string;
  patternChains: Array<{
    sequence: TacticalPattern[];
    frequency: number;
    effectiveness: number;
  }>;
  adaptabilityScore: number;
  predictabilityScore: number;
  complexityScore: number;
  analysisTimestamp: Date;
}

export class TacticalPatternMatcher {
  private readonly patternDefinitions = new Map<
    TacticalPattern,
    PatternDefinition
  >();
  private readonly hebrewPatternNames = new Map<TacticalPattern, string>();
  private readonly patternCounters = new Map<
    TacticalPattern,
    TacticalPattern[]
  >();
  private readonly formationAnalyzer: FormationAnalyzer;

  constructor(formationAnalyzer: FormationAnalyzer) {
    this.formationAnalyzer = formationAnalyzer;
    this.initializePatternDefinitions();
    this.initializeHebrewNames();
    this.initializePatternCounters();
  }

  private initializePatternDefinitions(): void {
    // Tiki-Taka Pattern
    this.patternDefinitions.set(TacticalPattern.TIKI_TAKA, {
      pattern: TacticalPattern.TIKI_TAKA,
      name: 'Tiki-Taka',
      hebrewName: 'טיקי-טאקה',
      description:
        'Short passing, possession-based style with high technical skill',
      hebrewDescription: 'סגנון משחק קצר ומבוסס החזקה עם מיומנות טכנית גבוהה',
      minPlayers: 6,
      typicalDuration: 45,
      successCriteria: [
        'high_pass_completion',
        'territorial_control',
        'opponent_pressing',
      ],
      failureCauses: ['rushed_passes', 'pressure_application', 'loss_of_shape'],
      requiredFormations: [
        FormationType.FOUR_THREE_THREE,
        FormationType.FOUR_TWO_THREE_ONE,
      ],
      preferredZones: [FieldZone.MIDDLE_THIRD, FieldZone.CENTRAL_CHANNEL],
      triggers: [
        PatternTrigger.BALL_RECOVERY,
        PatternTrigger.GOALKEEPER_DISTRIBUTION,
      ],
      sequences: [
        {
          step: 1,
          playerId: 'cb1',
          action: 'short_pass',
          position: { x: 40, y: 20 },
          timing: 0,
          success: true,
        },
        {
          step: 2,
          playerId: 'cm1',
          action: 'receive_turn',
          position: { x: 45, y: 35 },
          timing: 2,
          success: true,
        },
        {
          step: 3,
          playerId: 'cm1',
          action: 'short_pass',
          position: { x: 45, y: 35 },
          timing: 4,
          success: true,
        },
        {
          step: 4,
          playerId: 'cm2',
          action: 'first_touch_pass',
          position: { x: 55, y: 40 },
          timing: 6,
          success: true,
        },
      ],
      variations: [
        'wide_tiki_taka',
        'central_tiki_taka',
        'defensive_tiki_taka',
      ],
      counters: ['high_press', 'compact_defense', 'long_ball_bypass'],
      effectiveness: {
        formation: {
          [FormationType.FOUR_THREE_THREE]: 0.9,
          [FormationType.FOUR_TWO_THREE_ONE]: 0.85,
          [FormationType.FOUR_FOUR_TWO]: 0.7,
          [FormationType.THREE_FIVE_TWO]: 0.75,
          [FormationType.FIVE_THREE_TWO]: 0.6,
          [FormationType.FOUR_FIVE_ONE]: 0.65,
          [FormationType.THREE_FOUR_THREE]: 0.8,
          [FormationType.FOUR_ONE_FOUR_ONE]: 0.75,
          [FormationType.CUSTOM]: 0.5,
        },
        opposition: {
          [TacticalPattern.HIGH_PRESS]: 0.4,
          [TacticalPattern.LOW_BLOCK]: 0.7,
          [TacticalPattern.COUNTER_ATTACK]: 0.6,
          [TacticalPattern.WING_PLAY]: 0.8,
          [TacticalPattern.ROUTE_ONE]: 0.9,
          [TacticalPattern.GEGENPRESSING]: 0.3,
          [TacticalPattern.PARKING_BUS]: 0.5,
          [TacticalPattern.POSSESSION_GAME]: 0.7,
          [TacticalPattern.TIKI_TAKA]: 0.6,
          [TacticalPattern.OVERLOAD_TO_ISOLATE]: 0.75,
          [TacticalPattern.TRIANGULATION]: 0.8,
          [TacticalPattern.THIRD_MAN_RUNS]: 0.8,
          [TacticalPattern.OVERLAPPING_RUNS]: 0.7,
          [TacticalPattern.CUTBACK_ATTACKS]: 0.7,
          [TacticalPattern.SET_PIECE_ROUTINE]: 0.6,
        },
        phase: {
          [PatternPhase.BUILD_UP]: 0.9,
          [PatternPhase.PROGRESSION]: 0.85,
          [PatternPhase.FINAL_THIRD]: 0.7,
          [PatternPhase.DEFENSIVE_TRANSITION]: 0.4,
          [PatternPhase.ATTACKING_TRANSITION]: 0.6,
          [PatternPhase.SET_PIECE]: 0.3,
          [PatternPhase.RESTART]: 0.7,
        },
      },
    });

    // Gegenpressing Pattern
    this.patternDefinitions.set(TacticalPattern.GEGENPRESSING, {
      pattern: TacticalPattern.GEGENPRESSING,
      name: 'Gegenpressing',
      hebrewName: 'לחיצה נגדית',
      description:
        'Immediate pressing after losing possession to win ball back quickly',
      hebrewDescription:
        'לחיצה מיידית לאחר איבוד החזקה כדי לזכות בכדור חזרה במהירות',
      minPlayers: 3,
      typicalDuration: 8,
      successCriteria: [
        'immediate_press',
        'ball_recovery',
        'numerical_advantage',
      ],
      failureCauses: [
        'delayed_reaction',
        'poor_coordination',
        'fitness_levels',
      ],
      requiredFormations: [
        FormationType.FOUR_THREE_THREE,
        FormationType.FOUR_TWO_THREE_ONE,
        FormationType.FOUR_ONE_FOUR_ONE,
      ],
      preferredZones: [FieldZone.ATTACKING_THIRD, FieldZone.MIDDLE_THIRD],
      triggers: [PatternTrigger.BALL_LOSS],
      sequences: [
        {
          step: 1,
          playerId: 'closest',
          action: 'immediate_press',
          position: { x: 0, y: 0 },
          timing: 0,
          success: true,
        },
        {
          step: 2,
          playerId: 'support1',
          action: 'cover_passing_lane',
          position: { x: 0, y: 0 },
          timing: 1,
          success: true,
        },
        {
          step: 3,
          playerId: 'support2',
          action: 'press_trigger',
          position: { x: 0, y: 0 },
          timing: 1.5,
          success: true,
        },
        {
          step: 4,
          playerId: 'closest',
          action: 'win_ball',
          position: { x: 0, y: 0 },
          timing: 3,
          success: true,
        },
      ],
      variations: [
        'high_gegenpressing',
        'midfield_gegenpressing',
        'coordinated_gegenpressing',
      ],
      counters: ['quick_passing', 'long_clearances', 'individual_skill'],
      effectiveness: {
        formation: {
          [FormationType.FOUR_THREE_THREE]: 0.9,
          [FormationType.FOUR_TWO_THREE_ONE]: 0.85,
          [FormationType.FOUR_ONE_FOUR_ONE]: 0.8,
          [FormationType.FOUR_FOUR_TWO]: 0.7,
          [FormationType.THREE_FIVE_TWO]: 0.75,
          [FormationType.FIVE_THREE_TWO]: 0.6,
          [FormationType.FOUR_FIVE_ONE]: 0.65,
          [FormationType.THREE_FOUR_THREE]: 0.85,
          [FormationType.CUSTOM]: 0.5,
        },
        opposition: {
          [TacticalPattern.TIKI_TAKA]: 0.9,
          [TacticalPattern.POSSESSION_GAME]: 0.85,
          [TacticalPattern.ROUTE_ONE]: 0.3,
          [TacticalPattern.WING_PLAY]: 0.7,
          [TacticalPattern.COUNTER_ATTACK]: 0.6,
          [TacticalPattern.HIGH_PRESS]: 0.4,
          [TacticalPattern.LOW_BLOCK]: 0.2,
          [TacticalPattern.GEGENPRESSING]: 0.5,
          [TacticalPattern.PARKING_BUS]: 0.1,
          [TacticalPattern.OVERLOAD_TO_ISOLATE]: 0.8,
          [TacticalPattern.TRIANGULATION]: 0.8,
          [TacticalPattern.THIRD_MAN_RUNS]: 0.7,
          [TacticalPattern.OVERLAPPING_RUNS]: 0.6,
          [TacticalPattern.CUTBACK_ATTACKS]: 0.7,
          [TacticalPattern.SET_PIECE_ROUTINE]: 0.1,
        },
        phase: {
          [PatternPhase.BUILD_UP]: 0.3,
          [PatternPhase.PROGRESSION]: 0.8,
          [PatternPhase.FINAL_THIRD]: 0.9,
          [PatternPhase.DEFENSIVE_TRANSITION]: 0.95,
          [PatternPhase.ATTACKING_TRANSITION]: 0.7,
          [PatternPhase.SET_PIECE]: 0.1,
          [PatternPhase.RESTART]: 0.4,
        },
      },
    });

    // Wing Play Pattern
    this.patternDefinitions.set(TacticalPattern.WING_PLAY, {
      pattern: TacticalPattern.WING_PLAY,
      name: 'Wing Play',
      hebrewName: 'משחק באגפים',
      description: 'Attacking pattern focused on wide areas and crosses',
      hebrewDescription: 'דפוס התקפי המתמקד באזורים רחבים והעברות',
      minPlayers: 4,
      typicalDuration: 20,
      successCriteria: ['wide_progression', 'quality_crosses', 'box_presence'],
      failureCauses: ['poor_crossing', 'lack_of_support', 'defensive_cover'],
      requiredFormations: [
        FormationType.FOUR_FOUR_TWO,
        FormationType.FOUR_THREE_THREE,
        FormationType.THREE_FIVE_TWO,
      ],
      preferredZones: [
        FieldZone.LEFT_FLANK,
        FieldZone.RIGHT_FLANK,
        FieldZone.WIDE_AREAS,
      ],
      triggers: [PatternTrigger.WIDE_PROGRESSION, PatternTrigger.THROW_IN],
      sequences: [
        {
          step: 1,
          playerId: 'fullback',
          action: 'receive_wide',
          position: { x: 85, y: 40 },
          timing: 0,
          success: true,
        },
        {
          step: 2,
          playerId: 'winger',
          action: 'make_run',
          position: { x: 90, y: 60 },
          timing: 2,
          success: true,
        },
        {
          step: 3,
          playerId: 'fullback',
          action: 'pass_to_winger',
          position: { x: 85, y: 40 },
          timing: 4,
          success: true,
        },
        {
          step: 4,
          playerId: 'winger',
          action: 'cross',
          position: { x: 90, y: 70 },
          timing: 8,
          success: true,
        },
      ],
      variations: [
        'overlapping_wing_play',
        'inverted_wing_play',
        'quick_switches',
      ],
      counters: ['compact_defense', 'double_team_wingers', 'central_focus'],
      effectiveness: {
        formation: {
          [FormationType.FOUR_FOUR_TWO]: 0.9,
          [FormationType.THREE_FIVE_TWO]: 0.85,
          [FormationType.FOUR_THREE_THREE]: 0.8,
          [FormationType.FIVE_THREE_TWO]: 0.75,
          [FormationType.FOUR_TWO_THREE_ONE]: 0.7,
          [FormationType.FOUR_FIVE_ONE]: 0.65,
          [FormationType.THREE_FOUR_THREE]: 0.8,
          [FormationType.FOUR_ONE_FOUR_ONE]: 0.6,
          [FormationType.CUSTOM]: 0.5,
        },
        opposition: {
          [TacticalPattern.TIKI_TAKA]: 0.6,
          [TacticalPattern.POSSESSION_GAME]: 0.7,
          [TacticalPattern.ROUTE_ONE]: 0.5,
          [TacticalPattern.COUNTER_ATTACK]: 0.7,
          [TacticalPattern.HIGH_PRESS]: 0.6,
          [TacticalPattern.LOW_BLOCK]: 0.8,
          [TacticalPattern.GEGENPRESSING]: 0.5,
          [TacticalPattern.PARKING_BUS]: 0.4,
          [TacticalPattern.WING_PLAY]: 0.5,
          [TacticalPattern.OVERLOAD_TO_ISOLATE]: 0.6,
          [TacticalPattern.TRIANGULATION]: 0.7,
          [TacticalPattern.THIRD_MAN_RUNS]: 0.6,
          [TacticalPattern.OVERLAPPING_RUNS]: 0.8,
          [TacticalPattern.CUTBACK_ATTACKS]: 0.9,
          [TacticalPattern.SET_PIECE_ROUTINE]: 0.5,
        },
        phase: {
          [PatternPhase.BUILD_UP]: 0.6,
          [PatternPhase.PROGRESSION]: 0.9,
          [PatternPhase.FINAL_THIRD]: 0.95,
          [PatternPhase.DEFENSIVE_TRANSITION]: 0.2,
          [PatternPhase.ATTACKING_TRANSITION]: 0.8,
          [PatternPhase.SET_PIECE]: 0.3,
          [PatternPhase.RESTART]: 0.7,
        },
      },
    });

    // Counter Attack Pattern
    this.patternDefinitions.set(TacticalPattern.COUNTER_ATTACK, {
      pattern: TacticalPattern.COUNTER_ATTACK,
      name: 'Counter Attack',
      hebrewName: 'התקפת נגד',
      description: 'Quick transition from defense to attack exploiting space',
      hebrewDescription: 'מעבר מהיר מהגנה להתקפה תוך ניצול מרחב',
      minPlayers: 3,
      typicalDuration: 12,
      successCriteria: [
        'quick_transition',
        'space_exploitation',
        'clinical_finishing',
      ],
      failureCauses: ['slow_execution', 'poor_first_pass', 'lack_of_runners'],
      requiredFormations: [
        FormationType.FOUR_FIVE_ONE,
        FormationType.FIVE_THREE_TWO,
        FormationType.FOUR_FOUR_TWO,
      ],
      preferredZones: [FieldZone.MIDDLE_THIRD, FieldZone.ATTACKING_THIRD],
      triggers: [PatternTrigger.BALL_RECOVERY, PatternTrigger.BALL_LOSS],
      sequences: [
        {
          step: 1,
          playerId: 'defender',
          action: 'win_ball',
          position: { x: 30, y: 30 },
          timing: 0,
          success: true,
        },
        {
          step: 2,
          playerId: 'midfielder',
          action: 'transition_pass',
          position: { x: 45, y: 40 },
          timing: 2,
          success: true,
        },
        {
          step: 3,
          playerId: 'forward',
          action: 'run_into_space',
          position: { x: 70, y: 70 },
          timing: 4,
          success: true,
        },
        {
          step: 4,
          playerId: 'forward',
          action: 'finish',
          position: { x: 85, y: 85 },
          timing: 8,
          success: true,
        },
      ],
      variations: ['direct_counter', 'patient_counter', 'wide_counter'],
      counters: ['defensive_recovery', 'tactical_fouls', 'compact_shape'],
      effectiveness: {
        formation: {
          [FormationType.FOUR_FIVE_ONE]: 0.9,
          [FormationType.FIVE_THREE_TWO]: 0.85,
          [FormationType.FOUR_FOUR_TWO]: 0.8,
          [FormationType.FOUR_THREE_THREE]: 0.7,
          [FormationType.FOUR_TWO_THREE_ONE]: 0.75,
          [FormationType.THREE_FIVE_TWO]: 0.7,
          [FormationType.THREE_FOUR_THREE]: 0.6,
          [FormationType.FOUR_ONE_FOUR_ONE]: 0.75,
          [FormationType.CUSTOM]: 0.5,
        },
        opposition: {
          [TacticalPattern.TIKI_TAKA]: 0.8,
          [TacticalPattern.POSSESSION_GAME]: 0.85,
          [TacticalPattern.HIGH_PRESS]: 0.9,
          [TacticalPattern.WING_PLAY]: 0.6,
          [TacticalPattern.ROUTE_ONE]: 0.4,
          [TacticalPattern.LOW_BLOCK]: 0.3,
          [TacticalPattern.GEGENPRESSING]: 0.5,
          [TacticalPattern.PARKING_BUS]: 0.2,
          [TacticalPattern.COUNTER_ATTACK]: 0.5,
          [TacticalPattern.OVERLOAD_TO_ISOLATE]: 0.7,
          [TacticalPattern.TRIANGULATION]: 0.7,
          [TacticalPattern.THIRD_MAN_RUNS]: 0.6,
          [TacticalPattern.OVERLAPPING_RUNS]: 0.6,
          [TacticalPattern.CUTBACK_ATTACKS]: 0.5,
          [TacticalPattern.SET_PIECE_ROUTINE]: 0.3,
        },
        phase: {
          [PatternPhase.BUILD_UP]: 0.3,
          [PatternPhase.PROGRESSION]: 0.6,
          [PatternPhase.FINAL_THIRD]: 0.8,
          [PatternPhase.DEFENSIVE_TRANSITION]: 0.95,
          [PatternPhase.ATTACKING_TRANSITION]: 0.9,
          [PatternPhase.SET_PIECE]: 0.2,
          [PatternPhase.RESTART]: 0.4,
        },
      },
    });
  }

  private initializeHebrewNames(): void {
    this.hebrewPatternNames.set(TacticalPattern.TIKI_TAKA, 'טיקי-טאקה');
    this.hebrewPatternNames.set(TacticalPattern.GEGENPRESSING, 'לחיצה נגדית');
    this.hebrewPatternNames.set(TacticalPattern.PARKING_BUS, 'חניית אוטובוס');
    this.hebrewPatternNames.set(TacticalPattern.WING_PLAY, 'משחק באגפים');
    this.hebrewPatternNames.set(TacticalPattern.ROUTE_ONE, 'כדור ארוך');
    this.hebrewPatternNames.set(TacticalPattern.POSSESSION_GAME, 'משחק החזקה');
    this.hebrewPatternNames.set(TacticalPattern.COUNTER_ATTACK, 'התקפת נגד');
    this.hebrewPatternNames.set(TacticalPattern.HIGH_PRESS, 'לחיצה גבוהה');
    this.hebrewPatternNames.set(TacticalPattern.LOW_BLOCK, 'בלוק נמוך');
    this.hebrewPatternNames.set(
      TacticalPattern.OVERLOAD_TO_ISOLATE,
      'עומס לבידוד'
    );
    this.hebrewPatternNames.set(TacticalPattern.TRIANGULATION, 'משולשים');
    this.hebrewPatternNames.set(
      TacticalPattern.THIRD_MAN_RUNS,
      'ריצות איש שלישי'
    );
    this.hebrewPatternNames.set(
      TacticalPattern.OVERLAPPING_RUNS,
      'ריצות חפיפה'
    );
    this.hebrewPatternNames.set(TacticalPattern.CUTBACK_ATTACKS, 'התקפות חזרה');
    this.hebrewPatternNames.set(TacticalPattern.SET_PIECE_ROUTINE, 'מצב קבוע');
  }

  private initializePatternCounters(): void {
    this.patternCounters.set(TacticalPattern.TIKI_TAKA, [
      TacticalPattern.HIGH_PRESS,
      TacticalPattern.GEGENPRESSING,
    ]);
    this.patternCounters.set(TacticalPattern.GEGENPRESSING, [
      TacticalPattern.ROUTE_ONE,
      TacticalPattern.POSSESSION_GAME,
    ]);
    this.patternCounters.set(TacticalPattern.WING_PLAY, [
      TacticalPattern.LOW_BLOCK,
      TacticalPattern.PARKING_BUS,
    ]);
    this.patternCounters.set(TacticalPattern.COUNTER_ATTACK, [
      TacticalPattern.LOW_BLOCK,
      TacticalPattern.POSSESSION_GAME,
    ]);
    this.patternCounters.set(TacticalPattern.HIGH_PRESS, [
      TacticalPattern.ROUTE_ONE,
      TacticalPattern.COUNTER_ATTACK,
    ]);
    this.patternCounters.set(TacticalPattern.LOW_BLOCK, [
      TacticalPattern.TIKI_TAKA,
      TacticalPattern.POSSESSION_GAME,
    ]);
  }

  public async analyzePatterns(
    scope: AnalysisScope,
    matchEvents: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>,
    playerPositions: PlayerPosition[],
    contextData?: {
      matchMinute?: number;
      gameState?: string;
      scoreline?: string;
      formation?: FormationType;
    }
  ): Promise<PatternAnalysisResult> {
    const detectedPatterns = this.detectPatterns(matchEvents, playerPositions);
    const frequencyAnalysis = this.analyzeFrequency(detectedPatterns);
    const effectivenessAnalysis = this.analyzeEffectiveness(detectedPatterns);
    const zoneAnalysis = this.analyzeByZone(detectedPatterns);
    const phaseAnalysis = this.analyzeByPhase(detectedPatterns, matchEvents);
    const playerRoles = this.analyzePlayerRoles(
      detectedPatterns,
      playerPositions
    );
    const recommendations = await this.generatePatternRecommendations(
      detectedPatterns,
      scope,
      contextData
    );
    const hebrewSummary = this.generateHebrewSummary(
      detectedPatterns,
      effectivenessAnalysis
    );
    const patternChains = this.analyzePatternChains(detectedPatterns);

    return {
      detectedPatterns,
      frequencyAnalysis,
      effectivenessAnalysis,
      zoneAnalysis,
      phaseAnalysis,
      playerRoles,
      recommendations,
      hebrewSummary,
      patternChains,
      adaptabilityScore: this.calculateAdaptabilityScore(detectedPatterns),
      predictabilityScore: this.calculatePredictabilityScore(detectedPatterns),
      complexityScore: this.calculateComplexityScore(detectedPatterns),
      analysisTimestamp: new Date(),
    };
  }

  private detectPatterns(
    matchEvents: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>,
    playerPositions: PlayerPosition[]
  ): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    const eventSequences = this.groupEventSequences(matchEvents);

    for (const sequence of eventSequences) {
      for (const [patternType, definition] of this.patternDefinitions) {
        const match = this.matchPattern(sequence, definition, playerPositions);
        if (match && match.confidence > 0.6) {
          patterns.push(match);
        }
      }
    }

    return this.filterOverlappingPatterns(patterns);
  }

  private groupEventSequences(
    events: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>
  ): Array<
    Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>
  > {
    const sequences: Array<
      Array<{
        timestamp: number;
        playerId: string;
        action: string;
        position: { x: number; y: number };
        outcome: string;
        metadata?: any;
      }>
    > = [];

    let currentSequence: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }> = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Start new sequence on significant events
      if (this.isSequenceBreaker(event) && currentSequence.length > 0) {
        sequences.push([...currentSequence]);
        currentSequence = [event];
      } else {
        currentSequence.push(event);
      }

      // Break sequence if too long
      if (currentSequence.length > 20) {
        sequences.push([...currentSequence]);
        currentSequence = [];
      }
    }

    if (currentSequence.length > 0) {
      sequences.push(currentSequence);
    }

    return sequences;
  }

  private isSequenceBreaker(event: {
    timestamp: number;
    playerId: string;
    action: string;
    position: { x: number; y: number };
    outcome: string;
    metadata?: any;
  }): boolean {
    const breakerActions = [
      'goal',
      'substitution',
      'card',
      'half_time',
      'kick_off',
      'throw_in',
      'corner_kick',
      'free_kick',
      'goal_kick',
    ];

    return breakerActions.includes(event.action);
  }

  private matchPattern(
    sequence: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>,
    definition: PatternDefinition,
    playerPositions: PlayerPosition[]
  ): PatternMatch | null {
    if (sequence.length < definition.minPlayers) return null;

    const participants = [...new Set(sequence.map(e => e.playerId))];
    if (participants.length < definition.minPlayers) return null;

    // Check for pattern-specific triggers
    const hasTrigger = definition.triggers.some(trigger => {
      return sequence.some(event => this.matchesTrigger(event, trigger));
    });

    if (!hasTrigger) return null;

    // Calculate pattern matching score
    const matchingScore = this.calculatePatternMatch(sequence, definition);
    if (matchingScore < 0.5) return null;

    // Determine pattern zone
    const avgX =
      sequence.reduce((sum, e) => sum + e.position.x, 0) / sequence.length;
    const avgY =
      sequence.reduce((sum, e) => sum + e.position.y, 0) / sequence.length;
    const zone = this.determineZone(avgX, avgY);

    // Check if zone is preferred for this pattern
    const zoneMatch = definition.preferredZones.includes(zone) ? 1.0 : 0.7;
    const finalConfidence = matchingScore * zoneMatch;

    if (finalConfidence < 0.6) return null;

    return {
      pattern: definition.pattern,
      confidence: finalConfidence,
      completeness: this.calculateCompleteness(sequence, definition),
      startTime: sequence[0].timestamp,
      endTime: sequence[sequence.length - 1].timestamp,
      participants,
      keyEvents: sequence.map(e => ({
        playerId: e.playerId,
        action: e.action,
        timestamp: e.timestamp,
        success: e.outcome === 'success',
      })),
      outcome: this.determineOutcome(sequence),
      zone,
      variations: this.identifyVariations(sequence, definition),
      nextPossiblePatterns: this.predictNextPatterns(definition.pattern),
    };
  }

  private matchesTrigger(
    event: {
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    },
    trigger: PatternTrigger
  ): boolean {
    const triggerMappings: Record<PatternTrigger, string[]> = {
      [PatternTrigger.BALL_RECOVERY]: ['interception', 'tackle', 'block'],
      [PatternTrigger.BALL_LOSS]: ['dispossession', 'bad_pass', 'tackle_lost'],
      [PatternTrigger.WIDE_PROGRESSION]: ['wide_pass', 'dribble_wide', 'cross'],
      [PatternTrigger.CENTRAL_PENETRATION]: [
        'through_pass',
        'dribble_central',
        'run_central',
      ],
      [PatternTrigger.GOALKEEPER_DISTRIBUTION]: [
        'gk_pass',
        'gk_throw',
        'gk_kick',
      ],
      [PatternTrigger.THROW_IN]: ['throw_in'],
      [PatternTrigger.CORNER_KICK]: ['corner_kick'],
      [PatternTrigger.FREE_KICK]: ['free_kick'],
      [PatternTrigger.GOAL_KICK]: ['goal_kick'],
      [PatternTrigger.SUBSTITUTION]: ['substitution'],
    };

    return triggerMappings[trigger]?.includes(event.action) || false;
  }

  private calculatePatternMatch(
    sequence: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>,
    definition: PatternDefinition
  ): number {
    let score = 0;
    let checks = 0;

    // Check sequence characteristics
    const duration =
      sequence[sequence.length - 1].timestamp - sequence[0].timestamp;
    const durationScore =
      Math.abs(duration - definition.typicalDuration) <
      definition.typicalDuration * 0.5
        ? 1
        : 0.5;
    score += durationScore;
    checks++;

    // Check action patterns
    const actions = sequence.map(e => e.action);
    const expectedActions = definition.sequences.map(s => s.action);
    const actionOverlap = this.calculateOverlap(actions, expectedActions);
    score += actionOverlap;
    checks++;

    // Check success criteria
    const successScore = this.evaluateSuccessCriteria(
      sequence,
      definition.successCriteria
    );
    score += successScore;
    checks++;

    return score / checks;
  }

  private calculateOverlap(array1: string[], array2: string[]): number {
    const set1 = new Set(array1);
    const set2 = new Set(array2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private evaluateSuccessCriteria(
    sequence: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>,
    criteria: string[]
  ): number {
    let score = 0;

    criteria.forEach(criterion => {
      switch (criterion) {
        case 'high_pass_completion':
          const passes = sequence.filter(e => e.action.includes('pass'));
          const successfulPasses = passes.filter(e => e.outcome === 'success');
          score +=
            passes.length > 0 ? successfulPasses.length / passes.length : 0;
          break;
        case 'quick_transition':
          const transitionTime =
            sequence[sequence.length - 1].timestamp - sequence[0].timestamp;
          score += transitionTime < 10 ? 1 : 0.5;
          break;
        case 'numerical_advantage':
          const participants = [...new Set(sequence.map(e => e.playerId))];
          score += participants.length >= 3 ? 1 : 0.5;
          break;
        default:
          score += 0.5; // Default score for unknown criteria
      }
    });

    return criteria.length > 0 ? score / criteria.length : 0;
  }

  private calculateCompleteness(
    sequence: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>,
    definition: PatternDefinition
  ): number {
    const expectedSteps = definition.sequences.length;
    const actualActions = sequence.map(e => e.action);
    const expectedActions = definition.sequences.map(s => s.action);

    let completedSteps = 0;
    let expectedIndex = 0;

    for (const action of actualActions) {
      if (
        expectedIndex < expectedActions.length &&
        action === expectedActions[expectedIndex]
      ) {
        completedSteps++;
        expectedIndex++;
      }
    }

    return expectedSteps > 0 ? completedSteps / expectedSteps : 0;
  }

  private determineOutcome(
    sequence: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>
  ): 'successful' | 'failed' | 'interrupted' {
    const lastEvent = sequence[sequence.length - 1];

    if (lastEvent.outcome === 'success') return 'successful';
    if (lastEvent.outcome === 'failure') return 'failed';
    return 'interrupted';
  }

  private determineZone(x: number, y: number): FieldZone {
    if (y < 33) return FieldZone.DEFENSIVE_THIRD;
    if (y > 67) return FieldZone.ATTACKING_THIRD;
    if (x < 25) return FieldZone.LEFT_FLANK;
    if (x > 75) return FieldZone.RIGHT_FLANK;
    if (x > 35 && x < 65) return FieldZone.CENTRAL_CHANNEL;
    return FieldZone.MIDDLE_THIRD;
  }

  private identifyVariations(
    sequence: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>,
    definition: PatternDefinition
  ): string[] {
    const variations: string[] = [];

    // Check for wide vs central execution
    const avgX =
      sequence.reduce((sum, e) => sum + e.position.x, 0) / sequence.length;
    if (avgX < 30) variations.push('left_sided');
    else if (avgX > 70) variations.push('right_sided');
    else variations.push('central');

    // Check for quick vs patient execution
    const duration =
      sequence[sequence.length - 1].timestamp - sequence[0].timestamp;
    if (duration < definition.typicalDuration * 0.7)
      variations.push('quick_tempo');
    else if (duration > definition.typicalDuration * 1.3)
      variations.push('patient_buildup');

    return variations;
  }

  private predictNextPatterns(
    currentPattern: TacticalPattern
  ): TacticalPattern[] {
    const transitions: Record<TacticalPattern, TacticalPattern[]> = {
      [TacticalPattern.TIKI_TAKA]: [
        TacticalPattern.TRIANGULATION,
        TacticalPattern.OVERLOAD_TO_ISOLATE,
      ],
      [TacticalPattern.GEGENPRESSING]: [
        TacticalPattern.COUNTER_ATTACK,
        TacticalPattern.HIGH_PRESS,
      ],
      [TacticalPattern.WING_PLAY]: [
        TacticalPattern.CUTBACK_ATTACKS,
        TacticalPattern.OVERLAPPING_RUNS,
      ],
      [TacticalPattern.COUNTER_ATTACK]: [
        TacticalPattern.THIRD_MAN_RUNS,
        TacticalPattern.WING_PLAY,
      ],
      [TacticalPattern.HIGH_PRESS]: [
        TacticalPattern.GEGENPRESSING,
        TacticalPattern.COUNTER_ATTACK,
      ],
      [TacticalPattern.LOW_BLOCK]: [
        TacticalPattern.COUNTER_ATTACK,
        TacticalPattern.ROUTE_ONE,
      ],
      [TacticalPattern.POSSESSION_GAME]: [
        TacticalPattern.TIKI_TAKA,
        TacticalPattern.TRIANGULATION,
      ],
      [TacticalPattern.PARKING_BUS]: [
        TacticalPattern.COUNTER_ATTACK,
        TacticalPattern.ROUTE_ONE,
      ],
      [TacticalPattern.ROUTE_ONE]: [
        TacticalPattern.WING_PLAY,
        TacticalPattern.SET_PIECE_ROUTINE,
      ],
      [TacticalPattern.OVERLOAD_TO_ISOLATE]: [
        TacticalPattern.TIKI_TAKA,
        TacticalPattern.WING_PLAY,
      ],
      [TacticalPattern.TRIANGULATION]: [
        TacticalPattern.TIKI_TAKA,
        TacticalPattern.THIRD_MAN_RUNS,
      ],
      [TacticalPattern.THIRD_MAN_RUNS]: [
        TacticalPattern.OVERLAPPING_RUNS,
        TacticalPattern.CUTBACK_ATTACKS,
      ],
      [TacticalPattern.OVERLAPPING_RUNS]: [
        TacticalPattern.WING_PLAY,
        TacticalPattern.CUTBACK_ATTACKS,
      ],
      [TacticalPattern.CUTBACK_ATTACKS]: [
        TacticalPattern.WING_PLAY,
        TacticalPattern.SET_PIECE_ROUTINE,
      ],
      [TacticalPattern.SET_PIECE_ROUTINE]: [
        TacticalPattern.HIGH_PRESS,
        TacticalPattern.POSSESSION_GAME,
      ],
    };

    return transitions[currentPattern] || [];
  }

  private filterOverlappingPatterns(patterns: PatternMatch[]): PatternMatch[] {
    const filtered: PatternMatch[] = [];
    const sortedPatterns = patterns.sort((a, b) => b.confidence - a.confidence);

    for (const pattern of sortedPatterns) {
      const hasOverlap = filtered.some(
        existing =>
          this.hasTimeOverlap(pattern, existing) &&
          this.hasPlayerOverlap(pattern, existing)
      );

      if (!hasOverlap) {
        filtered.push(pattern);
      }
    }

    return filtered;
  }

  private hasTimeOverlap(
    pattern1: PatternMatch,
    pattern2: PatternMatch
  ): boolean {
    return !(
      pattern1.endTime < pattern2.startTime ||
      pattern2.endTime < pattern1.startTime
    );
  }

  private hasPlayerOverlap(
    pattern1: PatternMatch,
    pattern2: PatternMatch
  ): boolean {
    const overlap = pattern1.participants.filter(p =>
      pattern2.participants.includes(p)
    );
    return overlap.length > pattern1.participants.length * 0.5;
  }

  private analyzeFrequency(
    patterns: PatternMatch[]
  ): Record<TacticalPattern, number> {
    const frequency: Record<TacticalPattern, number> = {} as Record<
      TacticalPattern,
      number
    >;

    Object.values(TacticalPattern).forEach(pattern => {
      frequency[pattern] = patterns.filter(p => p.pattern === pattern).length;
    });

    return frequency;
  }

  private analyzeEffectiveness(
    patterns: PatternMatch[]
  ): Record<TacticalPattern, number> {
    const effectiveness: Record<TacticalPattern, number> = {} as Record<
      TacticalPattern,
      number
    >;

    Object.values(TacticalPattern).forEach(pattern => {
      const patternMatches = patterns.filter(p => p.pattern === pattern);
      if (patternMatches.length === 0) {
        effectiveness[pattern] = 0;
        return;
      }

      const successfulMatches = patternMatches.filter(
        p => p.outcome === 'successful'
      );
      effectiveness[pattern] = successfulMatches.length / patternMatches.length;
    });

    return effectiveness;
  }

  private analyzeByZone(
    patterns: PatternMatch[]
  ): Record<FieldZone, TacticalPattern[]> {
    const zoneAnalysis: Record<FieldZone, TacticalPattern[]> = {} as Record<
      FieldZone,
      TacticalPattern[]
    >;

    Object.values(FieldZone).forEach(zone => {
      zoneAnalysis[zone] = patterns
        .filter(p => p.zone === zone)
        .map(p => p.pattern);
    });

    return zoneAnalysis;
  }

  private analyzeByPhase(
    patterns: PatternMatch[],
    matchEvents: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>
  ): Record<PatternPhase, TacticalPattern[]> {
    const phaseAnalysis: Record<PatternPhase, TacticalPattern[]> = {} as Record<
      PatternPhase,
      TacticalPattern[]
    >;

    Object.values(PatternPhase).forEach(phase => {
      phaseAnalysis[phase] = patterns
        .filter(p => this.determinePatternPhase(p, matchEvents) === phase)
        .map(p => p.pattern);
    });

    return phaseAnalysis;
  }

  private determinePatternPhase(
    pattern: PatternMatch,
    matchEvents: Array<{
      timestamp: number;
      playerId: string;
      action: string;
      position: { x: number; y: number };
      outcome: string;
      metadata?: any;
    }>
  ): PatternPhase {
    const patternEvents = matchEvents.filter(
      e => e.timestamp >= pattern.startTime && e.timestamp <= pattern.endTime
    );

    const avgY =
      patternEvents.reduce((sum, e) => sum + e.position.y, 0) /
      patternEvents.length;

    if (avgY < 33) return PatternPhase.BUILD_UP;
    if (avgY > 67) return PatternPhase.FINAL_THIRD;
    return PatternPhase.PROGRESSION;
  }

  private analyzePlayerRoles(
    patterns: PatternMatch[],
    playerPositions: PlayerPosition[]
  ): Record<
    string,
    {
      patterns: TacticalPattern[];
      frequency: number;
      effectiveness: number;
      preferredZones: FieldZone[];
    }
  > {
    const playerRoles: Record<
      string,
      {
        patterns: TacticalPattern[];
        frequency: number;
        effectiveness: number;
        preferredZones: FieldZone[];
      }
    > = {};

    const allPlayers = [...new Set(patterns.flatMap(p => p.participants))];

    allPlayers.forEach(playerId => {
      const playerPatterns = patterns.filter(p =>
        p.participants.includes(playerId)
      );
      const successfulPatterns = playerPatterns.filter(
        p => p.outcome === 'successful'
      );
      const zones = [...new Set(playerPatterns.map(p => p.zone))];

      playerRoles[playerId] = {
        patterns: [...new Set(playerPatterns.map(p => p.pattern))],
        frequency: playerPatterns.length,
        effectiveness:
          playerPatterns.length > 0
            ? successfulPatterns.length / playerPatterns.length
            : 0,
        preferredZones: zones,
      };
    });

    return playerRoles;
  }

  private async generatePatternRecommendations(
    patterns: PatternMatch[],
    scope: AnalysisScope,
    contextData?: {
      matchMinute?: number;
      gameState?: string;
      scoreline?: string;
      formation?: FormationType;
    }
  ): Promise<TacticalInsight[]> {
    const insights: TacticalInsight[] = [];

    // Analyze pattern effectiveness
    const effectiveness = this.analyzeEffectiveness(patterns);

    // Generate insights for low-effectiveness patterns
    Object.entries(effectiveness).forEach(([pattern, eff]) => {
      if (
        eff < 0.5 &&
        patterns.some(p => p.pattern === (pattern as TacticalPattern))
      ) {
        const hebrewName =
          this.hebrewPatternNames.get(pattern as TacticalPattern) || pattern;

        const insight = TacticalInsight.create(
          InsightType.PERFORMANCE_PATTERN,
          `Low effectiveness in ${pattern} pattern`,
          `יעילות נמוכה בדפוס ${hebrewName}`,
          `The ${pattern} pattern is showing low success rate (${(
            eff * 100
          ).toFixed(0)}%)`,
          `דפוס ה${hebrewName} מציג שיעור הצלחה נמוך (${(eff * 100).toFixed(
            0
          )}%)`,
          InsightPriority.MEDIUM,
          InsightConfidence.HIGH,
          {
            teamId: scope.teamScope?.teamId,
            isActionable: true,
            metadata: {
              pattern,
              effectiveness: eff,
              suggestions: this.getPatternImprovementSuggestions(
                pattern as TacticalPattern
              ),
            },
          }
        );

        insights.push(insight);
      }
    });

    // Generate insights for pattern recommendations
    if (contextData?.formation) {
      const recommendations = this.getPatternRecommendations(
        contextData.formation,
        contextData
      );

      recommendations.forEach(rec => {
        const insight = TacticalInsight.create(
          InsightType.TACTICAL_ADJUSTMENT,
          `Consider implementing ${rec.pattern}`,
          `שקול יישום ${this.hebrewPatternNames.get(rec.pattern)}`,
          rec.reason,
          rec.hebrewReason,
          InsightPriority.MEDIUM,
          InsightConfidence.MEDIUM,
          {
            teamId: scope.teamScope?.teamId,
            isActionable: true,
            metadata: {
              recommendedPattern: rec.pattern,
              expectedEffectiveness: rec.effectiveness,
              requirements: rec.requirements,
            },
          }
        );

        insights.push(insight);
      });
    }

    return insights;
  }

  private getPatternImprovementSuggestions(pattern: TacticalPattern): string[] {
    const suggestions: Record<TacticalPattern, string[]> = {
      [TacticalPattern.TIKI_TAKA]: [
        'Improve first touch quality',
        'Increase movement off the ball',
        'Work on quick decision making',
        'Practice under pressure scenarios',
      ],
      [TacticalPattern.GEGENPRESSING]: [
        'Improve reaction time after losing ball',
        'Better coordination between players',
        'Work on pressing triggers',
        'Increase fitness levels',
      ],
      [TacticalPattern.WING_PLAY]: [
        'Improve crossing accuracy',
        'Better timing of runs',
        'Work on 1v1 situations',
        'Practice cutback moves',
      ],
      [TacticalPattern.COUNTER_ATTACK]: [
        'Quicker first pass after winning ball',
        'Better running patterns',
        'Improve clinical finishing',
        'Practice quick transitions',
      ],
      [TacticalPattern.HIGH_PRESS]: [
        'Better pressing coordination',
        'Improve fitness for sustained pressing',
        'Work on pressing triggers',
        'Practice recovery runs',
      ],
      [TacticalPattern.LOW_BLOCK]: [
        'Maintain defensive shape',
        'Improve communication',
        'Work on quick transitions',
        'Practice set piece defense',
      ],
      [TacticalPattern.POSSESSION_GAME]: [
        'Improve passing accuracy',
        'Better movement to create space',
        'Work on press resistance',
        'Practice patient buildup',
      ],
      [TacticalPattern.PARKING_BUS]: [
        'Maintain discipline',
        'Improve counter-attack execution',
        'Work on set piece threats',
        'Practice defensive transitions',
      ],
      [TacticalPattern.ROUTE_ONE]: [
        'Improve aerial ability',
        'Better timing of runs',
        'Work on second ball situations',
        'Practice quick combinations',
      ],
      [TacticalPattern.OVERLOAD_TO_ISOLATE]: [
        'Better timing of overloads',
        'Improve 1v1 situations',
        'Work on quick switches',
        'Practice patience in buildup',
      ],
      [TacticalPattern.TRIANGULATION]: [
        'Improve passing angles',
        'Better movement timing',
        'Work on first touch',
        'Practice quick combinations',
      ],
      [TacticalPattern.THIRD_MAN_RUNS]: [
        'Better timing of runs',
        'Improve through ball accuracy',
        'Work on off-ball movement',
        'Practice blind-side runs',
      ],
      [TacticalPattern.OVERLAPPING_RUNS]: [
        'Improve timing coordination',
        'Better crossing from deep',
        'Work on recovery runs',
        'Practice communication',
      ],
      [TacticalPattern.CUTBACK_ATTACKS]: [
        'Improve cutback accuracy',
        'Better box movement',
        'Work on finishing',
        'Practice timing of runs',
      ],
      [TacticalPattern.SET_PIECE_ROUTINE]: [
        'Improve delivery quality',
        'Better movement coordination',
        'Work on set piece variations',
        'Practice defensive marking',
      ],
    };

    return suggestions[pattern] || ['General tactical improvements needed'];
  }

  private getPatternRecommendations(
    formation: FormationType,
    contextData?: {
      matchMinute?: number;
      gameState?: string;
      scoreline?: string;
    }
  ): Array<{
    pattern: TacticalPattern;
    reason: string;
    hebrewReason: string;
    effectiveness: number;
    requirements: string[];
  }> {
    const recommendations: Array<{
      pattern: TacticalPattern;
      reason: string;
      hebrewReason: string;
      effectiveness: number;
      requirements: string[];
    }> = [];

    // Formation-based recommendations
    const formationPatterns: Record<FormationType, TacticalPattern[]> = {
      [FormationType.FOUR_THREE_THREE]: [
        TacticalPattern.TIKI_TAKA,
        TacticalPattern.HIGH_PRESS,
        TacticalPattern.WING_PLAY,
      ],
      [FormationType.FOUR_FOUR_TWO]: [
        TacticalPattern.WING_PLAY,
        TacticalPattern.COUNTER_ATTACK,
        TacticalPattern.ROUTE_ONE,
      ],
      [FormationType.FOUR_TWO_THREE_ONE]: [
        TacticalPattern.POSSESSION_GAME,
        TacticalPattern.OVERLOAD_TO_ISOLATE,
        TacticalPattern.TIKI_TAKA,
      ],
      [FormationType.THREE_FIVE_TWO]: [
        TacticalPattern.WING_PLAY,
        TacticalPattern.OVERLAPPING_RUNS,
        TacticalPattern.POSSESSION_GAME,
      ],
      [FormationType.FIVE_THREE_TWO]: [
        TacticalPattern.COUNTER_ATTACK,
        TacticalPattern.LOW_BLOCK,
        TacticalPattern.WING_PLAY,
      ],
      [FormationType.FOUR_FIVE_ONE]: [
        TacticalPattern.COUNTER_ATTACK,
        TacticalPattern.LOW_BLOCK,
        TacticalPattern.POSSESSION_GAME,
      ],
      [FormationType.THREE_FOUR_THREE]: [
        TacticalPattern.HIGH_PRESS,
        TacticalPattern.WING_PLAY,
        TacticalPattern.TIKI_TAKA,
      ],
      [FormationType.FOUR_ONE_FOUR_ONE]: [
        TacticalPattern.POSSESSION_GAME,
        TacticalPattern.TRIANGULATION,
        TacticalPattern.COUNTER_ATTACK,
      ],
      [FormationType.CUSTOM]: [TacticalPattern.POSSESSION_GAME],
    };

    const suitablePatterns = formationPatterns[formation] || [];

    suitablePatterns.forEach(pattern => {
      const definition = this.patternDefinitions.get(pattern);
      if (definition) {
        const effectiveness =
          definition.effectiveness.formation[formation] || 0.5;

        recommendations.push({
          pattern,
          reason: `${pattern} suits your ${formation} formation well`,
          hebrewReason: `${this.hebrewPatternNames.get(
            pattern
          )} מתאים היטב למערך ${formation}`,
          effectiveness,
          requirements: definition.successCriteria,
        });
      }
    });

    // Context-based recommendations
    if (
      contextData?.scoreline === '0-1' &&
      contextData.matchMinute &&
      contextData.matchMinute > 70
    ) {
      recommendations.push({
        pattern: TacticalPattern.HIGH_PRESS,
        reason: 'Need urgent goals - high pressing can create opportunities',
        hebrewReason: 'דרושים שערים דחופים - לחיצה גבוהה יכולה ליצור הזדמנויות',
        effectiveness: 0.7,
        requirements: ['high_fitness', 'coordination', 'quick_transitions'],
      });
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
  }

  private generateHebrewSummary(
    patterns: PatternMatch[],
    effectiveness: Record<TacticalPattern, number>
  ): string {
    let summary = 'ניתוח דפוסים טקטיים:\n\n';

    const totalPatterns = patterns.length;
    const successfulPatterns = patterns.filter(
      p => p.outcome === 'successful'
    ).length;
    const overallEffectiveness =
      totalPatterns > 0 ? successfulPatterns / totalPatterns : 0;

    summary += `סך הכל זוהו ${totalPatterns} דפוסים טקטיים
`;
    summary += `יעילות כוללת: ${(overallEffectiveness * 100).toFixed(0)}%

`;

    const topPatterns = Object.entries(effectiveness)
      .filter(([_, eff]) => eff > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3);

    if (topPatterns.length > 0) {
      summary += 'הדפוסים היעילים ביותר:\n';
      topPatterns.forEach(([pattern, eff], index) => {
        const hebrewName =
          this.hebrewPatternNames.get(pattern as TacticalPattern) || pattern;
        summary += `${index + 1}. ${hebrewName}: ${(eff * 100).toFixed(0)}%\n`;
      });
      summary += '\n';
    }

    const weakPatterns = Object.entries(effectiveness)
      .filter(([_, eff]) => eff > 0 && eff < 0.5)
      .slice(0, 2);

    if (weakPatterns.length > 0) {
      summary += 'דפוסים הדורשים שיפור:\n';
      weakPatterns.forEach(([pattern, eff], index) => {
        const hebrewName =
          this.hebrewPatternNames.get(pattern as TacticalPattern) || pattern;
        summary += `${index + 1}. ${hebrewName}: ${(eff * 100).toFixed(0)}%\n`;
      });
      summary += '\n';
    }

    summary += 'המלצות:\n';
    summary += '- התמקדות בשיפור הדפוסים הפחות יעילים\n';
    summary += '- חיזוק הדפוסים המוצלחים\n';
    summary += '- עבודה על תיאום וביצוע\n';

    return summary;
  }

  private analyzePatternChains(patterns: PatternMatch[]): Array<{
    sequence: TacticalPattern[];
    frequency: number;
    effectiveness: number;
  }> {
    const chains: Array<{
      sequence: TacticalPattern[];
      frequency: number;
      effectiveness: number;
    }> = [];

    // Sort patterns by start time
    const sortedPatterns = patterns.sort((a, b) => a.startTime - b.startTime);

    // Find sequential patterns (within 30 seconds of each other)
    for (let i = 0; i < sortedPatterns.length - 1; i++) {
      const current = sortedPatterns[i];
      const next = sortedPatterns[i + 1];

      if (next.startTime - current.endTime < 30) {
        const sequence = [current.pattern, next.pattern];
        const existingChain = chains.find(
          c =>
            c.sequence.length === 2 &&
            c.sequence[0] === sequence[0] &&
            c.sequence[1] === sequence[1]
        );

        if (existingChain) {
          existingChain.frequency++;
          // Update effectiveness based on outcomes
          const effectiveness =
            current.outcome === 'successful' && next.outcome === 'successful'
              ? 1
              : 0;
          existingChain.effectiveness =
            (existingChain.effectiveness + effectiveness) / 2;
        } else {
          chains.push({
            sequence,
            frequency: 1,
            effectiveness:
              current.outcome === 'successful' && next.outcome === 'successful'
                ? 1
                : 0,
          });
        }
      }
    }

    return chains.sort((a, b) => b.frequency - a.frequency).slice(0, 5);
  }

  private calculateAdaptabilityScore(patterns: PatternMatch[]): number {
    if (patterns.length === 0) return 0;

    const uniquePatterns = new Set(patterns.map(p => p.pattern)).size;
    const totalPatterns = Object.keys(TacticalPattern).length;
    const varietyScore = uniquePatterns / totalPatterns;

    const zoneVariety = new Set(patterns.map(p => p.zone)).size;
    const totalZones = Object.keys(FieldZone).length;
    const zoneScore = zoneVariety / totalZones;

    return (varietyScore + zoneScore) / 2;
  }

  private calculatePredictabilityScore(patterns: PatternMatch[]): number {
    if (patterns.length === 0) return 1;

    const patternCounts = patterns.reduce((counts, pattern) => {
      counts[pattern.pattern] = (counts[pattern.pattern] || 0) + 1;
      return counts;
    }, {} as Record<TacticalPattern, number>);

    const totalPatterns = patterns.length;
    const maxFrequency = Math.max(...Object.values(patternCounts));

    return maxFrequency / totalPatterns;
  }

  private calculateComplexityScore(patterns: PatternMatch[]): number {
    if (patterns.length === 0) return 0;

    const avgParticipants =
      patterns.reduce((sum, p) => sum + p.participants.length, 0) /
      patterns.length;
    const avgCompleteness =
      patterns.reduce((sum, p) => sum + p.completeness, 0) / patterns.length;
    const avgConfidence =
      patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;

    return (avgParticipants / 11 + avgCompleteness + avgConfidence) / 3;
  }

  public getPatternCounters(pattern: TacticalPattern): TacticalPattern[] {
    return this.patternCounters.get(pattern) || [];
  }

  public getPatternDefinition(
    pattern: TacticalPattern
  ): PatternDefinition | undefined {
    return this.patternDefinitions.get(pattern);
  }

  public suggestPatternAdaptations(
    currentPatterns: TacticalPattern[],
    oppositionPatterns: TacticalPattern[]
  ): Array<{
    adaptation: string;
    hebrewAdaptation: string;
    reasoning: string;
    hebrewReasoning: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const adaptations: Array<{
      adaptation: string;
      hebrewAdaptation: string;
      reasoning: string;
      hebrewReasoning: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    // Suggest counter-patterns for opposition tactics
    oppositionPatterns.forEach(oppPattern => {
      const counters = this.getPatternCounters(oppPattern);
      const missingCounters = counters.filter(
        counter => !currentPatterns.includes(counter)
      );

      missingCounters.forEach(counter => {
        const counterName = this.hebrewPatternNames.get(counter) || counter;
        const oppName = this.hebrewPatternNames.get(oppPattern) || oppPattern;

        adaptations.push({
          adaptation: `Implement ${counter} to counter opponent's ${oppPattern}`,
          hebrewAdaptation: `יישום ${counterName} כדי להתמודד עם ${oppName} של היריב`,
          reasoning: `${counter} is effective against ${oppPattern} patterns`,
          hebrewReasoning: `${counterName} יעיל נגד דפוסי ${oppName}`,
          priority: 'high',
        });
      });
    });

    return adaptations.slice(0, 3); // Limit to top 3 adaptations
  }
}
