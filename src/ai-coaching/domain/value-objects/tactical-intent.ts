/**
 * Tactical Intent Value Object
 * Hebrew coaching query classification and intent understanding system
 */

import { FootballConcept, ConceptCategory } from './football-concept';
import {
  FootballEntity,
  EntityType,
  PositionType,
  TacticalRole,
} from './football-entity';
import { HebrewMorphology } from './hebrew-morphology';

export enum IntentType {
  // Query Intents
  QUESTION = 'question',
  EXPLANATION_REQUEST = 'explanation_request',
  COMPARISON_REQUEST = 'comparison_request',
  EVALUATION_REQUEST = 'evaluation_request',
  PREDICTION_REQUEST = 'prediction_request',

  // Action Intents
  INSTRUCTION = 'instruction',
  RECOMMENDATION_REQUEST = 'recommendation_request',
  STRATEGY_REQUEST = 'strategy_request',
  TRAINING_REQUEST = 'training_request',
  ADJUSTMENT_REQUEST = 'adjustment_request',

  // Analysis Intents
  PERFORMANCE_ANALYSIS = 'performance_analysis',
  TACTICAL_ANALYSIS = 'tactical_analysis',
  FORMATION_ANALYSIS = 'formation_analysis',
  PLAYER_ANALYSIS = 'player_analysis',
  OPPONENT_ANALYSIS = 'opponent_analysis',

  // Contextual Intents
  LIVE_MATCH_QUERY = 'live_match_query',
  POST_MATCH_ANALYSIS = 'post_match_analysis',
  PRE_MATCH_PLANNING = 'pre_match_planning',
  TRAINING_SESSION = 'training_session',
  SEASON_PLANNING = 'season_planning',

  // Meta Intents
  CLARIFICATION = 'clarification',
  FOLLOW_UP = 'follow_up',
  CONFIRMATION = 'confirmation',
  DISAGREEMENT = 'disagreement',
  APPRECIATION = 'appreciation',
}

export enum IntentUrgency {
  LOW = 'low', // General inquiry, can wait
  MEDIUM = 'medium', // Important but not immediate
  HIGH = 'high', // Needs quick response
  URGENT = 'urgent', // Live match or critical situation
  CRITICAL = 'critical', // Emergency tactical situation
}

export enum IntentComplexity {
  SIMPLE = 'simple', // Single concept query
  MODERATE = 'moderate', // Multiple related concepts
  COMPLEX = 'complex', // Multi-layered analysis
  ADVANCED = 'advanced', // Deep tactical understanding
  EXPERT = 'expert', // Professional-level insight
}

export enum ResponseExpectation {
  BRIEF = 'brief', // 1-2 sentences
  EXPLANATION = 'explanation', // Detailed explanation
  STEP_BY_STEP = 'step_by_step', // Process breakdown
  ANALYSIS = 'analysis', // Comprehensive analysis
  RECOMMENDATION = 'recommendation', // Actionable advice
  VISUALIZATION = 'visualization', // Diagrams/charts
  EXAMPLES = 'examples', // Practical examples
  COMPARISON = 'comparison', // Side-by-side analysis
}

export enum IntentContext {
  // Temporal Context
  REAL_TIME = 'real_time',
  RECENT_PAST = 'recent_past',
  HISTORICAL = 'historical',
  FUTURE_PLANNING = 'future_planning',

  // Match Context
  PRE_MATCH = 'pre_match',
  FIRST_HALF = 'first_half',
  HALF_TIME = 'half_time',
  SECOND_HALF = 'second_half',
  EXTRA_TIME = 'extra_time',
  POST_MATCH = 'post_match',

  // Situational Context
  WINNING = 'winning',
  LOSING = 'losing',
  DRAWING = 'drawing',
  DOMINANT = 'dominant',
  STRUGGLING = 'struggling',
  NEUTRAL = 'neutral',
}

export interface IntentModifiers {
  emotional: {
    frustration?: number; // 0-1
    excitement?: number; // 0-1
    concern?: number; // 0-1
    confidence?: number; // 0-1
    urgency?: number; // 0-1
  };
  linguistic: {
    formality?: number; // 0-1 (informal to formal)
    directness?: number; // 0-1 (indirect to direct)
    politeness?: number; // 0-1 (impolite to very polite)
    technical?: number; // 0-1 (basic to technical)
  };
  temporal: {
    immediacy?: number; // 0-1 (when needed to right now)
    timeframe?: string; // specific time reference
    deadline?: Date; // when response is needed
  };
}

export interface IntentTargets {
  entities: {
    players?: string[]; // player IDs or names
    teams?: string[]; // team IDs or names
    positions?: PositionType[];
    roles?: TacticalRole[];
    formations?: string[];
    coaches?: string[];
  };
  concepts: {
    tactical?: string[]; // tactical concept IDs
    technical?: string[]; // technical skill IDs
    physical?: string[]; // physical attribute IDs
    mental?: string[]; // mental quality IDs
  };
  scope: {
    timeRange?: {
      start?: Date;
      end?: Date;
      description?: string; // "last 5 games", "this season"
    };
    matchScope?: {
      matchId?: string;
      phase?: string; // "first_half", "set_pieces"
      situation?: string; // "attacking", "defending"
    };
    comparison?: {
      baseline?: string; // what to compare against
      metrics?: string[]; // specific comparison criteria
    };
  };
}

export interface HebrewLinguisticFeatures {
  questionMarkers: string[]; // Hebrew question words found
  imperativeMarkers: string[]; // Hebrew command indicators
  timeMarkers: string[]; // Hebrew temporal references
  emotionalMarkers: string[]; // Hebrew emotional expressions
  formalityMarkers: string[]; // Hebrew formality indicators
  uncertaintyMarkers: string[]; // Hebrew uncertainty expressions
  emphasisMarkers: string[]; // Hebrew emphasis words
}

