import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { CreateTeamCommand } from './create-team.command';
import { TeamAggregate } from '../../domain/entities/team.aggregate';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { TeamValidationService } from '../../domain/services/team-validation.service';

@CommandHandler(CreateTeamCommand)
@Injectable()
export class CreateTeamHandler implements ICommandHandler<CreateTeamCommand> {
  private readonly logger = new Logger(CreateTeamHandler.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly teamValidationService: TeamValidationService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateTeamCommand): Promise<{ teamId: string }> {
    this.logger.log(`Creating team: ${command.name}`);

    try {
      // Validate team data
      await this.teamValidationService.validateTeamCreation(command);

      // Check if team name already exists
      const existingTeam = await this.teamRepository.findByName(command.name);
      if (existingTeam) {
        throw new Error(`Team with name '${command.name}' already exists`);
      }

      // Create team aggregate
      const team = TeamAggregate.create(
        command.name,
        command.shortName,
        command.logo,
        command.colors,
        command.stadium,
        command.foundedYear,
        command.website,
        command.socialMedia
      );

      // Save team
      await this.teamRepository.save(team);

      // Publish domain events
      team.getUncommittedEvents().forEach(event => {
        this.eventBus.publish(event);
      });
      team.markEventsAsCommitted();

      this.logger.log(`Team created successfully: ${team.id.value}`);

      return { teamId: team.id.value };
    } catch (error) {
      this.logger.error(`Failed to create team: ${error.message}`, error.stack);
      throw error;
    }
  }
}
