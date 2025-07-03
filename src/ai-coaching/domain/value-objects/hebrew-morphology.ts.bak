/**
 * Hebrew Morphology Value Object
 * Advanced Hebrew language processing for football tactical analysis
 */

export enum HebrewWordType {
  NOUN = 'noun',
  VERB = 'verb',
  ADJECTIVE = 'adjective',
  ADVERB = 'adverb',
  PREPOSITION = 'preposition',
  PRONOUN = 'pronoun',
  CONJUNCTION = 'conjunction',
  PARTICIPLE = 'participle',
  INFINITIVE = 'infinitive',
}

export enum HebrewGender {
  MASCULINE = 'masculine',
  FEMININE = 'feminine',
  NEUTRAL = 'neutral',
}

export enum HebrewNumber {
  SINGULAR = 'singular',
  PLURAL = 'plural',
  DUAL = 'dual',
}

export enum HebrewTense {
  PAST = 'past',
  PRESENT = 'present',
  FUTURE = 'future',
  IMPERATIVE = 'imperative',
  INFINITIVE = 'infinitive',
}

export enum HebrewPerson {
  FIRST = 'first',
  SECOND = 'second',
  THIRD = 'third',
}

export enum FootballSemanticCategory {
  PLAYER = 'player',
  POSITION = 'position',
  ACTION = 'action',
  FORMATION = 'formation',
  TACTIC = 'tactic',
  LOCATION = 'location',
  TIME = 'time',
  SCORE = 'score',
  EQUIPMENT = 'equipment',
  RULE = 'rule',
  EMOTION = 'emotion',
  QUALITY = 'quality',
}

export interface HebrewRoot {
  consonants: string;
  meaning: string;
  relatedWords: string[];
}

export interface MorphologicalFeatures {
  wordType: HebrewWordType;
  gender?: HebrewGender;
  number?: HebrewNumber;
  tense?: HebrewTense;
  person?: HebrewPerson;
  definite?: boolean;
  construct?: boolean;
  prefixes: string[];
  suffixes: string[];
  root?: HebrewRoot;
}

export interface SemanticAnalysis {
  category: FootballSemanticCategory;
  confidence: number;
  englishTranslation: string;
  tacticalRelevance: number;
  synonyms: string[];
  antonyms: string[];
  relatedConcepts: string[];
  contextualMeaning?: string;
}

export interface HebrewMorphologyData {
  originalText: string;
  normalizedText: string;
  tokens: string[];
  morphology: MorphologicalFeatures[];
  semantics: SemanticAnalysis[];
  footballTerms: string[];
  sentimentScore: number;
  intentClassification: string;
  confidence: number;
  processingTimestamp: Date;
}

export class HebrewMorphology {
  private readonly _data: HebrewMorphologyData;

