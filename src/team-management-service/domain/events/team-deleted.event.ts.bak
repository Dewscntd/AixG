import { IEvent } from '@nestjs/cqrs';

export class TeamDeletedEvent implements IEvent {
  constructor(
    public readonly teamId: string,
    public readonly teamName: string,
    public readonly occurredAt: Date = new Date()
  ) {}

  public getEventName(): string {
    return 'TeamDeleted';
  }

  public getAggregateId(): string {
    return this.teamId;
  }

  public toPrimitives(): any {
    return {
      teamId: this.teamId,
      teamName: this.teamName,
      occurredAt: this.occurredAt,
    };
  }
}
