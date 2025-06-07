import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { RealTimeAnalysisController } from './controllers/real-time-analysis.controller';

// Gateways
import { RealTimeAnalysisGateway } from './gateways/real-time-analysis.gateway';

// Services
import { RealTimeAnalysisService } from './application/services/real-time-analysis.service';
import { EventStreamService } from './infrastructure/events/event-stream.service';

// Configuration
import configuration from './config/configuration';

/**
 * Real-time Analysis Module
 * Main module for the real-time video analysis service
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Event Emitter for domain events
    EventEmitterModule.forRoot({
      // Use this instance across the whole app
      global: true,
      // Set this to `true` to use wildcards
      wildcard: true,
      // The delimiter used to segment namespaces
      delimiter: '.',
      // Set this to `true` if you want to emit the newListener event
      newListener: false,
      // Set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // The maximum amount of listeners that can be assigned to an event
      maxListeners: 20,
      // Show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // Disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
  ],

  controllers: [
    RealTimeAnalysisController,
  ],

  providers: [
    // Application Services
    RealTimeAnalysisService,
    
    // Infrastructure Services
    EventStreamService,
    
    // WebSocket Gateways
    RealTimeAnalysisGateway,
  ],

  exports: [
    RealTimeAnalysisService,
    EventStreamService,
  ],
})
export class RealTimeAnalysisModule {}
