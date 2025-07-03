import { ICommand } from '@nestjs/cqrs';

export class RemovePlayerFromTeamCommand implements ICommand {
  constructor(
    public readonly teamId: string,
    public readonly playerId: string
  ) {}
}
