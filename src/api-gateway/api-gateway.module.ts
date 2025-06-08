/**
 * API Gateway Module - Apollo Federation Gateway Configuration
 * 
 * Implements Apollo Federation with comprehensive features:
 * - Federated schema composition
 * - DataLoader for N+1 prevention
 * - Real-time subscriptions
 * - Authorization and authentication
 * - Performance monitoring
 * - Error handling and logging
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource, GraphQLDataSourceProcessOptions } from '@apollo/gateway';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';
import { Request } from 'express';
import Redis from 'ioredis';

// Configuration
import { gatewayConfiguration } from './config/gateway.config';

// Services
import { AuthService } from './services/auth.service';
import { DataLoaderService } from './services/dataloader.service';
import { SubscriptionService } from './services/subscription.service';
import { MetricsService } from './services/metrics.service';

// Resolvers
import { GatewayResolver } from './resolvers/gateway.resolver';

// Plugins
import { AuthenticationPlugin } from './plugins/authentication.plugin';
import { DataLoaderPlugin } from './plugins/dataloader.plugin';
import { MetricsPlugin } from './plugins/metrics.plugin';
import { ComplexityPlugin } from './plugins/complexity.plugin';

// Directives
import { AuthDirective } from './directives/auth.directive';
import { RateLimitDirective } from './directives/rate-limit.directive';
import { CacheDirective } from './directives/cache.directive';

// Types
import { GraphQLContext } from './types/context';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [gatewayConfiguration],
      envFilePath: ['.env.local', '.env'],
    }),

    // GraphQL Gateway
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      useFactory: async (
        configService: ConfigService,
        authService: AuthService,
        dataLoaderService: DataLoaderService,
        metricsService: MetricsService
      ) => {
        // Redis client for caching and subscriptions
        const redis = new Redis(configService.get<string>('gateway.redisUrl') || 'redis://localhost:6379');

        // Subgraph configurations
        const subgraphs = [
          {
            name: 'analytics',
            url: configService.get<string>('gateway.analyticsServiceUrl') || 'http://localhost:3000/graphql',
          },
          {
            name: 'video-ingestion',
            url: configService.get<string>('gateway.videoIngestionServiceUrl') || 'http://localhost:3001/graphql',
          },
          {
            name: 'ml-pipeline',
            url: configService.get<string>('gateway.mlPipelineServiceUrl') || 'http://localhost:8000/graphql',
          },
          {
            name: 'team-management',
            url: configService.get<string>('gateway.teamManagementServiceUrl') || 'http://localhost:3002/graphql',
          },
        ];

        return {
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs,
            }),
            buildService: ({ url }: { url?: string }) => new RemoteGraphQLDataSource({
                url: url || '',
                willSendRequest({ request, context }: GraphQLDataSourceProcessOptions<GraphQLContext>) {
                  // Forward authentication headers
                  if (context.user && request.http) {
                    request.http.headers.set('x-user-id', context.user.id);
                    request.http.headers.set('x-user-roles', JSON.stringify(context.user.roles));
                  }

                  // Forward correlation ID for tracing
                  if (context.correlationId && request.http) {
                    request.http.headers.set('x-correlation-id', context.correlationId);
                  }
                },
              }),
          },
          server: {
            // Context creation
            context: async ({ req, connection }: { req?: Request; connection?: any }): Promise<GraphQLContext> => {
              if (connection) {
                // WebSocket connection context
                return {
                  ...connection.context,
                  dataSources: dataLoaderService.createDataSources(),
                  redis,
                  correlationId: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  startTime: Date.now(),
                };
              }

              // HTTP request context - ensure req is defined
              if (!req) {
                throw new Error('Request object is required for HTTP context');
              }

              const user = await authService.validateRequest(req);
              const correlationId = (req.headers['x-correlation-id'] as string) ||
                                  (req.headers['x-request-id'] as string) ||
                                  `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              return {
                req,
                user,
                correlationId,
                dataSources: dataLoaderService.createDataSources(),
                redis,
                startTime: Date.now(),
              };
            },

            // Plugins
            plugins: [
              // Landing page for development
              ApolloServerPluginLandingPageLocalDefault({ 
                embed: true,
                includeCookies: true 
              }),

              // Cache control
              ApolloServerPluginCacheControl({
                defaultMaxAge: 300, // 5 minutes
                calculateHttpHeaders: true,
              }),

              // Usage reporting (production only)
              ...(configService.get<string>('nodeEnv') === 'production' ? [
                ApolloServerPluginUsageReporting({
                  sendVariableValues: { none: true },
                  sendHeaders: { none: true },
                })
              ] : []),

              // Custom plugins
              new AuthenticationPlugin(authService),
              new DataLoaderPlugin(dataLoaderService),
              new MetricsPlugin(metricsService),
              new ComplexityPlugin({
                maximumComplexity: 1000,
                variables: {},
                createError: (max, actual) => new Error(`Query complexity ${actual} exceeds maximum ${max}`),
              }),
            ],

            // Subscriptions
            subscriptions: {
              'graphql-ws': {
                path: '/graphql',
                onConnect: async (connectionParams: any) => {
                  // Authenticate WebSocket connections
                  const token = connectionParams?.authorization || connectionParams?.Authorization;
                  if (token) {
                    const user = await authService.validateToken(token.replace('Bearer ', ''));
                    return { user };
                  }
                  return {};
                },
              },
            },

            // Error formatting
            formatError: (error: any) => {
              // Log error for monitoring
              const errorObj = new Error(error.message);
              metricsService.recordError(errorObj);

              // Return sanitized error in production
              if (configService.get<string>('gateway.nodeEnv') === 'production') {
                return {
                  message: error.message,
                  code: error.extensions?.code || 'INTERNAL_ERROR',
                  path: error.path || undefined,
                  timestamp: new Date().toISOString(),
                };
              }

              // Return full error in development
              return {
                message: error.message,
                code: error.extensions?.code,
                path: error.path || undefined,
                locations: error.locations,
                extensions: error.extensions,
                timestamp: new Date().toISOString(),
              };
            },

            // Response formatting
            formatResponse: (response: any, { request: _request, context }: { request: any; context: any }) => {
              // Add performance metrics
              if (context.startTime) {
                const duration = Date.now() - context.startTime;
                response.extensions = {
                  ...response.extensions,
                  tracing: {
                    duration,
                    correlationId: context.correlationId,
                  },
                };
              }

              return response;
            },

            // Introspection and playground
            introspection: configService.get<boolean>('graphqlIntrospection'),
            playground: configService.get<boolean>('graphqlPlayground'),
          },
        };
      },
      inject: [ConfigService, AuthService, DataLoaderService, MetricsService],
    }),
  ],
  providers: [
    // Services
    AuthService,
    DataLoaderService,
    SubscriptionService,
    MetricsService,

    // Resolvers
    GatewayResolver,

    // Directives
    AuthDirective,
    RateLimitDirective,
    CacheDirective,
  ],
})
export class ApiGatewayModule {}
