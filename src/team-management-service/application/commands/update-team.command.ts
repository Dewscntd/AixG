import { ICommand } from '@nestjs/cqrs';

export class UpdateTeamCommand implements ICommand {
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
    }>
  ) {}
}
