import { BaseDomainEvent } from './domain-event';

export class XGCalculatedEvent extends BaseDomainEvent {
  public readonly teamId: string;
  public readonly newXG: number;
  public readonly previousXG: number;
  public readonly shotData?: any;

  constructor(
    matchId: string,
    teamId: string,
    newXG: number,
    previousXG: number,
    timestamp?: Date,
    shotData?: any,
    correlationId?: string,
    causationId?: string
  ) {
    super(
      'XGCalculated',
      matchId,
      'MatchAnalytics',
      1,
      correlationId,
      causationId
    );
    
    this.teamId = teamId;
    this.newXG = newXG;
    this.previousXG = previousXG;
    this.shotData = shotData;
    
    if (timestamp) {
      (this as any).timestamp = timestamp;
    }
  }

  getEventData(): Record<string, any> {
    return {
      teamId: this.teamId,
      newXG: this.newXG,
      previousXG: this.previousXG,
      xgDifference: this.newXG - this.previousXG,
      shotData: this.shotData
    };
  }
}
