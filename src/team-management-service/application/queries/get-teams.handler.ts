import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { GetTeamsQuery } from './get-teams.query';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';

@QueryHandler(GetTeamsQuery)
@Injectable()
export class GetTeamsHandler implements IQueryHandler<GetTeamsQuery> {
  private readonly logger = new Logger(GetTeamsHandler.name);

  constructor(private readonly teamRepository: TeamRepository) {}

  async execute(query: GetTeamsQuery): Promise<any[]> {
    this.logger.log('Getting teams with filters:', query.filters);

    try {
      const teams = await this.teamRepository.findAll(query.filters);
      return teams.map(team => team.toPrimitives());
    } catch (error) {
      this.logger.error(`Failed to get teams: ${error.message}`, error.stack);
      throw error;
    }
  }
}
