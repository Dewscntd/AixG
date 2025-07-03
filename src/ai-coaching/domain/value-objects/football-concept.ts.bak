/**
 * Football Concept Value Object
 * Semantic modeling of football terminology and tactical concepts with Hebrew support
 */

export enum ConceptCategory {
  PLAYER_ROLE = 'player_role',
  TACTICAL_FORMATION = 'tactical_formation',
  PLAYING_STYLE = 'playing_style',
  FIELD_ZONE = 'field_zone',
  TECHNICAL_SKILL = 'technical_skill',
  PHYSICAL_ATTRIBUTE = 'physical_attribute',
  MENTAL_QUALITY = 'mental_quality',
  TACTICAL_ACTION = 'tactical_action',
  GAME_PHASE = 'game_phase',
  SET_PIECE = 'set_piece',
  MATCH_SITUATION = 'match_situation',
  COACHING_INSTRUCTION = 'coaching_instruction',
  PERFORMANCE_METRIC = 'performance_metric',
  TEAM_STRATEGY = 'team_strategy',
  OPPONENT_ANALYSIS = 'opponent_analysis',
}

export enum ConceptDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  PROFESSIONAL = 'professional',
}

export enum ConceptFrequency {
  VERY_RARE = 'very_rare', // < 1% of matches
  RARE = 'rare', // 1-5% of matches
  UNCOMMON = 'uncommon', // 5-15% of matches
  COMMON = 'common', // 15-40% of matches
  FREQUENT = 'frequent', // 40-70% of matches
  VERY_FREQUENT = 'very_frequent', // > 70% of matches
}

export enum ContextualRelevance {
  ATTACKING = 'attacking',
  DEFENDING = 'defending',
  TRANSITION = 'transition',
  SET_PIECE = 'set_piece',
  TRAINING = 'training',
  MATCH_ANALYSIS = 'match_analysis',
  PLAYER_DEVELOPMENT = 'player_development',
  TACTICAL_PLANNING = 'tactical_planning',
}

export interface ConceptTranslation {
  language: string;
  term: string;
  pronunciation?: string;
  alternativeTerms: string[];
  colloquialTerms: string[];
  formalTerms: string[];
  regionalVariations: Record<string, string>;
}

export interface ConceptRelationship {
  type:
    | 'synonym'
    | 'antonym'
    | 'hypernym'
    | 'hyponym'
    | 'meronym'
    | 'holonym'
    | 'causation'
    | 'prerequisite'
    | 'enables'
    | 'conflicts';
  targetConceptId: string;
  strength: number; // 0-1
  bidirectional: boolean;
  contextDependent: boolean;
  description?: string;
  hebrewDescription?: string;
}

export interface TacticalSignificance {
  importance: number; // 0-1
  complexity: number; // 0-1
  coachingValue: number; // 0-1
  playerDevelopmentValue: number; // 0-1
  gameImpact: number; // 0-1
  tacticalDepth: number; // 0-1
  requires: string[]; // prerequisite concepts
  enables: string[]; // concepts this enables
  conflictsWith: string[]; // incompatible concepts
}

export interface ConceptMetrics {
  usageFrequency: ConceptFrequency;
  difficulty: ConceptDifficulty;
  ageAppropriate: {
    youth: boolean;
    amateur: boolean;
    semiprofessional: boolean;
    professional: boolean;
  };
  positionRelevance: Record<string, number>; // position -> relevance (0-1)
  formationRelevance: Record<string, number>; // formation -> relevance (0-1)
  gamePhaseRelevance: Record<string, number>; // phase -> relevance (0-1)
}

export interface ConceptExamples {
  textual: {
    english: string[];
    hebrew: string[];
  };
  situational: Array<{
    scenario: string;
    hebrewScenario: string;
    application: string;
    hebrewApplication: string;
    outcome: string;
    hebrewOutcome: string;
  }>;
  videoReferences?: Array<{
    description: string;
    hebrewDescription: string;
    timestamp?: string;
    url?: string;
    tags: string[];
  }>;
}

export interface ConceptData {
  id: string;
  category: ConceptCategory;
  englishTerm: string;
  hebrewTerm: string;
  translations: ConceptTranslation[];
  definition: {
    english: string;
    hebrew: string;
    technical: string;
    hebrewTechnical: string;
  };
  relationships: ConceptRelationship[];
  tacticalSignificance: TacticalSignificance;
  metrics: ConceptMetrics;
  contextualRelevance: ContextualRelevance[];
  examples: ConceptExamples;
  tags: string[];
  aliases: string[];
  hebrewAliases: string[];
  createdAt: Date;
  lastUpdated: Date;
  version: string;
  confidence: number; // 0-1
  verified: boolean;
  sources: string[];
}

export class FootballConcept {
  private readonly _data: ConceptData;

