/**
 * Immutable value objects for analytics metrics using functional programming principles
 */

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface ShotData {
  readonly position: Position;
  readonly targetPosition: Position;
  readonly distanceToGoal: number;
  readonly angle: number;
  readonly bodyPart: 'foot' | 'head' | 'other';
  readonly situation: 'open_play' | 'corner' | 'free_kick' | 'penalty';
  readonly defenderCount: number;
  readonly gameState: {
    readonly minute: number;
    readonly scoreDifference: number;
    readonly isHome: boolean;
  };
}

export class XGValue {
  private readonly _value: number;

  constructor(value: number) {
    if (isNaN(value) || !isFinite(value)) {
      throw new Error('xG value must be a finite number');
    }
    if (value < 0 || value > 1) {
      throw new Error(`xG value must be between 0 and 1, got ${value}`);
    }
    this._value = Number(value.toFixed(4)); // Precision to 4 decimal places
  }

  get value(): number {
    return this._value;
  }

  add(other: XGValue): XGValue {
    return new XGValue(Math.min(1, this._value + other._value));
  }

  // For summing multiple shots where total can exceed 1.0
  addUncapped(other: XGValue): number {
    return this._value + other._value;
  }

  multiply(factor: number): XGValue {
    return new XGValue(this._value * factor);
  }

  equals(other: XGValue): boolean {
    return Math.abs(this._value - other._value) < 0.0001;
  }

  toString(): string {
    return this._value.toFixed(4);
  }

  static zero(): XGValue {
    return new XGValue(0);
  }

  static fromNumber(value: number): XGValue {
    return new XGValue(value);
  }

  static fromNumberClamped(value: number): XGValue {
    if (isNaN(value) || !isFinite(value)) {
      return XGValue.zero();
    }
    const clampedValue = Math.min(1, Math.max(0, value));
    return new XGValue(clampedValue);
  }
}

export class PossessionPercentage {
  private readonly _value: number;

  constructor(value: number) {
    if (value < 0 || value > 100) {
      throw new Error('Possession percentage must be between 0 and 100');
    }
    this._value = Number(value.toFixed(2));
  }

  get value(): number {
    return this._value;
  }

  equals(other: PossessionPercentage): boolean {
    return Math.abs(this._value - other._value) < 0.01;
  }

  toString(): string {
    return `${this._value.toFixed(1)}%`;
  }

  static fromNumber(value: number): PossessionPercentage {
    return new PossessionPercentage(value);
  }

  static zero(): PossessionPercentage {
    return new PossessionPercentage(0);
  }
}

export interface PassData {
  readonly fromPosition: Position;
  readonly toPosition: Position;
  readonly successful: boolean;
  readonly distance: number;
  readonly direction: 'forward' | 'backward' | 'sideways';
  readonly type: 'short' | 'medium' | 'long' | 'cross' | 'through_ball';
  readonly pressure: 'low' | 'medium' | 'high';
}

export class PassAccuracy {
  private readonly _successful: number;
  private readonly _total: number;

  constructor(successful: number, total: number) {
    if (successful < 0 || total < 0 || successful > total) {
      throw new Error('Invalid pass accuracy data');
    }
    this._successful = successful;
    this._total = total;
  }

  get percentage(): number {
    return this._total === 0 ? 0 : (this._successful / this._total) * 100;
  }

  get successful(): number {
    return this._successful;
  }

  get total(): number {
    return this._total;
  }

  add(other: PassAccuracy): PassAccuracy {
    return new PassAccuracy(
      this._successful + other._successful,
      this._total + other._total
    );
  }

  equals(other: PassAccuracy): boolean {
    return this._successful === other._successful && this._total === other._total;
  }

  toString(): string {
    return `${this._successful}/${this._total} (${this.percentage.toFixed(1)}%)`;
  }

  static empty(): PassAccuracy {
    return new PassAccuracy(0, 0);
  }
}

export interface FormationData {
  readonly formation: string; // e.g., "4-4-2", "3-5-2"
  readonly playerPositions: ReadonlyArray<{
    readonly playerId: string;
    readonly position: Position;
    readonly role: string;
  }>;
  readonly timestamp: number;
  readonly confidence: number;
}

export class Formation {
  private readonly _formation: string;
  private readonly _playerPositions: ReadonlyArray<{
    readonly playerId: string;
    readonly position: Position;
    readonly role: string;
  }>;
  private readonly _timestamp: number;
  private readonly _confidence: number;

  constructor(data: FormationData) {
    this._formation = data.formation;
    this._playerPositions = Object.freeze([...data.playerPositions]);
    this._timestamp = data.timestamp;
    this._confidence = data.confidence;
  }

  get formation(): string {
    return this._formation;
  }

  get playerPositions(): ReadonlyArray<{
    readonly playerId: string;
    readonly position: Position;
    readonly role: string;
  }> {
    return this._playerPositions;
  }

  get timestamp(): number {
    return this._timestamp;
  }

  get confidence(): number {
    return this._confidence;
  }

  equals(other: Formation): boolean {
    return (
      this._formation === other._formation &&
      this._timestamp === other._timestamp &&
      Math.abs(this._confidence - other._confidence) < 0.01
    );
  }

  toString(): string {
    return `${this._formation} (${this._confidence.toFixed(2)} confidence)`;
  }
}

export interface TeamMetrics {
  readonly teamId: string;
  readonly xG: XGValue;
  readonly xA: XGValue; // Expected Assists
  readonly possession: PossessionPercentage;
  readonly passAccuracy: PassAccuracy;
  readonly shotsOnTarget: number;
  readonly shotsOffTarget: number;
  readonly corners: number;
  readonly fouls: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly formation: Formation | null;
}

export class TeamAnalytics {
  private readonly _metrics: TeamMetrics;

  constructor(metrics: TeamMetrics) {
    this._metrics = Object.freeze({ ...metrics });
  }

  get metrics(): TeamMetrics {
    return this._metrics;
  }

  get teamId(): string {
    return this._metrics.teamId;
  }

  get xG(): XGValue {
    return this._metrics.xG;
  }

  get possession(): PossessionPercentage {
    return this._metrics.possession;
  }

  updateXG(newXG: XGValue): TeamAnalytics {
    return new TeamAnalytics({
      ...this._metrics,
      xG: newXG
    });
  }

  updatePossession(newPossession: PossessionPercentage): TeamAnalytics {
    return new TeamAnalytics({
      ...this._metrics,
      possession: newPossession
    });
  }

  updateFormation(newFormation: Formation): TeamAnalytics {
    return new TeamAnalytics({
      ...this._metrics,
      formation: newFormation
    });
  }

  equals(other: TeamAnalytics): boolean {
    return this._metrics.teamId === other._metrics.teamId &&
           this._metrics.xG.equals(other._metrics.xG) &&
           this._metrics.possession.equals(other._metrics.possession);
  }

  static empty(teamId: string): TeamAnalytics {
    return new TeamAnalytics({
      teamId,
      xG: XGValue.zero(),
      xA: XGValue.zero(),
      possession: PossessionPercentage.zero(),
      passAccuracy: PassAccuracy.empty(),
      shotsOnTarget: 0,
      shotsOffTarget: 0,
      corners: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      formation: null
    });
  }
}
