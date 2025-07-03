import { IEvent } from '@nestjs/cqrs';

export class TeamCreatedEvent implements IEvent {
  constructor(
    public readonly teamId: string,
    public readonly name: string,
    public readonly shortName?: string,
    public readonly logo?: string,
    public readonly primaryColor?: string,
    public readonly secondaryColor?: string,
    public readonly stadium?: string,
    public readonly foundedYear?: number,
    public readonly website?: string,
    public readonly socialMedia?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
    },
    public readonly occurredAt: Date = new Date()
  ) {}

  public getEventName(): string {
    return 'TeamCreated';
  }

  public getAggregateId(): string {
    return this.teamId;
  }

  public toPrimitives(): any {
    return {
      teamId: this.teamId,
      name: this.name,
      shortName: this.shortName,
      logo: this.logo,
      primaryColor: this.primaryColor,
      secondaryColor: this.secondaryColor,
      stadium: this.stadium,
      foundedYear: this.foundedYear,
      website: this.website,
      socialMedia: this.socialMedia,
      occurredAt: this.occurredAt,
    };
  }
}
