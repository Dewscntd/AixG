import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GetTeamQuery } from './get-team.query';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';

@QueryHandler(GetTeamQuery)
@Injectable()
export class GetTeamHandler implements IQueryHandler<GetTeamQuery> {
  private readonly logger = new Logger(GetTeamHandler.name);

  constructor(private readonly teamRepository: TeamRepository) {}

  async execute(query: GetTeamQuery): Promise<any> {
    this.logger.log(`Getting team: ${query.teamId}`);

    try {
      const team = await this.teamRepository.findById(query.teamId);

      if (!team) {
        throw new NotFoundException(`Team with ID ${query.teamId} not found`);
      }

      return team.toPrimitives();
    } catch (error) {
      this.logger.error(
        `Failed to get team ${query.teamId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
