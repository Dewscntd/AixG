import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  TeamApplicationService,
  CreateTeamDto,
  UpdateTeamDto,
  TeamFiltersDto,
  AddPlayerDto,
} from '../application/team-application.service';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamController {
  private readonly logger = new Logger(TeamController.name);

  constructor(
    private readonly teamApplicationService: TeamApplicationService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Team name already exists' })
  async createTeam(@Body() createTeamDto: CreateTeamDto) {
    this.logger.log(`Creating team: ${createTeamDto.name}`);
    return await this.teamApplicationService.createTeam(createTeamDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({ status: 200, description: 'Team found' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getTeam(@Param('id') id: string) {
    this.logger.log(`Getting team: ${id}`);
    return await this.teamApplicationService.getTeam(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teams with optional filters' })
  @ApiResponse({ status: 200, description: 'Teams retrieved successfully' })
  async getTeams(
    @Query('name') name?: string,
    @Query('league') league?: string,
    @Query('foundedFrom') foundedFrom?: number,
    @Query('foundedTo') foundedTo?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    this.logger.log('Getting teams with filters');

    const filters: TeamFiltersDto = {
      name,
      league,
      founded:
        foundedFrom || foundedTo
          ? {
              from: foundedFrom,
              to: foundedTo,
            }
          : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };

    return await this.teamApplicationService.getTeams(filters);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team by ID' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateTeam(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto
  ) {
    this.logger.log(`Updating team: ${id}`);
    await this.teamApplicationService.updateTeam(id, updateTeamDto);
    return { message: 'Team updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete team by ID' })
  @ApiResponse({ status: 204, description: 'Team deleted successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async deleteTeam(@Param('id') id: string) {
    this.logger.log(`Deleting team: ${id}`);
    await this.teamApplicationService.deleteTeam(id);
  }

  @Get(':id/players')
  @ApiOperation({ summary: 'Get all players for a team' })
  @ApiResponse({
    status: 200,
    description: 'Team players retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getTeamPlayers(@Param('id') id: string) {
    this.logger.log(`Getting players for team: ${id}`);
    return await this.teamApplicationService.getTeamPlayers(id);
  }

  @Post(':id/players')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a player to the team' })
  @ApiResponse({ status: 201, description: 'Player added successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiResponse({ status: 400, description: 'Invalid player data or team full' })
  async addPlayerToTeam(
    @Param('id') id: string,
    @Body() addPlayerDto: AddPlayerDto
  ) {
    this.logger.log(`Adding player to team: ${id}`);
    return await this.teamApplicationService.addPlayerToTeam(id, addPlayerDto);
  }

  @Delete(':id/players/:playerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a player from the team' })
  @ApiResponse({ status: 204, description: 'Player removed successfully' })
  @ApiResponse({ status: 404, description: 'Team or player not found' })
  async removePlayerFromTeam(
    @Param('id') id: string,
    @Param('playerId') playerId: string
  ) {
    this.logger.log(`Removing player ${playerId} from team: ${id}`);
    await this.teamApplicationService.removePlayerFromTeam(id, playerId);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'Get all matches for a team' })
  @ApiResponse({
    status: 200,
    description: 'Team matches retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getTeamMatches(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    this.logger.log(`Getting matches for team: ${id}`);

    const timeRange =
      from || to
        ? {
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
          }
        : undefined;

    return await this.teamApplicationService.getTeamMatches(
      id,
      timeRange as any
    );
  }
}
