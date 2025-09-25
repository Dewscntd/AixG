import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type TeamPrismaRecord = Record<string, unknown>; // replace with domain Team type when available

@Injectable()
export class TeamRepository {
  private readonly logger = new Logger(TeamRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TeamPrismaRecord | null> {
    try {
      const teamData = await this.prisma.team.findUnique({ where: { id } });
      if (!teamData) return null;
      return teamData as TeamPrismaRecord;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch team ${id}: ${err.message}`, err.stack);
      throw err;
    }
  }

  async create(teamData: TeamPrismaRecord): Promise<void> {
    try {
      await this.prisma.team.create({ data: teamData as any });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create team: ${err.message}`, err.stack);
      throw err;
    }
  }
}