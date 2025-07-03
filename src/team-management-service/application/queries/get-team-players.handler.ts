import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GetTeamPlayersQuery } from './get-team-players.query';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';

@QueryHandler(GetTeamPlayersQuery)
@Injectable()
export class GetTeamPlayersHandler
  implements IQueryHandler<GetTeamPlayersQuery>
{
  private readonly logger = new Logger(GetTeamPlayersHandler.name);

  constructor(private readonly teamRepository: TeamRepository) {}

  async execute(query: GetTeamPlayersQuery): Promise<any[]> {
    this.logger.log(`Getting players for team: ${query.teamId}`);

    try {
      const team = await this.teamRepository.findById(query.teamId);

      if (!team) {
        throw new NotFoundException(`Team with ID ${query.teamId} not found`);
      }

      return team.players;
    } catch (error) {
      this.logger.error(
        `Failed to get team players ${query.teamId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
