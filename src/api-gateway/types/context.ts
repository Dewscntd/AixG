/**
 * GraphQL Context Types
 *
 * Defines the context object passed to all GraphQL resolvers
 */

import { Request } from 'express';
import Redis from 'ioredis';
import { DataSources } from './datasources';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly roles: string[];
  readonly permissions: string[];
  readonly teamId?: string;
  readonly isActive: boolean;
  readonly lastLoginAt?: Date;
}

export interface GraphQLContext {
  // HTTP Request (for HTTP operations)
  req?: Request | undefined;

  // Authenticated user
  user?: User | undefined;

  // Correlation ID for tracing
  correlationId: string;

  // Data sources for efficient data loading
  dataSources: DataSources;

  // Redis client for caching and pub/sub
  redis: Redis;

  // Request start time for performance tracking
  startTime?: number | undefined;

  // Additional metadata
  metadata?: GraphQLMetadata | undefined;
}

export interface GraphQLMetadata {
  queryComplexity?: number;
  queryDepth?: number;
  operationName?: string;
  operationType?: 'query' | 'mutation' | 'subscription';
  variables?: Record<string, unknown>;
  cacheKey?: string;
  cacheTTL?: number;
  rateLimitInfo?: RateLimitInfo;
  performanceMetrics?: PerformanceMetrics;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  windowMs: number;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface AuthenticationContext {
  user?: User;
  token?: string;
  isAuthenticated: boolean;
}

export interface AuthorizationContext {
  user?: User;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  resourceId?: string;
  action?: string;
}

export interface CacheContext {
  key: string;
  ttl?: number;
  tags?: string[];
  invalidateOn?: string[];
}

export interface MetricsContext {
  operationName?: string;
  operationType?: 'query' | 'mutation' | 'subscription';
  complexity?: number;
  depth?: number;
  startTime: number;
  variables?: Record<string, unknown>;
}
