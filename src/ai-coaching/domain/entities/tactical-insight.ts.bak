/**
 * Tactical Insight Entity
 * Represents analyzed tactical observations and coaching recommendations
 */

import { v4 as uuidv4 } from 'uuid';

export enum InsightType {
  FORMATION_WEAKNESS = 'formation_weakness',
  PLAYER_POSITIONING = 'player_positioning',
  ATTACKING_OPPORTUNITY = 'attacking_opportunity',
  DEFENSIVE_VULNERABILITY = 'defensive_vulnerability',
  TRANSITION_IMPROVEMENT = 'transition_improvement',
  SET_PIECE_ADVANTAGE = 'set_piece_advantage',
  SUBSTITUTION_RECOMMENDATION = 'substitution_recommendation',
  TACTICAL_ADJUSTMENT = 'tactical_adjustment',
  PERFORMANCE_PATTERN = 'performance_pattern',
  OPPONENT_WEAKNESS = 'opponent_weakness',
}

export enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum InsightConfidence {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export enum ActionType {
  IMMEDIATE = 'immediate',
  NEXT_BREAK = 'next_break',
  HALF_TIME = 'half_time',
  TRAINING = 'training',
  LONG_TERM = 'long_term',
}

export interface SupportingEvidence {
  type:
    | 'statistic'
    | 'video_clip'
    | 'historical_comparison'
    | 'expert_analysis';
  description: string;
  value?: number;
  unit?: string;
  timestamp?: Date;
  confidence: number;
  source: string;
}

export interface ActionRecommendation {
  actionType: ActionType;
  description: string;
  hebrewDescription: string;
  priority: InsightPriority;
  expectedImpact: string;
  implementationSteps: string[];
  successMetrics: string[];
  timeToImplement: number; // minutes
  resources?: string[];
}

export interface TacticalInsightData {
  id: string;
  type: InsightType;
  title: string;
  hebrewTitle: string;
  description: string;
  hebrewDescription: string;
  priority: InsightPriority;
  confidence: InsightConfidence;
  matchId?: string;
  teamId?: string;
  playerId?: string;
  matchMinute?: number;
  fieldZone?: string;
  supportingEvidence: SupportingEvidence[];
  recommendations: ActionRecommendation[];
  relatedInsights: string[];
  tags: string[];
  createdAt: Date;
  validUntil?: Date;
  implementedAt?: Date;
  isActionable: boolean;
  metadata: Record<string, any>;
}

export class TacticalInsight {
  private readonly _data: TacticalInsightData;

  constructor(data: TacticalInsightData) {
    this.validateTacticalInsight(data);
    this._data = Object.freeze({ ...data });
  }

  public static create(
    type: InsightType,
    title: string,
    hebrewTitle: string,
    description: string,
    hebrewDescription: string,
    priority: InsightPriority,
    confidence: InsightConfidence,
    options?: {
      matchId?: string;
      teamId?: string;
      playerId?: string;
      matchMinute?: number;
      fieldZone?: string;
      validUntil?: Date;
      isActionable?: boolean;
      metadata?: Record<string, any>;
    }
  ): TacticalInsight {
    return new TacticalInsight({
      id: uuidv4(),
      type,
      title,
      hebrewTitle,
      description,
      hebrewDescription,
      priority,
      confidence,
      matchId: options?.matchId,
      teamId: options?.teamId,
      playerId: options?.playerId,
      matchMinute: options?.matchMinute,
      fieldZone: options?.fieldZone,
      supportingEvidence: [],
      recommendations: [],
      relatedInsights: [],
      tags: [],
      createdAt: new Date(),
      validUntil: options?.validUntil,
      isActionable: options?.isActionable ?? true,
      metadata: options?.metadata || {},
    });
  }

  private validateTacticalInsight(data: TacticalInsightData): void {
    if (!data.id?.trim()) {
      throw new Error('Tactical insight ID is required');
    }

    if (!data.type) {
      throw new Error('Insight type is required');
    }

    if (!data.title?.trim()) {
      throw new Error('Title is required');
    }

    if (!data.hebrewTitle?.trim()) {
      throw new Error('Hebrew title is required');
    }

    if (!data.description?.trim()) {
      throw new Error('Description is required');
    }

    if (!data.hebrewDescription?.trim()) {
      throw new Error('Hebrew description is required');
    }

    if (!data.priority) {
      throw new Error('Priority is required');
    }

    if (!data.confidence) {
      throw new Error('Confidence level is required');
    }

    if (!data.createdAt) {
      throw new Error('Creation date is required');
    }

    if (data.validUntil && data.validUntil <= data.createdAt) {
      throw new Error('Valid until date must be after creation date');
    }

    if (data.implementedAt && data.implementedAt < data.createdAt) {
      throw new Error('Implementation date cannot be before creation date');
    }

    if (
      data.matchMinute !== undefined &&
      (data.matchMinute < 0 || data.matchMinute > 150)
    ) {
      throw new Error('Match minute must be between 0 and 150');
    }

    // Validate supporting evidence
    data.supportingEvidence.forEach((evidence, index) => {
      if (!evidence.description?.trim()) {
        throw new Error(
          `Supporting evidence ${index + 1}: Description is required`
        );
      }
      if (evidence.confidence < 0 || evidence.confidence > 1) {
        throw new Error(
          `Supporting evidence ${index + 1}: Confidence must be between 0 and 1`
        );
      }
      if (!evidence.source?.trim()) {
        throw new Error(`Supporting evidence ${index + 1}: Source is required`);
      }
    });

    // Validate recommendations
    data.recommendations.forEach((rec, index) => {
      if (!rec.description?.trim()) {
        throw new Error(`Recommendation ${index + 1}: Description is required`);
      }
      if (!rec.hebrewDescription?.trim()) {
        throw new Error(
          `Recommendation ${index + 1}: Hebrew description is required`
        );
      }
      if (rec.timeToImplement < 0) {
        throw new Error(
          `Recommendation ${index + 1}: Time to implement cannot be negative`
        );
      }
    });
  }

  // Getters
  get id(): string {
    return this._data.id;
  }

  get type(): InsightType {
    return this._data.type;
  }

  get title(): string {
    return this._data.title;
  }

  get hebrewTitle(): string {
    return this._data.hebrewTitle;
  }

  get description(): string {
    return this._data.description;
  }

  get hebrewDescription(): string {
    return this._data.hebrewDescription;
  }

  get priority(): InsightPriority {
    return this._data.priority;
  }

  get confidence(): InsightConfidence {
    return this._data.confidence;
  }

  get matchId(): string | undefined {
    return this._data.matchId;
  }

  get teamId(): string | undefined {
    return this._data.teamId;
  }

  get playerId(): string | undefined {
    return this._data.playerId;
  }

  get matchMinute(): number | undefined {
    return this._data.matchMinute;
  }

  get fieldZone(): string | undefined {
    return this._data.fieldZone;
  }

  get supportingEvidence(): SupportingEvidence[] {
    return [...this._data.supportingEvidence];
  }

  get recommendations(): ActionRecommendation[] {
    return [...this._data.recommendations];
  }

  get relatedInsights(): string[] {
    return [...this._data.relatedInsights];
  }

  get tags(): string[] {
    return [...this._data.tags];
  }

  get createdAt(): Date {
    return this._data.createdAt;
  }

  get validUntil(): Date | undefined {
    return this._data.validUntil;
  }

  get implementedAt(): Date | undefined {
    return this._data.implementedAt;
  }

  get isActionable(): boolean {
    return this._data.isActionable;
  }

  get metadata(): Record<string, any> {
    return { ...this._data.metadata };
  }

  // Derived properties
  get isHighPriority(): boolean {
    return ['high', 'critical'].includes(this._data.priority);
  }

  get isHighConfidence(): boolean {
    return ['high', 'very_high'].includes(this._data.confidence);
  }

  get isExpired(): boolean {
    return this._data.validUntil ? this._data.validUntil < new Date() : false;
  }

  get isImplemented(): boolean {
    return this._data.implementedAt !== undefined;
  }

  get isPending(): boolean {
    return !this.isImplemented && !this.isExpired;
  }

  get ageInMinutes(): number {
    return Math.floor((Date.now() - this._data.createdAt.getTime()) / 60000);
  }

  get timeUntilExpiry(): number | undefined {
    if (!this._data.validUntil) return undefined;
    return Math.max(0, this._data.validUntil.getTime() - Date.now());
  }

  get evidenceCount(): number {
    return this._data.supportingEvidence.length;
  }

  get recommendationCount(): number {
    return this._data.recommendations.length;
  }

  get hasImmediateRecommendations(): boolean {
    return this._data.recommendations.some(
      rec => rec.actionType === ActionType.IMMEDIATE
    );
  }

  get urgencyScore(): number {
    let score = 0;

    // Priority weight
    const priorityWeights = {
      [InsightPriority.LOW]: 1,
      [InsightPriority.MEDIUM]: 2,
      [InsightPriority.HIGH]: 3,
      [InsightPriority.CRITICAL]: 4,
    };
    score += priorityWeights[this._data.priority] * 25;

    // Confidence weight
    const confidenceWeights = {
      [InsightConfidence.LOW]: 0.5,
      [InsightConfidence.MEDIUM]: 0.7,
      [InsightConfidence.HIGH]: 0.9,
      [InsightConfidence.VERY_HIGH]: 1.0,
    };
    score *= confidenceWeights[this._data.confidence];

    // Time sensitivity
    if (this.hasImmediateRecommendations) score += 20;
    if (
      this._data.validUntil &&
      this.timeUntilExpiry &&
      this.timeUntilExpiry < 1800000
    ) {
      // 30 minutes
      score += 15;
    }

    // Evidence support
    score += Math.min(this.evidenceCount * 5, 20);

    return Math.min(score, 100);
  }

  // Methods
  public hasTag(tag: string): boolean {
    return this._data.tags.includes(tag);
  }

  public hasEvidence(type: SupportingEvidence['type']): boolean {
    return this._data.supportingEvidence.some(
      evidence => evidence.type === type
    );
  }

  public hasRecommendation(actionType: ActionType): boolean {
    return this._data.recommendations.some(
      rec => rec.actionType === actionType
    );
  }

  public isRelatedTo(insightId: string): boolean {
    return this._data.relatedInsights.includes(insightId);
  }

  public getEvidenceByType(
    type: SupportingEvidence['type']
  ): SupportingEvidence[] {
    return this._data.supportingEvidence.filter(
      evidence => evidence.type === type
    );
  }

  public getRecommendationsByType(
    actionType: ActionType
  ): ActionRecommendation[] {
    return this._data.recommendations.filter(
      rec => rec.actionType === actionType
    );
  }

  public getHighPriorityRecommendations(): ActionRecommendation[] {
    return this._data.recommendations.filter(rec =>
      ['high', 'critical'].includes(rec.priority)
    );
  }

  public getAverageEvidenceConfidence(): number {
    if (this._data.supportingEvidence.length === 0) return 0;

    const totalConfidence = this._data.supportingEvidence.reduce(
      (sum, evidence) => sum + evidence.confidence,
      0
    );

    return totalConfidence / this._data.supportingEvidence.length;
  }

  public withAddedEvidence(evidence: SupportingEvidence): TacticalInsight {
    return new TacticalInsight({
      ...this._data,
      supportingEvidence: [...this._data.supportingEvidence, evidence],
    });
  }

  public withAddedRecommendation(
    recommendation: ActionRecommendation
  ): TacticalInsight {
    return new TacticalInsight({
      ...this._data,
      recommendations: [...this._data.recommendations, recommendation],
    });
  }

  public withAddedRelatedInsight(insightId: string): TacticalInsight {
    if (this._data.relatedInsights.includes(insightId)) {
      return this;
    }

    return new TacticalInsight({
      ...this._data,
      relatedInsights: [...this._data.relatedInsights, insightId],
    });
  }

  public withAddedTag(tag: string): TacticalInsight {
    if (this._data.tags.includes(tag)) {
      return this;
    }

    return new TacticalInsight({
      ...this._data,
      tags: [...this._data.tags, tag],
    });
  }

  public withUpdatedPriority(priority: InsightPriority): TacticalInsight {
    return new TacticalInsight({
      ...this._data,
      priority,
    });
  }

  public withImplementation(implementedAt: Date = new Date()): TacticalInsight {
    return new TacticalInsight({
      ...this._data,
      implementedAt,
    });
  }

  public withValidityExtension(newValidUntil: Date): TacticalInsight {
    if (newValidUntil <= this._data.createdAt) {
      throw new Error('New validity date must be after creation date');
    }

    return new TacticalInsight({
      ...this._data,
      validUntil: newValidUntil,
    });
  }

  public withMetadata(metadata: Record<string, any>): TacticalInsight {
    return new TacticalInsight({
      ...this._data,
      metadata: { ...this._data.metadata, ...metadata },
    });
  }

  public equals(other: TacticalInsight): boolean {
    return this._data.id === other._data.id;
  }

  public toJSON(): TacticalInsightData {
    return { ...this._data };
  }

  public toString(): string {
    return `TacticalInsight(${this._data.type}: ${this._data.title}, ${this._data.priority}, ${this._data.confidence})`;
  }
}