  // Comprehensive football concept database
  private static readonly CONCEPT_DATABASE = new Map<string, ConceptData>([
    // Player Roles
    [
      'goalkeeper',
      {
        id: 'goalkeeper',
        category: ConceptCategory.PLAYER_ROLE,
        englishTerm: 'Goalkeeper',
        hebrewTerm: 'שוער',
        translations: [
          {
            language: 'he',
            term: 'שוער',
            pronunciation: 'sho-er',
            alternativeTerms: ['שוער שערים', 'שומר השער'],
            colloquialTerms: ['השוער', 'הגולי'],
            formalTerms: ['שוער הקבוצה', 'שוער ראשי'],
            regionalVariations: {},
          },
        ],
        definition: {
          english:
            'Player who defends the goal and is the only player allowed to use hands within the penalty area',
          hebrew:
            'שחקן המגן על השער והוא השחקן היחיד המורשה להשתמש בידיים בתוך רחבת העונשין',
          technical:
            'Specialized defensive player with unique privileges and responsibilities for goal protection',
          hebrewTechnical:
            'שחקן הגנתי מתמחה עם זכויות ואחריות ייחודיות להגנה על השער',
        },
        relationships: [
          {
            type: 'prerequisite',
            targetConceptId: 'penalty_area',
            strength: 1.0,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'enables',
            targetConceptId: 'distribution',
            strength: 0.9,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'conflicts',
            targetConceptId: 'outfield_player',
            strength: 1.0,
            bidirectional: true,
            contextDependent: false,
          },
        ],
        tacticalSignificance: {
          importance: 1.0,
          complexity: 0.8,
          coachingValue: 0.9,
          playerDevelopmentValue: 0.8,
          gameImpact: 0.95,
          tacticalDepth: 0.7,
          requires: ['penalty_area', 'goal_line'],
          enables: ['distribution', 'sweeper_keeper', 'command_area'],
          conflictsWith: ['outfield_movement'],
        },
        metrics: {
          usageFrequency: ConceptFrequency.VERY_FREQUENT,
          difficulty: ConceptDifficulty.INTERMEDIATE,
          ageAppropriate: {
            youth: true,
            amateur: true,
            semiprofessional: true,
            professional: true,
          },
          positionRelevance: { GK: 1.0, CB: 0.3, FB: 0.2 },
          formationRelevance: { all: 1.0 },
          gamePhaseRelevance: { defending: 1.0, building: 0.8, attacking: 0.3 },
        },
        contextualRelevance: [
          ContextualRelevance.DEFENDING,
          ContextualRelevance.TRANSITION,
          ContextualRelevance.SET_PIECE,
        ],
        examples: {
          textual: {
            english: [
              'The goalkeeper made a crucial save',
              'Distribution from the keeper',
            ],
            hebrew: ['השוער ביצע הצלה קריטית', 'חלוקה מהשוער'],
          },
          situational: [
            {
              scenario: 'Cross into the penalty area',
              hebrewScenario: 'העברה לתוך רחבת העונשין',
              application: 'Goalkeeper commands the area and catches the ball',
              hebrewApplication: 'השוער שולט באזור ותופס את הכדור',
              outcome: 'Prevents scoring opportunity',
              hebrewOutcome: 'מונע הזדמנות לכבוש שער',
            },
          ],
        },
        tags: ['position', 'defensive', 'specialized', 'goal_protection'],
        aliases: ['keeper', 'goalie', 'gk'],
        hebrewAliases: ['שומר השער', 'הגולי'],
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: '1.0',
        confidence: 1.0,
        verified: true,
        sources: ['FIFA Laws of the Game', 'Tactical Analysis'],
      },
    ],

    // Tactical Formations
    [
      'four_four_two',
      {
        id: 'four_four_two',
        category: ConceptCategory.TACTICAL_FORMATION,
        englishTerm: '4-4-2 Formation',
        hebrewTerm: 'מערך 4-4-2',
        translations: [
          {
            language: 'he',
            term: 'מערך 4-4-2',
            pronunciation: 'ma-arakh ar-ba ar-ba sh-ta-yim',
            alternativeTerms: ['מערכת 4-4-2', 'מבנה 4-4-2'],
            colloquialTerms: ['ארבע-ארבע-שתיים'],
            formalTerms: ['מערך טקטי 4-4-2'],
            regionalVariations: {},
          },
        ],
        definition: {
          english:
            'A tactical formation with 4 defenders, 4 midfielders, and 2 forwards',
          hebrew: 'מערך טקטי עם 4 מגנים, 4 קשרים ו-2 חלוצים',
          technical:
            'Traditional formation emphasizing width in midfield and partnership in attack',
          hebrewTechnical: 'מערך מסורתי המדגיש רוחב בקו האמצע ושותפות בהתקפה',
        },
        relationships: [
          {
            type: 'enables',
            targetConceptId: 'wing_play',
            strength: 0.9,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'enables',
            targetConceptId: 'strike_partnership',
            strength: 0.95,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'conflicts',
            targetConceptId: 'false_nine',
            strength: 0.8,
            bidirectional: false,
            contextDependent: true,
          },
        ],
        tacticalSignificance: {
          importance: 0.9,
          complexity: 0.6,
          coachingValue: 0.8,
          playerDevelopmentValue: 0.9,
          gameImpact: 0.8,
          tacticalDepth: 0.7,
          requires: ['positional_discipline', 'wing_play', 'defensive_line'],
          enables: ['overlapping_runs', 'direct_play', 'crossing'],
          conflictsWith: ['overloads', 'false_nine'],
        },
        metrics: {
          usageFrequency: ConceptFrequency.COMMON,
          difficulty: ConceptDifficulty.BEGINNER,
          ageAppropriate: {
            youth: true,
            amateur: true,
            semiprofessional: true,
            professional: true,
          },
          positionRelevance: { all: 0.8, RM: 1.0, LM: 1.0, ST: 0.9 },
          formationRelevance: { '4-4-2': 1.0, '4-4-1-1': 0.8, '4-2-4': 0.7 },
          gamePhaseRelevance: {
            defending: 0.8,
            attacking: 0.9,
            transition: 0.7,
          },
        },
        contextualRelevance: [
          ContextualRelevance.TACTICAL_PLANNING,
          ContextualRelevance.TRAINING,
        ],
        examples: {
          textual: {
            english: [
              'Classic 4-4-2 with wide midfielders',
              'Defensive stability of 4-4-2',
            ],
            hebrew: ['4-4-2 קלאסי עם קשרי אגף', 'יציבות הגנתית של 4-4-2'],
          },
          situational: [
            {
              scenario: 'Team needs width and defensive stability',
              hebrewScenario: 'הקבוצה זקוקה לרוחב ויציבות הגנתית',
              application: 'Deploy 4-4-2 with disciplined wide midfielders',
              hebrewApplication: 'פריסת 4-4-2 עם קשרי אגף ממושמעים',
              outcome: 'Balanced approach with multiple attacking options',
              hebrewOutcome: 'גישה מאוזנת עם אפשרויות התקפה מגוונות',
            },
          ],
        },
        tags: ['formation', 'traditional', 'balanced', 'width'],
        aliases: ['442', 'four-four-two'],
        hebrewAliases: ['ארבע-ארבע-שתיים', 'מערכת קלאסית'],
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: '1.0',
        confidence: 1.0,
        verified: true,
        sources: ['Tactical Evolution', 'Formation Analysis'],
      },
    ],

    // Technical Skills
    [
      'first_touch',
      {
        id: 'first_touch',
        category: ConceptCategory.TECHNICAL_SKILL,
        englishTerm: 'First Touch',
        hebrewTerm: 'מגע ראשון',
        translations: [
          {
            language: 'he',
            term: 'מגע ראשון',
            pronunciation: 'ma-ga ri-shon',
            alternativeTerms: ['קבלת כדור', 'מגע ראשוני'],
            colloquialTerms: ['הקבלה', 'המגע'],
            formalTerms: ['טכניקת המגע הראשון'],
            regionalVariations: {},
          },
        ],
        definition: {
          english:
            'The first contact a player makes with the ball when receiving a pass',
          hebrew: 'המגע הראשון שעושה שחקן עם הכדור כאשר הוא מקבל מסירה',
          technical:
            'Fundamental ball control technique determining subsequent actions and tempo',
          hebrewTechnical:
            'טכניקת שליטה בסיסית בכדור הקובעת פעולות עוקבות וקצב',
        },
        relationships: [
          {
            type: 'prerequisite',
            targetConceptId: 'ball_control',
            strength: 1.0,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'enables',
            targetConceptId: 'quick_passing',
            strength: 0.9,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'enables',
            targetConceptId: 'turning',
            strength: 0.8,
            bidirectional: false,
            contextDependent: false,
          },
        ],
        tacticalSignificance: {
          importance: 0.95,
          complexity: 0.7,
          coachingValue: 1.0,
          playerDevelopmentValue: 1.0,
          gameImpact: 0.9,
          tacticalDepth: 0.6,
          requires: ['ball_control', 'anticipation'],
          enables: ['quick_passing', 'turning', 'dribbling'],
          conflictsWith: ['rushed_play'],
        },
        metrics: {
          usageFrequency: ConceptFrequency.VERY_FREQUENT,
          difficulty: ConceptDifficulty.INTERMEDIATE,
          ageAppropriate: {
            youth: true,
            amateur: true,
            semiprofessional: true,
            professional: true,
          },
          positionRelevance: { all: 0.95, CM: 1.0, CAM: 1.0, ST: 0.9 },
          formationRelevance: { all: 0.9 },
          gamePhaseRelevance: { building: 1.0, attacking: 0.9, defending: 0.6 },
        },
        contextualRelevance: [
          ContextualRelevance.TRAINING,
          ContextualRelevance.PLAYER_DEVELOPMENT,
        ],
        examples: {
          textual: {
            english: [
              'Clean first touch to set up the pass',
              'Poor first touch under pressure',
            ],
            hebrew: ['מגע ראשון נקי להכנת המסירה', 'מגע ראשון גרוע תחת לחץ'],
          },
          situational: [
            {
              scenario: 'Receiving a pass in tight space',
              hebrewScenario: 'קבלת מסירה במרחב צפוף',
              application:
                'Use soft first touch to control and protect the ball',
              hebrewApplication: 'שימוש במגע ראשון רך לשליטה והגנה על הכדור',
              outcome: 'Maintains possession and creates time for next action',
              hebrewOutcome: 'שומר על החזקה ויוצר זמן לפעולה הבאה',
            },
          ],
        },
        tags: ['technical', 'fundamental', 'ball_control', 'receiving'],
        aliases: ['reception', 'touch', 'control'],
        hebrewAliases: ['קבלה', 'מגע', 'שליטה'],
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: '1.0',
        confidence: 1.0,
        verified: true,
        sources: ['Technical Training Manual', 'Skill Development'],
      },
    ],

    // Tactical Actions
    [
      'pressing',
      {
        id: 'pressing',
        category: ConceptCategory.TACTICAL_ACTION,
        englishTerm: 'Pressing',
        hebrewTerm: 'לחיצה',
        translations: [
          {
            language: 'he',
            term: 'לחיצה',
            pronunciation: 'l-chi-tza',
            alternativeTerms: ['לחץ על היריב', 'הפרעה אקטיבית'],
            colloquialTerms: ['ללחוץ', 'להפריע'],
            formalTerms: ['לחיצה טקטית', 'הפרעה מאורגנת'],
            regionalVariations: {},
          },
        ],
        definition: {
          english:
            'Defensive tactic of applying immediate pressure to the opponent with the ball',
          hebrew: 'טקטיקה הגנתית של הפעלת לחץ מיידי על היריב עם הכדור',
          technical:
            'Coordinated defensive approach to reduce opponent time and space',
          hebrewTechnical: 'גישה הגנתית מתואמת להקטנת זמן ומרחב של היריב',
        },
        relationships: [
          {
            type: 'enables',
            targetConceptId: 'ball_recovery',
            strength: 0.8,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'prerequisite',
            targetConceptId: 'fitness',
            strength: 0.7,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'enables',
            targetConceptId: 'counter_attack',
            strength: 0.6,
            bidirectional: false,
            contextDependent: true,
          },
        ],
        tacticalSignificance: {
          importance: 0.9,
          complexity: 0.8,
          coachingValue: 0.9,
          playerDevelopmentValue: 0.8,
          gameImpact: 0.85,
          tacticalDepth: 0.9,
          requires: ['coordination', 'fitness', 'positioning'],
          enables: ['ball_recovery', 'turnovers', 'counter_attacks'],
          conflictsWith: ['deep_defending'],
        },
        metrics: {
          usageFrequency: ConceptFrequency.FREQUENT,
          difficulty: ConceptDifficulty.ADVANCED,
          ageAppropriate: {
            youth: false,
            amateur: true,
            semiprofessional: true,
            professional: true,
          },
          positionRelevance: { all: 0.8, CM: 0.9, CAM: 0.95, ST: 0.9 },
          formationRelevance: { '4-3-3': 0.9, '4-2-3-1': 0.85, '4-4-2': 0.7 },
          gamePhaseRelevance: {
            defending: 0.95,
            transition: 0.9,
            attacking: 0.3,
          },
        },
        contextualRelevance: [
          ContextualRelevance.DEFENDING,
          ContextualRelevance.TRANSITION,
          ContextualRelevance.TACTICAL_PLANNING,
        ],
        examples: {
          textual: {
            english: [
              'High pressing in the final third',
              'Coordinated pressing trigger',
            ],
            hebrew: ['לחיצה גבוהה בשליש האחרון', 'טריגר לחיצה מתואם'],
          },
          situational: [
            {
              scenario: 'Opponent builds up from the back',
              hebrewScenario: 'היריב בונה מהאחור',
              application: 'Apply high pressing to force errors',
              hebrewApplication: 'הפעלת לחיצה גבוהה לכפיית שגיאות',
              outcome: 'Win ball in dangerous area or force long ball',
              hebrewOutcome: 'זכייה בכדור באזור מסוכן או כפיית כדור ארוך',
            },
          ],
        },
        tags: ['defensive', 'tactical', 'coordination', 'pressure'],
        aliases: ['pressure', 'harassing', 'disruption'],
        hebrewAliases: ['לחץ', 'הפרעה', 'רדיפה'],
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: '1.0',
        confidence: 1.0,
        verified: true,
        sources: ['Modern Pressing Tactics', 'Defensive Strategies'],
      },
    ],

    // Game Phases
    [
      'transition_defense_to_attack',
      {
        id: 'transition_defense_to_attack',
        category: ConceptCategory.GAME_PHASE,
        englishTerm: 'Defensive to Attacking Transition',
        hebrewTerm: 'מעבר מהגנה להתקפה',
        translations: [
          {
            language: 'he',
            term: 'מעבר מהגנה להתקפה',
            pronunciation: 'ma-a-var me-ha-ga-na le-ha-tka-fa',
            alternativeTerms: ['מעבר התקפי', 'טרנזיציה התקפית'],
            colloquialTerms: ['נגד', 'המעבר'],
            formalTerms: ['שלב המעבר ההתקפי'],
            regionalVariations: {},
          },
        ],
        definition: {
          english:
            'The phase when a team regains possession and transitions from defending to attacking',
          hebrew: 'השלב בו קבוצה מחזירה לעצמה את החזקה ועוברת מהגנה להתקפה',
          technical:
            'Critical moment requiring quick decision-making and positional reorganization',
          hebrewTechnical:
            'רגע קריטי הדורש קבלת החלטות מהירה וארגון מחדש של העמדות',
        },
        relationships: [
          {
            type: 'prerequisite',
            targetConceptId: 'ball_recovery',
            strength: 1.0,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'enables',
            targetConceptId: 'counter_attack',
            strength: 0.9,
            bidirectional: false,
            contextDependent: false,
          },
          {
            type: 'prerequisite',
            targetConceptId: 'quick_thinking',
            strength: 0.8,
            bidirectional: false,
            contextDependent: false,
          },
        ],
        tacticalSignificance: {
          importance: 0.95,
          complexity: 0.9,
          coachingValue: 0.95,
          playerDevelopmentValue: 0.9,
          gameImpact: 0.9,
          tacticalDepth: 0.95,
          requires: ['ball_recovery', 'quick_thinking', 'positioning'],
          enables: ['counter_attack', 'quick_play', 'numerical_advantage'],
          conflictsWith: ['slow_buildup'],
        },
        metrics: {
          usageFrequency: ConceptFrequency.VERY_FREQUENT,
          difficulty: ConceptDifficulty.ADVANCED,
          ageAppropriate: {
            youth: false,
            amateur: true,
            semiprofessional: true,
            professional: true,
          },
          positionRelevance: { all: 0.9, CM: 1.0, CAM: 0.95, FB: 0.8 },
          formationRelevance: { all: 0.9 },
          gamePhaseRelevance: {
            transition: 1.0,
            attacking: 0.8,
            defending: 0.3,
          },
        },
        contextualRelevance: [
          ContextualRelevance.TRANSITION,
          ContextualRelevance.TACTICAL_PLANNING,
          ContextualRelevance.TRAINING,
        ],
        examples: {
          textual: {
            english: [
              'Quick transition after winning the ball',
              'Exploiting space in transition',
            ],
            hebrew: ['מעבר מהיר לאחר זכייה בכדור', 'ניצול מרחב במעבר'],
          },
          situational: [
            {
              scenario: 'Midfielder wins ball in center circle',
              hebrewScenario: 'קשר זוכה בכדור במעגל האמצע',
              application: 'Quick forward pass to exploit space behind defense',
              hebrewApplication: 'מסירה מהירה קדימה לניצול מרחב מאחורי ההגנה',
              outcome: 'Creates scoring opportunity or numerical advantage',
              hebrewOutcome: 'יוצר הזדמנות לכבוש או יתרון מספרי',
            },
          ],
        },
        tags: ['transition', 'critical_moment', 'tactical', 'speed'],
        aliases: ['counter', 'quick_break', 'transition'],
        hebrewAliases: ['נגד', 'פריצה', 'מעבר מהיר'],
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: '1.0',
        confidence: 1.0,
        verified: true,
        sources: ['Transition Play Analysis', 'Modern Football Tactics'],
      },
    ],
  ]);