export interface IntentConfidence {
  overall: number; // 0-1 overall confidence
  classification: number; // confidence in intent type
  entities: number; // confidence in entity extraction
  temporal: number; // confidence in timing understanding
  emotional: number; // confidence in emotional tone
  complexity: number; // confidence in complexity assessment
}

export interface TacticalIntentData {
  id: string;
  originalQuery: string;
  normalizedQuery: string;
  language: 'he' | 'en' | 'mixed';

  // Core Intent Classification
  primaryIntent: IntentType;
  secondaryIntents: IntentType[];
  urgency: IntentUrgency;
  complexity: IntentComplexity;
  responseExpectation: ResponseExpectation;
  context: IntentContext[];

  // Intent Modifiers and Nuances
  modifiers: IntentModifiers;
  targets: IntentTargets;

  // Hebrew-specific Analysis
  hebrewFeatures: HebrewLinguisticFeatures;
  morphology?: HebrewMorphology;

  // Confidence and Metadata
  confidence: IntentConfidence;
  processingSteps: string[]; // steps taken during analysis
  alternativeInterpretations: Array<{
    intent: IntentType;
    confidence: number;
    reasoning: string;
  }>;

  // Context and Relationships
  relatedQueries?: string[]; // related query IDs
  sessionContext?: {
    previousQueries: string[];
    conversationFlow: string;
    userPreferences: Record<string, any>;
  };

  createdAt: Date;
  processingTime: number; // milliseconds
  version: string;
}

export class TacticalIntent {
  private readonly _data: TacticalIntentData;

  // Hebrew intent markers and patterns
  private static readonly HEBREW_INTENT_PATTERNS = new Map<
    IntentType,
    {
      patterns: string[];
      questionWords: string[];
      actionWords: string[];
      contextClues: string[];
      examples: string[];
    }
  >([
    [
      IntentType.QUESTION,
      {
        patterns: ['מה', 'איך', 'מי', 'איפה', 'מתי', 'למה', 'האם', 'האין'],
        questionWords: [
          'מה זה',
          'איך עושים',
          'מי אמור',
          'איפה צריך',
          'מתי כדאי',
          'למה חשוב',
        ],
        actionWords: [],
        contextClues: ['?', 'לא מבין', 'תוכל להסביר', 'רוצה לדעת'],
        examples: [
          'מה זה פולס ניין?',
          'איך עושים לחיצה יעילה?',
          'מי אמור לכסות את האגף?',
        ],
      },
    ],

    [
      IntentType.INSTRUCTION,
      {
        patterns: ['תגיד ל', 'בצע', 'עשה', 'תעשה', 'תבצע', 'הוראה'],
        questionWords: [],
        actionWords: ['תגיד', 'בצע', 'עשה', 'החלף', 'שנה', 'התאם'],
        contextClues: ['!', 'עכשיו', 'מיד', 'צריך', 'חובה'],
        examples: [
          'תגיד לחלוץ לרוץ עמוק',
          'בצע החלפה של הקשר',
          'עשה שינוי במערך',
        ],
      },
    ],

    [
      IntentType.RECOMMENDATION_REQUEST,
      {
        patterns: [
          'מה ההמלצה',
          'איך כדאי',
          'מה עדיף',
          'איך הכי טוב',
          'מה הדרך',
        ],
        questionWords: ['מה כדאי', 'איך הכי טוב', 'מה עדיף'],
        actionWords: ['המלץ', 'יעץ', 'הצע'],
        contextClues: ['עצה', 'המלצה', 'כדאי', 'עדיף', 'הטוב ביותר'],
        examples: [
          'מה ההמלצה למערך נגד 4-3-3?',
          'איך כדאי להתמודד עם לחיצה גבוהה?',
        ],
      },
    ],

    [
      IntentType.PERFORMANCE_ANALYSIS,
      {
        patterns: ['איך שיחק', 'מה הביצועים', 'נתח את', 'בדוק את', 'הערך את'],
        questionWords: ['איך שיחק', 'מה הביצועים', 'איך הלך'],
        actionWords: ['נתח', 'בדוק', 'הערך', 'בחן'],
        contextClues: ['ביצועים', 'רמה', 'איכות', 'הצלחה', 'כישלון'],
        examples: ['איך שיחק הקשר במחצית הראשונה?', 'נתח את ביצועי ההגנה'],
      },
    ],

    [
      IntentType.TACTICAL_ANALYSIS,
      {
        patterns: [
          'מה הטקטיקה',
          'איך המערך',
          'נתח את האסטרטגיה',
          'בדוק את התכנון',
        ],
        questionWords: ['מה הטקטיקה', 'איך המערך', 'איך התכנון'],
        actionWords: ['נתח', 'בדוק', 'הסבר', 'פרק'],
        contextClues: ['טקטיקה', 'מערך', 'אסטרטגיה', 'תכנון', 'גישה'],
        examples: ['מה הטקטיקה של היריב?', 'נתח את המערך ההתקפי שלנו'],
      },
    ],

    [
      IntentType.LIVE_MATCH_QUERY,
      {
        patterns: ['עכשיו', 'כרגע', 'במשחק', 'בזמן אמת', 'מה קורה'],
        questionWords: ['מה קורה', 'איך זה נראה', 'מה המצב'],
        actionWords: ['שנה', 'התאם', 'תקן', 'החלף'],
        contextClues: ['עכשיו', 'כרגע', 'מיד', 'דחוף', 'במשחק'],
        examples: ['מה קורה עכשיו במרכז?', 'צריך לשנות משהו כרגע?'],
      },
    ],

    [
      IntentType.COMPARISON_REQUEST,
      {
        patterns: ['השווה', 'מה ההבדל', 'מה עדיף', 'איך משתווה', 'לעומת'],
        questionWords: ['מה ההבדל', 'איך משתווה', 'מה עדיף'],
        actionWords: ['השווה', 'הקש', 'בדוק'],
        contextClues: ['לעומת', 'בהשוואה ל', 'מול', 'נגד', 'כנגד'],
        examples: [
          'השווה בין 4-4-2 ל-4-3-3',
          'מה עדיף - לחיצה גבוהה או נמוכה?',
        ],
      },
    ],

    [
      IntentType.TRAINING_REQUEST,
      {
        patterns: ['תרגיל', 'אימון', 'תרגל', 'עבודה על', 'שיפור'],
        questionWords: ['איך מתרגלים', 'מה התרגיל', 'איך משפרים'],
        actionWords: ['תרגל', 'אמן', 'שפר', 'עבוד'],
        contextClues: ['אימון', 'תרגיל', 'תרגול', 'שיפור', 'פיתוח'],
        examples: ['איך מתרגלים מסירות קצרות?', 'תרגיל לשיפור המיקום'],
      },
    ],

    [
      IntentType.PREDICTION_REQUEST,
      {
        patterns: ['מה יקרה', 'איך זה יסתיים', 'מה הסיכויים', 'מה הצפוי'],
        questionWords: ['מה יקרה', 'איך זה יסתיים', 'מה הסיכויים'],
        actionWords: ['חזה', 'נבא', 'העריך'],
        contextClues: ['סיכויים', 'צפוי', 'עתיד', 'יקרה', 'יסתיים'],
        examples: ['מה יקרה אם נשנה למערך 3-5-2?', 'מה הסיכויים לנצח?'],
      },
    ],
  ]);