  // Hebrew football terminology dictionary
  private static readonly FOOTBALL_TERMS = new Map<string, SemanticAnalysis>([
    // Players
    [
      'שחקן',
      {
        category: FootballSemanticCategory.PLAYER,
        confidence: 0.95,
        englishTranslation: 'player',
        tacticalRelevance: 0.9,
        synonyms: ['כדורגלן'],
        antonyms: [],
        relatedConcepts: ['קבוצה', 'מאמן'],
      },
    ],
    [
      'שוער',
      {
        category: FootballSemanticCategory.POSITION,
        confidence: 0.98,
        englishTranslation: 'goalkeeper',
        tacticalRelevance: 0.95,
        synonyms: ['שוער שערים'],
        antonyms: [],
        relatedConcepts: ['שער', 'הגנה'],
      },
    ],
    [
      'מגן',
      {
        category: FootballSemanticCategory.POSITION,
        confidence: 0.95,
        englishTranslation: 'defender',
        tacticalRelevance: 0.9,
        synonyms: ['בלם'],
        antonyms: ['תוקף'],
        relatedConcepts: ['הגנה', 'קו אחורי'],
      },
    ],
    [
      'קשר',
      {
        category: FootballSemanticCategory.POSITION,
        confidence: 0.92,
        englishTranslation: 'midfielder',
        tacticalRelevance: 0.85,
        synonyms: ['שחקן אמצע'],
        antonyms: [],
        relatedConcepts: ['מרכז', 'קישור'],
      },
    ],
    [
      'תוקף',
      {
        category: FootballSemanticCategory.POSITION,
        confidence: 0.94,
        englishTranslation: 'attacker',
        tacticalRelevance: 0.9,
        synonyms: ['חלוץ'],
        antonyms: ['מגן'],
        relatedConcepts: ['התקפה', 'שער'],
      },
    ],

    // Actions
    [
      'בעיטה',
      {
        category: FootballSemanticCategory.ACTION,
        confidence: 0.95,
        englishTranslation: 'kick',
        tacticalRelevance: 0.8,
        synonyms: ['בעט'],
        antonyms: [],
        relatedConcepts: ['כדור', 'שער'],
      },
    ],
    [
      'מסירה',
      {
        category: FootballSemanticCategory.ACTION,
        confidence: 0.93,
        englishTranslation: 'pass',
        tacticalRelevance: 0.85,
        synonyms: ['העברה'],
        antonyms: [],
        relatedConcepts: ['שחקן', 'קבוצה'],
      },
    ],
    [
      'יירוט',
      {
        category: FootballSemanticCategory.ACTION,
        confidence: 0.9,
        englishTranslation: 'interception',
        tacticalRelevance: 0.8,
        synonyms: ['חטיפה'],
        antonyms: [],
        relatedConcepts: ['הגנה', 'כדור'],
      },
    ],
    [
      'ריצה',
      {
        category: FootballSemanticCategory.ACTION,
        confidence: 0.85,
        englishTranslation: 'run',
        tacticalRelevance: 0.7,
        synonyms: ['דהירה'],
        antonyms: [],
        relatedConcepts: ['מהירות', 'תנועה'],
      },
    ],
    [
      'קפיצה',
      {
        category: FootballSemanticCategory.ACTION,
        confidence: 0.88,
        englishTranslation: 'jump',
        tacticalRelevance: 0.75,
        synonyms: ['זינוק'],
        antonyms: [],
        relatedConcepts: ['גובה', 'כדור אווירי'],
      },
    ],

    // Formations & Tactics
    [
      'מערך',
      {
        category: FootballSemanticCategory.FORMATION,
        confidence: 0.95,
        englishTranslation: 'formation',
        tacticalRelevance: 0.95,
        synonyms: ['מערכת'],
        antonyms: [],
        relatedConcepts: ['טקטיקה', 'שחקנים'],
      },
    ],
    [
      'הגנה',
      {
        category: FootballSemanticCategory.TACTIC,
        confidence: 0.95,
        englishTranslation: 'defense',
        tacticalRelevance: 0.9,
        synonyms: ['הגנתי'],
        antonyms: ['התקפה'],
        relatedConcepts: ['מגן', 'שער'],
      },
    ],
    [
      'התקפה',
      {
        category: FootballSemanticCategory.TACTIC,
        confidence: 0.95,
        englishTranslation: 'attack',
        tacticalRelevance: 0.9,
        synonyms: ['התקפי'],
        antonyms: ['הגנה'],
        relatedConcepts: ['תוקף', 'שער'],
      },
    ],
    [
      'לחיצה',
      {
        category: FootballSemanticCategory.TACTIC,
        confidence: 0.9,
        englishTranslation: 'pressing',
        tacticalRelevance: 0.85,
        synonyms: ['לחץ'],
        antonyms: [],
        relatedConcepts: ['הגנה', 'מהירות'],
      },
    ],
    [
      'נגד התקפה',
      {
        category: FootballSemanticCategory.TACTIC,
        confidence: 0.92,
        englishTranslation: 'counter-attack',
        tacticalRelevance: 0.88,
        synonyms: ['התקפת נגד'],
        antonyms: [],
        relatedConcepts: ['מהירות', 'מעבר'],
      },
    ],

    // Locations
    [
      'שער',
      {
        category: FootballSemanticCategory.LOCATION,
        confidence: 0.98,
        englishTranslation: 'goal',
        tacticalRelevance: 0.95,
        synonyms: ['שערים'],
        antonyms: [],
        relatedConcepts: ['שוער', 'בעיטה'],
      },
    ],
    [
      'קו חצי',
      {
        category: FootballSemanticCategory.LOCATION,
        confidence: 0.9,
        englishTranslation: 'midfield line',
        tacticalRelevance: 0.8,
        synonyms: ['אמצע המגרש'],
        antonyms: [],
        relatedConcepts: ['מגרש', 'קישור'],
      },
    ],
    [
      'רחבה',
      {
        category: FootballSemanticCategory.LOCATION,
        confidence: 0.92,
        englishTranslation: 'penalty area',
        tacticalRelevance: 0.9,
        synonyms: ['קופסה'],
        antonyms: [],
        relatedConcepts: ['שער', 'פנדל'],
      },
    ],
    [
      'פינה',
      {
        category: FootballSemanticCategory.LOCATION,
        confidence: 0.88,
        englishTranslation: 'corner',
        tacticalRelevance: 0.8,
        synonyms: ['קורנר'],
        antonyms: [],
        relatedConcepts: ['בעיטה', 'שער'],
      },
    ],

    // Time & Score
    [
      'דקה',
      {
        category: FootballSemanticCategory.TIME,
        confidence: 0.95,
        englishTranslation: 'minute',
        tacticalRelevance: 0.7,
        synonyms: ['זמן'],
        antonyms: [],
        relatedConcepts: ['משחק', 'שעון'],
      },
    ],
    [
      'מחצית',
      {
        category: FootballSemanticCategory.TIME,
        confidence: 0.93,
        englishTranslation: 'half',
        tacticalRelevance: 0.8,
        synonyms: ['חלק'],
        antonyms: [],
        relatedConcepts: ['משחק', 'הפסקה'],
      },
    ],
    [
      'תוצאה',
      {
        category: FootballSemanticCategory.SCORE,
        confidence: 0.95,
        englishTranslation: 'score',
        tacticalRelevance: 0.85,
        synonyms: ['ניקוד'],
        antonyms: [],
        relatedConcepts: ['שער', 'זכייה'],
      },
    ],
    [
      'שוויון',
      {
        category: FootballSemanticCategory.SCORE,
        confidence: 0.9,
        englishTranslation: 'draw',
        tacticalRelevance: 0.8,
        synonyms: ['תיקו'],
        antonyms: ['זכייה', 'הפסד'],
        relatedConcepts: ['תוצאה'],
      },
    ],

    // Qualities & Emotions
    [
      'מהיר',
      {
        category: FootballSemanticCategory.QUALITY,
        confidence: 0.85,
        englishTranslation: 'fast',
        tacticalRelevance: 0.8,
        synonyms: ['זריז'],
        antonyms: ['איטי'],
        relatedConcepts: ['ריצה', 'התקפה'],
      },
    ],
    [
      'חזק',
      {
        category: FootballSemanticCategory.QUALITY,
        confidence: 0.85,
        englishTranslation: 'strong',
        tacticalRelevance: 0.8,
        synonyms: ['עוצמתי'],
        antonyms: ['חלש'],
        relatedConcepts: ['כוח', 'דואל'],
      },
    ],
    [
      'מדויק',
      {
        category: FootballSemanticCategory.QUALITY,
        confidence: 0.88,
        englishTranslation: 'accurate',
        tacticalRelevance: 0.85,
        synonyms: ['נכון'],
        antonyms: ['שגוי'],
        relatedConcepts: ['מסירה', 'בעיטה'],
      },
    ],
    [
      'נלהב',
      {
        category: FootballSemanticCategory.EMOTION,
        confidence: 0.8,
        englishTranslation: 'enthusiastic',
        tacticalRelevance: 0.6,
        synonyms: ['מתרגש'],
        antonyms: ['אדיש'],
        relatedConcepts: ['רגש', 'מוטיבציה'],
      },
    ],
  ]);

