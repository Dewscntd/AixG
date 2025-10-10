
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { StartCoachingSessionCommand } from '../../application/commands/start-coaching-session.command';
import { GetCoachingSessionQuery } from '../../application/queries/get-coaching-session.query';

@Resolver('Coaching')
export class CoachingResolver {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Query(() => String)
  async getCoachingSession(@Args('id') id: string) {
    return this.queryBus.execute(new GetCoachingSessionQuery(id));
  }

  @Mutation(() => String)
  async startCoachingSession(@Args('input') input: any, @Context() context: any) {
    const { query, language, taskType, context: commandContext, preferences } = input;
    const userId = context.req.user.id;
    return this.commandBus.execute(
      new StartCoachingSessionCommand(
        userId,
        query,
        language,
        taskType,
        commandContext,
        preferences,
      ),
    );
  }
}
