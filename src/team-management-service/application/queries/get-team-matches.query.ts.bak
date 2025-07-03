import { IQuery } from '@nestjs/cqrs';

export class GetTeamMatchesQuery implements IQuery {
  constructor(
    public readonly teamId: string,
    public readonly timeRange?: {
      from?: Date;
      to?: Date;
    }
  ) {}
}