  constructor(data: HebrewMorphologyData) {
    this.validateHebrewMorphology(data);
    this._data = Object.freeze({ ...data });
  }

  public static analyze(text: string): HebrewMorphology {
    const tokens = this.tokenize(text);
    const morphology = this.analyzeMorphology(tokens);
    const semantics = this.analyzeSemantics(tokens);
    const footballTerms = this.extractFootballTerms(tokens);
    const sentiment = this.analyzeSentiment(text, semantics);
    const intent = this.classifyIntent(text, semantics);

    return new HebrewMorphology({
      originalText: text,
      normalizedText: this.normalizeText(text),
      tokens,
      morphology,
      semantics,
      footballTerms,
      sentimentScore: sentiment,
      intentClassification: intent,
      confidence: this.calculateOverallConfidence(morphology, semantics),
      processingTimestamp: new Date(),
    });
  }

  private static tokenize(text: string): string[] {
    // Hebrew tokenization - handles Hebrew text specifics
    const normalized = text
      .replace(/[״״]/g, '"') // Replace Hebrew quotes
      .replace(/[׳']/g, "'") // Replace Hebrew apostrophes
      .replace(/[־]/g, '-') // Replace Hebrew dash
      .trim();

    // Split by whitespace and punctuation, but preserve Hebrew words
    return normalized
      .split(/[\s\.,;!?\(\)\[\]{}]+/)
      .filter(token => token.length > 0)
      .map(token => token.trim());
  }

  private static normalizeText(text: string): string {
    return text
      .replace(/[״״]/g, '"')
      .replace(/[׳']/g, "'")
      .replace(/[־]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static analyzeMorphology(tokens: string[]): MorphologicalFeatures[] {
    return tokens.map(token => {
      // Basic Hebrew morphological analysis
      const features: MorphologicalFeatures = {
        wordType: this.determineWordType(token),
        prefixes: this.extractPrefixes(token),
        suffixes: this.extractSuffixes(token),
      };

      // Determine gender, number for nouns/adjectives
      if (
        features.wordType === HebrewWordType.NOUN ||
        features.wordType === HebrewWordType.ADJECTIVE
      ) {
        features.gender = this.determineGender(token);
        features.number = this.determineNumber(token);
        features.definite = this.isDefinite(token);
      }

      // Determine tense, person for verbs
      if (features.wordType === HebrewWordType.VERB) {
        features.tense = this.determineTense(token);
        features.person = this.determinePerson(token);
        features.gender = this.determineGender(token);
        features.number = this.determineNumber(token);
      }

      // Extract root if possible
      features.root = this.extractRoot(token);

      return features;
    });
  }

  private static determineWordType(token: string): HebrewWordType {
    // Simplified Hebrew word type determination

    // Common verb patterns
    if (token.match(/^[מ][א-ת]{2,3}$/)) return HebrewWordType.PARTICIPLE;
    if (token.match(/^[ל][א-ת]{2,4}$/)) return HebrewWordType.INFINITIVE;
    if (token.endsWith('ים') || token.endsWith('ות'))
      return HebrewWordType.NOUN;
    if (token.endsWith('תי') || token.endsWith('נו') || token.endsWith('תם'))
      return HebrewWordType.VERB;

    // Football specific patterns
    if (this.FOOTBALL_TERMS.has(token)) {
      const analysis = this.FOOTBALL_TERMS.get(token)!;
      if (analysis.category === FootballSemanticCategory.ACTION)
        return HebrewWordType.VERB;
      if (analysis.category === FootballSemanticCategory.QUALITY)
        return HebrewWordType.ADJECTIVE;
    }

    return HebrewWordType.NOUN; // Default
  }

  private static determineGender(token: string): HebrewGender {
    // Hebrew gender determination rules
    if (token.endsWith('ה') || token.endsWith('ת') || token.endsWith('ות')) {
      return HebrewGender.FEMININE;
    }
    return HebrewGender.MASCULINE; // Default for Hebrew
  }

  private static determineNumber(token: string): HebrewNumber {
    if (token.endsWith('ים') || token.endsWith('ות') || token.endsWith('ין')) {
      return HebrewNumber.PLURAL;
    }
    if (token.endsWith('יים') || token.endsWith('תיים')) {
      return HebrewNumber.DUAL;
    }
    return HebrewNumber.SINGULAR;
  }

  private static determineTense(token: string): HebrewTense {
    // Hebrew tense determination
    if (
      token.startsWith('י') ||
      token.startsWith('ת') ||
      token.startsWith('א') ||
      token.startsWith('נ')
    ) {
      return HebrewTense.FUTURE;
    }
    if (token.endsWith('תי') || token.endsWith('ת') || token.endsWith('נו')) {
      return HebrewTense.PAST;
    }
    if (token.startsWith('מ')) {
      return HebrewTense.PRESENT;
    }
    return HebrewTense.PRESENT; // Default
  }

  private static determinePerson(token: string): HebrewPerson {
    if (token.endsWith('תי') || token.endsWith('נו')) return HebrewPerson.FIRST;
    if (token.endsWith('ת') || token.endsWith('תם') || token.endsWith('תן'))
      return HebrewPerson.SECOND;
    return HebrewPerson.THIRD;
  }

  private static isDefinite(token: string): boolean {
    return token.startsWith('ה') && token.length > 2;
  }

  private static extractPrefixes(token: string): string[] {
    const prefixes: string[] = [];
    let remaining = token;

    // Common Hebrew prefixes
    const hebrewPrefixes = [
      'ב',
      'כ',
      'ל',
      'מ',
      'ש',
      'ה',
      'ו',
      'כש',
      'שב',
      'שכ',
      'שמ',
    ];

    for (const prefix of hebrewPrefixes) {
      if (
        remaining.startsWith(prefix) &&
        remaining.length > prefix.length + 1
      ) {
        prefixes.push(prefix);
        remaining = remaining.substring(prefix.length);
        break; // One prefix at a time for simplicity
      }
    }

    return prefixes;
  }

  private static extractSuffixes(token: string): string[] {
    const suffixes: string[] = [];

    // Common Hebrew suffixes
    const hebrewSuffixes = [
      'ים',
      'ות',
      'תי',
      'נו',
      'תם',
      'תן',
      'הם',
      'הן',
      'ך',
      'ה',
    ];

    for (const suffix of hebrewSuffixes) {
      if (token.endsWith(suffix) && token.length > suffix.length + 1) {
        suffixes.push(suffix);
        break;
      }
    }

    return suffixes;
  }

  private static extractRoot(token: string): HebrewRoot | undefined {
    // Simplified root extraction - in practice would use more sophisticated algorithms
    let remaining = token;

    // Remove prefixes and suffixes
    const prefixes = this.extractPrefixes(remaining);
    prefixes.forEach(prefix => {
      if (remaining.startsWith(prefix)) {
        remaining = remaining.substring(prefix.length);
      }
    });

    const suffixes = this.extractSuffixes(remaining);
    suffixes.forEach(suffix => {
      if (remaining.endsWith(suffix)) {
        remaining = remaining.substring(0, remaining.length - suffix.length);
      }
    });

    if (remaining.length >= 2 && remaining.length <= 4) {
      return {
        consonants: remaining,
        meaning: `Root of ${token}`,
        relatedWords: [],
      };
    }

    return undefined;
  }

  private static analyzeSemantics(tokens: string[]): SemanticAnalysis[] {
    return tokens.map(token => {
      // Check if token is a known football term
      if (this.FOOTBALL_TERMS.has(token)) {
        return { ...this.FOOTBALL_TERMS.get(token)! };
      }

      // Check for partial matches or variations
      const partialMatch = this.findPartialMatch(token);
      if (partialMatch) {
        return {
          ...partialMatch,
          confidence: partialMatch.confidence * 0.8, // Reduce confidence for partial match
          contextualMeaning: `Possible variation of ${partialMatch.englishTranslation}`,
        };
      }

      // Default semantic analysis
      return {
        category: FootballSemanticCategory.QUALITY, // Default category
        confidence: 0.3,
        englishTranslation: token, // Keep Hebrew if no translation
        tacticalRelevance: 0.2,
        synonyms: [],
        antonyms: [],
        relatedConcepts: [],
      };
    });
  }

  private static findPartialMatch(token: string): SemanticAnalysis | null {
    // Check for root-based matches
    for (const [term, analysis] of this.FOOTBALL_TERMS) {
      if (token.includes(term) || term.includes(token)) {
        return analysis;
      }
    }

    // Check for semantic similarity (simplified)
    const cleanToken = token.replace(/[ה]$/, ''); // Remove definite article
    for (const [term, analysis] of this.FOOTBALL_TERMS) {
      const cleanTerm = term.replace(/[ה]$/, '');
      if (cleanToken === cleanTerm) {
        return analysis;
      }
    }

    return null;
  }

  private static extractFootballTerms(tokens: string[]): string[] {
    const footballTerms: string[] = [];

    tokens.forEach(token => {
      if (this.FOOTBALL_TERMS.has(token)) {
        footballTerms.push(token);
      } else {
        const partialMatch = this.findPartialMatch(token);
        if (partialMatch && partialMatch.confidence > 0.7) {
          footballTerms.push(token);
        }
      }
    });

    return footballTerms;
  }

  private static analyzeSentiment(
    text: string,
    semantics: SemanticAnalysis[]
  ): number {
    // Simple sentiment analysis for Hebrew football text
    let sentimentScore = 0;
    let count = 0;

    // Positive football terms
    const positiveTerms = [
      'טוב',
      'מעולה',
      'חזק',
      'מהיר',
      'מדויק',
      'יפה',
      'נהדר',
    ];
    const negativeTerms = ['רע', 'איטי', 'חלש', 'שגוי', 'גרוע', 'קשה'];

    const words = text.split(/\s+/);
    words.forEach(word => {
      if (positiveTerms.includes(word)) {
        sentimentScore += 1;
        count++;
      } else if (negativeTerms.includes(word)) {
        sentimentScore -= 1;
        count++;
      }
    });

    // Analyze semantic emotions
    semantics.forEach(semantic => {
      if (semantic.category === FootballSemanticCategory.EMOTION) {
        sentimentScore += (semantic.confidence - 0.5) * 2;
        count++;
      }
    });

    return count > 0 ? sentimentScore / count : 0;
  }

  private static classifyIntent(
    text: string,
    semantics: SemanticAnalysis[]
  ): string {
    // Intent classification for Hebrew football queries
    const actionTerms = semantics.filter(
      s => s.category === FootballSemanticCategory.ACTION
    ).length;
    const playerTerms = semantics.filter(
      s => s.category === FootballSemanticCategory.PLAYER
    ).length;
    const tacticTerms = semantics.filter(
      s => s.category === FootballSemanticCategory.TACTIC
    ).length;

    // Question markers in Hebrew
    if (
      text.includes('?') ||
      text.startsWith('איך') ||
      text.startsWith('מה') ||
      text.startsWith('מי') ||
      text.startsWith('למה') ||
      text.startsWith('מתי')
    ) {
      return 'question';
    }

    // Command markers
    if (
      text.includes('!') ||
      text.startsWith('תעשה') ||
      text.startsWith('בצע')
    ) {
      return 'command';
    }

    // Analysis request
    if (tacticTerms > actionTerms && tacticTerms > playerTerms) {
      return 'tactical_analysis';
    }

    // Player evaluation
    if (playerTerms > actionTerms && playerTerms > tacticTerms) {
      return 'player_evaluation';
    }

    // Action analysis
    if (actionTerms > 0) {
      return 'action_analysis';
    }

    return 'general_inquiry';
  }

  private static calculateOverallConfidence(
    morphology: MorphologicalFeatures[],
    semantics: SemanticAnalysis[]
  ): number {
    const semanticConfidence =
      semantics.reduce((sum, s) => sum + s.confidence, 0) / semantics.length;
    const morphologyConfidence =
      morphology.filter(m => m.root !== undefined).length / morphology.length;

    return semanticConfidence * 0.7 + morphologyConfidence * 0.3;
  }

  private validateHebrewMorphology(data: HebrewMorphologyData): void {
    if (!data.originalText?.trim()) {
      throw new Error('Original text is required');
    }

    if (!data.tokens || data.tokens.length === 0) {
      throw new Error('Tokens are required');
    }

    if (!data.morphology || data.morphology.length !== data.tokens.length) {
      throw new Error('Morphology analysis must match token count');
    }

    if (!data.semantics || data.semantics.length !== data.tokens.length) {
      throw new Error('Semantic analysis must match token count');
    }

    if (data.confidence < 0 || data.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    if (data.sentimentScore < -1 || data.sentimentScore > 1) {
      throw new Error('Sentiment score must be between -1 and 1');
    }
  }

  // Getters
  get originalText(): string {
    return this._data.originalText;
  }

  get normalizedText(): string {
    return this._data.normalizedText;
  }

  get tokens(): string[] {
    return [...this._data.tokens];
  }

  get morphology(): MorphologicalFeatures[] {
    return [...this._data.morphology];
  }

  get semantics(): SemanticAnalysis[] {
    return [...this._data.semantics];
  }

  get footballTerms(): string[] {
    return [...this._data.footballTerms];
  }

  get sentimentScore(): number {
    return this._data.sentimentScore;
  }

  get intentClassification(): string {
    return this._data.intentClassification;
  }

  get confidence(): number {
    return this._data.confidence;
  }

  get processingTimestamp(): Date {
    return this._data.processingTimestamp;
  }

  // Derived properties
  get isQuestion(): boolean {
    return this._data.intentClassification === 'question';
  }

  get isCommand(): boolean {
    return this._data.intentClassification === 'command';
  }

  get isTacticalQuery(): boolean {
    return this._data.intentClassification === 'tactical_analysis';
  }

  get hasFootballContent(): boolean {
    return this._data.footballTerms.length > 0;
  }

  get isPositiveSentiment(): boolean {
    return this._data.sentimentScore > 0.2;
  }

  get isNegativeSentiment(): boolean {
    return this._data.sentimentScore < -0.2;
  }

  get isHighConfidence(): boolean {
    return this._data.confidence > 0.8;
  }

  get footballTermCount(): number {
    return this._data.footballTerms.length;
  }

  get tacticalRelevanceScore(): number {
    if (this._data.semantics.length === 0) return 0;
    return (
      this._data.semantics.reduce((sum, s) => sum + s.tacticalRelevance, 0) /
      this._data.semantics.length
    );
  }

  // Methods
  public getTokensByWordType(wordType: HebrewWordType): string[] {
    return this._data.tokens.filter(
      (_, index) => this._data.morphology[index].wordType === wordType
    );
  }

  public getSemanticsByCategory(
    category: FootballSemanticCategory
  ): SemanticAnalysis[] {
    return this._data.semantics.filter(s => s.category === category);
  }

  public getMostRelevantTerms(
    count: number = 5
  ): Array<{ token: string; relevance: number }> {
    return this._data.tokens
      .map((token, index) => ({
        token,
        relevance: this._data.semantics[index].tacticalRelevance,
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);
  }

  public hasWordType(wordType: HebrewWordType): boolean {
    return this._data.morphology.some(m => m.wordType === wordType);
  }

  public hasSemanticCategory(category: FootballSemanticCategory): boolean {
    return this._data.semantics.some(s => s.category === category);
  }

  public getEnglishTranslation(): string {
    return this._data.semantics.map(s => s.englishTranslation).join(' ');
  }

  public equals(other: HebrewMorphology): boolean {
    return (
      this._data.originalText === other._data.originalText &&
      this._data.processingTimestamp.getTime() ===
        other._data.processingTimestamp.getTime()
    );
  }

  public toJSON(): HebrewMorphologyData {
    return { ...this._data };
  }

  public toString(): string {
    return `HebrewMorphology("${
      this._data.originalText
    }", ${this._data.confidence.toFixed(2)}, ${
      this._data.intentClassification
    })`;
  }
}
