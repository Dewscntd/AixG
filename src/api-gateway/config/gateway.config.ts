/**
 * Gateway Configuration
 *
 * Centralized configuration for the API Gateway with environment-based settings
 */

import { registerAs } from '@nestjs/config';

export const gatewayConfiguration = registerAs('gateway', () => ({
  // Server Configuration
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // GraphQL Configuration
  graphqlPlayground:
    process.env.GRAPHQL_PLAYGROUND === 'true' ||
    process.env.NODE_ENV !== 'production',
  graphqlIntrospection:
    process.env.GRAPHQL_INTROSPECTION === 'true' ||
    process.env.NODE_ENV !== 'production',

  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Redis Configuration
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Authentication Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Rate Limiting Configuration
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),

  // Cache Configuration
  cacheDefaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10), // 5 minutes
  cacheMaxTtl: parseInt(process.env.CACHE_MAX_TTL || '3600', 10), // 1 hour

  // Subgraph Service URLs
  analyticsServiceUrl:
    process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3000/graphql',
  videoIngestionServiceUrl:
    process.env.VIDEO_INGESTION_SERVICE_URL || 'http://localhost:3001/graphql',
  mlPipelineServiceUrl:
    process.env.ML_PIPELINE_SERVICE_URL || 'http://localhost:8000/graphql',
  teamManagementServiceUrl:
    process.env.TEAM_MANAGEMENT_SERVICE_URL || 'http://localhost:3002/graphql',

  // Monitoring Configuration
  metricsEnabled:
    process.env.METRICS_ENABLED === 'true' ||
    process.env.NODE_ENV === 'production',
  tracingEnabled:
    process.env.TRACING_ENABLED === 'true' ||
    process.env.NODE_ENV === 'production',

  // Apollo Studio Configuration (Production)
  apolloKey: process.env.APOLLO_KEY,
  apolloGraphRef: process.env.APOLLO_GRAPH_REF,

  // Security Configuration
  helmetEnabled:
    process.env.HELMET_ENABLED === 'true' ||
    process.env.NODE_ENV === 'production',
  compressionEnabled:
    process.env.COMPRESSION_ENABLED === 'true' ||
    process.env.NODE_ENV === 'production',

  // Query Complexity Configuration
  maxQueryComplexity: parseInt(process.env.MAX_QUERY_COMPLEXITY || '1000', 10),
  maxQueryDepth: parseInt(process.env.MAX_QUERY_DEPTH || '15', 10),

  // File Upload Configuration
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
  allowedFileTypes: (
    process.env.ALLOWED_FILE_TYPES || 'video/mp4,video/avi,video/mov'
  ).split(','),

  // WebSocket Configuration
  websocketPath: process.env.WEBSOCKET_PATH || '/graphql',
  websocketKeepAlive: parseInt(process.env.WEBSOCKET_KEEP_ALIVE || '30000', 10), // 30 seconds

  // Health Check Configuration
  healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
  healthCheckInterval: parseInt(
    process.env.HEALTH_CHECK_INTERVAL || '30000',
    10
  ), // 30 seconds

  // Logging Configuration
  logLevel: process.env.LOG_LEVEL || 'info',
  logFormat: process.env.LOG_FORMAT || 'json',

  // Feature Flags
  features: {
    subscriptions: process.env.FEATURE_SUBSCRIPTIONS === 'true' || true,
    fileUploads: process.env.FEATURE_FILE_UPLOADS === 'true' || true,
    caching: process.env.FEATURE_CACHING === 'true' || true,
    rateLimiting: process.env.FEATURE_RATE_LIMITING === 'true' || true,
    authentication: process.env.FEATURE_AUTHENTICATION === 'true' || true,
    authorization: process.env.FEATURE_AUTHORIZATION === 'true' || true,
    metrics: process.env.FEATURE_METRICS === 'true' || true,
    tracing: process.env.FEATURE_TRACING === 'true' || true,
  },
}));
