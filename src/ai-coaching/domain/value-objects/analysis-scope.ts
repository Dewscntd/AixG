/**
 * Analysis Scope Value Object
 * Defines the scope and focus of tactical analysis requests
 */

export enum AnalysisType {
  TEAM_PERFORMANCE = 'team_performance',
  INDIVIDUAL_PLAYER = 'individual_player',
  TACTICAL_FORMATION = 'tactical_formation',
  SET_PIECES = 'set_pieces',
  ATTACKING_PATTERNS = 'attacking_patterns',
  DEFENSIVE_STRUCTURE = 'defensive_structure',
  TRANSITION_PLAY = 'transition_play',
  MATCH_HIGHLIGHTS = 'match_highlights',
  OPPONENT_ANALYSIS = 'opponent_analysis',
  TRAINING_FOCUS = 'training_focus',
}

export enum TimeFrame {
  REAL_TIME = 'real_time',
  LAST_5_MINUTES = 'last_5_minutes',
  CURRENT_HALF = 'current_half',
  FULL_MATCH = 'full_match',
  LAST_3_MATCHES = 'last_3_matches',
  SEASON_TO_DATE = 'season_to_date',
  HISTORICAL = 'historical',
}

export enum DetailLevel {
  OVERVIEW = 'overview',
  STANDARD = 'standard',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive',
}

export enum MetricCategory {
  POSSESSION = 'possession',
  PASSING = 'passing',
  SHOOTING = 'shooting',
  DEFENDING = 'defending',
  ATTACKING = 'attacking',
  PHYSICAL = 'physical',
  TACTICAL = 'tactical',
  MENTAL = 'mental',
  SET_PIECES = 'set_pieces',
  GOALKEEPING = 'goalkeeping',
}

export interface PlayerScope {
  playerId: string;
  playerName: string;
  position: string;
  includeComparisons: boolean;
  benchmarkPlayers?: string[];
}

export interface TeamScope {
  teamId: string;
  teamName: string;
  includeOpponentComparison: boolean;
  opponentTeamId?: string;
  focusOnFormation: boolean;
  targetFormation?: string;
}

export interface MatchScope {
  matchId: string;
  includePreMatch: boolean;
  includePostMatch: boolean;
  segmentAnalysis: boolean;
  keyMoments: boolean;
}

export interface AnalysisScopeData {
  analysisType: AnalysisType;
  timeFrame: TimeFrame;
  detailLevel: DetailLevel;
  metricCategories: MetricCategory[];
  playerScope?: PlayerScope;
  teamScope?: TeamScope;
  matchScope?: MatchScope;
  customFocus?: string[];
  excludeAreas?: string[];
  includeVideoClips: boolean;
  includeStatistics: boolean;
  includeRecommendations: boolean;
  includeHistoricalContext: boolean;
  languagePreference: string;
  maxResponseLength?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
}

export class AnalysisScope {
  private readonly _data: AnalysisScopeData;

  constructor(data: AnalysisScopeData) {
    this.validateAnalysisScope(data);
    this._data = Object.freeze({ ...data });
  }

  private validateAnalysisScope(data: AnalysisScopeData): void {
    if (!data.analysisType) {
      throw new Error('Analysis type is required');
    }

    if (!data.timeFrame) {
      throw new Error('Time frame is required');
    }

    if (!data.detailLevel) {
      throw new Error('Detail level is required');
    }

    if (!data.metricCategories || data.metricCategories.length === 0) {
      throw new Error('At least one metric category is required');
    }

    if (data.metricCategories.length > 8) {
      throw new Error('Maximum 8 metric categories allowed');
    }

    if (!data.languagePreference?.trim()) {
      throw new Error('Language preference is required');
    }

    if (
      data.maxResponseLength &&
      (data.maxResponseLength < 100 || data.maxResponseLength > 10000)
    ) {
      throw new Error(
        'Max response length must be between 100 and 10000 characters'
      );
    }

    // Validate player scope if provided
    if (data.playerScope) {
      if (!data.playerScope.playerId?.trim()) {
        throw new Error('Player ID is required for player scope');
      }
      if (!data.playerScope.playerName?.trim()) {
        throw new Error('Player name is required for player scope');
      }
      if (!data.playerScope.position?.trim()) {
        throw new Error('Player position is required for player scope');
      }
    }

    // Validate team scope if provided
    if (data.teamScope) {
      if (!data.teamScope.teamId?.trim()) {
        throw new Error('Team ID is required for team scope');
      }
      if (!data.teamScope.teamName?.trim()) {
        throw new Error('Team name is required for team scope');
      }
      if (
        data.teamScope.includeOpponentComparison &&
        !data.teamScope.opponentTeamId?.trim()
      ) {
        throw new Error(
          'Opponent team ID is required when including opponent comparison'
        );
      }
    }

    // Validate match scope if provided
    if (data.matchScope) {
      if (!data.matchScope.matchId?.trim()) {
        throw new Error('Match ID is required for match scope');
      }
    }

    // Validation based on analysis type
    if (
      data.analysisType === AnalysisType.INDIVIDUAL_PLAYER &&
      !data.playerScope
    ) {
      throw new Error(
        'Player scope is required for individual player analysis'
      );
    }

    if (
      data.analysisType === AnalysisType.TEAM_PERFORMANCE &&
      !data.teamScope
    ) {
      throw new Error('Team scope is required for team performance analysis');
    }

    if (
      [AnalysisType.MATCH_HIGHLIGHTS, AnalysisType.TRANSITION_PLAY].includes(
        data.analysisType
      ) &&
      !data.matchScope
    ) {
      throw new Error('Match scope is required for match-specific analysis');
    }
  }

