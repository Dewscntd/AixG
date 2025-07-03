import { IQuery } from '@nestjs/cqrs';

export class GetTeamsQuery implements IQuery {
  constructor(
    public readonly filters?: {
      name?: string;
      league?: string;
      founded?: { from?: number; to?: number };
      limit?: number;
      offset?: number;
    }
  ) {}
}