  constructor(data: ConceptData) {
    this.validateFootballConcept(data);
    this._data = Object.freeze({ ...data });
  }

  public static create(
    category: ConceptCategory,
    englishTerm: string,
    hebrewTerm: string,
    englishDefinition: string,
    hebrewDefinition: string,
    tacticalSignificance: TacticalSignificance,
    options?: {
      translations?: ConceptTranslation[];
      relationships?: ConceptRelationship[];
      metrics?: Partial<ConceptMetrics>;
      contextualRelevance?: ContextualRelevance[];
      examples?: Partial<ConceptExamples>;
      tags?: string[];
      aliases?: string[];
      hebrewAliases?: string[];
    }
  ): FootballConcept {
    const id = englishTerm.toLowerCase().replace(/\s+/g, '_');

    return new FootballConcept({
      id,
      category,
      englishTerm,
      hebrewTerm,
      translations: options?.translations || [],
      definition: {
        english: englishDefinition,
        hebrew: hebrewDefinition,
        technical: englishDefinition,
        hebrewTechnical: hebrewDefinition,
      },
      relationships: options?.relationships || [],
      tacticalSignificance,
      metrics: {
        usageFrequency: ConceptFrequency.COMMON,
        difficulty: ConceptDifficulty.INTERMEDIATE,
        ageAppropriate: {
          youth: true,
          amateur: true,
          semiprofessional: true,
          professional: true,
        },
        positionRelevance: {},
        formationRelevance: {},
        gamePhaseRelevance: {},
        ...options?.metrics,
      },
      contextualRelevance: options?.contextualRelevance || [],
      examples: {
        textual: { english: [], hebrew: [] },
        situational: [],
        ...options?.examples,
      },
      tags: options?.tags || [],
      aliases: options?.aliases || [],
      hebrewAliases: options?.hebrewAliases || [],
      createdAt: new Date(),
      lastUpdated: new Date(),
      version: '1.0',
      confidence: 1.0,
      verified: false,
      sources: [],
    });
  }

