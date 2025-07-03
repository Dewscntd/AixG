import { ICommand } from '@nestjs/cqrs';

export class AddPlayerToTeamCommand implements ICommand {
  constructor(
    public readonly teamId: string,
    public readonly playerName: string,
    public readonly position?: string,
    public readonly jerseyNumber?: number,
    public readonly dateOfBirth?: Date,
    public readonly nationality?: string
  ) {}
}
