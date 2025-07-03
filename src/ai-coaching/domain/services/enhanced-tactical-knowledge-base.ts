/**
 * Enhanced Tactical Knowledge Base System
 * Comprehensive pattern library and formation database with advanced tactical intelligence
 */

import {
  FootballConcept,
  ConceptCategory,
} from '../value-objects/football-concept';
import {
  FootballEntity,
  EntityType,
  PositionType,
  TacticalRole,
} from '../value-objects/football-entity';
import { TacticalIntent, IntentType } from '../value-objects/tactical-intent';
import {
  FormationAnalyzer,
  FormationType,
  FieldZone,
  PlayerPosition,
  FormationAnalysisResult,
} from './formation-analyzer';
import {
  TacticalPatternMatcher,
  TacticalPattern,
  PatternMatch,
  PatternDefinition,
} from './tactical-pattern-matcher';

export enum KnowledgeCategory {
  FORMATIONS = 'formations',
  TACTICAL_PATTERNS = 'tactical_patterns',
  PLAYER_ROLES = 'player_roles',
  GAME_PHASES = 'game_phases',
  SET_PIECES = 'set_pieces',
  PRESSING_SYSTEMS = 'pressing_systems',
  ATTACKING_PRINCIPLES = 'attacking_principles',
  DEFENSIVE_PRINCIPLES = 'defensive_principles',
  TRANSITION_PLAY = 'transition_play',
  PLAYER_DEVELOPMENT = 'player_development',
  MATCH_ANALYSIS = 'match_analysis',
  OPPOSITION_ANALYSIS = 'opposition_analysis',
}

export enum TacticalEra {
  CLASSICAL = 'classical', // Pre-1960s
  MODERN = 'modern', // 1960s-1990s
  CONTEMPORARY = 'contemporary', // 2000s-2010s
  CURRENT = 'current', // 2020s+
}

export enum TacticalPhilosophy {
  POSSESSION_BASED = 'possession_based',
  DIRECT_PLAY = 'direct_play',
  COUNTER_ATTACKING = 'counter_attacking',
  HIGH_PRESSING = 'high_pressing',
  DEFENSIVE_SOLIDITY = 'defensive_solidity',
  WING_PLAY = 'wing_play',
  CENTRAL_DOMINANCE = 'central_dominance',
  FLUID_SYSTEM = 'fluid_system',
  STRUCTURED_APPROACH = 'structured_approach',
  GEGENPRESSING = 'gegenpressing',
  TIKI_TAKA = 'tiki_taka',
  TOTAL_FOOTBALL = 'total_football',
}

export interface TacticalKnowledgeItem {
  id: string;
  category: KnowledgeCategory;
  name: string;
  hebrewName: string;
  description: string;
  hebrewDescription: string;
  era: TacticalEra;
  philosophy: TacticalPhilosophy[];
  complexity:
    | 'beginner'
    | 'intermediate'
    | 'advanced'
    | 'expert'
    | 'professional';
  effectiveness: Record<string, number>; // Context -> effectiveness rating
  prerequisites: string[];
  relatedItems: string[];
  contradictions: string[];
  metadata: {
    creator?: string;
    popularizedBy?: string[];
    firstUsed?: string;
    peakPopularity?: string;
    modernAdaptations?: string[];
    successfulTeams?: string[];
  };
  tacticalPrinciples: {
    attacking: string[];
    defending: string[];
    transitions: string[];
  };
  implementationGuide: {
    playerRequirements: Record<string, string[]>;
    trainingMethods: string[];
    commonMistakes: string[];
    adaptations: string[];
  };
  videoReferences?: string[];
  statisticalEvidence?: Record<string, number>;
}

export interface FormationKnowledge extends TacticalKnowledgeItem {
  formation: FormationType;
  playerPositions: PlayerPosition[];
  variations: Array<{
    name: string;
    hebrewName: string;
    description: string;
    modifications: Record<string, any>;
  }>;
  strengths: Array<{
    area: FieldZone;
    description: string;
    hebrewDescription: string;
    rating: number;
  }>;
  weaknesses: Array<{
    area: FieldZone;
    description: string;
    hebrewDescription: string;
    severity: number;
  }>;
  optimalConditions: {
    playerTypes: Record<string, string[]>;
    matchSituations: string[];
    oppositionFormations: FormationType[];
  };
  transitionMechanics: {
    attackingTransition: string[];
    defensiveTransition: string[];
    setToOpenPlay: string[];
  };
}

export interface PatternKnowledge extends TacticalKnowledgeItem {
  pattern: TacticalPattern;
  phases: Array<{
    phase: string;
    description: string;
    hebrewDescription: string;
    keyActions: string[];
    timing: number;
    successCriteria: string[];
  }>;
  variations: Array<{
    name: string;
    hebrewName: string;
    modifications: string[];
    effectiveness: number;
  }>;
  counters: Array<{
    method: string;
    hebrewMethod: string;
    effectiveness: number;
    implementation: string[];
  }>;
  optimalFormations: FormationType[];
  playerSkillRequirements: Record<string, string[]>;
}

export interface KnowledgeSearchOptions {
  categories?: KnowledgeCategory[];
  complexity?: string[];
  era?: TacticalEra[];
  philosophy?: TacticalPhilosophy[];
  language?: 'he' | 'en' | 'both';
  minEffectiveness?: number;
  includeRelated?: boolean;
  maxResults?: number;
}

export interface KnowledgeSearchResult {
  item: TacticalKnowledgeItem;
  relevanceScore: number;
  matchedTerms: string[];
  contextualFactors: string[];
}

export interface TacticalScenario {
  id: string;
  name: string;
  hebrewName: string;
  description: string;
  hebrewDescription: string;
  context: {
    matchPhase: string;
    scoreline: string;
    timeRemaining: number;
    matchImportance: 'low' | 'medium' | 'high' | 'critical';
    weather?: string;
    venue?: 'home' | 'away' | 'neutral';
  };
  challengingFactors: string[];
  recommendedKnowledge: string[];
  successMetrics: Record<string, number>;
  alternativeApproaches: Array<{
    approach: string;
    pros: string[];
    cons: string[];
    effectiveness: number;
  }>;
}

