/**
 * Cache Directive
 *
 * GraphQL directive for field-level caching with Redis
 * Implements composition pattern for flexible caching strategies
 */

import { Injectable, Logger } from '@nestjs/common';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import {
  GraphQLField,
  GraphQLObjectType,
  defaultFieldResolver,
  GraphQLResolveInfo,
} from 'graphql';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { GraphQLContext } from '../types/context';

export interface GraphQLResolverArgs {
  [key: string]: unknown;
}

export interface GraphQLResolverSource {
  [key: string]: unknown;
  teamId?: string;
  team?: { id: string };
}
import { MetricsService } from '../services/metrics.service';

export interface CacheDirectiveArgs {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key template
  tags?: string[]; // Cache tags for invalidation
  scope?: 'public' | 'private' | 'team'; // Cache scope
  invalidateOn?: string[]; // Events that invalidate this cache
}

@Injectable()
export class CacheDirective extends SchemaDirectiveVisitor {
  private readonly logger = new Logger(CacheDirective.name);
  private readonly redis: Redis;
  private readonly defaultTtl: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService
  ) {
    super();
    const redisUrl = this.configService.get<string>('redisUrl');
    if (!redisUrl) {
      throw new Error('Redis URL is not configured');
    }
    this.redis = new Redis(redisUrl);
    this.defaultTtl = this.configService.get<number>('cacheDefaultTtl', 300); // 5 minutes
  }

  visitFieldDefinition(
    field: GraphQLField<unknown, GraphQLContext>,
    _details: { objectType: GraphQLObjectType }
  ) {
    const { resolve = defaultFieldResolver } = field;
    const directiveArgs = this.args as CacheDirectiveArgs;

    field.resolve = async function (
      source: unknown,
      args: unknown,
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) {
      const startTime = Date.now();

      try {
        // Generate cache key
        const cacheKey = this.generateCacheKey(
          source,
          args,
          context,
          info,
          directiveArgs
        );

        // Try to get from cache
        const cached = await this.getFromCache(cacheKey);
        if (cached !== null) {
          // Record cache hit
          this.metricsService.recordCacheOperation({
            operation: 'hit',
            key: cacheKey,
            duration: Date.now() - startTime,
            timestamp: new Date(),
          });

          this.logger.debug('Cache hit', {
            key: cacheKey,
            field: info.fieldName,
            correlationId: context.correlationId,
          });

          return cached;
        }

        // Record cache miss
        this.metricsService.recordCacheOperation({
          operation: 'miss',
          key: cacheKey,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        });

        // Execute resolver
        const result = await resolve.call(this, source, args, context, info);

        // Cache the result
        await this.setInCache(cacheKey, result, directiveArgs);

        this.logger.debug('Cache miss - result cached', {
          key: cacheKey,
          field: info.fieldName,
          ttl: directiveArgs.ttl || this.defaultTtl,
          correlationId: context.correlationId,
        });

        return result;
      } catch (error) {
        this.logger.error('Cache directive error', {
          error: error.message,
          field: info.fieldName,
          correlationId: context.correlationId,
        });

        // If caching fails, still execute the resolver
        return resolve.call(this, source, args, context, info);
      }
    }.bind(this);
  }

  /**
   * Generates a cache key based on the directive configuration
   */
  private generateCacheKey(
    source: unknown,
    args: unknown,
    context: GraphQLContext,
    info: GraphQLResolveInfo,
    directiveArgs: CacheDirectiveArgs
  ): string {
    const field = `${info.parentType.name}.${info.fieldName}`;

    // Use custom key template if provided
    if (directiveArgs.key) {
      return this.interpolateKeyTemplate(
        directiveArgs.key,
        source,
        args,
        context
      );
    }

    // Generate key based on scope
    switch (directiveArgs.scope) {
      case 'private':
        return `cache:private:${context.user?.id}:${field}:${this.hashArgs(
          args
        )}`;

      case 'team': {
        const teamId = context.user?.teamId || this.extractTeamId(source, args);
        return `cache:team:${teamId}:${field}:${this.hashArgs(args)}`;
      }

      case 'public':
      default:
        return `cache:public:${field}:${this.hashArgs(args)}`;
    }
  }

  /**
   * Interpolates variables in cache key template
   */
  private interpolateKeyTemplate(
    template: string,
    source: unknown,
    args: unknown,
    context: GraphQLContext
  ): string {
    const argsObj = args as Record<string, unknown>;
    const sourceObj = source as Record<string, unknown>;

    return template
      .replace(/\{userId\}/g, context.user?.id || 'anonymous')
      .replace(/\{teamId\}/g, context.user?.teamId || 'none')
      .replace(/\{args\.(\w+)\}/g, (match, argName) =>
        String(argsObj[argName] || 'null')
      )
      .replace(/\{source\.(\w+)\}/g, (match, fieldName) =>
        String(sourceObj?.[fieldName] || 'null')
      );
  }

  /**
   * Creates a hash of the arguments for cache key uniqueness
   */
  private hashArgs(args: unknown): string {
    if (!args || Object.keys(args).length === 0) {
      return 'no-args';
    }

    // Simple hash implementation - in production, use a proper hash function
    const argsString = JSON.stringify(args, Object.keys(args).sort());
    let hash = 0;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Retrieves value from cache
   */
  private async getFromCache(key: string): Promise<unknown> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn(`Failed to get from cache: ${key}`, error);
      return null;
    }
  }

  /**
   * Stores value in cache
   */
  private async setInCache(
    key: string,
    value: unknown,
    directiveArgs: CacheDirectiveArgs
  ): Promise<void> {
    try {
      const ttl = directiveArgs.ttl || this.defaultTtl;
      const serialized = JSON.stringify(value);

      await this.redis.setex(key, ttl, serialized);

      // Store cache tags for invalidation
      if (directiveArgs.tags && directiveArgs.tags.length > 0) {
        await this.storeCacheTags(key, directiveArgs.tags, ttl);
      }

      // Record cache set operation
      this.metricsService.recordCacheOperation({
        operation: 'set',
        key,
        size: serialized.length,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to set cache: ${key}`, error);
    }
  }

  /**
   * Stores cache tags for invalidation purposes
   */
  private async storeCacheTags(
    key: string,
    tags: string[],
    ttl: number
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const tag of tags) {
        const tagKey = `cache_tag:${tag}`;
        pipeline.sadd(tagKey, key);
        pipeline.expire(tagKey, ttl + 60); // Expire tags slightly later than cache
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Failed to store cache tags for key: ${key}`, error);
    }
  }

  /**
   * Invalidates cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `cache_tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          await this.redis.del(...keys);
          await this.redis.del(tagKey);

          this.logger.debug(
            `Invalidated ${keys.length} cache entries for tag: ${tag}`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache by tags: ${tags.join(', ')}`,
        error
      );
    }
  }

  /**
   * Extracts team ID from source or args
   */
  private extractTeamId(source: unknown, args: unknown): string {
    const argsObj = args as Record<string, unknown>;
    const sourceObj = source as Record<string, unknown>;
    const teamObj = sourceObj?.team as Record<string, unknown>;

    return String(
      argsObj.teamId || sourceObj?.teamId || teamObj?.id || 'unknown'
    );
  }
}

/**
 * Schema directive definition for GraphQL schema
 */
export const cacheDirectiveTypeDefs = `
  enum CacheScope {
    PUBLIC
    PRIVATE
    TEAM
  }

  directive @cache(
    ttl: Int
    key: String
    tags: [String!]
    scope: CacheScope = PUBLIC
    invalidateOn: [String!]
  ) on FIELD_DEFINITION
`;

/**
 * Factory function to create cache directive transformer
 */
export function createCacheDirective(
  configService: ConfigService,
  metricsService: MetricsService
) {
  return class extends CacheDirective {
    constructor() {
      super(configService, metricsService);
    }
  };
}
