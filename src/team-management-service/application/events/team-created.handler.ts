import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { TeamCreatedEvent } from '../../domain/events/team-created.event';

@EventsHandler(TeamCreatedEvent)
@Injectable()
export class TeamCreatedHandler implements IEventHandler<TeamCreatedEvent> {
  private readonly logger = new Logger(TeamCreatedHandler.name);

  async handle(event: TeamCreatedEvent): Promise<void> {
    this.logger.log(`Team created event: ${event.teamId}`);

    try {
      // Handle team creation side effects
      // For example: send notifications, update analytics, etc.

      this.logger.log(`Team created event processed: ${event.teamId}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle team created event: ${error.message}`,
        error.stack
      );
    }
  }
}