export class EnhancedTacticalKnowledgeBase {
  private readonly knowledgeItems = new Map<string, TacticalKnowledgeItem>();
  private readonly formationKnowledge = new Map<string, FormationKnowledge>();
  private readonly patternKnowledge = new Map<string, PatternKnowledge>();
  private readonly tacticalScenarios = new Map<string, TacticalScenario>();

  private readonly searchIndex = new Map<string, Set<string>>();
  private readonly hebrewSearchIndex = new Map<string, Set<string>>();
  private readonly conceptGraph = new Map<string, Set<string>>();

  private readonly formationAnalyzer: FormationAnalyzer;
  private readonly patternMatcher: TacticalPatternMatcher;

  constructor() {
    this.formationAnalyzer = new FormationAnalyzer();
    this.patternMatcher = new TacticalPatternMatcher();
    this.initializeKnowledgeBase();
    this.buildSearchIndices();
    this.buildConceptGraph();
  }

  /**
   * Initialize the comprehensive tactical knowledge database
   */
  private initializeKnowledgeBase(): void {
    this.initializeFormationKnowledge();
    this.initializePatternKnowledge();
    this.initializeTacticalScenarios();
    this.initializeSpecializedKnowledge();
  }

  /**
   * Initialize formation knowledge database
   */
  private initializeFormationKnowledge(): void {
    // 4-4-2 Formation Knowledge
    const formation442: FormationKnowledge = {
      id: 'formation_442',
      category: KnowledgeCategory.FORMATIONS,
      name: '4-4-2 Formation',
      hebrewName: 'מערך 4-4-2',
      description:
        'Classic balanced formation with two banks of four and two strikers',
      hebrewDescription: 'מערך קלאסי מאוזן עם שני טורים של ארבעה ושני חלוצים',
      era: TacticalEra.CLASSICAL,
      philosophy: [
        TacticalPhilosophy.STRUCTURED_APPROACH,
        TacticalPhilosophy.WING_PLAY,
      ],
      complexity: 'intermediate',
      effectiveness: {
        possession_play: 0.6,
        counter_attacking: 0.8,
        wing_play: 0.9,
        central_dominance: 0.5,
        defensive_stability: 0.8,
      },
      prerequisites: ['basic_positional_play', 'defensive_organization'],
      relatedItems: [
        'formation_442_diamond',
        'pattern_wing_play',
        'defensive_block',
      ],
      contradictions: ['tiki_taka', 'false_nine_system'],
      metadata: {
        popularizedBy: ['English Football', 'Sir Alf Ramsey'],
        firstUsed: '1960s',
        peakPopularity: '1980s-1990s',
        modernAdaptations: ['4-4-2 Diamond', '4-4-1-1'],
        successfulTeams: [
          'Manchester United 1990s',
          'Liverpool 1980s',
          'Leicester City 2016',
        ],
      },
      tacticalPrinciples: {
        attacking: [
          'width_creation',
          'striker_partnership',
          'midfield_support',
        ],
        defending: ['compact_shape', 'defensive_line', 'midfield_screening'],
        transitions: [
          'quick_switches',
          'long_ball_option',
          'wing_counter_attacks',
        ],
      },
      implementationGuide: {
        playerRequirements: {
          strikers: ['complementary_skills', 'partnership', 'aerial_ability'],
          wide_midfielders: [
            'stamina',
            'crossing_ability',
            'defensive_work_rate',
          ],
          central_midfielders: [
            'box_to_box_ability',
            'passing_range',
            'defensive_discipline',
          ],
        },
        trainingMethods: [
          'shape_work',
          'crossing_practice',
          'defensive_pressing',
        ],
        commonMistakes: [
          'wide_midfielders_not_tracking',
          'central_midfield_gaps',
          'striker_isolation',
        ],
        adaptations: ['narrow_442', 'wide_442', 'asymmetric_442'],
      },
      formation: FormationType.FOUR_FOUR_TWO,
      playerPositions: [
        {
          playerId: 'gk',
          playerName: 'Goalkeeper',
          position: 'GK',
          x: 50,
          y: 5,
          role: 'goalkeeper',
          responsibilities: ['shot_stopping', 'distribution'],
        },
        {
          playerId: 'rb',
          playerName: 'Right Back',
          position: 'RB',
          x: 80,
          y: 20,
          role: 'fullback',
          responsibilities: ['defensive_cover', 'attacking_support'],
        },
        {
          playerId: 'rcb',
          playerName: 'Right CB',
          position: 'CB',
          x: 60,
          y: 15,
          role: 'center_back',
          responsibilities: ['aerial_duels', 'marking'],
        },
        {
          playerId: 'lcb',
          playerName: 'Left CB',
          position: 'CB',
          x: 40,
          y: 15,
          role: 'center_back',
          responsibilities: ['aerial_duels', 'build_up'],
        },
        {
          playerId: 'lb',
          playerName: 'Left Back',
          position: 'LB',
          x: 20,
          y: 20,
          role: 'fullback',
          responsibilities: ['defensive_cover', 'attacking_support'],
        },
        {
          playerId: 'rm',
          playerName: 'Right Mid',
          position: 'RM',
          x: 80,
          y: 50,
          role: 'wide_midfielder',
          responsibilities: ['width', 'tracking'],
        },
        {
          playerId: 'rcm',
          playerName: 'Right CM',
          position: 'CM',
          x: 60,
          y: 45,
          role: 'central_midfielder',
          responsibilities: ['box_to_box', 'support'],
        },
        {
          playerId: 'lcm',
          playerName: 'Left CM',
          position: 'CM',
          x: 40,
          y: 45,
          role: 'central_midfielder',
          responsibilities: ['box_to_box', 'creativity'],
        },
        {
          playerId: 'lm',
          playerName: 'Left Mid',
          position: 'LM',
          x: 20,
          y: 50,
          role: 'wide_midfielder',
          responsibilities: ['width', 'tracking'],
        },
        {
          playerId: 'rs',
          playerName: 'Right Striker',
          position: 'ST',
          x: 60,
          y: 80,
          role: 'striker',
          responsibilities: ['finishing', 'link_play'],
        },
        {
          playerId: 'ls',
          playerName: 'Left Striker',
          position: 'ST',
          x: 40,
          y: 80,
          role: 'striker',
          responsibilities: ['finishing', 'movement'],
        },
      ],
      variations: [
        {
          name: '4-4-2 Diamond',
          hebrewName: '4-4-2 יהלום',
          description: 'Diamond midfield with attacking midfielder',
          modifications: {
            midfield_shape: 'diamond',
            attacking_midfielder: true,
          },
        },
        {
          name: '4-4-2 Flat',
          hebrewName: '4-4-2 שטוח',
          description: 'Flat midfield line for defensive stability',
          modifications: { midfield_shape: 'flat', defensive_focus: true },
        },
      ],
      strengths: [
        {
          area: FieldZone.WIDE_AREAS,
          description: 'Excellent width and crossing opportunities',
          hebrewDescription: 'רוחב מעולה והזדמנויות מסירות רוחב',
          rating: 0.9,
        },
        {
          area: FieldZone.DEFENSIVE_THIRD,
          description: 'Solid defensive structure with good cover',
          hebrewDescription: 'מבנה הגנתי יציב עם כיסוי טוב',
          rating: 0.8,
        },
      ],
      weaknesses: [
        {
          area: FieldZone.CENTRAL_CHANNEL,
          description: 'Can be outnumbered in central midfield',
          hebrewDescription: 'יכול להיות במיעוט מספרי בקו האמצע המרכזי',
          severity: 0.7,
        },
      ],
      optimalConditions: {
        playerTypes: {
          strikers: ['target_man', 'poacher'],
          wingers: ['crosser', 'work_rate'],
          center_backs: ['aerial_strong', 'organizer'],
        },
        matchSituations: [
          'counter_attacking',
          'set_piece_situations',
          'direct_play',
        ],
        oppositionFormations: [
          FormationType.FOUR_THREE_THREE,
          FormationType.THREE_FIVE_TWO,
        ],
      },
      transitionMechanics: {
        attackingTransition: [
          'quick_wide_switches',
          'striker_support',
          'midfield_runners',
        ],
        defensiveTransition: [
          'immediate_pressure',
          'compact_shape',
          'channel_blocking',
        ],
        setToOpenPlay: [
          'second_ball_control',
          'wide_clearances',
          'counter_press',
        ],
      },
    };

    this.formationKnowledge.set('formation_442', formation442);

    // 4-3-3 Formation Knowledge
    const formation433: FormationKnowledge = {
      id: 'formation_433',
      category: KnowledgeCategory.FORMATIONS,
      name: '4-3-3 Formation',
      hebrewName: 'מערך 4-3-3',
      description:
        'Modern attacking formation with midfield triangle and front three',
      hebrewDescription: 'מערך התקפי מודרני עם משולש קו אמצע ושלישיית חזית',
      era: TacticalEra.CONTEMPORARY,
      philosophy: [
        TacticalPhilosophy.POSSESSION_BASED,
        TacticalPhilosophy.HIGH_PRESSING,
        TacticalPhilosophy.TIKI_TAKA,
      ],
      complexity: 'advanced',
      effectiveness: {
        possession_play: 0.9,
        high_pressing: 0.8,
        wing_play: 0.8,
        central_dominance: 0.7,
        attacking_fluidity: 0.9,
      },
      prerequisites: [
        'advanced_pressing',
        'positional_play',
        'technical_ability',
      ],
      relatedItems: ['pattern_tiki_taka', 'false_nine', 'inverted_wingers'],
      contradictions: ['direct_play', 'route_one_football'],
      metadata: {
        popularizedBy: ['Pep Guardiola', 'Barcelona', 'Ajax'],
        firstUsed: '1970s Ajax',
        peakPopularity: '2000s-present',
        modernAdaptations: [
          'False 9',
          'Inverted Wingers',
          'Attacking Fullbacks',
        ],
        successfulTeams: [
          'Barcelona 2008-2012',
          'Manchester City',
          'Liverpool under Klopp',
        ],
      },
      tacticalPrinciples: {
        attacking: ['positional_rotation', 'overloads', 'width_and_depth'],
        defending: ['high_press', 'coordinated_pressure', 'quick_recovery'],
        transitions: [
          'immediate_counter_press',
          'quick_combinations',
          'vertical_passes',
        ],
      },
      implementationGuide: {
        playerRequirements: {
          wingers: ['pace', 'dribbling', 'pressing_intensity'],
          central_midfielder: [
            'technical_ability',
            'press_resistance',
            'vision',
          ],
          fullbacks: ['attacking_instinct', 'stamina', 'crossing'],
        },
        trainingMethods: [
          'positional_games',
          'pressing_triggers',
          'combination_play',
        ],
        commonMistakes: [
          'wide_players_isolation',
          'midfield_overrun',
          'defensive_gaps',
        ],
        adaptations: ['narrow_433', 'asymmetric_433', 'fluid_433'],
      },
      formation: FormationType.FOUR_THREE_THREE,
      playerPositions: [
        {
          playerId: 'gk',
          playerName: 'Goalkeeper',
          position: 'GK',
          x: 50,
          y: 5,
          role: 'sweeper_keeper',
          responsibilities: ['distribution', 'sweeping'],
        },
        {
          playerId: 'rb',
          playerName: 'Right Back',
          position: 'RB',
          x: 80,
          y: 20,
          role: 'attacking_fullback',
          responsibilities: ['overlap', 'width'],
        },
        {
          playerId: 'rcb',
          playerName: 'Right CB',
          position: 'CB',
          x: 60,
          y: 15,
          role: 'ball_playing_defender',
          responsibilities: ['build_up', 'pressing'],
        },
        {
          playerId: 'lcb',
          playerName: 'Left CB',
          position: 'CB',
          x: 40,
          y: 15,
          role: 'ball_playing_defender',
          responsibilities: ['build_up', 'covering'],
        },
        {
          playerId: 'lb',
          playerName: 'Left Back',
          position: 'LB',
          x: 20,
          y: 20,
          role: 'attacking_fullback',
          responsibilities: ['overlap', 'width'],
        },
        {
          playerId: 'dm',
          playerName: 'Defensive Mid',
          position: 'DM',
          x: 50,
          y: 35,
          role: 'holding_midfielder',
          responsibilities: ['screening', 'distribution'],
        },
        {
          playerId: 'rcm',
          playerName: 'Right CM',
          position: 'CM',
          x: 65,
          y: 50,
          role: 'box_to_box',
          responsibilities: ['pressing', 'support'],
        },
        {
          playerId: 'lcm',
          playerName: 'Left CM',
          position: 'CM',
          x: 35,
          y: 50,
          role: 'playmaker',
          responsibilities: ['creativity', 'pressing'],
        },
        {
          playerId: 'rw',
          playerName: 'Right Winger',
          position: 'RW',
          x: 85,
          y: 70,
          role: 'inverted_winger',
          responsibilities: ['cutting_inside', 'pressing'],
        },
        {
          playerId: 'st',
          playerName: 'Striker',
          position: 'ST',
          x: 50,
          y: 85,
          role: 'false_nine',
          responsibilities: ['dropping_deep', 'link_play'],
        },
        {
          playerId: 'lw',
          playerName: 'Left Winger',
          position: 'LW',
          x: 15,
          y: 70,
          role: 'inverted_winger',
          responsibilities: ['cutting_inside', 'pressing'],
        },
      ],
      variations: [
        {
          name: '4-3-3 False 9',
          hebrewName: '4-3-3 תשעה כוזב',
          description: 'Central striker drops deep to create space',
          modifications: {
            striker_role: 'false_nine',
            midfield_overload: true,
          },
        },
        {
          name: '4-3-3 High Press',
          hebrewName: '4-3-3 לחץ גבוה',
          description: 'Aggressive high pressing system',
          modifications: { pressing_intensity: 'high', defensive_line: 'high' },
        },
      ],
      strengths: [
        {
          area: FieldZone.MIDDLE_THIRD,
          description: 'Midfield triangle provides excellent control',
          hebrewDescription: 'משולש קו האמצע מספק שליטה מעולה',
          rating: 0.9,
        },
        {
          area: FieldZone.ATTACKING_THIRD,
          description: 'Multiple attacking threats and combinations',
          hebrewDescription: 'איומי התקפה מרובים וצירופים',
          rating: 0.8,
        },
      ],
      weaknesses: [
        {
          area: FieldZone.DEFENSIVE_THIRD,
          description: 'Can be vulnerable to quick counter-attacks',
          hebrewDescription: 'יכול להיות פגיע לנגדיות מהירות',
          severity: 0.6,
        },
      ],
      optimalConditions: {
        playerTypes: {
          wingers: ['technical', 'pace', 'work_rate'],
          midfielder: ['technical', 'intelligent', 'press_resistant'],
          fullbacks: ['attacking_minded', 'stamina', 'crossing'],
        },
        matchSituations: [
          'possession_dominance',
          'high_pressing',
          'technical_play',
        ],
        oppositionFormations: [
          FormationType.FOUR_FOUR_TWO,
          FormationType.FIVE_THREE_TWO,
        ],
      },
      transitionMechanics: {
        attackingTransition: [
          'immediate_pressing',
          'quick_combinations',
          'overloads',
        ],
        defensiveTransition: [
          'counter_press',
          'coordinated_retreat',
          'compact_shape',
        ],
        setToOpenPlay: [
          'immediate_pressure',
          'second_ball_win',
          'quick_restart',
        ],
      },
    };

    this.formationKnowledge.set('formation_433', formation433);
  }