  // Getters
  get analysisType(): AnalysisType {
    return this._data.analysisType;
  }

  get timeFrame(): TimeFrame {
    return this._data.timeFrame;
  }

  get detailLevel(): DetailLevel {
    return this._data.detailLevel;
  }

  get metricCategories(): MetricCategory[] {
    return [...this._data.metricCategories];
  }

  get playerScope(): PlayerScope | undefined {
    return this._data.playerScope ? { ...this._data.playerScope } : undefined;
  }

  get teamScope(): TeamScope | undefined {
    return this._data.teamScope ? { ...this._data.teamScope } : undefined;
  }

  get matchScope(): MatchScope | undefined {
    return this._data.matchScope ? { ...this._data.matchScope } : undefined;
  }

  get customFocus(): string[] {
    return this._data.customFocus ? [...this._data.customFocus] : [];
  }

  get excludeAreas(): string[] {
    return this._data.excludeAreas ? [...this._data.excludeAreas] : [];
  }

  get includeVideoClips(): boolean {
    return this._data.includeVideoClips;
  }

  get includeStatistics(): boolean {
    return this._data.includeStatistics;
  }

  get includeRecommendations(): boolean {
    return this._data.includeRecommendations;
  }

  get includeHistoricalContext(): boolean {
    return this._data.includeHistoricalContext;
  }

  get languagePreference(): string {
    return this._data.languagePreference;
  }

  get maxResponseLength(): number | undefined {
    return this._data.maxResponseLength;
  }

  get priority(): AnalysisScopeData['priority'] {
    return this._data.priority;
  }

  get tags(): string[] {
    return this._data.tags ? [...this._data.tags] : [];
  }

  // Derived properties
  get isPlayerFocused(): boolean {
    return this._data.analysisType === AnalysisType.INDIVIDUAL_PLAYER;
  }

  get isTeamFocused(): boolean {
    return [
      AnalysisType.TEAM_PERFORMANCE,
      AnalysisType.TACTICAL_FORMATION,
      AnalysisType.ATTACKING_PATTERNS,
      AnalysisType.DEFENSIVE_STRUCTURE,
    ].includes(this._data.analysisType);
  }

  get isMatchFocused(): boolean {
    return [
      AnalysisType.MATCH_HIGHLIGHTS,
      AnalysisType.TRANSITION_PLAY,
      AnalysisType.OPPONENT_ANALYSIS,
    ].includes(this._data.analysisType);
  }

  get isRealTime(): boolean {
    return this._data.timeFrame === TimeFrame.REAL_TIME;
  }

  get isHistorical(): boolean {
    return [
      TimeFrame.LAST_3_MATCHES,
      TimeFrame.SEASON_TO_DATE,
      TimeFrame.HISTORICAL,
    ].includes(this._data.timeFrame);
  }

  get isHighPriority(): boolean {
    return ['high', 'urgent'].includes(this._data.priority);
  }

  get isComprehensive(): boolean {
    return this._data.detailLevel === DetailLevel.COMPREHENSIVE;
  }

  get requiresVideoAnalysis(): boolean {
    return (
      this._data.includeVideoClips ||
      this._data.analysisType === AnalysisType.MATCH_HIGHLIGHTS ||
      this._data.analysisType === AnalysisType.SET_PIECES
    );
  }

