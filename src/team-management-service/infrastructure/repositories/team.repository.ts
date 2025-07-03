import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TeamAggregate } from '../../domain/entities/team.aggregate';
import { TeamId } from '../../domain/value-objects/team-id.vo';

export interface ITeamRepository {
  save(team: TeamAggregate): Promise<void>;
  findById(id: string): Promise<TeamAggregate | null>;
  findByName(name: string): Promise<TeamAggregate | null>;
  findAll(filters?: {
    name?: string;
    league?: string;
    founded?: { from?: number; to?: number };
    limit?: number;
    offset?: number;
  }): Promise<TeamAggregate[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

@Injectable()
export class TeamRepository implements ITeamRepository {
  private readonly logger = new Logger(TeamRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(team: TeamAggregate): Promise<void> {
    this.logger.log(`Saving team: ${team.id.value}`);

    try {
      const teamData = team.toPrimitives();

      await this.prisma.team.upsert({
        where: { id: teamData.id },
        update: {
          name: teamData.name,
          shortName: teamData.shortName,
          logo: teamData.logo,
          primaryColor: teamData.primaryColor,
          secondaryColor: teamData.secondaryColor,
          stadium: teamData.stadium,
          foundedYear: teamData.foundedYear,
          website: teamData.website,
          socialMedia: teamData.socialMedia,
          formation: teamData.formation,
          updatedAt: teamData.updatedAt,
        },
        create: {
          id: teamData.id,
          name: teamData.name,
          shortName: teamData.shortName,
          logo: teamData.logo,
          primaryColor: teamData.primaryColor,
          secondaryColor: teamData.secondaryColor,
          stadium: teamData.stadium,
          foundedYear: teamData.foundedYear,
          website: teamData.website,
          socialMedia: teamData.socialMedia,
          formation: teamData.formation,
          createdAt: teamData.createdAt,
          updatedAt: teamData.updatedAt,
        },
      });

      this.logger.log(`Team saved successfully: ${team.id.value}`);
    } catch (error) {
      this.logger.error(
        `Failed to save team ${team.id.value}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async findById(id: string): Promise<TeamAggregate | null> {
    this.logger.log(`Finding team by ID: ${id}`);

    try {
      const teamData = await this.prisma.team.findUnique({
        where: { id },
        include: {
          players: true,
        },
      });

      if (!teamData) {
        return null;
      }

      return TeamAggregate.fromPrimitives(teamData);
    } catch (error) {
      this.logger.error(
        `Failed to find team by ID ${id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async findByName(name: string): Promise<TeamAggregate | null> {
    this.logger.log(`Finding team by name: ${name}`);

    try {
      const teamData = await this.prisma.team.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
        include: {
          players: true,
        },
      });

      if (!teamData) {
        return null;
      }

      return TeamAggregate.fromPrimitives(teamData);
    } catch (error) {
      this.logger.error(
        `Failed to find team by name ${name}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async findAll(filters?: {
    name?: string;
    league?: string;
    founded?: { from?: number; to?: number };
    limit?: number;
    offset?: number;
  }): Promise<TeamAggregate[]> {
    this.logger.log('Finding all teams with filters:', filters);

    try {
      const where: any = {};

      if (filters?.name) {
        where.name = {
          contains: filters.name,
          mode: 'insensitive',
        };
      }

      if (filters?.founded) {
        where.foundedYear = {};
        if (filters.founded.from) {
          where.foundedYear.gte = filters.founded.from;
        }
        if (filters.founded.to) {
          where.foundedYear.lte = filters.founded.to;
        }
      }

      const teamsData = await this.prisma.team.findMany({
        where,
        include: {
          players: true,
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      });

      return teamsData.map(teamData => TeamAggregate.fromPrimitives(teamData));
    } catch (error) {
      this.logger.error(`Failed to find teams: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting team: ${id}`);

    try {
      await this.prisma.team.delete({
        where: { id },
      });

      this.logger.log(`Team deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete team ${id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.prisma.team.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Failed to check if team exists ${id}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }
}
