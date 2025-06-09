/**
 * Global Type Declarations for FootAnalytics Platform
 */

// Environment Variables
declare namespace NodeJS {
  interface ProcessEnv {
    // Application
    NODE_ENV: 'development' | 'production' | 'test' | 'staging';
    PORT: string;
    LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    
    // Database
    DATABASE_URL: string;
    TEST_DATABASE_URL?: string;
    REDIS_URL: string;
    TEST_REDIS_URL?: string;
    
    // Authentication & Security
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    ENCRYPTION_KEY: string;
    
    // External Services
    ML_PIPELINE_SERVICE_URL: string;
    ANALYTICS_SERVICE_URL: string;
    VIDEO_INGESTION_SERVICE_URL: string;
    REAL_TIME_ANALYSIS_SERVICE_URL: string;
    
    // Message Broker
    PULSAR_URL: string;
    KAFKA_BROKERS?: string;
    
    // Storage
    AWS_S3_BUCKET: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_REGION?: string;
    
    // GraphQL & API
    GRAPHQL_PLAYGROUND: string;
    GRAPHQL_INTROSPECTION: string;
    CORS_ORIGIN: string;
    MAX_QUERY_COMPLEXITY: string;
    MAX_QUERY_DEPTH: string;
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: string;
    RATE_LIMIT_MAX: string;
    
    // Caching
    CACHE_DEFAULT_TTL: string;
    CACHE_MAX_TTL: string;
    
    // Monitoring & Observability
    APOLLO_KEY?: string;
    APOLLO_GRAPH_REF?: string;
    METRICS_ENABLED: string;
    TRACING_ENABLED: string;
    
    // Feature Flags
    USE_IN_MEMORY_REPOSITORY?: string;
    DISABLE_EXTERNAL_SERVICES?: string;
    MOCK_EXTERNAL_APIS?: string;
    MOCK_ML_PIPELINE?: string;
    MOCK_MESSAGE_BROKER?: string;
    MOCK_S3_STORAGE?: string;
    
    // Test Configuration
    INIT_TEST_DB?: string;
    CLEANUP_TEST_DB?: string;
    INIT_TEST_REDIS?: string;
    CLEANUP_TEST_REDIS?: string;
    USE_TEST_CONTAINERS?: string;
    CLEANUP_TEMP_FILES?: string;
    MAX_WORKERS?: string;
    JEST_TIMEOUT?: string;
  }
}

// Global Utility Types
declare global {
  // Common ID types
  type EntityId = string;
  type UserId = string;
  type TeamId = string;
  type MatchId = string;
  type VideoId = string;
  type PlayerId = string;
  
  // Timestamp types
  type Timestamp = Date | string | number;
  type ISO8601String = string;
  
  // Generic response wrapper
  interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: Timestamp;
  }
  
  // Pagination
  interface PaginationInput {
    page?: number;
    limit?: number;
    offset?: number;
  }
  
  interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }
  
  // Common domain interfaces
  interface BaseEntity {
    id: EntityId;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
  
  interface DomainEvent {
    id: string;
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    eventData: Record<string, any>;
    eventVersion: number;
    occurredAt: Timestamp;
    metadata?: Record<string, any> | undefined;
  }
  
  // Health Check
  interface HealthCheck {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: Timestamp;
    services: Record<string, boolean>;
    details?: Record<string, any>;
  }
  
  // Error types
  interface DomainError extends Error {
    code: string;
    statusCode?: number;
    details?: Record<string, any>;
  }
  
  // Test utilities
  interface TestContext {
    startTime: number;
    testName: string;
    cleanup: Array<() => Promise<void> | void>;
  }
}

// Module augmentations for better typing
declare module 'express' {
  interface Request {
    user?: {
      id: UserId;
      email: string;
      roles: string[];
    };
    correlationId?: string;
    startTime?: number;
  }
}

declare module 'graphql' {
  interface GraphQLResolveInfo {
    correlationId?: string;
  }
}

// Export empty object to make this a module
export {};
