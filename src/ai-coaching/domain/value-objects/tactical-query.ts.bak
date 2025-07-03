/**
 * Tactical Query Value Object
 * Represents structured queries about football tactics, strategy, and performance
 */

export enum QueryType {
  FORMATION_ANALYSIS = 'formation_analysis',
  PLAYER_PERFORMANCE = 'player_performance',
  TACTICAL_WEAKNESS = 'tactical_weakness',
  IMPROVEMENT_SUGGESTION = 'improvement_suggestion',
  OPPONENT_ANALYSIS = 'opponent_analysis',
  TRAINING_RECOMMENDATION = 'training_recommendation',
  MATCH_SITUATION = 'match_situation',
  SET_PIECE_STRATEGY = 'set_piece_strategy',
  SUBSTITUTION_ADVICE = 'substitution_advice',
  GENERAL_QUESTION = 'general_question',
}

export enum QueryContext {
  PRE_MATCH = 'pre_match',
  LIVE_MATCH = 'live_match',
  HALF_TIME = 'half_time',
  POST_MATCH = 'post_match',
  TRAINING_SESSION = 'training_session',
  TACTICAL_PLANNING = 'tactical_planning',
  PLAYER_DEVELOPMENT = 'player_development',
  SEASON_PLANNING = 'season_planning',
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ExpectedResponseType {
  BRIEF_ANSWER = 'brief_answer',
  DETAILED_EXPLANATION = 'detailed_explanation',
  ACTIONABLE_RECOMMENDATIONS = 'actionable_recommendations',
  COMPARATIVE_ANALYSIS = 'comparative_analysis',
  STATISTICAL_BREAKDOWN = 'statistical_breakdown',
  VISUAL_DIAGRAM = 'visual_diagram',
  VIDEO_CLIPS = 'video_clips',
  TRAINING_DRILL = 'training_drill',
}

export interface TacticalElement {
  type: 'formation' | 'position' | 'movement' | 'strategy' | 'technique';
  name: string;
  description?: string;
  relevance: number; // 0-1 score
}

export interface QueryConstraints {
  maxResponseLength?: number;
  includeStatistics: boolean;
  includeVideoReferences: boolean;
  includeHistoricalComparisons: boolean;
  focusOnPracticalApplication: boolean;
  avoidTechnicalJargon: boolean;
  targetAudience: 'player' | 'coach' | 'analyst' | 'fan' | 'general';
}

export interface QueryMetadata {
  queryId: string;
  timestamp: Date;
  source:
    | 'user_input'
    | 'automated_analysis'
    | 'scheduled_report'
    | 'live_event';
  relatedEntityIds: string[];
  sessionId?: string;
  userId?: string;
  teamId?: string;
  matchId?: string;
  tags: string[];
}

export interface TacticalQueryData {
  queryText: string;
  queryType: QueryType;
  context: QueryContext;
  urgency: UrgencyLevel;
  expectedResponseType: ExpectedResponseType;
  language: string;
  tacticalElements: TacticalElement[];
  constraints: QueryConstraints;
  metadata: QueryMetadata;
  relatedQueries?: string[];
  followUpQuestions?: string[];
  confidenceThreshold?: number;
}

export class TacticalQuery {
  private readonly _data: TacticalQueryData;

  constructor(data: TacticalQueryData) {
    this.validateTacticalQuery(data);
    this._data = Object.freeze({ ...data });
  }

  private validateTacticalQuery(data: TacticalQueryData): void {
    if (!data.queryText?.trim()) {
      throw new Error('Query text is required');
    }

    if (data.queryText.length < 3) {
      throw new Error('Query text must be at least 3 characters long');
    }

    if (data.queryText.length > 2000) {
      throw new Error('Query text cannot exceed 2000 characters');
    }

    if (!data.queryType) {
      throw new Error('Query type is required');
    }

    if (!data.context) {
      throw new Error('Query context is required');
    }

    if (!data.urgency) {
      throw new Error('Urgency level is required');
    }

    if (!data.expectedResponseType) {
      throw new Error('Expected response type is required');
    }

    if (!data.language?.trim()) {
      throw new Error('Language is required');
    }

    if (!data.tacticalElements || data.tacticalElements.length === 0) {
      throw new Error('At least one tactical element is required');
    }

    if (!data.constraints) {
      throw new Error('Query constraints are required');
    }

    if (!data.metadata) {
      throw new Error('Query metadata is required');
    }

    if (!data.metadata.queryId?.trim()) {
      throw new Error('Query ID is required in metadata');
    }

    if (!data.metadata.timestamp) {
      throw new Error('Timestamp is required in metadata');
    }

    if (!data.metadata.source) {
      throw new Error('Source is required in metadata');
    }

    if (!data.metadata.tags || !Array.isArray(data.metadata.tags)) {
      throw new Error('Tags array is required in metadata');
    }

    // Validate tactical elements
    data.tacticalElements.forEach((element, index) => {
      if (!element.type) {
        throw new Error(`Tactical element ${index + 1}: Type is required`);
      }
      if (!element.name?.trim()) {
        throw new Error(`Tactical element ${index + 1}: Name is required`);
      }
      if (element.relevance < 0 || element.relevance > 1) {
        throw new Error(
          `Tactical element ${index + 1}: Relevance must be between 0 and 1`
        );
      }
    });

    // Validate constraints
    if (
      data.constraints.maxResponseLength &&
      (data.constraints.maxResponseLength < 50 ||
        data.constraints.maxResponseLength > 10000)
    ) {
      throw new Error(
        'Max response length must be between 50 and 10000 characters'
      );
    }

    if (
      data.confidenceThreshold &&
      (data.confidenceThreshold < 0 || data.confidenceThreshold > 1)
    ) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
  }

