/**
 * Main module for Analytics Engine Service
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { Pool } from 'pg';

// Application Services
import { AnalyticsApplicationService } from './application/analytics-application.service';

// Infrastructure
import { TimescaleDBEventStore } from './infrastructure/event-store/timescaledb-event-store';
import { EventStore } from './infrastructure/event-store/event-store.interface';

// API
import { AnalyticsController } from './api/analytics.controller';

// Configuration
const configuration = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  eventStoreUrl: process.env.EVENT_STORE_URL || 'postgresql://localhost:5432/analytics_events',
  readDbUrl: process.env.READ_DB_URL || 'postgresql://localhost:5432/analytics_read',
  
  // Event Store Configuration
  snapshotFrequency: parseInt(process.env.SNAPSHOT_FREQUENCY || '100', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),
  
  // GraphQL Configuration
  graphqlPlayground: process.env.GRAPHQL_PLAYGROUND === 'true' || process.env.NODE_ENV !== 'production',
  graphqlIntrospection: process.env.GRAPHQL_INTROSPECTION === 'true' || process.env.NODE_ENV !== 'production',
  
  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // ML Pipeline Integration
  mlPipelineServiceUrl: process.env.ML_PIPELINE_SERVICE_URL || 'http://localhost:8000',
  
  // Pulsar Configuration
  pulsarUrl: process.env.PULSAR_URL || 'pulsar://localhost:6650',
  
  // Redis Configuration
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
});

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    
    // GraphQL
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: configService.get<boolean>('graphqlPlayground'),
        introspection: configService.get<boolean>('graphqlIntrospection'),
        context: ({ req, connection }: any) => connection ? { req: connection.context } : { req },
        subscriptions: {
          'graphql-ws': {
            path: '/graphql',
          },
          'subscriptions-transport-ws': {
            path: '/graphql',
          },
        },
        formatError: (error: any) =>
          // GraphQL Error logging handled by NestJS Logger
           ({
            message: error.message,
            code: error.extensions?.code,
            path: error.path,
            timestamp: new Date().toISOString(),
          })
        ,
        formatResponse: (response: any, { request }: any) => {
          // Add request timing
          if (request.http) {
            response.extensions = {
              ...response.extensions,
              timestamp: new Date().toISOString(),
            };
          }
          return response;
        },
      }),
      inject: [ConfigService],
    }),
  ],
  
  controllers: [AnalyticsController],
  
  providers: [
    // Event Store
    {
      provide: 'EVENT_STORE',
      useFactory: (configService: ConfigService): EventStore => new TimescaleDBEventStore({
          connectionString: configService.get<string>('eventStoreUrl') || 'postgresql://localhost:5432/footanalytics',
          maxRetries: configService.get<number>('maxRetries'),
          retryDelay: configService.get<number>('retryDelay'),
          snapshotFrequency: configService.get<number>('snapshotFrequency'),
        }),
      inject: [ConfigService],
    },
    
    // Read Database Pool
    {
      provide: 'READ_DB_POOL',
      useFactory: (configService: ConfigService): Pool => new Pool({
          connectionString: configService.get<string>('readDbUrl'),
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        }),
      inject: [ConfigService],
    },
    
    // Application Service
    {
      provide: AnalyticsApplicationService,
      useFactory: (eventStore: EventStore, readDbPool: Pool) => new AnalyticsApplicationService(eventStore, readDbPool),
      inject: ['EVENT_STORE', 'READ_DB_POOL'],
    },
  ],
  
  exports: [AnalyticsApplicationService],
})
export class AnalyticsModule {
  constructor(
    private readonly analyticsService: AnalyticsApplicationService,
    private readonly configService: ConfigService
  ) {
    this.initializeService();
  }
  
  private async initializeService(): Promise<void> {
    const logger = new (await import('@nestjs/common')).Logger('AnalyticsModule');
    
    try {
      // Start projections
      await this.analyticsService.startProjections();
      logger.log('✅ Projections started successfully');
      
      // Health check
      const health = await this.analyticsService.healthCheck();
      logger.log(`📊 Health Check - Event Store: ${health.eventStore ? '✅' : '❌'}`);
      logger.log(`📊 Health Check - Read DB: ${health.readDatabase ? '✅' : '❌'}`);
      logger.log(`📊 Health Check - Projections: ${health.projections ? '✅' : '❌'}`);
      
      if (!health.eventStore || !health.readDatabase) {
        logger.warn('⚠️  Some components are not healthy - service may not function correctly');
      }
      
    } catch (error) {
      logger.error('❌ Failed to initialize Analytics Service:', error);
      throw error;
    }
  }
  
  async onModuleDestroy(): Promise<void> {
    const logger = new (await import('@nestjs/common')).Logger('AnalyticsModule');
    
    try {
      await this.analyticsService.close();
      logger.log('✅ Analytics Service closed gracefully');
    } catch (error) {
      logger.error('❌ Error during service shutdown:', error);
    }
  }
}