  // Hebrew temporal markers
  private static readonly HEBREW_TIME_MARKERS = new Map<string, IntentContext>([
    // Match phases
    ['מחצית ראשונה', IntentContext.FIRST_HALF],
    ['מחצית שנייה', IntentContext.SECOND_HALF],
    ['הפסקה', IntentContext.HALF_TIME],
    ['לפני המשחק', IntentContext.PRE_MATCH],
    ['אחרי המשחק', IntentContext.POST_MATCH],
    ['תוספת זמן', IntentContext.EXTRA_TIME],

    // Temporal references
    ['עכשיו', IntentContext.REAL_TIME],
    ['כרגע', IntentContext.REAL_TIME],
    ['לאחרונה', IntentContext.RECENT_PAST],
    ['בעבר', IntentContext.HISTORICAL],
    ['בעתיד', IntentContext.FUTURE_PLANNING],
    ['המשחק הבא', IntentContext.FUTURE_PLANNING],

    // Situational context
    ['כשאנחנו מנצחים', IntentContext.WINNING],
    ['כשאנחנו מפסידים', IntentContext.LOSING],
    ['כשיש תיקו', IntentContext.DRAWING],
    ['כשאנחנו שולטים', IntentContext.DOMINANT],
    ['כשאנחנו נלחצים', IntentContext.STRUGGLING],
  ]);

  // Hebrew emotional indicators
  private static readonly HEBREW_EMOTIONAL_MARKERS = {
    frustration: ['מעצבן', 'מתסכל', 'לא עובד', 'גרוע', 'נורא'],
    excitement: ['מעולה', 'נהדר', 'פנטסטי', 'מדהים', 'יפה'],
    concern: ['דואג', 'מודאג', 'חושש', 'פוחד', 'בעיה'],
    confidence: ['בטוח', 'ודאי', 'יודע', 'מאמין', 'סמוך'],
    urgency: ['דחוף', 'מיד', 'עכשיו', 'מהר', 'בזירוז'],
  };

  // Hebrew formality indicators
  private static readonly HEBREW_FORMALITY_MARKERS = {
    formal: ['אדוני', 'כבודו', 'אבקש', 'הייתי רוצה', 'האם ניתן'],
    informal: ['יאללה', 'בואנה', 'חבר', 'אחי', 'תגיד'],
  };

  constructor(data: TacticalIntentData) {
    this.validateTacticalIntent(data);
    this._data = Object.freeze({ ...data });
  }

