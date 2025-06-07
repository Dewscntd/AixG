import { BaseDomainEvent } from './domain-event';

export class MatchAnalyticsCreatedEvent extends BaseDomainEvent {
  public readonly homeTeamId: string;
  public readonly awayTeamId: string;

  constructor(
    matchId: string,
    homeTeamId: string,
    awayTeamId: string,
    timestamp?: Date,
    correlationId?: string,
    causationId?: string
  ) {
    super(
      'MatchAnalyticsCreated',
      matchId,
      'MatchAnalytics',
      1,
      correlationId,
      causationId
    );
    
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;
    
    if (timestamp) {
      (this as any).timestamp = timestamp;
    }
  }

  getEventData(): Record<string, any> {
    return {
      homeTeamId: this.homeTeamId,
      awayTeamId: this.awayTeamId
    };
  }
}
