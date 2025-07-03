import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeleteTeamCommand } from './delete-team.command';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';

@CommandHandler(DeleteTeamCommand)
@Injectable()
export class DeleteTeamHandler implements ICommandHandler<DeleteTeamCommand> {
  private readonly logger = new Logger(DeleteTeamHandler.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: DeleteTeamCommand): Promise<void> {
    this.logger.log(`Deleting team: ${command.teamId}`);

    try {
      // Find existing team
      const team = await this.teamRepository.findById(command.teamId);
      if (!team) {
        throw new NotFoundException(`Team with ID ${command.teamId} not found`);
      }

      // Mark team for deletion
      team.delete();

      // Delete from repository
      await this.teamRepository.delete(command.teamId);

      // Publish domain events
      team.getUncommittedEvents().forEach(event => {
        this.eventBus.publish(event);
      });
      team.markEventsAsCommitted();

      this.logger.log(`Team deleted successfully: ${command.teamId}`);
    } catch (error) {
      this.logger.error(`Failed to delete team: ${error.message}`, error.stack);
      throw error;
    }
  }
}
