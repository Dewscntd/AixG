import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TeamAccessGuard } from '../../common/guards/team-access.guard';
import { TeamApplicationService } from '../../team-management-service/application/team-application.service';

@Resolver('Team')
@UseGuards(JwtAuthGuard)
export class TeamManagementResolver {
  private readonly logger = new Logger(TeamManagementResolver.name);

  constructor(
    private readonly teamApplicationService: TeamApplicationService
  ) {}

  @Query('getTeam')
  @UseGuards(TeamAccessGuard)
  async getTeam(@Args('id') id: string) {
    this.logger.log(`GraphQL: Getting team ${id}`);
    return await this.teamApplicationService.getTeam(id);
  }

  @Query('getTeams')
  async getTeams(@Args('filters') filters?: any) {
    this.logger.log('GraphQL: Getting teams with filters');
    return await this.teamApplicationService.getTeams(filters);
  }

  @Query('getTeamPlayers')
  @UseGuards(TeamAccessGuard)
  async getTeamPlayers(@Args('teamId') teamId: string) {
    this.logger.log(`GraphQL: Getting players for team ${teamId}`);
    return await this.teamApplicationService.getTeamPlayers(teamId);
  }

  @Query('getTeamMatches')
  @UseGuards(TeamAccessGuard)
  async getTeamMatches(
    @Args('teamId') teamId: string,
    @Args('timeRange') timeRange?: any
  ) {
    this.logger.log(`GraphQL: Getting matches for team ${teamId}`);
    return await this.teamApplicationService.getTeamMatches(teamId, timeRange);
  }

  @Mutation('createTeam')
  async createTeam(@Args('input') input: any) {
    this.logger.log(`GraphQL: Creating team ${input.name}`);

    try {
      const result = await this.teamApplicationService.createTeam(input);
      return {
        teamId: result.teamId,
        success: true,
        message: 'Team created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create team: ${error.message}`);
      return {
        teamId: null,
        success: false,
        message: error.message,
      };
    }
  }

  @Mutation('updateTeam')
  @UseGuards(TeamAccessGuard)
  async updateTeam(@Args('id') id: string, @Args('input') input: any) {
    this.logger.log(`GraphQL: Updating team ${id}`);

    try {
      await this.teamApplicationService.updateTeam(id, input);
      return {
        success: true,
        message: 'Team updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to update team: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Mutation('deleteTeam')
  @UseGuards(TeamAccessGuard)
  async deleteTeam(@Args('id') id: string) {
    this.logger.log(`GraphQL: Deleting team ${id}`);

    try {
      await this.teamApplicationService.deleteTeam(id);
      return {
        success: true,
        message: 'Team deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete team: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Mutation('addPlayerToTeam')
  @UseGuards(TeamAccessGuard)
  async addPlayerToTeam(
    @Args('teamId') teamId: string,
    @Args('input') input: any
  ) {
    this.logger.log(`GraphQL: Adding player to team ${teamId}`);

    try {
      const result = await this.teamApplicationService.addPlayerToTeam(
        teamId,
        input
      );
      return {
        playerId: result.playerId,
        success: true,
        message: 'Player added successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to add player to team: ${error.message}`);
      return {
        playerId: null,
        success: false,
        message: error.message,
      };
    }
  }

  @Mutation('removePlayerFromTeam')
  @UseGuards(TeamAccessGuard)
  async removePlayerFromTeam(
    @Args('teamId') teamId: string,
    @Args('playerId') playerId: string
  ) {
    this.logger.log(`GraphQL: Removing player ${playerId} from team ${teamId}`);

    try {
      await this.teamApplicationService.removePlayerFromTeam(teamId, playerId);
      return {
        success: true,
        message: 'Player removed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to remove player from team: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
