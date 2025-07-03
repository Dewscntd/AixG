import { BaseDomainEvent } from './domain-event';

export class FormationDetectedEvent extends BaseDomainEvent {
  public readonly teamId: string;
  public readonly formation: string;
  public readonly confidence: number;
  public readonly playerPositions: Array<{
    playerId: string;
    position: { x: number; y: number };
    role: string;
  }>;
  public readonly detectionTimestamp: number;

  constructor(
    matchId: string,
    teamId: string,
    formation: string,
    confidence: number,
    playerPositions: Array<{
      playerId: string;
      position: { x: number; y: number };
      role: string;
    }>,
    detectionTimestamp: number,
    timestamp?: Date,
    correlationId?: string,
    causationId?: string
  ) {
    super(
      'FormationDetected',
      matchId,
      'MatchAnalytics',
      1,
      correlationId,
      causationId
    );

    this.teamId = teamId;
    this.formation = formation;
    this.confidence = confidence;
    this.playerPositions = playerPositions;
    this.detectionTimestamp = detectionTimestamp;

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
      formation: this.formation,
      confidence: this.confidence,
      playerPositions: this.playerPositions,
      detectionTimestamp: this.detectionTimestamp,
      playerCount: this.playerPositions.length,
    };
  }
}
