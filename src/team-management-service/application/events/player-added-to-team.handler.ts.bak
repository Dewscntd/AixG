import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { PlayerAddedToTeamEvent } from '../../domain/events/player-added-to-team.event';

@EventsHandler(PlayerAddedToTeamEvent)
@Injectable()
export class PlayerAddedToTeamHandler
  implements IEventHandler<PlayerAddedToTeamEvent>
{
  private readonly logger = new Logger(PlayerAddedToTeamHandler.name);

  async handle(event: PlayerAddedToTeamEvent): Promise<void> {
    this.logger.log(
      `Player added to team event: ${event.playerId} -> ${event.teamId}`
    );

    try {
      // Handle player addition side effects
      // For example: update player statistics, send notifications, etc.

      this.logger.log(
        `Player added to team event processed: ${event.playerId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle player added to team event: ${error.message}`,
        error.stack
      );
    }
  }
}
