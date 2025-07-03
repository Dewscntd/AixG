import { ICommand } from '@nestjs/cqrs';

export class CreateTeamCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly shortName?: string,
    public readonly logo?: string,
    public readonly colors?: {
      primary: string;
      secondary?: string;
    },
    public readonly stadium?: string,
    public readonly foundedYear?: number,
    public readonly website?: string,
    public readonly socialMedia?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
    }
  ) {}
}
