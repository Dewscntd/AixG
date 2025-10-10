
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetCoachingSessionQuery } from './get-coaching-session.query';

@QueryHandler(GetCoachingSessionQuery)
export class GetCoachingSessionHandler
  implements IQueryHandler<GetCoachingSessionQuery>
{
  constructor() {}

  async execute(query: GetCoachingSessionQuery): Promise<any> {
    // For now, we'll return a mock coaching session.
    return {
      id: query.sessionId,
      status: 'in-progress',
      messages: [],
    };
  }
}