  public static fromId(conceptId: string): FootballConcept | null {
    const data = this.CONCEPT_DATABASE.get(conceptId);
    return data ? new FootballConcept(data) : null;
  }

  public static findByTerm(
    term: string,
    language: 'en' | 'he' = 'en'
  ): FootballConcept | null {
    const normalizedTerm = term.toLowerCase().trim();

    for (const [_, data] of this.CONCEPT_DATABASE) {
      if (language === 'en') {
        if (
          data.englishTerm.toLowerCase() === normalizedTerm ||
          data.aliases.some(alias => alias.toLowerCase() === normalizedTerm)
        ) {
          return new FootballConcept(data);
        }
      } else {
        if (
          data.hebrewTerm === term.trim() ||
          data.hebrewAliases.some(alias => alias === term.trim())
        ) {
          return new FootballConcept(data);
        }
      }
    }

    return null;
  }

  public static searchConcepts(
    query: string,
    options?: {
      category?: ConceptCategory;
      language?: 'en' | 'he';
      minConfidence?: number;
      limit?: number;
    }
  ): FootballConcept[] {
    const results: Array<{ concept: FootballConcept; score: number }> = [];
    const normalizedQuery = query.toLowerCase().trim();
    const language = options?.language || 'en';

    for (const [_, data] of this.CONCEPT_DATABASE) {
      if (options?.category && data.category !== options.category) continue;
      if (options?.minConfidence && data.confidence < options.minConfidence)
        continue;

      let score = 0;

      // Exact term match
      if (language === 'en') {
        if (data.englishTerm.toLowerCase().includes(normalizedQuery)) {
          score +=
            data.englishTerm.toLowerCase() === normalizedQuery ? 1.0 : 0.8;
        }
        // Check aliases
        for (const alias of data.aliases) {
          if (alias.toLowerCase().includes(normalizedQuery)) {
            score += alias.toLowerCase() === normalizedQuery ? 0.9 : 0.6;
          }
        }
        // Check definition
        if (data.definition.english.toLowerCase().includes(normalizedQuery)) {
          score += 0.4;
        }
      } else {
        if (data.hebrewTerm.includes(query.trim())) {
          score += data.hebrewTerm === query.trim() ? 1.0 : 0.8;
        }
        // Check Hebrew aliases
        for (const alias of data.hebrewAliases) {
          if (alias.includes(query.trim())) {
            score += alias === query.trim() ? 0.9 : 0.6;
          }
        }
        // Check Hebrew definition
        if (data.definition.hebrew.includes(query.trim())) {
          score += 0.4;
        }
      }

      // Check tags
      for (const tag of data.tags) {
        if (tag.toLowerCase().includes(normalizedQuery)) {
          score += 0.3;
        }
      }

      if (score > 0) {
        results.push({ concept: new FootballConcept(data), score });
      }
    }

    results.sort((a, b) => b.score - a.score);

    const limit = options?.limit || 10;
    return results.slice(0, limit).map(r => r.concept);
  }