  /**
   * Initialize tactical pattern knowledge
   */
  private initializePatternKnowledge(): void {
    // Tiki-Taka Pattern
    const tikitaka: PatternKnowledge = {
      id: 'pattern_tiki_taka',
      category: KnowledgeCategory.TACTICAL_PATTERNS,
      name: 'Tiki-Taka',
      hebrewName: 'טיקי-טקה',
      description:
        'Short passing style emphasizing possession, movement, and technical ability',
      hebrewDescription: 'סגנון מסירות קצרות המדגיש החזקה, תנועה ויכולת טכנית',
      era: TacticalEra.CONTEMPORARY,
      philosophy: [
        TacticalPhilosophy.POSSESSION_BASED,
        TacticalPhilosophy.TIKI_TAKA,
      ],
      complexity: 'expert',
      effectiveness: {
        possession_retention: 0.95,
        technical_teams: 0.9,
        patient_buildup: 0.85,
        press_resistance: 0.8,
      },
      prerequisites: [
        'exceptional_technique',
        'tactical_intelligence',
        'positional_play',
      ],
      relatedItems: ['formation_433', 'positional_play', 'false_nine'],
      contradictions: ['direct_play', 'route_one', 'long_ball_game'],
      metadata: {
        creator: 'Johan Cruyff',
        popularizedBy: ['Pep Guardiola', 'Barcelona', 'Spain National Team'],
        firstUsed: '1990s Barcelona',
        peakPopularity: '2008-2012',
        modernAdaptations: ['Positional Play', 'Juego de Posición'],
        successfulTeams: [
          'Barcelona 2008-2012',
          'Spain 2008-2012',
          'Manchester City',
        ],
      },
      tacticalPrinciples: {
        attacking: ['short_passing', 'constant_movement', 'triangulation'],
        defending: ['immediate_press', 'ball_recovery', 'possession_regain'],
        transitions: ['quick_counter_press', 'circulation', 'patient_buildup'],
      },
      implementationGuide: {
        playerRequirements: {
          all_players: [
            'exceptional_first_touch',
            'quick_decision_making',
            'spatial_awareness',
          ],
          midfielders: ['press_resistance', 'vision', 'technical_excellence'],
          defenders: ['ball_playing_ability', 'composure', 'passing_range'],
        },
        trainingMethods: [
          'rondo_exercises',
          'positional_games',
          'technical_circuits',
        ],
        commonMistakes: [
          'over_elaboration',
          'lack_of_penetration',
          'slow_tempo',
        ],
        adaptations: [
          'vertical_tiki_taka',
          'direct_tiki_taka',
          'wide_tiki_taka',
        ],
      },
      pattern: TacticalPattern.TIKI_TAKA,
      phases: [
        {
          phase: 'circulation',
          description: 'Ball circulation to draw out opponents',
          hebrewDescription: 'סיבוב כדור למשיכת יריבים',
          keyActions: ['short_passes', 'movement_off_ball', 'space_creation'],
          timing: 10,
          successCriteria: [
            'maintain_possession',
            'draw_pressure',
            'create_gaps',
          ],
        },
        {
          phase: 'penetration',
          description: 'Quick penetrating pass through created space',
          hebrewDescription: 'מסירת חדירה מהירה דרך המרחב שנוצר',
          keyActions: ['vertical_pass', 'third_man_run', 'quick_combination'],
          timing: 3,
          successCriteria: [
            'break_lines',
            'create_advantage',
            'maintain_tempo',
          ],
        },
        {
          phase: 'progression',
          description: 'Continue movement into dangerous areas',
          hebrewDescription: 'המשך התקדמות לאזורים מסוכנים',
          keyActions: ['support_runs', 'overlaps', 'final_ball'],
          timing: 5,
          successCriteria: [
            'create_chances',
            'maintain_possession',
            'numerical_advantage',
          ],
        },
      ],
      variations: [
        {
          name: 'Vertical Tiki-Taka',
          hebrewName: 'טיקי-טקה אנכי',
          modifications: [
            'faster_vertical_passes',
            'quicker_tempo',
            'direct_approach',
          ],
          effectiveness: 0.8,
        },
        {
          name: 'Wide Tiki-Taka',
          hebrewName: 'טיקי-טקה רחב',
          modifications: [
            'emphasis_on_width',
            'fullback_involvement',
            'cross_completion',
          ],
          effectiveness: 0.75,
        },
      ],
      counters: [
        {
          method: 'High Intensity Pressing',
          hebrewMethod: 'לחץ עצימות גבוהה',
          effectiveness: 0.7,
          implementation: [
            'man_to_man_pressing',
            'quick_closing',
            'force_errors',
          ],
        },
        {
          method: 'Deep Defensive Block',
          hebrewMethod: 'בלוק הגנתי עמוק',
          effectiveness: 0.6,
          implementation: ['compact_shape', 'deny_space', 'counter_attack'],
        },
      ],
      optimalFormations: [
        FormationType.FOUR_THREE_THREE,
        FormationType.FOUR_TWO_THREE_ONE,
      ],
      playerSkillRequirements: {
        technical: ['first_touch', 'passing_accuracy', 'ball_control'],
        mental: ['decision_making', 'spatial_awareness', 'patience'],
        physical: ['agility', 'acceleration', 'stamina'],
      },
    };

    this.patternKnowledge.set('pattern_tiki_taka', tikitaka);

    // Gegenpressing Pattern
    const gegenpressing: PatternKnowledge = {
      id: 'pattern_gegenpressing',
      category: KnowledgeCategory.TACTICAL_PATTERNS,
      name: 'Gegenpressing',
      hebrewName: 'גגנפרסינג',
      description: 'Immediate high-intensity pressing after losing possession',
      hebrewDescription: 'לחץ מיידי בעצימות גבוהה לאחר איבוד החזקה',
      era: TacticalEra.CURRENT,
      philosophy: [
        TacticalPhilosophy.HIGH_PRESSING,
        TacticalPhilosophy.GEGENPRESSING,
      ],
      complexity: 'advanced',
      effectiveness: {
        ball_recovery: 0.8,
        counter_prevention: 0.85,
        high_intensity: 0.9,
        team_coordination: 0.75,
      },
      prerequisites: [
        'high_fitness',
        'team_coordination',
        'aggressive_mentality',
      ],
      relatedItems: ['high_pressing', 'counter_press', 'intensive_running'],
      contradictions: ['possession_based_patient', 'conservative_approach'],
      metadata: {
        creator: 'Ralf Rangnick',
        popularizedBy: ['Jürgen Klopp', 'RB Leipzig', 'Liverpool'],
        firstUsed: '1990s German Football',
        peakPopularity: '2010s-present',
        modernAdaptations: ['Counter-Counter-Press', 'Selective Pressing'],
        successfulTeams: [
          'Liverpool under Klopp',
          'RB Leipzig',
          'Borussia Dortmund',
        ],
      },
      tacticalPrinciples: {
        attacking: ['quick_transitions', 'immediate_pressure', 'ball_recovery'],
        defending: [
          'coordinated_pressing',
          'cutting_passing_lanes',
          'aggressive_tackles',
        ],
        transitions: [
          'instant_reaction',
          'collective_movement',
          'press_triggers',
        ],
      },
      implementationGuide: {
        playerRequirements: {
          all_players: [
            'high_work_rate',
            'aggressive_pressing',
            'quick_reactions',
          ],
          forwards: ['pressing_intelligence', 'stamina', 'leadership'],
          midfielders: [
            'box_to_box_ability',
            'reading_game',
            'physical_strength',
          ],
        },
        trainingMethods: [
          'pressing_drills',
          'transition_training',
          'fitness_conditioning',
        ],
        commonMistakes: [
          'uncoordinated_pressing',
          'energy_waste',
          'gaps_creation',
        ],
        adaptations: [
          'selective_gegenpressing',
          'positional_gegenpressing',
          'triggered_gegenpressing',
        ],
      },
      pattern: TacticalPattern.GEGENPRESSING,
      phases: [
        {
          phase: 'trigger_moment',
          description: 'Moment of ball loss recognition',
          hebrewDescription: 'רגע זיהוי איבוד הכדור',
          keyActions: [
            'immediate_recognition',
            'closest_player_pressure',
            'signal_team',
          ],
          timing: 1,
          successCriteria: [
            'quick_reaction',
            'coordinated_response',
            'prevent_escape',
          ],
        },
        {
          phase: 'collective_press',
          description: 'Coordinated team pressing movement',
          hebrewDescription: 'תנועת לחץ קבוצתית מתואמת',
          keyActions: ['surround_ball', 'cut_passing_lanes', 'force_errors'],
          timing: 4,
          successCriteria: [
            'numerical_superiority',
            'limit_options',
            'create_turnover',
          ],
        },
        {
          phase: 'ball_recovery',
          description: 'Win ball back and quick transition',
          hebrewDescription: 'החזרת הכדור ומעבר מהיר',
          keyActions: [
            'win_ball',
            'quick_distribution',
            'exploit_disorganization',
          ],
          timing: 3,
          successCriteria: [
            'regain_possession',
            'quick_attack',
            'maintain_momentum',
          ],
        },
      ],
      variations: [
        {
          name: 'Selective Gegenpressing',
          hebrewName: 'גגנפרסינג סלקטיבי',
          modifications: [
            'choose_pressing_moments',
            'energy_conservation',
            'tactical_triggers',
          ],
          effectiveness: 0.85,
        },
        {
          name: 'Six-Second Rule',
          hebrewName: 'כלל שש השניות',
          modifications: [
            'time_limited_pressing',
            'immediate_intensity',
            'quick_recovery',
          ],
          effectiveness: 0.8,
        },
      ],
      counters: [
        {
          method: 'Quick Long Passes',
          hebrewMethod: 'מסירות ארוכות מהירות',
          effectiveness: 0.7,
          implementation: [
            'bypass_press',
            'quick_distribution',
            'exploit_space',
          ],
        },
        {
          method: 'Calm Possession',
          hebrewMethod: 'החזקה רגועה',
          effectiveness: 0.6,
          implementation: [
            'patient_buildup',
            'technical_ability',
            'press_resistance',
          ],
        },
      ],
      optimalFormations: [
        FormationType.FOUR_THREE_THREE,
        FormationType.FOUR_TWO_THREE_ONE,
      ],
      playerSkillRequirements: {
        physical: ['stamina', 'speed', 'strength'],
        mental: ['aggression', 'teamwork', 'reading_game'],
        technical: ['pressing_technique', 'quick_passing', 'ball_winning'],
      },
    };

    this.patternKnowledge.set('pattern_gegenpressing', gegenpressing);
  }

