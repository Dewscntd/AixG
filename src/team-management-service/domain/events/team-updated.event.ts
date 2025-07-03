import { IEvent } from '@nestjs/cqrs';

export class TeamUpdatedEvent implements IEvent {
  constructor(
    public readonly teamId: string,
    public readonly updateData: Partial<{
      name: string;
      shortName: string;
      logo: string;
      colors: { primary: string; secondary?: string };
      stadium: string;
      foundedYear: number;
      website: string;
      socialMedia: { facebook?: string; twitter?: string; instagram?: string };
      coachId: string;
      formation: string;
    }>,
    public readonly occurredAt: Date = new Date()
  ) {}

  public getEventName(): string {
    return 'TeamUpdated';
  }

  public getAggregateId(): string {
    return this.teamId;
  }

  public toPrimitives(): any {
    return {
      teamId: this.teamId,
      updateData: this.updateData,
      occurredAt: this.occurredAt,
    };
  }
}
