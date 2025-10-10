/**
 * Rate Limit Decorator
 * Custom decorator for configuring rate limits on AI coaching endpoints
 */

import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Maximum number of requests per window
   */
  maxRequests: number;
  
  /**
   * Skip successful requests when counting
   */
  skipSuccessfulRequests?: boolean;
  
  /**
   * Skip failed requests when counting
   */
  skipFailedRequests?: boolean;
  
  /**
   * Multiplier for Hebrew requests (allows more requests for Hebrew content)
   */
  hebrewMultiplier?: number;
  
  /**
   * Custom message for rate limit exceeded
   */
  message?: string;
  
  /**
   * Custom Hebrew message for rate limit exceeded
   */
  hebrewMessage?: string;
}

/**
 * Apply rate limiting to an endpoint
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata('rateLimit', options);

/**
 * Predefined rate limit configurations for common use cases
 */
export const RateLimitPresets = {
  /**
   * Conservative rate limit for expensive operations
   * 10 requests per minute, 20 for Hebrew
   */
  CONSERVATIVE: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    hebrewMultiplier: 2,
    message: 'Rate limit exceeded for expensive operation',
    hebrewMessage: 'חרגת ממגבלת הבקשות לפעולה יקרה'
  },

  /**
   * Standard rate limit for normal API operations
   * 100 requests per minute, 150 for Hebrew
   */
  STANDARD: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    hebrewMultiplier: 1.5,
    message: 'Rate limit exceeded',
    hebrewMessage: 'חרגת ממגבלת הבקשות'
  },

  /**
   * Generous rate limit for lightweight operations
   * 500 requests per minute, 750 for Hebrew
   */
  GENEROUS: {
    windowMs: 60 * 1000,
    maxRequests: 500,
    hebrewMultiplier: 1.5,
    message: 'Rate limit exceeded',
    hebrewMessage: 'חרגת ממגבלת הבקשות'
  },

  /**
   * Real-time rate limit for live coaching queries
   * 60 requests per minute, 90 for Hebrew
   */
  REAL_TIME: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    hebrewMultiplier: 1.5,
    message: 'Real-time query rate limit exceeded',
    hebrewMessage: 'חרגת ממגבלת שאילתות בזמן אמת'
  },

  /**
   * Session management rate limit
   * 20 sessions per hour, 30 for Hebrew
   */
  SESSION_MANAGEMENT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    hebrewMultiplier: 1.5,
    message: 'Session creation rate limit exceeded',
    hebrewMessage: 'חרגת ממגבלת יצירת מפגשים'
  },

  /**
   * Insights generation rate limit
   * 200 requests per 5 minutes, 300 for Hebrew
   */
  INSIGHTS_GENERATION: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 200,
    hebrewMultiplier: 1.5,
    message: 'Insights generation rate limit exceeded',
    hebrewMessage: 'חרגת ממגבלת יצירת תובנות'
  }
};

/**
 * Convenience decorators for common rate limit scenarios
 */

/**
 * Conservative rate limiting for expensive operations
 */
export const ConservativeRateLimit = () => RateLimit(RateLimitPresets.CONSERVATIVE);

/**
 * Standard rate limiting for normal operations
 */
export const StandardRateLimit = () => RateLimit(RateLimitPresets.STANDARD);

/**
 * Generous rate limiting for lightweight operations
 */
export const GenerousRateLimit = () => RateLimit(RateLimitPresets.GENEROUS);

/**
 * Real-time rate limiting for live coaching
 */
export const RealTimeRateLimit = () => RateLimit(RateLimitPresets.REAL_TIME);

/**
 * Session management rate limiting
 */
export const SessionRateLimit = () => RateLimit(RateLimitPresets.SESSION_MANAGEMENT);

/**
 * Insights generation rate limiting
 */
export const InsightsRateLimit = () => RateLimit(RateLimitPresets.INSIGHTS_GENERATION);