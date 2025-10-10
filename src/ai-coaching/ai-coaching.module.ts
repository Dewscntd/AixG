
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CoachingController } from './api/coaching.controller';
import { CoachingResolver } from './api/resolvers/coaching.resolver';
import { StartCoachingSessionHandler } from './application/commands/start-coaching-session.handler';
import { GetCoachingSessionHandler } from './application/queries/get-coaching-session.handler';
import { LLMOrchestrationService } from './infrastructure/llm/llm-orchestration-service';
import { VectorDatabaseService } from './infrastructure/vector-database/vector-database-service';
import { EnhancedTacticalKnowledgeBase } from './domain/services/enhanced-tactical-knowledge-base';
import { PlayerPerformanceAnalyzer } from './domain/services/player-performance-analyzer';

// Mock providers for dependencies that are not yet implemented
const mockVectorDatabaseServiceProvider = {
  provide: VectorDatabaseService,
  useValue: {},
};
const mockKnowledgeBaseProvider = {
  provide: EnhancedTacticalKnowledgeBase,
  useValue: {},
};
const mockPerformanceAnalyzerProvider = {
  provide: PlayerPerformanceAnalyzer,
  useValue: {},
};

@Module({
  imports: [CqrsModule],
  controllers: [CoachingController],
  providers: [
    CoachingResolver,
    StartCoachingSessionHandler,
    GetCoachingSessionHandler,
    LLMOrchestrationService,
    mockVectorDatabaseServiceProvider,
    mockKnowledgeBaseProvider,
    mockPerformanceAnalyzerProvider,
  ],
})
export class AiCoachingModule {}
