/**
 * AI Coaching Presentation Module
 * Module configuration for GraphQL and REST API presentation layer
 */

import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'path';

// Application layer
import { RealTimeCoachingService } from '../application/services/real-time-coaching.service';

// Infrastructure layer
import { CoachingWebSocketGateway } from '../infrastructure/gateways/coaching-websocket.gateway';

// Presentation layer
import { AICoachingResolver } from './graphql/ai-coaching.resolver';
import { AICoachingController } from './controllers/ai-coaching.controller';

@Module({
  imports: [
    // GraphQL configuration
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/ai-coaching/presentation/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      subscriptions: {
        'graphql-ws': true,
        'subscriptions-transport-ws': true,
      },
      context: ({ req, connection }) => {
        // For HTTP requests
        if (req) {
          return {
            req,
            user: req.user, // Assuming authentication middleware sets this
            headers: req.headers
          };
        }
        // For WebSocket connections (subscriptions)
        if (connection) {
          return {
            req: connection.context,
            user: connection.context.user,
            headers: connection.context.headers
          };
        }
      },
      formatError: (error) => {
        console.error('GraphQL Error:', error);
        return {
          message: error.message,
          code: error.extensions?.code || 'INTERNAL_ERROR',
          timestamp: new Date().toISOString(),
          path: error.path
        };
      }
    }),

    // Event system for real-time updates
    EventEmitterModule.forRoot({
      // Use this instance across the application
      global: true,
      // Set this to `true` to use wildcards
      wildcard: false,
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
    })
  ],
  controllers: [
    AICoachingController
  ],
  providers: [
    // Application services
    RealTimeCoachingService,
    
    // GraphQL resolvers
    AICoachingResolver,
    
    // WebSocket gateways
    CoachingWebSocketGateway
  ],
  exports: [
    RealTimeCoachingService,
    AICoachingResolver,
    CoachingWebSocketGateway
  ]
})
export class AICoachingPresentationModule {}