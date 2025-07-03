import { IQuery } from '@nestjs/cqrs';

export class GetTeamPlayersQuery implements IQuery {
  constructor(public readonly teamId: string) {}
}
