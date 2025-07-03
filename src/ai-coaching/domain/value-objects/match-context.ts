/**
 * Match Context Value Object
 * Provides situational context for tactical analysis and coaching recommendations
 */

export enum MatchPhase {
  PRE_MATCH = 'pre_match',
  FIRST_HALF = 'first_half',
  HALF_TIME = 'half_time',
  SECOND_HALF = 'second_half',
  EXTRA_TIME = 'extra_time',
  PENALTY_SHOOTOUT = 'penalty_shootout',
  POST_MATCH = 'post_match',
}

export enum GameState {
  ATTACKING = 'attacking',
  DEFENDING = 'defending',
  TRANSITION_TO_ATTACK = 'transition_to_attack',
  TRANSITION_TO_DEFENSE = 'transition_to_defense',
  SET_PIECE = 'set_piece',
  DEAD_BALL = 'dead_ball',
}

export enum FieldZone {
  DEFENSIVE_THIRD = 'defensive_third',
  MIDDLE_THIRD = 'middle_third',
  ATTACKING_THIRD = 'attacking_third',
  LEFT_WING = 'left_wing',
  RIGHT_WING = 'right_wing',
  CENTER = 'center',
  PENALTY_AREA = 'penalty_area',
  GOAL_AREA = 'goal_area',
}

export interface WeatherConditions {
  temperature: number; // Celsius
  humidity: number; // Percentage
  windSpeed: number; // km/h
  precipitation: 'none' | 'light' | 'moderate' | 'heavy';
  visibility: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface MatchScore {
  homeTeamScore: number;
  awayTeamScore: number;
}

export interface MatchContextData {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  currentScore: MatchScore;
  phase: MatchPhase;
  gameState: GameState;
  fieldZone: FieldZone;
  minutesPlayed: number;
  timeRemaining: number;
  weather?: WeatherConditions;
  venue: {
    name: string;
    capacity: number;
    surfaceType: 'grass' | 'artificial' | 'hybrid';
    dimensions: {
      length: number;
      width: number;
    };
  };
  importance: 'friendly' | 'league' | 'cup' | 'championship' | 'international';
  attendance?: number;
  referee: {
    name: string;
    cardsTendency: 'lenient' | 'average' | 'strict';
  };
}

export class MatchContext {
  private readonly _data: MatchContextData;

  constructor(data: MatchContextData) {
    this.validateMatchContext(data);
    this._data = Object.freeze({ ...data });
  }

  private validateMatchContext(data: MatchContextData): void {
    if (!data.matchId?.trim()) {
      throw new Error('Match ID is required');
    }

    if (!data.homeTeamId?.trim()) {
      throw new Error('Home team ID is required');
    }

    if (!data.awayTeamId?.trim()) {
      throw new Error('Away team ID is required');
    }

    if (data.homeTeamId === data.awayTeamId) {
      throw new Error('Home and away teams cannot be the same');
    }

    if (data.minutesPlayed < 0 || data.minutesPlayed > 150) {
      throw new Error('Minutes played must be between 0 and 150');
    }

    if (data.timeRemaining < 0) {
      throw new Error('Time remaining cannot be negative');
    }

    if (
      data.currentScore.homeTeamScore < 0 ||
      data.currentScore.awayTeamScore < 0
    ) {
      throw new Error('Score cannot be negative');
    }

    if (data.weather) {
      if (data.weather.temperature < -40 || data.weather.temperature > 60) {
        throw new Error(
          'Temperature must be between -40 and 60 degrees Celsius'
        );
      }
      if (data.weather.humidity < 0 || data.weather.humidity > 100) {
        throw new Error('Humidity must be between 0 and 100 percent');
      }
      if (data.weather.windSpeed < 0 || data.weather.windSpeed > 200) {
        throw new Error('Wind speed must be between 0 and 200 km/h');
      }
    }
  }

  // Getters
  get matchId(): string {
    return this._data.matchId;
  }

  get homeTeamId(): string {
    return this._data.homeTeamId;
  }

  get awayTeamId(): string {
    return this._data.awayTeamId;
  }

  get currentScore(): MatchScore {
    return { ...this._data.currentScore };
  }

  get phase(): MatchPhase {
    return this._data.phase;
  }

  get gameState(): GameState {
    return this._data.gameState;
  }

  get fieldZone(): FieldZone {
    return this._data.fieldZone;
  }

  get minutesPlayed(): number {
    return this._data.minutesPlayed;
  }

  get timeRemaining(): number {
    return this._data.timeRemaining;
  }

  get weather(): WeatherConditions | undefined {
    return this._data.weather ? { ...this._data.weather } : undefined;
  }

  get venue(): MatchContextData['venue'] {
    return { ...this._data.venue };
  }

