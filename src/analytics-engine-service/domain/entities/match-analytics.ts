/**
 * Match Analytics Aggregate Root with Event Sourcing
 */

import { MatchId } from '../value-objects/match-id';
import { TeamAnalytics, XGValue, PossessionPercentage } from '../value-objects/analytics-metrics';
import { DomainEvent } from '../events/domain-event';
import { MatchAnalyticsCreatedEvent } from '../events/match-analytics-created.event';
import { XGCalculatedEvent } from '../events/xg-calculated.event';
import { PossessionCalculatedEvent } from '../events/possession-calculated.event';


export interface MatchAnalyticsSnapshot {
  readonly matchId: string;
  readonly homeTeam: TeamAnalytics;
  readonly awayTeam: TeamAnalytics;
  readonly matchDuration: number;
  readonly lastUpdated: Date;
  readonly version: number;
}

export class MatchAnalytics {
  private readonly _matchId: MatchId;
  private _homeTeam: TeamAnalytics;
  private _awayTeam: TeamAnalytics;
  private _matchDuration: number;
  private _lastUpdated: Date;
  private _version: number;
  private _uncommittedEvents: DomainEvent[];

  constructor(
    matchId: MatchId,
    homeTeamId: string,
    awayTeamId: string,
    matchDuration: number = 0
  ) {
    this._matchId = matchId;
    this._homeTeam = TeamAnalytics.empty(homeTeamId);
    this._awayTeam = TeamAnalytics.empty(awayTeamId);
    this._matchDuration = matchDuration;
    this._lastUpdated = new Date();
    this._version = 0;
    this._uncommittedEvents = [];

    this.addEvent(new MatchAnalyticsCreatedEvent(
      this._matchId.value,
      homeTeamId,
      awayTeamId,
      this._lastUpdated
    ));
  }

  // Getters
  get matchId(): MatchId {
    return this._matchId;
  }

  get homeTeam(): TeamAnalytics {
    return this._homeTeam;
  }

  get awayTeam(): TeamAnalytics {
    return this._awayTeam;
  }

  get matchDuration(): number {
    return this._matchDuration;
  }

  get lastUpdated(): Date {
    return this._lastUpdated;
  }

  get version(): number {
    return this._version;
  }

  get uncommittedEvents(): ReadonlyArray<DomainEvent> {
    return [...this._uncommittedEvents];
  }

  // Business methods
  updateHomeTeamXG(newXG: XGValue): void {
    const previousXG = this._homeTeam.xG;
    this._homeTeam = this._homeTeam.updateXG(newXG);
    this._lastUpdated = new Date();
    this._version++;

    this.addEvent(new XGCalculatedEvent(
      this._matchId.value,
      this._homeTeam.teamId,
      newXG.value,
      previousXG.value,
      this._lastUpdated
    ));
  }

  updateAwayTeamXG(newXG: XGValue): void {
    const previousXG = this._awayTeam.xG;
    this._awayTeam = this._awayTeam.updateXG(newXG);
    this._lastUpdated = new Date();
    this._version++;

    this.addEvent(new XGCalculatedEvent(
      this._matchId.value,
      this._awayTeam.teamId,
      newXG.value,
      previousXG.value,
      this._lastUpdated
    ));
  }

  updateTeamXG(teamId: string, newXG: XGValue): void {
    if (teamId === this._homeTeam.teamId) {
      this.updateHomeTeamXG(newXG);
    } else if (teamId === this._awayTeam.teamId) {
      this.updateAwayTeamXG(newXG);
    } else {
      throw new Error(`Team ${teamId} not found in match ${this._matchId.value}`);
    }
  }

  updatePossession(homeTeamPossession: PossessionPercentage, awayTeamPossession: PossessionPercentage): void {
    // Validate that percentages add up to approximately 100%
    const total = homeTeamPossession.value + awayTeamPossession.value;
    if (Math.abs(total - 100) > 1) {
      throw new Error('Possession percentages must add up to 100%');
    }

    this._homeTeam = this._homeTeam.updatePossession(homeTeamPossession);
    this._awayTeam = this._awayTeam.updatePossession(awayTeamPossession);
    this._lastUpdated = new Date();
    this._version++;

    this.addEvent(new PossessionCalculatedEvent(
      this._matchId.value,
      this._homeTeam.teamId,
      homeTeamPossession.value,
      this._awayTeam.teamId,
      awayTeamPossession.value,
      this._lastUpdated
    ));
  }

  updateMatchDuration(duration: number): void {
    if (duration < 0) {
      throw new Error('Match duration cannot be negative');
    }

    this._matchDuration = duration;
    this._lastUpdated = new Date();
    this._version++;
  }

