import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RemovePlayerFromTeamCommand } from './remove-player-from-team.command';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';

@CommandHandler(RemovePlayerFromTeamCommand)
@Injectable()
export class RemovePlayerFromTeamHandler
  implements ICommandHandler<RemovePlayerFromTeamCommand>
{
  private readonly logger = new Logger(RemovePlayerFromTeamHandler.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: RemovePlayerFromTeamCommand): Promise<void> {
    this.logger.log(
      `Removing player ${command.playerId} from team: ${command.teamId}`
    );

    try {
      // Find existing team
      const team = await this.teamRepository.findById(command.teamId);
      if (!team) {
        throw new NotFoundException(`Team with ID ${command.teamId} not found`);
      }

      // Remove player from team
      team.removePlayer(command.playerId);

      // Save updated team
      await this.teamRepository.save(team);

      // Publish domain events
      team.getUncommittedEvents().forEach(event => {
        this.eventBus.publish(event);
      });
      team.markEventsAsCommitted();

      this.logger.log(
        `Player removed successfully from team: ${command.teamId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove player from team: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
