/**
 * Rate Limit Directive
 * 
 * GraphQL directive for field-level rate limiting
 * Implements composition pattern for flexible rate limiting strategies
 */

import { Injectable, Logger } from '@nestjs/common';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import { GraphQLField, GraphQLObjectType, defaultFieldResolver, GraphQLResolveInfo } from 'graphql';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { GraphQLContext } from '../types/context';

export interface RateLimitDirectiveArgs {
  max: number;
  window: number; // in seconds
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: 'user' | 'ip' | 'user_and_field' | 'ip_and_field';
}

@Injectable()
export class RateLimitDirective extends SchemaDirectiveVisitor {
  private readonly logger = new Logger(RateLimitDirective.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super();
    const redisUrl = this.configService.get<string>('redisUrl');
    if (!redisUrl) {
      throw new Error('Redis URL is not configured');
    }
    this.redis = new Redis(redisUrl);
  }

  visitFieldDefinition(field: GraphQLField<unknown, GraphQLContext>, _details: { objectType: GraphQLObjectType }) {
    const { resolve = defaultFieldResolver } = field;
    const directiveArgs = this.args as RateLimitDirectiveArgs;

    field.resolve = async function (source, args, context: GraphQLContext, info) {
      try {
        // Generate rate limit key
        const key = this.generateRateLimitKey(context, info, directiveArgs.keyGenerator);
        
        // Check rate limit
        const isAllowed = await this.checkRateLimit(
          key,
          directiveArgs.max,
          directiveArgs.window
        );

        if (!isAllowed) {
          const message = directiveArgs.message || 
            `Rate limit exceeded. Maximum ${directiveArgs.max} requests per ${directiveArgs.window} seconds.`;
          
          this.logger.warn('Rate limit exceeded', {
            key,
            max: directiveArgs.max,
            window: directiveArgs.window,
            field: info.fieldName,
            userId: context.user?.id,
            correlationId: context.correlationId,
          });

          throw new Error(message);
        }

        // Execute the resolver
        const result = await resolve.call(this, source, args, context, info);

        // Update rate limit counter (only for successful requests if configured)
        if (!directiveArgs.skipSuccessfulRequests) {
          await this.incrementRateLimit(key, directiveArgs.window);
        }

        return result;
      } catch (error) {
        // Update rate limit counter (only for failed requests if configured)
        if (!directiveArgs.skipFailedRequests) {
          const key = this.generateRateLimitKey(context, info, directiveArgs.keyGenerator);
          await this.incrementRateLimit(key, directiveArgs.window);
        }

        throw error;
      }
    }.bind(this);
  }

  /**
   * Generates a rate limit key based on the strategy
   */
  private generateRateLimitKey(
    context: GraphQLContext,
    info: GraphQLResolveInfo,
    keyGenerator: string = 'user'
  ): string {
    const field = `${info.parentType.name}.${info.fieldName}`;
    
    switch (keyGenerator) {
      case 'user':
        return `rate_limit:user:${context.user?.id || 'anonymous'}`;
      
      case 'ip': {
        const ip = this.getClientIP(context);
        return `rate_limit:ip:${ip}`;
      }

      case 'user_and_field':
        return `rate_limit:user_field:${context.user?.id || 'anonymous'}:${field}`;

      case 'ip_and_field': {
        const clientIP = this.getClientIP(context);
        return `rate_limit:ip_field:${clientIP}:${field}`;
      }
      
      default:
        return `rate_limit:user:${context.user?.id || 'anonymous'}`;
    }
  }

  /**
   * Checks if the request is within rate limit
   */
  private async checkRateLimit(key: string, max: number, _windowSeconds: number): Promise<boolean> {
    try {
      const current = await this.redis.get(key);
      const currentCount = current ? parseInt(current, 10) : 0;
      
      return currentCount < max;
    } catch (error) {
      this.logger.error(`Failed to check rate limit for key ${key}:`, error);
      // Fail open - allow the request if Redis is down
      return true;
    }
  }

  /**
   * Increments the rate limit counter
   */
  private async incrementRateLimit(key: string, windowSeconds: number): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Failed to increment rate limit for key ${key}:`, error);
    }
  }

  /**
   * Extracts client IP from request context
   */
  private getClientIP(context: GraphQLContext): string {
    if (!context.req) return 'unknown';

    // Check for forwarded IP headers
    const forwarded = context.req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    }

    const realIP = context.req.headers['x-real-ip'];
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    return context.req.connection?.remoteAddress || 'unknown';
  }
}

/**
 * Schema directive definition for GraphQL schema
 */
export const rateLimitDirectiveTypeDefs = `
  enum RateLimitKeyGenerator {
    USER
    IP
    USER_AND_FIELD
    IP_AND_FIELD
  }

  directive @rateLimit(
    max: Int!
    window: Int!
    message: String
    skipSuccessfulRequests: Boolean = false
    skipFailedRequests: Boolean = false
    keyGenerator: RateLimitKeyGenerator = USER
  ) on FIELD_DEFINITION
`;

/**
 * Factory function to create rate limit directive transformer
 */
export function createRateLimitDirective(configService: ConfigService) {
  return class extends RateLimitDirective {
    constructor() {
      super(configService);
    }
  };
}