  // Getters
  get queryText(): string {
    return this._data.queryText;
  }

  get queryType(): QueryType {
    return this._data.queryType;
  }

  get context(): QueryContext {
    return this._data.context;
  }

  get urgency(): UrgencyLevel {
    return this._data.urgency;
  }

  get expectedResponseType(): ExpectedResponseType {
    return this._data.expectedResponseType;
  }

  get language(): string {
    return this._data.language;
  }

  get tacticalElements(): TacticalElement[] {
    return [...this._data.tacticalElements];
  }

  get constraints(): QueryConstraints {
    return { ...this._data.constraints };
  }

  get metadata(): QueryMetadata {
    return { ...this._data.metadata };
  }

  get relatedQueries(): string[] {
    return this._data.relatedQueries ? [...this._data.relatedQueries] : [];
  }

  get followUpQuestions(): string[] {
    return this._data.followUpQuestions
      ? [...this._data.followUpQuestions]
      : [];
  }

  get confidenceThreshold(): number {
    return this._data.confidenceThreshold || 0.7;
  }

  // Derived properties
  get isUrgent(): boolean {
    return ['high', 'urgent'].includes(this._data.urgency);
  }

  get isLiveMatch(): boolean {
    return this._data.context === QueryContext.LIVE_MATCH;
  }

  get isTrainingRelated(): boolean {
    return [
      QueryContext.TRAINING_SESSION,
      QueryContext.TACTICAL_PLANNING,
      QueryContext.PLAYER_DEVELOPMENT,
    ].includes(this._data.context);
  }

  get isMatchRelated(): boolean {
    return [
      QueryContext.PRE_MATCH,
      QueryContext.LIVE_MATCH,
      QueryContext.HALF_TIME,
      QueryContext.POST_MATCH,
    ].includes(this._data.context);
  }

  get requiresImmediateResponse(): boolean {
    return this.isUrgent || this.isLiveMatch;
  }

  get isHebrewQuery(): boolean {
    return this._data.language === 'he' || this._data.language === 'hebrew';
  }

  get isComplexQuery(): boolean {
    return (
      this._data.tacticalElements.length > 3 ||
      this._data.expectedResponseType ===
        ExpectedResponseType.COMPARATIVE_ANALYSIS ||
      this._data.expectedResponseType ===
        ExpectedResponseType.STATISTICAL_BREAKDOWN
    );
  }

  get primaryTacticalFocus(): string {
    if (this._data.tacticalElements.length === 0) return 'general';

    const sortedElements = this._data.tacticalElements.sort(
      (a, b) => b.relevance - a.relevance
    );

    return sortedElements[0].type;
  }

  get estimatedResponseTime(): number {
    let baseTime = 15; // seconds

    // Adjust based on complexity
    if (this.isComplexQuery) baseTime *= 2;
    if (this._data.constraints.includeStatistics) baseTime += 10;
    if (this._data.constraints.includeVideoReferences) baseTime += 15;
    if (this._data.constraints.includeHistoricalComparisons) baseTime += 10;

    // Adjust based on urgency
    if (this._data.urgency === UrgencyLevel.URGENT) baseTime *= 0.5;
    else if (this._data.urgency === UrgencyLevel.HIGH) baseTime *= 0.7;

    return Math.max(baseTime, 5); // Minimum 5 seconds
  }