  public static getConceptsByCategory(
    category: ConceptCategory
  ): FootballConcept[] {
    const concepts: FootballConcept[] = [];

    for (const [_, data] of this.CONCEPT_DATABASE) {
      if (data.category === category) {
        concepts.push(new FootballConcept(data));
      }
    }

    return concepts.sort(
      (a, b) =>
        b.tacticalSignificance.importance - a.tacticalSignificance.importance
    );
  }

  public static getRelatedConcepts(
    conceptId: string,
    relationshipType?: ConceptRelationship['type'],
    maxDepth: number = 1
  ): FootballConcept[] {
    const baseConcept = this.fromId(conceptId);
    if (!baseConcept) return [];

    const related: FootballConcept[] = [];
    const visited = new Set<string>([conceptId]);

    const findRelated = (concept: FootballConcept, depth: number) => {
      if (depth > maxDepth) return;

      for (const rel of concept.relationships) {
        if (relationshipType && rel.type !== relationshipType) continue;
        if (visited.has(rel.targetConceptId)) continue;

        const relatedConcept = this.fromId(rel.targetConceptId);
        if (relatedConcept) {
          related.push(relatedConcept);
          visited.add(rel.targetConceptId);

          if (depth < maxDepth) {
            findRelated(relatedConcept, depth + 1);
          }
        }
      }
    };

    findRelated(baseConcept, 0);

    return related.sort((a, b) => {
      const aRel = baseConcept.relationships.find(
        r => r.targetConceptId === a.id
      );
      const bRel = baseConcept.relationships.find(
        r => r.targetConceptId === b.id
      );
      return (bRel?.strength || 0) - (aRel?.strength || 0);
    });
  }

