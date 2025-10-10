/**
 * Rate Limiting Guard
 * Protects AI coaching API endpoints from abuse with Hebrew query consideration
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  hebrewMultiplier?: number; // Allow more requests for Hebrew queries
}

interface ClientInfo {
  requests: number[];
  hebrewRequests: number;
  totalRequests: number;
  lastReset: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly clients = new Map<string, ClientInfo>();
  
  // Default rate limit configuration
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    hebrewMultiplier: 1.5 // 50% more requests for Hebrew
  };

  constructor(private reflector: Reflector) {
    // Clean up old client data every 5 minutes
    setInterval(() => {
      this.cleanupOldClients();
    }, 5 * 60 * 1000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Get rate limit configuration from decorator or use default
    const config = this.reflector.get<RateLimitConfig>('rateLimit', context.getHandler()) || this.defaultConfig;

    const clientId = this.getClientId(request);
    const isHebrewRequest = this.detectHebrewContent(request);
    
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create client info
    let clientInfo = this.clients.get(clientId);
    if (!clientInfo) {
      clientInfo = {
        requests: [],
        hebrewRequests: 0,
        totalRequests: 0,
        lastReset: now
      };
      this.clients.set(clientId, clientInfo);
    }

    // Reset window if needed
    if (now - clientInfo.lastReset >= config.windowMs) {
      clientInfo.requests = [];
      clientInfo.hebrewRequests = 0;
      clientInfo.totalRequests = 0;
      clientInfo.lastReset = now;
    }

    // Remove old requests outside the window
    clientInfo.requests = clientInfo.requests.filter(timestamp => timestamp > windowStart);

    // Calculate effective max requests (considering Hebrew multiplier)
    let effectiveMaxRequests = config.maxRequests;
    if (isHebrewRequest && config.hebrewMultiplier) {
      effectiveMaxRequests = Math.floor(config.maxRequests * config.hebrewMultiplier);
    }

    // Check if client has exceeded the limit
    if (clientInfo.requests.length >= effectiveMaxRequests) {
      // Set rate limit headers
      response.set({
        'X-RateLimit-Limit': effectiveMaxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil((windowStart + config.windowMs) / 1000).toString(),
        'X-RateLimit-Window': config.windowMs.toString(),
        'X-RateLimit-Hebrew-Multiplier': config.hebrewMultiplier?.toString() || '1'
      });

      this.logger.warn(
        `Rate limit exceeded for client ${clientId}. ` +
        `Requests: ${clientInfo.requests.length}/${effectiveMaxRequests}, ` +
        `Hebrew: ${isHebrewRequest}, ` +
        `Hebrew ratio: ${clientInfo.hebrewRequests / Math.max(clientInfo.totalRequests, 1)}`
      );

      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          hebrewMessage: 'חרגת ממגבלת הבקשות',
          error: 'Too Many Requests',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter: Math.ceil(config.windowMs / 1000),
          limit: effectiveMaxRequests,
          window: config.windowMs,
          isHebrewRequest
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Record the request
    clientInfo.requests.push(now);
    clientInfo.totalRequests++;
    if (isHebrewRequest) {
      clientInfo.hebrewRequests++;
    }

    // Set rate limit headers
    const remaining = effectiveMaxRequests - clientInfo.requests.length;
    response.set({
      'X-RateLimit-Limit': effectiveMaxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil((windowStart + config.windowMs) / 1000).toString(),
      'X-RateLimit-Window': config.windowMs.toString(),
      'X-RateLimit-Hebrew-Multiplier': config.hebrewMultiplier?.toString() || '1',
      'X-RateLimit-Hebrew-Request': isHebrewRequest.toString()
    });

    return true;
  }

  /**
   * Get unique client identifier
   */
  private getClientId(request: Request): string {
    // Prefer authenticated user ID if available
    const userId = (request as any).user?.id;
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    const forwarded = request.headers['x-forwarded-for'];
    const ip = forwarded ? (forwarded as string).split(',')[0] : request.ip;
    return `ip:${ip}`;
  }

  /**
   * Detect if request contains Hebrew content
   */
  private detectHebrewContent(request: Request): boolean {
    try {
      // Check query parameters
      const queryString = JSON.stringify(request.query);
      if (this.containsHebrew(queryString)) {
        return true;
      }

      // Check request body if it exists
      if (request.body) {
        const bodyString = JSON.stringify(request.body);
        if (this.containsHebrew(bodyString)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if text contains Hebrew characters
   */
  private containsHebrew(text: string): boolean {
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  }

  /**
   * Clean up old client data to prevent memory leaks
   */
  private cleanupOldClients(): void {
    const now = Date.now();
    const oldThreshold = 24 * 60 * 60 * 1000; // 24 hours

    let cleanedUp = 0;
    for (const [clientId, clientInfo] of this.clients.entries()) {
      if (now - clientInfo.lastReset > oldThreshold) {
        this.clients.delete(clientId);
        cleanedUp++;
      }
    }

    if (cleanedUp > 0) {
      this.logger.log(`Cleaned up ${cleanedUp} old client rate limit records`);
    }
  }

  /**
   * Get current rate limit statistics
   */
  public getStatistics(): any {
    const stats = {
      totalClients: this.clients.size,
      hebrewClients: 0,
      totalRequests: 0,
      hebrewRequests: 0,
      averageRequestsPerClient: 0
    };

    for (const clientInfo of this.clients.values()) {
      stats.totalRequests += clientInfo.totalRequests;
      stats.hebrewRequests += clientInfo.hebrewRequests;
      if (clientInfo.hebrewRequests > 0) {
        stats.hebrewClients++;
      }
    }

    if (stats.totalClients > 0) {
      stats.averageRequestsPerClient = Math.round(stats.totalRequests / stats.totalClients);
    }

    return stats;
  }
}