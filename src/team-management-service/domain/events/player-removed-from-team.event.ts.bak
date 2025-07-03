import { IEvent } from '@nestjs/cqrs';

export class PlayerRemovedFromTeamEvent implements IEvent {
  constructor(
    public readonly teamId: string,
    public readonly playerId: string,
    public readonly playerName: string,
    public readonly occurredAt: Date = new Date()
  ) {}

  public getEventName(): string {
    return 'PlayerRemovedFromTeam';
  }

  public getAggregateId(): string {
    return this.teamId;
  }

  public toPrimitives(): any {
    return {
      teamId: this.teamId,
      playerId: this.playerId,
      playerName: this.playerName,
      occurredAt: this.occurredAt,
    };
  }
}
