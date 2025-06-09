import { BaseDomainEvent } from './domain-event';

export interface ShotEventData {
  teamId: string;
  position: { x: number; y: number };
  targetPosition: { x: number; y: number };
  timestamp: number;
  bodyPart: string;
  situation: string;
}

export class XGCalculatedEvent extends BaseDomainEvent {
  public readonly teamId: string;
  public readonly newXG: number;
  public readonly previousXG: number;
  public readonly shotData?: ShotEventData | undefined;

  constructor(
    matchId: string,
    teamId: string,
    newXG: number,
    previousXG: number,
    timestamp?: Date,
    shotData?: ShotEventData,
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
    this.shotData = shotData ?? undefined;

    if (timestamp) {
      // Use Object.defineProperty to modify readonly timestamp
      Object.defineProperty(this, 'timestamp', {
        value: timestamp,
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }
  }

  getEventData(): Record<string, unknown> {
    return {
      teamId: this.teamId,
      newXG: this.newXG,
      previousXG: this.previousXG,
      xgDifference: this.newXG - this.previousXG,
      shotData: this.shotData,
    };
  }
}