  private validateFootballConcept(data: ConceptData): void {
    if (!data.id?.trim()) {
      throw new Error('Concept ID is required');
    }

    if (!data.englishTerm?.trim()) {
      throw new Error('English term is required');
    }

    if (!data.hebrewTerm?.trim()) {
      throw new Error('Hebrew term is required');
    }

    if (!data.definition?.english?.trim()) {
      throw new Error('English definition is required');
    }

    if (!data.definition?.hebrew?.trim()) {
      throw new Error('Hebrew definition is required');
    }

    if (!data.category) {
      throw new Error('Category is required');
    }

    if (!data.tacticalSignificance) {
      throw new Error('Tactical significance is required');
    }

    if (data.confidence < 0 || data.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    // Validate relationships
    data.relationships.forEach((rel, index) => {
      if (rel.strength < 0 || rel.strength > 1) {
        throw new Error(
          `Relationship ${index + 1}: Strength must be between 0 and 1`
        );
      }
      if (!rel.targetConceptId?.trim()) {
        throw new Error(
          `Relationship ${index + 1}: Target concept ID is required`
        );
      }
    });

    // Validate tactical significance values
    Object.entries(data.tacticalSignificance).forEach(([key, value]) => {
      if (typeof value === 'number' && (value < 0 || value > 1)) {
        throw new Error(
          `Tactical significance ${key}: Value must be between 0 and 1`
        );
      }
    });
  }

  // Getters
  get id(): string {
    return this._data.id;
  }

  get category(): ConceptCategory {
    return this._data.category;
  }

  get englishTerm(): string {
    return this._data.englishTerm;
  }

  get hebrewTerm(): string {
    return this._data.hebrewTerm;
  }

  get translations(): ConceptTranslation[] {
    return [...this._data.translations];
  }

  get definition(): ConceptData['definition'] {
    return { ...this._data.definition };
  }

  get relationships(): ConceptRelationship[] {
    return [...this._data.relationships];
  }

  get tacticalSignificance(): TacticalSignificance {
    return { ...this._data.tacticalSignificance };
  }

  get metrics(): ConceptMetrics {
    return { ...this._data.metrics };
  }

  get contextualRelevance(): ContextualRelevance[] {
    return [...this._data.contextualRelevance];
  }

  get examples(): ConceptExamples {
    return {
      textual: {
        english: [...this._data.examples.textual.english],
        hebrew: [...this._data.examples.textual.hebrew],
      },
      situational: [...this._data.examples.situational],
      videoReferences: this._data.examples.videoReferences
        ? [...this._data.examples.videoReferences]
        : undefined,
    };
  }

  get tags(): string[] {
    return [...this._data.tags];
  }

  get aliases(): string[] {
    return [...this._data.aliases];
  }

  get hebrewAliases(): string[] {
    return [...this._data.hebrewAliases];
  }

  get confidence(): number {
    return this._data.confidence;
  }

  get verified(): boolean {
    return this._data.verified;
  }

  get sources(): string[] {
    return [...this._data.sources];
  }

  get createdAt(): Date {
    return this._data.createdAt;
  }

  get lastUpdated(): Date {
    return this._data.lastUpdated;
  }

  get version(): string {
    return this._data.version;
  }

  // Derived properties
  get isHighImportance(): boolean {
    return this._data.tacticalSignificance.importance > 0.8;
  }

  get isHighComplexity(): boolean {
    return this._data.tacticalSignificance.complexity > 0.7;
  }

  get isFrequentlyUsed(): boolean {
    return [ConceptFrequency.FREQUENT, ConceptFrequency.VERY_FREQUENT].includes(
      this._data.metrics.usageFrequency
    );
  }

  get isAdvancedConcept(): boolean {
    return [
      ConceptDifficulty.ADVANCED,
      ConceptDifficulty.EXPERT,
      ConceptDifficulty.PROFESSIONAL,
    ].includes(this._data.metrics.difficulty);
  }

  get isProfessionalLevel(): boolean {
    return this._data.metrics.ageAppropriate.professional;
  }

  get isYouthFriendly(): boolean {
    return this._data.metrics.ageAppropriate.youth;
  }

  get overallSignificance(): number {
    const { importance, complexity, coachingValue, gameImpact } =
      this._data.tacticalSignificance;
    return (
      (importance + coachingValue + gameImpact + (1 - complexity * 0.3)) / 3.7
    );
  }

  // Methods
  public hasTag(tag: string): boolean {
    return this._data.tags.includes(tag.toLowerCase());
  }

  public hasRelationshipWith(conceptId: string): boolean {
    return this._data.relationships.some(
      rel => rel.targetConceptId === conceptId
    );
  }

  public getRelationshipWith(
    conceptId: string
  ): ConceptRelationship | undefined {
    return this._data.relationships.find(
      rel => rel.targetConceptId === conceptId
    );
  }

  public getRelationshipsByType(
    type: ConceptRelationship['type']
  ): ConceptRelationship[] {
    return this._data.relationships.filter(rel => rel.type === type);
  }

  public isRelevantForPosition(position: string): boolean {
    const relevance = this._data.metrics.positionRelevance[position];
    return relevance !== undefined && relevance > 0.5;
  }

  public isRelevantForFormation(formation: string): boolean {
    const relevance =
      this._data.metrics.formationRelevance[formation] ||
      this._data.metrics.formationRelevance['all'];
    return relevance !== undefined && relevance > 0.5;
  }

  public isRelevantForGamePhase(phase: string): boolean {
    const relevance = this._data.metrics.gamePhaseRelevance[phase];
    return relevance !== undefined && relevance > 0.5;
  }

  public isRelevantForContext(context: ContextualRelevance): boolean {
    return this._data.contextualRelevance.includes(context);
  }

  public getPositionRelevance(position: string): number {
    return this._data.metrics.positionRelevance[position] || 0;
  }

  public getFormationRelevance(formation: string): number {
    return (
      this._data.metrics.formationRelevance[formation] ||
      this._data.metrics.formationRelevance['all'] ||
      0
    );
  }

  public getGamePhaseRelevance(phase: string): number {
    return this._data.metrics.gamePhaseRelevance[phase] || 0;
  }

  public getPrerequisites(): string[] {
    return this._data.tacticalSignificance.requires || [];
  }

  public getEnabledConcepts(): string[] {
    return this._data.tacticalSignificance.enables || [];
  }

  public getConflictingConcepts(): string[] {
    return this._data.tacticalSignificance.conflictsWith || [];
  }

  public getSimilarityScore(other: FootballConcept): number {
    let score = 0;
    let factors = 0;

    // Category similarity
    if (this._data.category === other._data.category) {
      score += 0.3;
    }
    factors++;

    // Tag overlap
    const tagOverlap = this._data.tags.filter(tag =>
      other._data.tags.includes(tag)
    ).length;
    const maxTags = Math.max(this._data.tags.length, other._data.tags.length);
    if (maxTags > 0) {
      score += (tagOverlap / maxTags) * 0.2;
    }
    factors++;

    // Contextual relevance overlap
    const contextOverlap = this._data.contextualRelevance.filter(ctx =>
      other._data.contextualRelevance.includes(ctx)
    ).length;
    const maxContexts = Math.max(
      this._data.contextualRelevance.length,
      other._data.contextualRelevance.length
    );
    if (maxContexts > 0) {
      score += (contextOverlap / maxContexts) * 0.2;
    }
    factors++;

    // Tactical significance similarity
    const sigDiff = Math.abs(
      this._data.tacticalSignificance.importance -
        other._data.tacticalSignificance.importance
    );
    score += (1 - sigDiff) * 0.3;
    factors++;

    return score / factors;
  }

  public withUpdatedRelationship(
    relationship: ConceptRelationship
  ): FootballConcept {
    const existingIndex = this._data.relationships.findIndex(
      rel =>
        rel.targetConceptId === relationship.targetConceptId &&
        rel.type === relationship.type
    );

    const updatedRelationships = [...this._data.relationships];
    if (existingIndex >= 0) {
      updatedRelationships[existingIndex] = relationship;
    } else {
      updatedRelationships.push(relationship);
    }

    return new FootballConcept({
      ...this._data,
      relationships: updatedRelationships,
      lastUpdated: new Date(),
    });
  }

  public withUpdatedConfidence(confidence: number): FootballConcept {
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    return new FootballConcept({
      ...this._data,
      confidence,
      lastUpdated: new Date(),
    });
  }

  public withVerification(
    verified: boolean,
    sources?: string[]
  ): FootballConcept {
    return new FootballConcept({
      ...this._data,
      verified,
      sources: sources
        ? [...this._data.sources, ...sources]
        : this._data.sources,
      lastUpdated: new Date(),
    });
  }

  public equals(other: FootballConcept): boolean {
    return (
      this._data.id === other._data.id &&
      this._data.version === other._data.version
    );
  }

  public toJSON(): ConceptData {
    return { ...this._data };
  }

  public toString(): string {
    return `FootballConcept(${this._data.id}: "${this._data.englishTerm}" / "${this._data.hebrewTerm}", ${this._data.category})`;
  }

  public toHebrewString(): string {
    return `מושג כדורגל (${this._data.hebrewTerm} - ${this._data.category})`;
  }
}
