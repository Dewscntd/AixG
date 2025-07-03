import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../prisma/prisma.module';
import { EventStoreModule } from '../common/event-store/event-store.module';
import { TeamController } from './api/team.controller';
import { TeamApplicationService } from './application/team-application.service';
import { TeamRepository } from './infrastructure/repositories/team.repository';
import { PlayerRepository } from './infrastructure/repositories/player.repository';

// Command Handlers
import { CreateTeamHandler } from './application/commands/create-team.handler';
import { UpdateTeamHandler } from './application/commands/update-team.handler';
import { DeleteTeamHandler } from './application/commands/delete-team.handler';
import { AddPlayerToTeamHandler } from './application/commands/add-player-to-team.handler';
import { RemovePlayerFromTeamHandler } from './application/commands/remove-player-from-team.handler';

// Query Handlers
import { GetTeamHandler } from './application/queries/get-team.handler';
import { GetTeamsHandler } from './application/queries/get-teams.handler';
import { GetTeamPlayersHandler } from './application/queries/get-team-players.handler';
import { GetTeamMatchesHandler } from './application/queries/get-team-matches.handler';

// Domain Services
import { TeamDomainService } from './domain/services/team-domain.service';
import { TeamValidationService } from './domain/services/team-validation.service';

// Event Handlers
import { TeamCreatedHandler } from './application/events/team-created.handler';
import { TeamUpdatedHandler } from './application/events/team-updated.handler';
import { PlayerAddedToTeamHandler } from './application/events/player-added-to-team.handler';

const CommandHandlers = [
  CreateTeamHandler,
  UpdateTeamHandler,
  DeleteTeamHandler,
  AddPlayerToTeamHandler,
  RemovePlayerFromTeamHandler,
];

const QueryHandlers = [
  GetTeamHandler,
  GetTeamsHandler,
  GetTeamPlayersHandler,
  GetTeamMatchesHandler,
];

const EventHandlers = [
  TeamCreatedHandler,
  TeamUpdatedHandler,
  PlayerAddedToTeamHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule, EventStoreModule],
  controllers: [TeamController],
  providers: [
    TeamApplicationService,
    TeamRepository,
    PlayerRepository,
    TeamDomainService,
    TeamValidationService,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [TeamApplicationService, TeamRepository, PlayerRepository],
})
export class TeamManagementModule {}