  get queryComplexityScore(): number {
    let score = 0;

    // Base complexity from query length
    score += Math.min(this._data.queryText.length / 100, 5);

    // Tactical elements complexity
    score += this._data.tacticalElements.length * 0.5;

    // Response type complexity
    const responseComplexity = {
      [ExpectedResponseType.BRIEF_ANSWER]: 1,
      [ExpectedResponseType.DETAILED_EXPLANATION]: 2,
      [ExpectedResponseType.ACTIONABLE_RECOMMENDATIONS]: 3,
      [ExpectedResponseType.COMPARATIVE_ANALYSIS]: 4,
      [ExpectedResponseType.STATISTICAL_BREAKDOWN]: 4,
      [ExpectedResponseType.VISUAL_DIAGRAM]: 3,
      [ExpectedResponseType.VIDEO_CLIPS]: 5,
      [ExpectedResponseType.TRAINING_DRILL]: 3,
    };
    score += responseComplexity[this._data.expectedResponseType] || 2;

    // Constraints complexity
    if (this._data.constraints.includeStatistics) score += 2;
    if (this._data.constraints.includeVideoReferences) score += 2;
    if (this._data.constraints.includeHistoricalComparisons) score += 1;

    return Math.min(score, 20); // Cap at 20
  }

  // Methods
  public hasElementType(type: TacticalElement['type']): boolean {
    return this._data.tacticalElements.some(element => element.type === type);
  }

  public hasTag(tag: string): boolean {
    return this._data.metadata.tags.includes(tag);
  }

  public getElementsByType(type: TacticalElement['type']): TacticalElement[] {
    return this._data.tacticalElements.filter(element => element.type === type);
  }

  public getMostRelevantElements(count: number = 3): TacticalElement[] {
    return this._data.tacticalElements
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);
  }

  public isRelatedToQuery(queryId: string): boolean {
    return this._data.relatedQueries?.includes(queryId) || false;
  }

  public requiresDataSource(source: string): boolean {
    const dataSourceRequirements = {
      match_statistics: this._data.constraints.includeStatistics,
      video_analysis: this._data.constraints.includeVideoReferences,
      historical_data: this._data.constraints.includeHistoricalComparisons,
      live_data: this.isLiveMatch,
      player_data:
        this.hasElementType('position') ||
        this._data.queryType === QueryType.PLAYER_PERFORMANCE,
      team_data:
        this.hasElementType('formation') ||
        this._data.queryType === QueryType.FORMATION_ANALYSIS,
    };

    return dataSourceRequirements[source] || false;
  }

  public getContextualPrompt(): string {
    const contextPrompts = {
      [QueryContext.PRE_MATCH]: 'Before the match starts',
      [QueryContext.LIVE_MATCH]: 'During live match play',
      [QueryContext.HALF_TIME]: 'At half-time break',
      [QueryContext.POST_MATCH]: 'After the match ends',
      [QueryContext.TRAINING_SESSION]: 'During training session',
      [QueryContext.TACTICAL_PLANNING]: 'For tactical planning',
      [QueryContext.PLAYER_DEVELOPMENT]: 'For player development',
      [QueryContext.SEASON_PLANNING]: 'For season planning',
    };

    return contextPrompts[this._data.context] || 'In general context';
  }

  public withUpdatedUrgency(urgency: UrgencyLevel): TacticalQuery {
    return new TacticalQuery({
      ...this._data,
      urgency,
    });
  }

  public withAddedElement(element: TacticalElement): TacticalQuery {
    return new TacticalQuery({
      ...this._data,
      tacticalElements: [...this._data.tacticalElements, element],
    });
  }

  public withAddedTag(tag: string): TacticalQuery {
    if (this._data.metadata.tags.includes(tag)) {
      return this;
    }

    return new TacticalQuery({
      ...this._data,
      metadata: {
        ...this._data.metadata,
        tags: [...this._data.metadata.tags, tag],
      },
    });
  }

  public withRelatedQuery(queryId: string): TacticalQuery {
    const currentRelated = this._data.relatedQueries || [];
    if (currentRelated.includes(queryId)) {
      return this;
    }

    return new TacticalQuery({
      ...this._data,
      relatedQueries: [...currentRelated, queryId],
    });
  }

  public withFollowUpQuestion(question: string): TacticalQuery {
    const currentFollowUps = this._data.followUpQuestions || [];
    if (currentFollowUps.includes(question)) {
      return this;
    }

    return new TacticalQuery({
      ...this._data,
      followUpQuestions: [...currentFollowUps, question],
    });
  }

  public equals(other: TacticalQuery): boolean {
    return this._data.metadata.queryId === other._data.metadata.queryId;
  }

  public toJSON(): TacticalQueryData {
    return { ...this._data };
  }

  public toString(): string {
    return `TacticalQuery(${
      this._data.queryType
    }: "${this._data.queryText.substring(0, 50)}...", ${this._data.urgency})`;
  }
}
