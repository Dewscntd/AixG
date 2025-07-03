/**
 * API Gateway Service Barrel Exports
 * Provides centralized access to API gateway components
 */

// Main Module
export { ApiGatewayModule } from './api-gateway.module';

// Configuration
export * from './config/gateway.config';

// Filters
export { GraphQLExceptionFilter } from './filters/graphql-exception.filter';

// Interceptors
export { LoggingInterceptor } from './interceptors/logging.interceptor';
export { PerformanceInterceptor } from './interceptors/performance.interceptor';

// Types & Context
export * from './types/context';

// Directives
export { AuthDirective } from './directives/auth.directive';
export { RateLimitDirective } from './directives/rate-limit.directive';
export { CacheDirective } from './directives/cache.directive';

// Services
export { DataLoaderService } from './services/dataloader.service';
export { AuthService } from './services/auth.service';
export { MetricsService } from './services/metrics.service';
export { SubscriptionService } from './services/subscription.service';

// Plugins
export { ComplexityPlugin } from './plugins/complexity.plugin';
export { AuthenticationPlugin } from './plugins/authentication.plugin';
export { DataLoaderPlugin } from './plugins/dataloader.plugin';
export { MetricsPlugin } from './plugins/metrics.plugin';

// Resolvers
export { GatewayResolver } from './resolvers/gateway.resolver';

// Types - Explicit exports to avoid conflicts
export type {
  // Auth types
  User as AuthUser,
  AuthContext,
  UserRole,
  Permission,
  AuthDirectiveArgs,
  AuthenticationError,
  AuthErrorCode,
} from './types/auth.types';

export type {
  // DataSource types
  DataSources,
  Match,
  Video,
  Team,
  Player,
  MatchAnalytics,
  MatchEvent,
  MatchEventMetadata,
  BatchLoadFn,
  CacheKeyGenerators,
} from './types/datasources';

export type {} from // Domain types (if they exist)
// These will be added when domain.types.ts is properly structured
'./types/domain.types';

// Schemas (GraphQL schema files)
// Note: These are .graphql files, not TypeScript exports
// They are imported by the GraphQL module loader
