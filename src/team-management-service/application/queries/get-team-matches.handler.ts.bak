import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GetTeamMatchesQuery } from './get-team-matches.query';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { PrismaService } from '../../../prisma/prisma.service';

@QueryHandler(GetTeamMatchesQuery)
@Injectable()
export class GetTeamMatchesHandler
  implements IQueryHandler<GetTeamMatchesQuery>
{
  private readonly logger = new Logger(GetTeamMatchesHandler.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(query: GetTeamMatchesQuery): Promise<any[]> {
    this.logger.log(`Getting matches for team: ${query.teamId}`);

    try {
      // Verify team exists
      const teamExists = await this.teamRepository.exists(query.teamId);
      if (!teamExists) {
        throw new NotFoundException(`Team with ID ${query.teamId} not found`);
      }

      // Build where clause
      const where: any = {
        OR: [{ homeTeamId: query.teamId }, { awayTeamId: query.teamId }],
      };

      if (query.timeRange) {
        where.matchDateTime = {};
        if (query.timeRange.from) {
          where.matchDateTime.gte = query.timeRange.from;
        }
        if (query.timeRange.to) {
          where.matchDateTime.lte = query.timeRange.to;
        }
      }

      // Query matches
      const matches = await this.prisma.match.findMany({
        where,
        include: {
          homeTeam: true,
          awayTeam: true,
        },
        orderBy: {
          matchDateTime: 'desc',
        },
      });

      return matches;
    } catch (error) {
      this.logger.error(
        `Failed to get team matches ${query.teamId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
