import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AddPlayerToTeamCommand } from './add-player-to-team.command';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { Player } from '../../../domain/models';
import { v4 as uuidv4 } from 'uuid';

@CommandHandler(AddPlayerToTeamCommand)
@Injectable()
export class AddPlayerToTeamHandler
  implements ICommandHandler<AddPlayerToTeamCommand>
{
  private readonly logger = new Logger(AddPlayerToTeamHandler.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(
    command: AddPlayerToTeamCommand
  ): Promise<{ playerId: string }> {
    this.logger.log(`Adding player to team: ${command.teamId}`);

    try {
      // Find existing team
      const team = await this.teamRepository.findById(command.teamId);
      if (!team) {
        throw new NotFoundException(`Team with ID ${command.teamId} not found`);
      }

      // Create player object
      const playerId = uuidv4();
      const player: Player = {
        id: playerId,
        name: command.playerName,
        position: command.position,
        jerseyNumber: command.jerseyNumber,
        dateOfBirth: command.dateOfBirth,
        nationality: command.nationality,
        teamId: command.teamId,
      };

      // Add player to team
      team.addPlayer(player);

      // Save updated team
      await this.teamRepository.save(team);

      // Publish domain events
      team.getUncommittedEvents().forEach(event => {
        this.eventBus.publish(event);
      });
      team.markEventsAsCommitted();

      this.logger.log(`Player added successfully to team: ${command.teamId}`);

      return { playerId };
    } catch (error) {
      this.logger.error(
        `Failed to add player to team: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