  // Event sourcing methods
  static fromSnapshot(snapshot: MatchAnalyticsSnapshot): MatchAnalytics {
    const analytics = Object.create(MatchAnalytics.prototype);
    analytics._matchId = MatchId.fromString(snapshot.matchId);
    analytics._homeTeam = snapshot.homeTeam;
    analytics._awayTeam = snapshot.awayTeam;
    analytics._matchDuration = snapshot.matchDuration;
    analytics._lastUpdated = snapshot.lastUpdated;
    analytics._version = snapshot.version;
    analytics._uncommittedEvents = [];
    return analytics;
  }

  static fromEvents(matchId: MatchId, events: DomainEvent[]): MatchAnalytics {
    // Find the creation event
    const creationEvent = events.find(e => e.eventType === 'MatchAnalyticsCreated') as MatchAnalyticsCreatedEvent;
    if (!creationEvent) {
      throw new Error('MatchAnalyticsCreated event not found');
    }

    const analytics = new MatchAnalytics(
      matchId,
      creationEvent.homeTeamId,
      creationEvent.awayTeamId
    );

    // Clear the creation event since we're replaying
    analytics._uncommittedEvents = [];

    // Apply all events
    events.forEach(event => analytics.applyEvent(event));

    return analytics;
  }

  applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'MatchAnalyticsCreated':
        // Already handled in constructor
        break;

      case 'XGCalculated': {
        const xgEvent = event as XGCalculatedEvent;
        const newXG = XGValue.fromNumber(xgEvent.newXG);
        
        if (xgEvent.teamId === this._homeTeam.teamId) {
          this._homeTeam = this._homeTeam.updateXG(newXG);
        } else if (xgEvent.teamId === this._awayTeam.teamId) {
          this._awayTeam = this._awayTeam.updateXG(newXG);
        }
        break;
      }

      case 'PossessionCalculated': {
        const possessionEvent = event as PossessionCalculatedEvent;
        const homePossession = PossessionPercentage.fromNumber(possessionEvent.homeTeamPossession);
        const awayPossession = PossessionPercentage.fromNumber(possessionEvent.awayTeamPossession);

        this._homeTeam = this._homeTeam.updatePossession(homePossession);
        this._awayTeam = this._awayTeam.updatePossession(awayPossession);
        break;
      }

      case 'FormationDetected': {
        // Handle formation updates
        break;
      }

      default:
        // Unknown event type - ignore but don't fail
    }

    this._lastUpdated = event.timestamp;
    this._version++;
  }

  markEventsAsCommitted(): void {
    this._uncommittedEvents = [];
  }

  createSnapshot(): MatchAnalyticsSnapshot {
    return {
      matchId: this._matchId.value,
      homeTeam: this._homeTeam,
      awayTeam: this._awayTeam,
      matchDuration: this._matchDuration,
      lastUpdated: this._lastUpdated,
      version: this._version
    };
  }

  // Comparison methods
  getXGDifference(): number {
    return this._homeTeam.xG.value - this._awayTeam.xG.value;
  }

  getPossessionDifference(): number {
    return this._homeTeam.possession.value - this._awayTeam.possession.value;
  }

  getTotalXG(): XGValue {
    return this._homeTeam.xG.add(this._awayTeam.xG);
  }

  // Validation methods
  isValid(): boolean {
    try {
      this.validate();
      return true;
    } catch {
      return false;
    }
  }

  validate(): void {
    if (!this._matchId) {
      throw new Error('Match ID is required');
    }

    if (!this._homeTeam || !this._awayTeam) {
      throw new Error('Both teams are required');
    }

    if (this._homeTeam.teamId === this._awayTeam.teamId) {
      throw new Error('Home and away teams must be different');
    }

    if (this._matchDuration < 0) {
      throw new Error('Match duration cannot be negative');
    }

    const totalPossession = this._homeTeam.possession.value + this._awayTeam.possession.value;
    if (totalPossession > 0 && Math.abs(totalPossession - 100) > 1) {
      throw new Error('Possession percentages must add up to 100%');
    }
  }

  private addEvent(event: DomainEvent): void {
    this._uncommittedEvents.push(event);
  }

  // Factory methods
  static create(matchId: MatchId, homeTeamId: string, awayTeamId: string): MatchAnalytics {
    return new MatchAnalytics(matchId, homeTeamId, awayTeamId);
  }

  static createWithDuration(
    matchId: MatchId, 
    homeTeamId: string, 
    awayTeamId: string, 
    duration: number
  ): MatchAnalytics {
    return new MatchAnalytics(matchId, homeTeamId, awayTeamId, duration);
  }
}