  public static analyze(
    query: string,
    options?: {
      language?: 'he' | 'en' | 'auto';
      sessionContext?: TacticalIntentData['sessionContext'];
      morphology?: HebrewMorphology;
      timeoutMs?: number;
    }
  ): TacticalIntent {
    const startTime = Date.now();
    const processingSteps: string[] = [];

    // Step 1: Language detection and normalization
    const language =
      options?.language === 'auto'
        ? this.detectLanguage(query)
        : options?.language || 'he';
    const normalizedQuery = this.normalizeQuery(query, language);
    processingSteps.push('language_detection_and_normalization');

    // Step 2: Morphological analysis (for Hebrew)
    let morphology = options?.morphology;
    if (language === 'he' && !morphology) {
      morphology = HebrewMorphology.analyze(query);
      processingSteps.push('hebrew_morphological_analysis');
    }

    // Step 3: Intent classification
    const intentClassification = this.classifyIntent(
      normalizedQuery,
      language,
      morphology
    );
    processingSteps.push('intent_classification');

    // Step 4: Entity and concept extraction
    const targets = this.extractTargets(normalizedQuery, language, morphology);
    processingSteps.push('entity_extraction');

    // Step 5: Context analysis
    const context = this.analyzeContext(
      normalizedQuery,
      language,
      options?.sessionContext
    );
    processingSteps.push('context_analysis');

    // Step 6: Modifiers and emotional analysis
    const modifiers = this.analyzeModifiers(normalizedQuery, language);
    processingSteps.push('modifiers_analysis');

    // Step 7: Hebrew linguistic features
    const hebrewFeatures =
      language === 'he'
        ? this.extractHebrewFeatures(normalizedQuery)
        : {
            questionMarkers: [],
            imperativeMarkers: [],
            timeMarkers: [],
            emotionalMarkers: [],
            formalityMarkers: [],
            uncertaintyMarkers: [],
            emphasisMarkers: [],
          };
    processingSteps.push('hebrew_features_extraction');

    // Step 8: Confidence calculation
    const confidence = this.calculateConfidence(
      intentClassification,
      targets,
      context,
      modifiers,
      morphology
    );
    processingSteps.push('confidence_calculation');

    const processingTime = Date.now() - startTime;

    return new TacticalIntent({
      id: this.generateId(),
      originalQuery: query,
      normalizedQuery,
      language,
      primaryIntent: intentClassification.primary.intent,
      secondaryIntents: intentClassification.secondary.map(s => s.intent),
      urgency: this.determineUrgency(modifiers, context, hebrewFeatures),
      complexity: this.determineComplexity(
        targets,
        intentClassification,
        morphology
      ),
      responseExpectation: this.determineResponseExpectation(
        intentClassification.primary.intent,
        modifiers,
        targets
      ),
      context: context.contexts,
      modifiers,
      targets,
      hebrewFeatures,
      morphology,
      confidence,
      processingSteps,
      alternativeInterpretations: intentClassification.alternatives,
      sessionContext: options?.sessionContext,
      createdAt: new Date(),
      processingTime,
      version: '1.0',
    });
  }

  private static detectLanguage(query: string): 'he' | 'en' | 'mixed' {
    const hebrewChars = query.match(/[\u0590-\u05FF]/g);
    const englishChars = query.match(/[a-zA-Z]/g);

    const hebrewRatio = hebrewChars ? hebrewChars.length / query.length : 0;
    const englishRatio = englishChars ? englishChars.length / query.length : 0;

    if (hebrewRatio > 0.5) return 'he';
    if (englishRatio > 0.5) return 'en';
    return 'mixed';
  }

