
import { Module } from '@nestjs/common';
import { CoachingController } from './api/coaching.controller';
import { CoachingResolver } from './api/resolvers/coaching.resolver';

@Module({
  controllers: [CoachingController],
  providers: [CoachingResolver],
})
export class AiCoachingModule {}
