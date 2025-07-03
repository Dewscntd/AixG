import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UpdateTeamCommand } from './update-team.command';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { TeamValidationService } from '../../domain/services/team-validation.service';

@CommandHandler(UpdateTeamCommand)
@Injectable()
export class UpdateTeamHandler implements ICommandHandler<UpdateTeamCommand> {
  private readonly logger = new Logger(UpdateTeamHandler.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly teamValidationService: TeamValidationService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: UpdateTeamCommand): Promise<void> {
    this.logger.log(`Updating team: ${command.teamId}`);

    try {
      // Find existing team
      const team = await this.teamRepository.findById(command.teamId);
      if (!team) {
        throw new NotFoundException(`Team with ID ${command.teamId} not found`);
      }

      // Update team
      team.update(command.updateData);

      // Save updated team
      await this.teamRepository.save(team);

      // Publish domain events
      team.getUncommittedEvents().forEach(event => {
        this.eventBus.publish(event);
      });
      team.markEventsAsCommitted();

      this.logger.log(`Team updated successfully: ${command.teamId}`);
    } catch (error) {
      this.logger.error(`Failed to update team: ${error.message}`, error.stack);
      throw error;
    }
  }
}