  /**
   * Initialize tactical scenarios
   */
  private initializeTacticalScenarios(): void {
    // Losing with 15 minutes remaining
    const comebackScenario: TacticalScenario = {
      id: 'scenario_comeback_15min',
      name: 'Comeback Situation',
      hebrewName: 'מצב קאמבק',
      description:
        'Team is losing 0-1 with 15 minutes remaining in important match',
      hebrewDescription: 'הקבוצה מפסידה 0-1 עם 15 דקות נותרות במשחק חשוב',
      context: {
        matchPhase: 'second_half',
        scoreline: '0-1',
        timeRemaining: 15,
        matchImportance: 'high',
        venue: 'home',
      },
      challengingFactors: [
        'time_pressure',
        'opponent_defensive',
        'crowd_pressure',
        'fatigue',
      ],
      recommendedKnowledge: [
        'formation_attacking_changes',
        'pressing_intensity',
        'set_piece_focus',
      ],
      successMetrics: {
        shots_on_target: 6,
        corners_won: 4,
        possession_final_third: 0.7,
        xG_created: 1.5,
      },
      alternativeApproaches: [
        {
          approach: 'Formation Change to 3-4-3',
          pros: ['more_attackers', 'width_creation', 'crossing_opportunities'],
          cons: ['defensive_vulnerability', 'gaps_in_midfield'],
          effectiveness: 0.75,
        },
        {
          approach: 'Long Ball Strategy',
          pros: ['direct_approach', 'aerial_threat', 'quick_attacks'],
          cons: ['low_possession', 'predictable', 'energy_intensive'],
          effectiveness: 0.6,
        },
      ],
    };

    this.tacticalScenarios.set('scenario_comeback_15min', comebackScenario);
  }

