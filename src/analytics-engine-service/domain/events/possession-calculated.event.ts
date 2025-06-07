import { BaseDomainEvent } from './domain-event';

export class PossessionCalculatedEvent extends BaseDomainEvent {
  public readonly homeTeamId: string;
  public readonly homeTeamPossession: number;
  public readonly awayTeamId: string;
  public readonly awayTeamPossession: number;
  public readonly calculationMethod: string;

  constructor(
    matchId: string,
    homeTeamId: string,
    homeTeamPossession: number,
    awayTeamId: string,
    awayTeamPossession: number,
    timestamp?: Date,
    calculationMethod: string = 'time_based',
    correlationId?: string,
    causationId?: string
  ) {
    super(
      'PossessionCalculated',
      matchId,
      'MatchAnalytics',
      1,
      correlationId,
      causationId
    );
    
    this.homeTeamId = homeTeamId;
    this.homeTeamPossession = homeTeamPossession;
    this.awayTeamId = awayTeamId;
    this.awayTeamPossession = awayTeamPossession;
    this.calculationMethod = calculationMethod;
    
    if (timestamp) {
      (this as any).timestamp = timestamp;
    }
  }

  getEventData(): Record<string, any> {
    return {
      homeTeamId: this.homeTeamId,
      homeTeamPossession: this.homeTeamPossession,
      awayTeamId: this.awayTeamId,
      awayTeamPossession: this.awayTeamPossession,
      possessionDifference: this.homeTeamPossession - this.awayTeamPossession,
      calculationMethod: this.calculationMethod
    };
  }
}
