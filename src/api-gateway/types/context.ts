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
  req?: Request;
  
  // Authenticated user
  user?: User;
  
  // Correlation ID for tracing
  correlationId: string;
  
  // Data sources for efficient data loading
  dataSources: DataSources;
  
  // Redis client for caching and pub/sub
  redis: Redis;
  
  // Request start time for performance tracking
  startTime?: number;
  
  // Additional metadata
  metadata?: Record<string, any>;
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
  variables?: Record<string, any>;
}
