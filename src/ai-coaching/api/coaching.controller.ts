
import { Controller, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { StartCoachingSessionCommand } from '../application/commands/start-coaching-session.command';

@Controller('ai-coaching')
export class CoachingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('session')
  async startCoachingSession(@Body() body: any) {
    const { userId, query, language, taskType, context, preferences } = body;
    return this.commandBus.execute(
      new StartCoachingSessionCommand(
        userId,
        query,
        language,
        taskType,
        context,
        preferences,
      ),
    );
  }
}
