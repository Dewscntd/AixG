import { IEvent } from '@nestjs/cqrs';

export class PlayerAddedToTeamEvent implements IEvent {
  constructor(
    public readonly teamId: string,
    public readonly playerId: string,
    public readonly playerName: string,
    public readonly playerPosition: string,
    public readonly occurredAt: Date = new Date()
  ) {}

  public getEventName(): string {
    return 'PlayerAddedToTeam';
  }

  public getAggregateId(): string {
    return this.teamId;
  }

  public toPrimitives(): any {
    return {
      teamId: this.teamId,
      playerId: this.playerId,
      playerName: this.playerName,
      playerPosition: this.playerPosition,
      occurredAt: this.occurredAt,
    };
  }
}
