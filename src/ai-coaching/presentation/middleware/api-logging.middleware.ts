/**
 * API Logging Middleware
 * Comprehensive logging for AI coaching API requests with Hebrew language support
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class APILoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('AICoachingAPI');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    
    // Extract useful headers
    const userAgent = headers['user-agent'] || 'unknown';
    const contentLength = headers['content-length'] || '0';
    const acceptLanguage = headers['accept-language'] || 'unknown';
    const isHebrewRequest = this.detectHebrewContent(req);

    // Log request start
    this.logger.log(
      `→ ${method} ${originalUrl} - IP: ${ip} - UA: ${userAgent.substring(0, 100)} - Hebrew: ${isHebrewRequest}`
    );

    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const statusCode = res.statusCode;
      const responseSize = res.get('content-length') || '0';
      
      // Determine log level based on status code
      const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'log';
      
      // Log response
      const middleware = new APILoggingMiddleware();
      middleware.logger[logLevel](
        `← ${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${responseSize}B - Hebrew: ${isHebrewRequest}`
      );

      // Log slow requests
      if (duration > 2000) {
        middleware.logger.warn(
          `SLOW REQUEST: ${method} ${originalUrl} took ${duration}ms`
        );
      }

      // Log errors with additional context
      if (statusCode >= 400) {
        middleware.logger.error(
          `ERROR: ${method} ${originalUrl} - Status: ${statusCode} - Duration: ${duration}ms - IP: ${ip}`
        );
      }

      // Call original end
      originalEnd.call(this, chunk, encoding);
    };

    next();
  }

  /**
   * Detect if request contains Hebrew content
   */
  private detectHebrewContent(req: Request): boolean {
    try {
      // Check query parameters
      const queryString = JSON.stringify(req.query);
      if (this.containsHebrew(queryString)) {
        return true;
      }

      // Check request body if it exists
      if (req.body) {
        const bodyString = JSON.stringify(req.body);
        if (this.containsHebrew(bodyString)) {
          return true;
        }
      }

      // Check URL path
      if (this.containsHebrew(req.originalUrl)) {
        return true;
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
}