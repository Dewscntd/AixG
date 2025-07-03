import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { TeamUpdatedEvent } from '../../domain/events/team-updated.event';

@EventsHandler(TeamUpdatedEvent)
@Injectable()
export class TeamUpdatedHandler implements IEventHandler<TeamUpdatedEvent> {
  private readonly logger = new Logger(TeamUpdatedHandler.name);

  async handle(event: TeamUpdatedEvent): Promise<void> {
    this.logger.log(`Team updated event: ${event.teamId}`);

    try {
      // Handle team update side effects
      // For example: invalidate caches, update search indexes, etc.

      this.logger.log(`Team updated event processed: ${event.teamId}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle team updated event: ${error.message}`,
        error.stack
      );
    }
  }
}