  private static normalizeQuery(
    query: string,
    language: 'he' | 'en' | 'mixed'
  ): string {
    let normalized = query.trim();

    if (language === 'he' || language === 'mixed') {
      // Hebrew-specific normalization
      normalized = normalized
        .replace(/[״״]/g, '"') // Normalize Hebrew quotes
        .replace(/[׳']/g, "'") // Normalize Hebrew apostrophes
        .replace(/[־]/g, '-') // Normalize Hebrew dash
        .replace(/\s+/g, ' '); // Multiple spaces to single
    }

    return normalized;
  }

  private static classifyIntent(
    query: string,
    language: 'he' | 'en' | 'mixed',
    morphology?: HebrewMorphology
  ): {
    primary: { intent: IntentType; confidence: number };
    secondary: Array<{ intent: IntentType; confidence: number }>;
    alternatives: Array<{
      intent: IntentType;
      confidence: number;
      reasoning: string;
    }>;
  } {
    const scores = new Map<IntentType, number>();
    const alternatives: Array<{
      intent: IntentType;
      confidence: number;
      reasoning: string;
    }> = [];

    if (language === 'he' || language === 'mixed') {
      // Hebrew intent pattern matching
      for (const [intentType, patterns] of this.HEBREW_INTENT_PATTERNS) {
        let score = 0;
        let reasoning = '';

        // Check question patterns
        for (const pattern of patterns.patterns) {
          if (query.includes(pattern)) {
            score += 0.8;
            reasoning += `Found pattern: ${pattern}. `;
          }
        }

        // Check question words
        for (const qword of patterns.questionWords) {
          if (query.includes(qword)) {
            score += 0.6;
            reasoning += `Found question word: ${qword}. `;
          }
        }

        // Check action words
        for (const aword of patterns.actionWords) {
          if (query.includes(aword)) {
            score += 0.7;
            reasoning += `Found action word: ${aword}. `;
          }
        }

        // Check context clues
        for (const clue of patterns.contextClues) {
          if (query.includes(clue)) {
            score += 0.4;
            reasoning += `Found context clue: ${clue}. `;
          }
        }

        if (score > 0) {
          scores.set(intentType, Math.min(score, 1.0));
          if (score > 0.3) {
            alternatives.push({
              intent: intentType,
              confidence: score,
              reasoning,
            });
          }
        }
      }
    }

    // Morphological enhancement for Hebrew
    if (morphology) {
      if (morphology.isQuestion) {
        scores.set(
          IntentType.QUESTION,
          (scores.get(IntentType.QUESTION) || 0) + 0.3
        );
      }
      if (morphology.isCommand) {
        scores.set(
          IntentType.INSTRUCTION,
          (scores.get(IntentType.INSTRUCTION) || 0) + 0.3
        );
      }
      if (morphology.isTacticalQuery) {
        scores.set(
          IntentType.TACTICAL_ANALYSIS,
          (scores.get(IntentType.TACTICAL_ANALYSIS) || 0) + 0.2
        );
      }
    }

    // Sort by score
    const sortedIntents = Array.from(scores.entries()).sort(
      ([, a], [, b]) => b - a
    );

    const primary =
      sortedIntents.length > 0
        ? { intent: sortedIntents[0][0], confidence: sortedIntents[0][1] }
        : { intent: IntentType.QUESTION, confidence: 0.3 };

    const secondary = sortedIntents
      .slice(1, 3)
      .map(([intent, confidence]) => ({ intent, confidence }));

    return { primary, secondary, alternatives };
  }

  private static extractTargets(
    query: string,
    language: 'he' | 'en' | 'mixed',
    morphology?: HebrewMorphology
  ): IntentTargets {
    const targets: IntentTargets = {
      entities: {
        players: [],
        teams: [],
        positions: [],
        roles: [],
        formations: [],
        coaches: [],
      },
      concepts: { tactical: [], technical: [], physical: [], mental: [] },
      scope: {},
    };

    // Extract formations
    const formationPatterns = /\d-\d-\d|\d-\d-\d-\d/g;
    const formations = query.match(formationPatterns);
    if (formations) {
      targets.entities.formations = formations;
    }

    // Extract Hebrew football terms from morphology
    if (morphology) {
      targets.concepts.tactical = morphology.footballTerms.filter(term => {
        const concept = FootballConcept.findByTerm(term, 'he');
        return (
          concept?.category === ConceptCategory.TACTICAL_ACTION ||
          concept?.category === ConceptCategory.TACTICAL_FORMATION
        );
      });

      targets.concepts.technical = morphology.footballTerms.filter(term => {
        const concept = FootballConcept.findByTerm(term, 'he');
        return concept?.category === ConceptCategory.TECHNICAL_SKILL;
      });
    }

    // Extract position references
    const hebrewPositions = ['שוער', 'מגן', 'קשר', 'חלוץ', 'תוקף'];
    for (const pos of hebrewPositions) {
      if (query.includes(pos)) {
        const entity = FootballEntity.searchEntities(pos, {
          language: 'he',
          type: EntityType.POSITION,
        })[0];
        if (entity && entity.positionType) {
          targets.entities.positions!.push(entity.positionType);
        }
      }
    }

    return targets;
  }

  private static analyzeContext(
    query: string,
    language: 'he' | 'en' | 'mixed',
    sessionContext?: TacticalIntentData['sessionContext']
  ): { contexts: IntentContext[]; confidence: number } {
    const contexts: IntentContext[] = [];
    let confidence = 0.7; // Base confidence

    // Check Hebrew time markers
    for (const [marker, context] of this.HEBREW_TIME_MARKERS) {
      if (query.includes(marker)) {
        contexts.push(context);
        confidence += 0.1;
      }
    }

    // Real-time indicators
    if (
      query.includes('עכשיו') ||
      query.includes('כרגע') ||
      query.includes('מיד')
    ) {
      contexts.push(IntentContext.REAL_TIME);
      confidence += 0.15;
    }

    // Default context if none found
    if (contexts.length === 0) {
      contexts.push(IntentContext.NEUTRAL);
    }

    return { contexts, confidence: Math.min(confidence, 1.0) };
  }

  private static analyzeModifiers(
    query: string,
    language: 'he' | 'en' | 'mixed'
  ): IntentModifiers {
    const modifiers: IntentModifiers = {
      emotional: {},
      linguistic: {},
      temporal: {},
    };

    // Emotional analysis
    for (const [emotion, markers] of Object.entries(
      this.HEBREW_EMOTIONAL_MARKERS
    )) {
      const found = markers.some(marker => query.includes(marker));
      if (found) {
        modifiers.emotional[
          emotion as keyof IntentModifiers['emotional']
        ] = 0.8;
      }
    }

    // Formality analysis
    const formalMarkers = this.HEBREW_FORMALITY_MARKERS.formal.filter(m =>
      query.includes(m)
    );
    const informalMarkers = this.HEBREW_FORMALITY_MARKERS.informal.filter(m =>
      query.includes(m)
    );

    if (formalMarkers.length > 0) {
      modifiers.linguistic.formality = 0.8;
      modifiers.linguistic.politeness = 0.9;
    } else if (informalMarkers.length > 0) {
      modifiers.linguistic.formality = 0.2;
      modifiers.linguistic.politeness = 0.4;
    }

    // Directness analysis
    if (
      query.includes('!') ||
      query.includes('צריך') ||
      query.includes('חובה')
    ) {
      modifiers.linguistic.directness = 0.9;
    } else if (
      query.includes('?') ||
      query.includes('אולי') ||
      query.includes('אפשר')
    ) {
      modifiers.linguistic.directness = 0.3;
    }

    // Temporal urgency
    if (
      query.includes('דחוף') ||
      query.includes('מיד') ||
      query.includes('עכשיו')
    ) {
      modifiers.temporal.immediacy = 0.9;
    }

    return modifiers;
  }

  private static extractHebrewFeatures(
    query: string
  ): HebrewLinguisticFeatures {
    const features: HebrewLinguisticFeatures = {
      questionMarkers: [],
      imperativeMarkers: [],
      timeMarkers: [],
      emotionalMarkers: [],
      formalityMarkers: [],
      uncertaintyMarkers: [],
      emphasisMarkers: [],
    };

    // Question markers
    const questionWords = ['מה', 'איך', 'מי', 'איפה', 'מתי', 'למה', 'האם'];
    features.questionMarkers = questionWords.filter(word =>
      query.includes(word)
    );

    // Imperative markers
    const imperativeWords = ['תעשה', 'בצע', 'שנה', 'תגיד', 'החלף'];
    features.imperativeMarkers = imperativeWords.filter(word =>
      query.includes(word)
    );

    // Time markers
    const timeWords = ['עכשיו', 'כרגע', 'מיד', 'אחרי', 'לפני', 'במהלך'];
    features.timeMarkers = timeWords.filter(word => query.includes(word));

    // Emotional markers
    const allEmotionalWords = Object.values(
      this.HEBREW_EMOTIONAL_MARKERS
    ).flat();
    features.emotionalMarkers = allEmotionalWords.filter(word =>
      query.includes(word)
    );

    // Formality markers
    const allFormalityWords = [
      ...this.HEBREW_FORMALITY_MARKERS.formal,
      ...this.HEBREW_FORMALITY_MARKERS.informal,
    ];
    features.formalityMarkers = allFormalityWords.filter(word =>
      query.includes(word)
    );

    // Uncertainty markers
    const uncertaintyWords = ['אולי', 'אפשר', 'לא בטוח', 'חושב', 'נראה לי'];
    features.uncertaintyMarkers = uncertaintyWords.filter(word =>
      query.includes(word)
    );

    // Emphasis markers
    const emphasisWords = ['מאוד', 'ממש', 'באמת', 'לחלוטין', 'בהחלט'];
    features.emphasisMarkers = emphasisWords.filter(word =>
      query.includes(word)
    );

    return features;
  }

  private static calculateConfidence(
    intentClassification: any,
    targets: IntentTargets,
    context: any,
    modifiers: IntentModifiers,
    morphology?: HebrewMorphology
  ): IntentConfidence {
    const classification = intentClassification.primary.confidence;

    // Entity extraction confidence
    const entityCount =
      Object.values(targets.entities).flat().length +
      Object.values(targets.concepts).flat().length;
    const entities = Math.min(entityCount * 0.1 + 0.4, 1.0);

    // Temporal understanding confidence
    const temporal = context.confidence;

    // Emotional analysis confidence
    const emotionalIndicators = Object.values(modifiers.emotional).length;
    const emotional = Math.min(emotionalIndicators * 0.2 + 0.5, 1.0);

    // Complexity assessment confidence
    const complexity = morphology
      ? morphology.confidence + (morphology.isHighConfidence ? 0.2 : 0)
      : 0.6;

    const overall =
      (classification + entities + temporal + emotional + complexity) / 5;

    return {
      overall,
      classification,
      entities,
      temporal,
      emotional,
      complexity,
    };
  }

  private static determineUrgency(
    modifiers: IntentModifiers,
    context: IntentContext[],
    hebrewFeatures: HebrewLinguisticFeatures
  ): IntentUrgency {
    // Critical urgency indicators
    if (modifiers.temporal?.immediacy && modifiers.temporal.immediacy > 0.8) {
      return IntentUrgency.CRITICAL;
    }

    // Live match context
    if (
      context.includes(IntentContext.REAL_TIME) ||
      context.includes(IntentContext.FIRST_HALF) ||
      context.includes(IntentContext.SECOND_HALF)
    ) {
      return IntentUrgency.URGENT;
    }

    // High urgency markers
    if (
      hebrewFeatures.imperativeMarkers.length > 0 ||
      (modifiers.emotional?.urgency && modifiers.emotional.urgency > 0.7)
    ) {
      return IntentUrgency.HIGH;
    }

    // Medium urgency for questions and recommendations
    if (hebrewFeatures.questionMarkers.length > 0) {
      return IntentUrgency.MEDIUM;
    }

    return IntentUrgency.LOW;
  }

  private static determineComplexity(
    targets: IntentTargets,
    intentClassification: any,
    morphology?: HebrewMorphology
  ): IntentComplexity {
    let complexityScore = 0;

    // Count entities and concepts
    const entityCount = Object.values(targets.entities).flat().length;
    const conceptCount = Object.values(targets.concepts).flat().length;
    complexityScore += (entityCount + conceptCount) * 0.1;

    // Intent type complexity
    const complexIntents = [
      IntentType.TACTICAL_ANALYSIS,
      IntentType.COMPARISON_REQUEST,
      IntentType.PREDICTION_REQUEST,
    ];
    if (complexIntents.includes(intentClassification.primary.intent)) {
      complexityScore += 0.3;
    }

    // Morphological complexity
    if (morphology) {
      complexityScore += morphology.tacticalRelevanceScore * 0.2;
      if (morphology.footballTermCount > 3) {
        complexityScore += 0.2;
      }
    }

    // Determine complexity level
    if (complexityScore < 0.3) return IntentComplexity.SIMPLE;
    if (complexityScore < 0.6) return IntentComplexity.MODERATE;
    if (complexityScore < 0.8) return IntentComplexity.COMPLEX;
    if (complexityScore < 1.0) return IntentComplexity.ADVANCED;
    return IntentComplexity.EXPERT;
  }

  private static determineResponseExpectation(
    intent: IntentType,
    modifiers: IntentModifiers,
    targets: IntentTargets
  ): ResponseExpectation {
    // Map intent types to expected response types
    const intentResponseMap: Record<IntentType, ResponseExpectation> = {
      [IntentType.QUESTION]: ResponseExpectation.EXPLANATION,
      [IntentType.INSTRUCTION]: ResponseExpectation.BRIEF,
      [IntentType.RECOMMENDATION_REQUEST]: ResponseExpectation.RECOMMENDATION,
      [IntentType.TACTICAL_ANALYSIS]: ResponseExpectation.ANALYSIS,
      [IntentType.COMPARISON_REQUEST]: ResponseExpectation.COMPARISON,
      [IntentType.TRAINING_REQUEST]: ResponseExpectation.STEP_BY_STEP,
      [IntentType.LIVE_MATCH_QUERY]: ResponseExpectation.BRIEF,
      [IntentType.PERFORMANCE_ANALYSIS]: ResponseExpectation.ANALYSIS,
      [IntentType.EXPLANATION_REQUEST]: ResponseExpectation.EXPLANATION,
      [IntentType.EVALUATION_REQUEST]: ResponseExpectation.ANALYSIS,
      [IntentType.PREDICTION_REQUEST]: ResponseExpectation.ANALYSIS,
      [IntentType.STRATEGY_REQUEST]: ResponseExpectation.RECOMMENDATION,
      [IntentType.ADJUSTMENT_REQUEST]: ResponseExpectation.RECOMMENDATION,
      [IntentType.FORMATION_ANALYSIS]: ResponseExpectation.ANALYSIS,
      [IntentType.PLAYER_ANALYSIS]: ResponseExpectation.ANALYSIS,
      [IntentType.OPPONENT_ANALYSIS]: ResponseExpectation.ANALYSIS,
      [IntentType.POST_MATCH_ANALYSIS]: ResponseExpectation.ANALYSIS,
      [IntentType.PRE_MATCH_PLANNING]: ResponseExpectation.RECOMMENDATION,
      [IntentType.TRAINING_SESSION]: ResponseExpectation.STEP_BY_STEP,
      [IntentType.SEASON_PLANNING]: ResponseExpectation.RECOMMENDATION,
      [IntentType.CLARIFICATION]: ResponseExpectation.EXPLANATION,
      [IntentType.FOLLOW_UP]: ResponseExpectation.BRIEF,
      [IntentType.CONFIRMATION]: ResponseExpectation.BRIEF,
      [IntentType.DISAGREEMENT]: ResponseExpectation.EXPLANATION,
      [IntentType.APPRECIATION]: ResponseExpectation.BRIEF,
    };

    return intentResponseMap[intent] || ResponseExpectation.EXPLANATION;
  }

  private static generateId(): string {
    return `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateTacticalIntent(data: TacticalIntentData): void {
    if (!data.id?.trim()) {
      throw new Error('Intent ID is required');
    }

    if (!data.originalQuery?.trim()) {
      throw new Error('Original query is required');
    }

    if (!data.primaryIntent) {
      throw new Error('Primary intent is required');
    }

    if (!data.language) {
      throw new Error('Language is required');
    }

    if (data.confidence.overall < 0 || data.confidence.overall > 1) {
      throw new Error('Overall confidence must be between 0 and 1');
    }

    if (data.processingTime < 0) {
      throw new Error('Processing time cannot be negative');
    }
  }

  // Getters
  get id(): string {
    return this._data.id;
  }

  get originalQuery(): string {
    return this._data.originalQuery;
  }

  get normalizedQuery(): string {
    return this._data.normalizedQuery;
  }

  get language(): 'he' | 'en' | 'mixed' {
    return this._data.language;
  }

  get primaryIntent(): IntentType {
    return this._data.primaryIntent;
  }

  get secondaryIntents(): IntentType[] {
    return [...this._data.secondaryIntents];
  }

  get urgency(): IntentUrgency {
    return this._data.urgency;
  }

  get complexity(): IntentComplexity {
    return this._data.complexity;
  }

  get responseExpectation(): ResponseExpectation {
    return this._data.responseExpectation;
  }

  get context(): IntentContext[] {
    return [...this._data.context];
  }

  get modifiers(): IntentModifiers {
    return { ...this._data.modifiers };
  }

  get targets(): IntentTargets {
    return { ...this._data.targets };
  }

  get hebrewFeatures(): HebrewLinguisticFeatures {
    return { ...this._data.hebrewFeatures };
  }

  get morphology(): HebrewMorphology | undefined {
    return this._data.morphology;
  }

  get confidence(): IntentConfidence {
    return { ...this._data.confidence };
  }

  get processingSteps(): string[] {
    return [...this._data.processingSteps];
  }

  get alternativeInterpretations(): TacticalIntentData['alternativeInterpretations'] {
    return [...this._data.alternativeInterpretations];
  }

  get sessionContext(): TacticalIntentData['sessionContext'] {
    return this._data.sessionContext
      ? { ...this._data.sessionContext }
      : undefined;
  }

  get createdAt(): Date {
    return this._data.createdAt;
  }

  get processingTime(): number {
    return this._data.processingTime;
  }

  get version(): string {
    return this._data.version;
  }

  // Derived properties
  get isQuestion(): boolean {
    return (
      this._data.primaryIntent === IntentType.QUESTION ||
      this._data.hebrewFeatures.questionMarkers.length > 0
    );
  }

  get isInstruction(): boolean {
    return (
      this._data.primaryIntent === IntentType.INSTRUCTION ||
      this._data.hebrewFeatures.imperativeMarkers.length > 0
    );
  }

  get isUrgent(): boolean {
    return [
      IntentUrgency.HIGH,
      IntentUrgency.URGENT,
      IntentUrgency.CRITICAL,
    ].includes(this._data.urgency);
  }

  get isLiveMatch(): boolean {
    return (
      this._data.context.includes(IntentContext.REAL_TIME) ||
      this._data.context.includes(IntentContext.FIRST_HALF) ||
      this._data.context.includes(IntentContext.SECOND_HALF)
    );
  }

  get isHighConfidence(): boolean {
    return this._data.confidence.overall > 0.8;
  }

  get isComplex(): boolean {
    return [
      IntentComplexity.COMPLEX,
      IntentComplexity.ADVANCED,
      IntentComplexity.EXPERT,
    ].includes(this._data.complexity);
  }

  get requiresDetailedResponse(): boolean {
    return [
      ResponseExpectation.ANALYSIS,
      ResponseExpectation.EXPLANATION,
      ResponseExpectation.STEP_BY_STEP,
      ResponseExpectation.COMPARISON,
    ].includes(this._data.responseExpectation);
  }

  get hasEmotionalContent(): boolean {
    return Object.keys(this._data.modifiers.emotional).length > 0;
  }

  get isFormalRequest(): boolean {
    return this._data.modifiers.linguistic.formality
      ? this._data.modifiers.linguistic.formality > 0.6
      : false;
  }

  get targetedEntitiesCount(): number {
    return Object.values(this._data.targets.entities).flat().length;
  }

  get targetedConceptsCount(): number {
    return Object.values(this._data.targets.concepts).flat().length;
  }

  // Methods
  public hasContext(context: IntentContext): boolean {
    return this._data.context.includes(context);
  }

  public hasIntent(intent: IntentType): boolean {
    return (
      this._data.primaryIntent === intent ||
      this._data.secondaryIntents.includes(intent)
    );
  }

  public hasHebrewFeature(
    featureType: keyof HebrewLinguisticFeatures
  ): boolean {
    return this._data.hebrewFeatures[featureType].length > 0;
  }

  public getEmotionalTone(): string {
    const emotions = this._data.modifiers.emotional;
    const dominant = Object.entries(emotions).sort(
      ([, a], [, b]) => (b || 0) - (a || 0)
    )[0];

    return dominant ? dominant[0] : 'neutral';
  }

  public getExpectedResponseTime(): number {
    // Base time in seconds
    let baseTime = 10;

    // Adjust for complexity
    const complexityMultipliers = {
      [IntentComplexity.SIMPLE]: 1,
      [IntentComplexity.MODERATE]: 1.5,
      [IntentComplexity.COMPLEX]: 2,
      [IntentComplexity.ADVANCED]: 3,
      [IntentComplexity.EXPERT]: 4,
    };
    baseTime *= complexityMultipliers[this._data.complexity];

    // Adjust for urgency
    const urgencyMultipliers = {
      [IntentUrgency.CRITICAL]: 0.3,
      [IntentUrgency.URGENT]: 0.5,
      [IntentUrgency.HIGH]: 0.7,
      [IntentUrgency.MEDIUM]: 1,
      [IntentUrgency.LOW]: 1.5,
    };
    baseTime *= urgencyMultipliers[this._data.urgency];

    // Adjust for response type
    const responseMultipliers = {
      [ResponseExpectation.BRIEF]: 0.5,
      [ResponseExpectation.EXPLANATION]: 1,
      [ResponseExpectation.STEP_BY_STEP]: 1.5,
      [ResponseExpectation.ANALYSIS]: 2,
      [ResponseExpectation.RECOMMENDATION]: 1.2,
      [ResponseExpectation.VISUALIZATION]: 2.5,
      [ResponseExpectation.EXAMPLES]: 1.3,
      [ResponseExpectation.COMPARISON]: 2,
    };
    baseTime *= responseMultipliers[this._data.responseExpectation];

    return Math.max(baseTime, 2); // Minimum 2 seconds
  }

  public getSimilarityScore(other: TacticalIntent): number {
    let score = 0;
    let factors = 0;

    // Intent similarity
    if (this._data.primaryIntent === other._data.primaryIntent) {
      score += 0.4;
    }
    factors++;

    // Context overlap
    const contextOverlap = this._data.context.filter(c =>
      other._data.context.includes(c)
    ).length;
    const maxContexts = Math.max(
      this._data.context.length,
      other._data.context.length
    );
    if (maxContexts > 0) {
      score += (contextOverlap / maxContexts) * 0.3;
    }
    factors++;

    // Target entity overlap
    const thisEntities = Object.values(this._data.targets.entities).flat();
    const otherEntities = Object.values(other._data.targets.entities).flat();
    const entityOverlap = thisEntities.filter(e =>
      otherEntities.includes(e)
    ).length;
    const maxEntities = Math.max(thisEntities.length, otherEntities.length);
    if (maxEntities > 0) {
      score += (entityOverlap / maxEntities) * 0.3;
    }
    factors++;

    return score / factors;
  }

  public withUpdatedConfidence(
    confidence: Partial<IntentConfidence>
  ): TacticalIntent {
    const updatedConfidence = { ...this._data.confidence, ...confidence };

    return new TacticalIntent({
      ...this._data,
      confidence: updatedConfidence,
    });
  }

  public withSessionContext(
    sessionContext: TacticalIntentData['sessionContext']
  ): TacticalIntent {
    return new TacticalIntent({
      ...this._data,
      sessionContext,
    });
  }

  public withRelatedQuery(queryId: string): TacticalIntent {
    const currentRelated = this._data.relatedQueries || [];
    if (currentRelated.includes(queryId)) {
      return this;
    }

    return new TacticalIntent({
      ...this._data,
      relatedQueries: [...currentRelated, queryId],
    });
  }

  public equals(other: TacticalIntent): boolean {
    return this._data.id === other._data.id;
  }

  public toJSON(): TacticalIntentData {
    return { ...this._data };
  }

  public toString(): string {
    return `TacticalIntent(${
      this._data.primaryIntent
    }: "${this._data.originalQuery.substring(0, 50)}...", ${
      this._data.urgency
    }, ${this._data.complexity})`;
  }

  public toHebrewString(): string {
    const intentTranslations = {
      [IntentType.QUESTION]: 'שאלה',
      [IntentType.INSTRUCTION]: 'הוראה',
      [IntentType.RECOMMENDATION_REQUEST]: 'בקשת המלצה',
      [IntentType.TACTICAL_ANALYSIS]: 'ניתוח טקטי',
      [IntentType.PERFORMANCE_ANALYSIS]: 'ניתוח ביצועים',
    };

    const intentHe =
      intentTranslations[this._data.primaryIntent] || this._data.primaryIntent;
    return `כוונה טקטית (${intentHe}: "${this._data.originalQuery.substring(
      0,
      30
    )}...")`;
  }
}
