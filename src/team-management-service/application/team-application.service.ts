import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateTeamCommand } from './commands/create-team.command';
import { UpdateTeamCommand } from './commands/update-team.command';
import { DeleteTeamCommand } from './commands/delete-team.command';
import { AddPlayerToTeamCommand } from './commands/add-player-to-team.command';
import { RemovePlayerFromTeamCommand } from './commands/remove-player-from-team.command';
import { GetTeamQuery } from './queries/get-team.query';
import { GetTeamsQuery } from './queries/get-teams.query';
import { GetTeamPlayersQuery } from './queries/get-team-players.query';
import { GetTeamMatchesQuery } from './queries/get-team-matches.query';

export interface CreateTeamDto {
  name: string;
  shortName?: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary?: string;
  };
  stadium?: string;
  foundedYear?: number;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
}

export interface UpdateTeamDto {
  name?: string;
  shortName?: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary?: string;
  };
  stadium?: string;
  foundedYear?: number;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  coachId?: string;
  formation?: string;
}

export interface TeamFiltersDto {
  name?: string;
  league?: string;
  founded?: { from?: number; to?: number };
  limit?: number;
  offset?: number;
}

export interface AddPlayerDto {
  name: string;
  position?: string;
  jerseyNumber?: number;
  dateOfBirth?: Date;
  nationality?: string;
}

@Injectable()
export class TeamApplicationService {
  private readonly logger = new Logger(TeamApplicationService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  async createTeam(dto: CreateTeamDto): Promise<{ teamId: string }> {
    this.logger.log(`Creating team: ${dto.name}`);

    const command = new CreateTeamCommand(
      dto.name,
      dto.shortName,
      dto.logo,
      dto.colors,
      dto.stadium,
      dto.foundedYear,
      dto.website,
      dto.socialMedia
    );

    return await this.commandBus.execute(command);
  }

  async updateTeam(teamId: string, dto: UpdateTeamDto): Promise<void> {
    this.logger.log(`Updating team: ${teamId}`);

    const command = new UpdateTeamCommand(teamId, dto);
    await this.commandBus.execute(command);
  }

  async deleteTeam(teamId: string): Promise<void> {
    this.logger.log(`Deleting team: ${teamId}`);

    const command = new DeleteTeamCommand(teamId);
    await this.commandBus.execute(command);
  }

  async getTeam(teamId: string): Promise<any> {
    this.logger.log(`Getting team: ${teamId}`);

    const query = new GetTeamQuery(teamId);
    return await this.queryBus.execute(query);
  }

  async getTeams(filters?: TeamFiltersDto): Promise<any[]> {
    this.logger.log('Getting teams with filters:', filters);

    const query = new GetTeamsQuery(filters);
    return await this.queryBus.execute(query);
  }

  async addPlayerToTeam(
    teamId: string,
    playerDto: AddPlayerDto
  ): Promise<{ playerId: string }> {
    this.logger.log(`Adding player to team: ${teamId}`);

    const command = new AddPlayerToTeamCommand(
      teamId,
      playerDto.name,
      playerDto.position,
      playerDto.jerseyNumber,
      playerDto.dateOfBirth,
      playerDto.nationality
    );

    return await this.commandBus.execute(command);
  }

  async removePlayerFromTeam(teamId: string, playerId: string): Promise<void> {
    this.logger.log(`Removing player ${playerId} from team: ${teamId}`);

    const command = new RemovePlayerFromTeamCommand(teamId, playerId);
    await this.commandBus.execute(command);
  }

  async getTeamPlayers(teamId: string): Promise<any[]> {
    this.logger.log(`Getting players for team: ${teamId}`);

    const query = new GetTeamPlayersQuery(teamId);
    return await this.queryBus.execute(query);
  }

  async getTeamMatches(
    teamId: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<any[]> {
    this.logger.log(`Getting matches for team: ${teamId}`);

    const query = new GetTeamMatchesQuery(teamId, timeRange);
    return await this.queryBus.execute(query);
  }
}
