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
      // Use Object.defineProperty to modify readonly timestamp
      Object.defineProperty(this, 'timestamp', {
        value: timestamp,
        writable: false,
        enumerable: true,
        configurable: false
      });
    }
  }

  getEventData(): Record<string, unknown> {
    return {
      homeTeamId: this.homeTeamId,
      awayTeamId: this.awayTeamId
    };
  }
}
