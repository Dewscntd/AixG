import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { EventStoreModule } from './shared/infrastructure/event-store/event-store.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.development',
        '.env.local',
        '.env',
      ],
      cache: true,
    }),

    // Event System
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // CQRS
    CqrsModule,

    // Infrastructure
    PrismaModule,
    EventStoreModule,

    // Health Check
    HealthModule,

    // Feature Modules (will be added as we fix them)
    // AICoachingModule,
    // TeamManagementModule,
    // VideoAnalysisModule,
    // RealTimeAnalysisModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor(private configService: ConfigService) {
    console.log('🎯 AixG Application Module initialized');
    console.log(`📍 Environment: ${this.configService.get('NODE_ENV', 'development')}`);
  }
}