  get requiresStatisticalAnalysis(): boolean {
    return (
      this._data.includeStatistics ||
      this._data.detailLevel === DetailLevel.COMPREHENSIVE ||
      this._data.analysisType === AnalysisType.TEAM_PERFORMANCE
    );
  }

  get estimatedComplexity(): 'low' | 'medium' | 'high' | 'very_high' {
    let complexity = 0;

    // Add complexity based on detail level
    switch (this._data.detailLevel) {
      case DetailLevel.OVERVIEW:
        complexity += 1;
        break;
      case DetailLevel.STANDARD:
        complexity += 2;
        break;
      case DetailLevel.DETAILED:
        complexity += 3;
        break;
      case DetailLevel.COMPREHENSIVE:
        complexity += 4;
        break;
    }

    // Add complexity based on scope
    if (this._data.playerScope?.includeComparisons) complexity += 2;
    if (this._data.teamScope?.includeOpponentComparison) complexity += 2;
    if (this._data.matchScope?.segmentAnalysis) complexity += 1;
    if (this._data.includeVideoClips) complexity += 2;
    if (this._data.includeHistoricalContext) complexity += 1;
    if (this._data.metricCategories.length > 4) complexity += 1;

    if (complexity <= 3) return 'low';
    if (complexity <= 6) return 'medium';
    if (complexity <= 9) return 'high';
    return 'very_high';
  }

  // Methods
  public hasMetricCategory(category: MetricCategory): boolean {
    return this._data.metricCategories.includes(category);
  }

  public hasCustomFocus(focus: string): boolean {
    return this._data.customFocus?.includes(focus) || false;
  }

  public hasTag(tag: string): boolean {
    return this._data.tags?.includes(tag) || false;
  }

  public isExcluded(area: string): boolean {
    return this._data.excludeAreas?.includes(area) || false;
  }

  public getEstimatedProcessingTime(): number {
    const baseTime = 30; // seconds
    const complexity = this.estimatedComplexity;

    const multipliers = {
      low: 1,
      medium: 2,
      high: 3,
      very_high: 5,
    };

    return baseTime * multipliers[complexity];
  }

  public getRequiredDataSources(): string[] {
    const sources: string[] = [];

    if (this.requiresVideoAnalysis) sources.push('video_analysis');
    if (this.requiresStatisticalAnalysis) sources.push('match_statistics');
    if (this._data.playerScope) sources.push('player_data');
    if (this._data.teamScope) sources.push('team_data');
    if (this._data.matchScope) sources.push('match_data');
    if (this.isHistorical) sources.push('historical_data');
    if (this._data.analysisType === AnalysisType.OPPONENT_ANALYSIS)
      sources.push('opponent_data');

    return sources;
  }

  public withUpdatedPriority(
    priority: AnalysisScopeData['priority']
  ): AnalysisScope {
    return new AnalysisScope({
      ...this._data,
      priority,
    });
  }

  public withAddedMetricCategory(category: MetricCategory): AnalysisScope {
    if (this._data.metricCategories.includes(category)) {
      return this;
    }

    return new AnalysisScope({
      ...this._data,
      metricCategories: [...this._data.metricCategories, category],
    });
  }

  public withAddedCustomFocus(focus: string): AnalysisScope {
    const currentFocus = this._data.customFocus || [];
    if (currentFocus.includes(focus)) {
      return this;
    }

    return new AnalysisScope({
      ...this._data,
      customFocus: [...currentFocus, focus],
    });
  }

  public withAddedTag(tag: string): AnalysisScope {
    const currentTags = this._data.tags || [];
    if (currentTags.includes(tag)) {
      return this;
    }

    return new AnalysisScope({
      ...this._data,
      tags: [...currentTags, tag],
    });
  }

  public withDetailLevel(detailLevel: DetailLevel): AnalysisScope {
    return new AnalysisScope({
      ...this._data,
      detailLevel,
    });
  }

  public withTimeFrame(timeFrame: TimeFrame): AnalysisScope {
    return new AnalysisScope({
      ...this._data,
      timeFrame,
    });
  }

  public equals(other: AnalysisScope): boolean {
    return JSON.stringify(this._data) === JSON.stringify(other._data);
  }

  public toJSON(): AnalysisScopeData {
    return { ...this._data };
  }

  public toString(): string {
    return `AnalysisScope(${this._data.analysisType}: ${this._data.timeFrame}, ${this._data.detailLevel}, ${this._data.priority})`;
  }
}
