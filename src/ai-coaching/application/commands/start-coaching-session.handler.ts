
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StartCoachingSessionCommand } from './start-coaching-session.command';
import { LLMOrchestrationService } from '../../infrastructure/llm/llm-orchestration-service';

@CommandHandler(StartCoachingSessionCommand)
export class StartCoachingSessionHandler
  implements ICommandHandler<StartCoachingSessionCommand>
{
  constructor(private readonly llmOrchestrationService: LLMOrchestrationService) {}

  async execute(command: StartCoachingSessionCommand): Promise<any> {
    const { userId, query, language, taskType, context, preferences } = command;

    const request = {
      query,
      language,
      taskType,
      context: { ...context, userId },
      preferences,
    };

    return this.llmOrchestrationService.processCoachingQuery(request);
  }
}