  get importance(): MatchContextData['importance'] {
    return this._data.importance;
  }

  get attendance(): number | undefined {
    return this._data.attendance;
  }

  get referee(): MatchContextData['referee'] {
    return { ...this._data.referee };
  }

  // Derived properties
  get isFirstHalf(): boolean {
    return this._data.phase === MatchPhase.FIRST_HALF;
  }

  get isSecondHalf(): boolean {
    return this._data.phase === MatchPhase.SECOND_HALF;
  }

  get isExtraTime(): boolean {
    return this._data.phase === MatchPhase.EXTRA_TIME;
  }

  get isMatchInProgress(): boolean {
    return [
      MatchPhase.FIRST_HALF,
      MatchPhase.SECOND_HALF,
      MatchPhase.EXTRA_TIME,
    ].includes(this._data.phase);
  }

  get scoreDifference(): number {
    return (
      this._data.currentScore.homeTeamScore -
      this._data.currentScore.awayTeamScore
    );
  }

  get isDraw(): boolean {
    return (
      this._data.currentScore.homeTeamScore ===
      this._data.currentScore.awayTeamScore
    );
  }

  get isHomeTeamWinning(): boolean {
    return (
      this._data.currentScore.homeTeamScore >
      this._data.currentScore.awayTeamScore
    );
  }

  get isAwayTeamWinning(): boolean {
    return (
      this._data.currentScore.awayTeamScore >
      this._data.currentScore.homeTeamScore
    );
  }

  get isInAttackingThird(): boolean {
    return this._data.fieldZone === FieldZone.ATTACKING_THIRD;
  }

  get isInDefensiveThird(): boolean {
    return this._data.fieldZone === FieldZone.DEFENSIVE_THIRD;
  }

  get isInDangerousArea(): boolean {
    return [
      FieldZone.PENALTY_AREA,
      FieldZone.GOAL_AREA,
      FieldZone.ATTACKING_THIRD,
    ].includes(this._data.fieldZone);
  }

  get isLateMoment(): boolean {
    return (
      this._data.minutesPlayed > 80 ||
      (this._data.phase === MatchPhase.SECOND_HALF &&
        this._data.timeRemaining < 10)
    );
  }

  get isCriticalMoment(): boolean {
    return (
      (this.isLateMoment && !this.isDraw) ||
      this._data.phase === MatchPhase.EXTRA_TIME ||
      this._data.phase === MatchPhase.PENALTY_SHOOTOUT
    );
  }

  get urgencyLevel(): 'low' | 'medium' | 'high' | 'critical' {
    if (this.isCriticalMoment) return 'critical';
    if (this.isLateMoment && Math.abs(this.scoreDifference) <= 1) return 'high';
    if (this._data.minutesPlayed > 60 && Math.abs(this.scoreDifference) <= 1)
      return 'medium';
    return 'low';
  }

  // Methods
  public withUpdatedScore(homeScore: number, awayScore: number): MatchContext {
    return new MatchContext({
      ...this._data,
      currentScore: { homeTeamScore: homeScore, awayTeamScore: awayScore },
    });
  }

  public withUpdatedTime(
    minutesPlayed: number,
    timeRemaining: number
  ): MatchContext {
    return new MatchContext({
      ...this._data,
      minutesPlayed,
      timeRemaining,
    });
  }

  public withUpdatedPhase(phase: MatchPhase): MatchContext {
    return new MatchContext({
      ...this._data,
      phase,
    });
  }

  public withUpdatedGameState(
    gameState: GameState,
    fieldZone?: FieldZone
  ): MatchContext {
    return new MatchContext({
      ...this._data,
      gameState,
      fieldZone: fieldZone || this._data.fieldZone,
    });
  }

  public getContextualFactors(): string[] {
    const factors: string[] = [];

    if (this.isLateMoment) factors.push('late_match');
    if (this.isCriticalMoment) factors.push('critical_moment');
    if (this.isInDangerousArea) factors.push('dangerous_area');
    if (Math.abs(this.scoreDifference) >= 2)
      factors.push('significant_score_difference');
    if (this._data.importance === 'championship') factors.push('high_stakes');
    if (this._data.weather?.precipitation !== 'none')
      factors.push('adverse_weather');
    if (this._data.referee.cardsTendency === 'strict')
      factors.push('strict_referee');

    return factors;
  }

  public equals(other: MatchContext): boolean {
    return JSON.stringify(this._data) === JSON.stringify(other._data);
  }

  public toJSON(): MatchContextData {
    return { ...this._data };
  }

  public toString(): string {
    return `MatchContext(${this._data.matchId}: ${this._data.currentScore.homeTeamScore}-${this._data.currentScore.awayTeamScore}, ${this._data.phase}, ${this._data.minutesPlayed}'})`;
  }
}