  /**
   * Initialize specialized tactical knowledge
   */
  private initializeSpecializedKnowledge(): void {
    // Set Piece Knowledge
    const setpieceCorners: TacticalKnowledgeItem = {
      id: 'setpiece_corner_variations',
      category: KnowledgeCategory.SET_PIECES,
      name: 'Corner Kick Variations',
      hebrewName: 'וריאציות בעיטות פינה',
      description: 'Various corner kick strategies and execution methods',
      hebrewDescription: 'אסטרטגיות שונות של בעיטות פינה ושיטות ביצוע',
      era: TacticalEra.CURRENT,
      philosophy: [TacticalPhilosophy.STRUCTURED_APPROACH],
      complexity: 'intermediate',
      effectiveness: {
        aerial_teams: 0.8,
        technical_teams: 0.7,
        surprise_factor: 0.85,
      },
      prerequisites: [
        'set_piece_practice',
        'aerial_ability',
        'movement_coordination',
      ],
      relatedItems: ['formation_defensive_organization', 'aerial_duels'],
      contradictions: [],
      metadata: {
        popularizedBy: ['Modern Football', 'Set Piece Specialists'],
        successfulTeams: ['Atletico Madrid', 'Stoke City', 'Leicester City'],
      },
      tacticalPrinciples: {
        attacking: ['movement_variety', 'delivery_quality', 'second_ball'],
        defending: ['zonal_marking', 'man_marking', 'goalkeeper_command'],
        transitions: ['quick_restart', 'counter_attack_preparation'],
      },
      implementationGuide: {
        playerRequirements: {
          delivery: ['crossing_accuracy', 'technique', 'variety'],
          attackers: ['aerial_ability', 'movement', 'finishing'],
          defenders: ['marking_discipline', 'communication', 'clearing'],
        },
        trainingMethods: [
          'delivery_practice',
          'movement_drills',
          'defensive_organization',
        ],
        commonMistakes: [
          'predictable_delivery',
          'poor_movement',
          'weak_defending',
        ],
        adaptations: ['short_corners', 'driven_corners', 'back_post_corners'],
      },
    };

    this.knowledgeItems.set('setpiece_corner_variations', setpieceCorners);
  }

  /**
   * Build search indices for quick lookup
   */
  private buildSearchIndices(): void {
    // English search index
    for (const [id, item] of this.knowledgeItems) {
      const terms = [
        ...item.name.toLowerCase().split(' '),
        ...item.description.toLowerCase().split(' '),
        ...item.tacticalPrinciples.attacking,
        ...item.tacticalPrinciples.defending,
        item.category,
        item.era,
        ...item.philosophy,
      ];

      for (const term of terms) {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, new Set());
        }
        this.searchIndex.get(term)!.add(id);
      }
    }

    // Hebrew search index
    for (const [id, item] of this.knowledgeItems) {
      const hebrewTerms = [
        ...item.hebrewName.split(' '),
        ...item.hebrewDescription.split(' '),
      ];

      for (const term of hebrewTerms) {
        if (!this.hebrewSearchIndex.has(term)) {
          this.hebrewSearchIndex.set(term, new Set());
        }
        this.hebrewSearchIndex.get(term)!.add(id);
      }
    }

    // Formation knowledge indices
    for (const [id, formation] of this.formationKnowledge) {
      const terms = [
        formation.formation,
        ...formation.variations.map(v => v.name.toLowerCase()),
        ...formation.optimalConditions.matchSituations,
      ];

      for (const term of terms) {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, new Set());
        }
        this.searchIndex.get(term)!.add(id);
      }
    }

    // Pattern knowledge indices
    for (const [id, pattern] of this.patternKnowledge) {
      const terms = [
        pattern.pattern,
        ...pattern.variations.map(v => v.name.toLowerCase()),
        ...pattern.optimalFormations.map(f => f.toLowerCase()),
      ];

      for (const term of terms) {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, new Set());
        }
        this.searchIndex.get(term)!.add(id);
      }
    }
  }

  /**
   * Build concept relationship graph
   */
  private buildConceptGraph(): void {
    for (const [id, item] of this.knowledgeItems) {
      this.conceptGraph.set(id, new Set(item.relatedItems));

      // Add reverse relationships
      for (const relatedId of item.relatedItems) {
        if (!this.conceptGraph.has(relatedId)) {
          this.conceptGraph.set(relatedId, new Set());
        }
        this.conceptGraph.get(relatedId)!.add(id);
      }
    }
  }

  /**
   * Search tactical knowledge with advanced filtering
   */
  public searchKnowledge(
    query: string,
    options: KnowledgeSearchOptions = {}
  ): KnowledgeSearchResult[] {
    const results: KnowledgeSearchResult[] = [];
    const searchTerms = query.toLowerCase().split(' ');
    const isHebrew = /[\u0590-\u05FF]/.test(query);

    const candidateIds = new Set<string>();

    // Search in appropriate index
    const searchIndex = isHebrew ? this.hebrewSearchIndex : this.searchIndex;

    for (const term of searchTerms) {
      if (searchIndex.has(term)) {
        for (const id of searchIndex.get(term)!) {
          candidateIds.add(id);
        }
      }
    }

    // Score and filter candidates
    for (const id of candidateIds) {
      const item = this.getKnowledgeItem(id);
      if (!item) continue;

      // Apply filters
      if (options.categories && !options.categories.includes(item.category))
        continue;
      if (options.complexity && !options.complexity.includes(item.complexity))
        continue;
      if (options.era && !options.era.includes(item.era)) continue;
      if (
        options.philosophy &&
        !item.philosophy.some(p => options.philosophy!.includes(p))
      )
        continue;

      const relevanceScore = this.calculateRelevanceScore(
        item,
        searchTerms,
        isHebrew
      );

      if (relevanceScore > 0.3) {
        results.push({
          item,
          relevanceScore,
          matchedTerms: this.getMatchedTerms(item, searchTerms, isHebrew),
          contextualFactors: this.getContextualFactors(item, options),
        });
      }
    }

    // Sort by relevance and limit results
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    if (options.maxResults) {
      return results.slice(0, options.maxResults);
    }

    return results;
  }

  /**
   * Get tactical recommendations for specific scenario
   */
  public getScenarioRecommendations(
    scenarioId: string,
    contextFactors?: Record<string, any>
  ): Array<{
    knowledge: TacticalKnowledgeItem;
    applicability: number;
    adaptations: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const scenario = this.tacticalScenarios.get(scenarioId);
    if (!scenario) return [];

    const recommendations: Array<{
      knowledge: TacticalKnowledgeItem;
      applicability: number;
      adaptations: string[];
      priority: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    for (const knowledgeId of scenario.recommendedKnowledge) {
      const knowledge = this.getKnowledgeItem(knowledgeId);
      if (!knowledge) continue;

      const applicability = this.calculateApplicability(
        knowledge,
        scenario,
        contextFactors
      );
      const adaptations = this.suggestAdaptations(knowledge, scenario);
      const priority = this.determinePriority(
        knowledge,
        scenario,
        applicability
      );

      recommendations.push({
        knowledge,
        applicability,
        adaptations,
        priority,
      });
    }

    return recommendations.sort((a, b) => b.applicability - a.applicability);
  }

  /**
   * Get formation analysis with knowledge base insights
   */
  public async analyzeFormationWithKnowledge(
    formation: FormationType,
    playerPositions: PlayerPosition[],
    contextData?: any
  ): Promise<{
    analysis: FormationAnalysisResult;
    knowledgeInsights: Array<{
      knowledge: FormationKnowledge;
      relevance: number;
      recommendations: string[];
    }>;
    alternativeFormations: Array<{
      formation: FormationType;
      knowledge: FormationKnowledge;
      effectiveness: number;
      reasoning: string;
    }>;
  }> {
    const analysis = await this.formationAnalyzer.analyzeFormation(
      {
        teamScope: { teamId: 'analysis' },
        timeScope: { matchId: 'current' },
        analysisTypes: [],
      },
      playerPositions,
      contextData
    );

    const knowledgeInsights: Array<{
      knowledge: FormationKnowledge;
      relevance: number;
      recommendations: string[];
    }> = [];

    const alternativeFormations: Array<{
      formation: FormationType;
      knowledge: FormationKnowledge;
      effectiveness: number;
      reasoning: string;
    }> = [];

    // Find relevant formation knowledge
    for (const [id, formationKnowledge] of this.formationKnowledge) {
      if (formationKnowledge.formation === formation) {
        knowledgeInsights.push({
          knowledge: formationKnowledge,
          relevance: 1.0,
          recommendations: this.generateFormationRecommendations(
            formationKnowledge,
            analysis
          ),
        });
      }
    }

    // Suggest alternative formations based on weaknesses
    for (const weakness of analysis.weaknesses) {
      const alternatives = this.findFormationsForWeakness(weakness.zone);
      for (const alt of alternatives) {
        if (alt.formation !== formation) {
          alternativeFormations.push({
            formation: alt.formation,
            knowledge: alt,
            effectiveness: this.calculateFormationEffectiveness(alt, weakness),
            reasoning: `Addresses weakness in ${weakness.zone}: ${weakness.description}`,
          });
        }
      }
    }

    return {
      analysis,
      knowledgeInsights,
      alternativeFormations: alternativeFormations.slice(0, 3), // Top 3 alternatives
    };
  }

  // Helper methods

  private getKnowledgeItem(id: string): TacticalKnowledgeItem | undefined {
    return (
      this.knowledgeItems.get(id) ||
      this.formationKnowledge.get(id) ||
      this.patternKnowledge.get(id)
    );
  }

  private calculateRelevanceScore(
    item: TacticalKnowledgeItem,
    searchTerms: string[],
    isHebrew: boolean
  ): number {
    let score = 0;
    const searchText = isHebrew
      ? `${item.hebrewName} ${item.hebrewDescription}`.toLowerCase()
      : `${item.name} ${item.description}`.toLowerCase();

    for (const term of searchTerms) {
      if (searchText.includes(term)) {
        score += 0.3;
      }
    }

    // Boost for exact matches
    if (searchText.includes(searchTerms.join(' '))) {
      score += 0.4;
    }

    return Math.min(score, 1.0);
  }

  private getMatchedTerms(
    item: TacticalKnowledgeItem,
    searchTerms: string[],
    isHebrew: boolean
  ): string[] {
    const matched: string[] = [];
    const searchText = isHebrew
      ? `${item.hebrewName} ${item.hebrewDescription}`
      : `${item.name} ${item.description}`;

    for (const term of searchTerms) {
      if (searchText.toLowerCase().includes(term)) {
        matched.push(term);
      }
    }

    return matched;
  }

  private getContextualFactors(
    item: TacticalKnowledgeItem,
    options: KnowledgeSearchOptions
  ): string[] {
    const factors: string[] = [];

    factors.push(`era_${item.era}`);
    factors.push(`complexity_${item.complexity}`);
    factors.push(...item.philosophy.map(p => `philosophy_${p}`));

    return factors;
  }

  private calculateApplicability(
    knowledge: TacticalKnowledgeItem,
    scenario: TacticalScenario,
    contextFactors?: Record<string, any>
  ): number {
    let applicability = 0.5;

    // Match scenario context with knowledge effectiveness
    for (const [context, effectiveness] of Object.entries(
      knowledge.effectiveness
    )) {
      if (scenario.challengingFactors.includes(context)) {
        applicability += effectiveness * 0.3;
      }
    }

    // Consider match importance
    if (
      scenario.context.matchImportance === 'critical' &&
      knowledge.complexity === 'expert'
    ) {
      applicability += 0.2;
    }

    return Math.min(applicability, 1.0);
  }

  private suggestAdaptations(
    knowledge: TacticalKnowledgeItem,
    scenario: TacticalScenario
  ): string[] {
    const adaptations: string[] = [];

    if (scenario.context.timeRemaining < 20) {
      adaptations.push('increase_urgency');
      adaptations.push('simplified_execution');
    }

    if (scenario.context.matchImportance === 'high') {
      adaptations.push('risk_management');
      adaptations.push('conservative_approach');
    }

    return adaptations;
  }

  private determinePriority(
    knowledge: TacticalKnowledgeItem,
    scenario: TacticalScenario,
    applicability: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (applicability > 0.8 && scenario.context.matchImportance === 'high')
      return 'critical';
    if (applicability > 0.6) return 'high';
    if (applicability > 0.4) return 'medium';
    return 'low';
  }

  private generateFormationRecommendations(
    formation: FormationKnowledge,
    analysis: FormationAnalysisResult
  ): string[] {
    const recommendations: string[] = [];

    for (const weakness of analysis.weaknesses) {
      const relevant = formation.weaknesses.find(w => w.area === weakness.zone);
      if (relevant) {
        recommendations.push(
          `Address ${
            weakness.zone
          } weakness through ${formation.transitionMechanics.defensiveTransition.join(
            ', '
          )}`
        );
      }
    }

    for (const strength of analysis.strengths) {
      const relevant = formation.strengths.find(s => s.area === strength.zone);
      if (relevant) {
        recommendations.push(
          `Leverage ${
            strength.zone
          } strength with ${formation.tacticalPrinciples.attacking.join(', ')}`
        );
      }
    }

    return recommendations;
  }

  private findFormationsForWeakness(zone: FieldZone): FormationKnowledge[] {
    const suitable: FormationKnowledge[] = [];

    for (const [id, formation] of this.formationKnowledge) {
      const hasStrengthInZone = formation.strengths.some(
        s => s.area === zone && s.rating > 0.7
      );
      if (hasStrengthInZone) {
        suitable.push(formation);
      }
    }

    return suitable;
  }

  private calculateFormationEffectiveness(
    formation: FormationKnowledge,
    weakness: any
  ): number {
    const strength = formation.strengths.find(s => s.area === weakness.zone);
    return strength ? strength.rating : 0.5;
  }

  /**
   * Get knowledge base statistics
   */
  public getStatistics(): {
    totalItems: number;
    formations: number;
    patterns: number;
    scenarios: number;
    categories: Record<KnowledgeCategory, number>;
    eras: Record<TacticalEra, number>;
    philosophies: Record<TacticalPhilosophy, number>;
  } {
    const stats = {
      totalItems:
        this.knowledgeItems.size +
        this.formationKnowledge.size +
        this.patternKnowledge.size,
      formations: this.formationKnowledge.size,
      patterns: this.patternKnowledge.size,
      scenarios: this.tacticalScenarios.size,
      categories: {} as Record<KnowledgeCategory, number>,
      eras: {} as Record<TacticalEra, number>,
      philosophies: {} as Record<TacticalPhilosophy, number>,
    };

    // Initialize counters
    Object.values(KnowledgeCategory).forEach(
      cat => (stats.categories[cat] = 0)
    );
    Object.values(TacticalEra).forEach(era => (stats.eras[era] = 0));
    Object.values(TacticalPhilosophy).forEach(
      phil => (stats.philosophies[phil] = 0)
    );

    // Count categories, eras, and philosophies
    const allItems = [
      ...Array.from(this.knowledgeItems.values()),
      ...Array.from(this.formationKnowledge.values()),
      ...Array.from(this.patternKnowledge.values()),
    ];

    for (const item of allItems) {
      stats.categories[item.category]++;
      stats.eras[item.era]++;
      item.philosophy.forEach(phil => stats.philosophies[phil]++);
    }

    return stats;
  }
}
