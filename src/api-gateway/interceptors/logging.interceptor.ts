/**
 * Logging Interceptor
 *
 * Intercepts all requests to log GraphQL operations with structured logging
 * Implements composition pattern for flexible logging strategies
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { GraphQLContext } from '../types/context';

// GraphQL Info type definitions
export interface GraphQLInfo {
  operation?: {
    name?: {
      value: string;
    };
    operation: 'query' | 'mutation' | 'subscription';
    selectionSet?: {
      selections: GraphQLSelection[];
    };
  };
}

export interface GraphQLSelection {
  name?: {
    value: string;
  };
  kind: string;
}

export interface LogEntry {
  timestamp: string;
  correlationId: string;
  operationName?: string;
  operationType?: string;
  userId?: string;
  userRoles?: string[];
  duration?: number;
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
  variables?: Record<string, unknown>;
  complexity?: number;
  depth?: number;
  clientIP?: string;
  userAgent?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly logLevel: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.logLevel = this.configService.get<string>('logLevel', 'info');
    this.isProduction =
      this.configService.get<string>('nodeEnv') === 'production';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Check if this is a GraphQL context
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext<GraphQLContext>();
    const info = gqlContext.getInfo();

    // Skip logging for introspection queries in production
    if (this.isProduction && this.isIntrospectionQuery(info)) {
      return next.handle();
    }

    const startTime = Date.now();
    const logEntry = this.createBaseLogEntry(ctx, info, startTime);

    // Log request start
    this.logRequest(logEntry);

    return next.handle().pipe(
      tap(result => {
        // Log successful response
        const duration = Date.now() - startTime;
        this.logResponse(
          {
            ...logEntry,
            duration,
            success: true,
          },
          result
        );
      }),
      catchError(error => {
        // Log error response
        const duration = Date.now() - startTime;
        this.logResponse(
          {
            ...logEntry,
            duration,
            success: false,
            errorMessage: error.message,
            errorCode: error.extensions?.code || 'UNKNOWN_ERROR',
          },
          null,
          error
        );

        // Re-throw the error
        throw error;
      })
    );
  }

  /**
   * Creates the base log entry with common fields
   */
  private createBaseLogEntry(
    context: GraphQLContext,
    info: GraphQLInfo,
    _startTime: number
  ): LogEntry {
    const operationName = info?.operation?.name?.value || 'anonymous';
    const operationType = this.getOperationType(info);

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      success: false, // Will be updated later
      clientIP: this.getClientIP(context),
      userAgent: this.getUserAgent(context),
    };

    // Only add optional properties if they have values
    if (operationName) {
      logEntry.operationName = operationName;
    }
    if (operationType) {
      logEntry.operationType = operationType;
    }
    if (context.user?.id) {
      logEntry.userId = context.user.id;
    }
    if (context.user?.roles) {
      logEntry.userRoles = context.user.roles;
    }
    if (context.metadata?.queryComplexity !== undefined) {
      logEntry.complexity = context.metadata.queryComplexity;
    }
    if (context.metadata?.queryDepth !== undefined) {
      logEntry.depth = context.metadata.queryDepth;
    }

    return logEntry;
  }

  /**
   * Logs the incoming request
   */
  private logRequest(logEntry: LogEntry): void {
    if (this.shouldLogLevel('debug')) {
      this.logger.debug('GraphQL Request Started', {
        operationName: logEntry.operationName,
        operationType: logEntry.operationType,
        userId: logEntry.userId,
        correlationId: logEntry.correlationId,
        clientIP: logEntry.clientIP,
      });
    }
  }

  /**
   * Logs the response (success or error)
   */
  private logResponse(
    logEntry: LogEntry,
    result?: unknown,
    _error?: Error
  ): void {
    const logData = {
      ...logEntry,
      resultSize: result ? this.calculateResultSize(result) : undefined,
    };

    if (logEntry.success) {
      // Log successful operations
      if (this.shouldLogLevel('info')) {
        this.logger.log('GraphQL Request Completed', logData);
      }

      // Log slow operations as warnings
      if (logEntry.duration && logEntry.duration > 1000) {
        this.logger.warn('Slow GraphQL Operation', {
          ...logData,
          slowOperation: true,
        });
      }
    } else {
      // Log errors
      const errorLevel = this.getErrorLogLevel(logEntry.errorCode);

      switch (errorLevel) {
        case 'error':
          this.logger.error('GraphQL Request Failed', logData);
          break;
        case 'warn':
          this.logger.warn('GraphQL Request Warning', logData);
          break;
        case 'debug':
          this.logger.debug('GraphQL Request Debug', logData);
          break;
        default:
          this.logger.log('GraphQL Request Info', logData);
      }
    }

    // Log performance metrics
    if (this.shouldLogLevel('debug') && logEntry.duration) {
      this.logPerformanceMetrics(logEntry);
    }
  }

  /**
   * Logs performance metrics
   */
  private logPerformanceMetrics(logEntry: LogEntry): void {
    const performanceData = {
      operationName: logEntry.operationName,
      duration: logEntry.duration,
      complexity: logEntry.complexity,
      depth: logEntry.depth,
      correlationId: logEntry.correlationId,
    };

    this.logger.debug('GraphQL Performance Metrics', performanceData);
  }

  /**
   * Determines the operation type from GraphQL info
   */
  private getOperationType(info: GraphQLInfo): string {
    if (!info?.operation?.operation) {
      return 'unknown';
    }

    return info.operation.operation; // 'query', 'mutation', or 'subscription'
  }

  /**
   * Extracts client IP from request context
   */
  private getClientIP(context: GraphQLContext): string {
    if (!context.req) return 'unknown';

    const forwarded = context.req.headers['x-forwarded-for'];
    if (forwarded) {
      const forwardedIP = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return forwardedIP || 'unknown';
    }

    const realIP = context.req.headers['x-real-ip'];
    if (realIP) {
      const realIPValue = Array.isArray(realIP) ? realIP[0] : realIP;
      return realIPValue || 'unknown';
    }

    return (
      (context.req as { socket?: { remoteAddress?: string } }).socket
        ?.remoteAddress || 'unknown'
    );
  }

  /**
   * Extracts user agent from request context
   */
  private getUserAgent(context: GraphQLContext): string {
    if (!context.req) return 'unknown';

    const userAgent = context.req.headers['user-agent'];
    return Array.isArray(userAgent) ? userAgent[0] : userAgent || 'unknown';
  }

  /**
   * Calculates the approximate size of the result
   */
  private calculateResultSize(result: unknown): number {
    try {
      return JSON.stringify(result).length;
    } catch {
      return 0;
    }
  }

  /**
   * Determines if we should log at the given level
   */
  private shouldLogLevel(level: string): boolean {
    const levels = ['error', 'warn', 'log', 'debug', 'verbose'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex <= currentLevelIndex;
  }

  /**
   * Determines the appropriate log level for errors
   */
  private getErrorLogLevel(
    errorCode?: string
  ): 'error' | 'warn' | 'debug' | 'log' {
    if (!errorCode) return 'error';

    switch (errorCode) {
      case 'UNAUTHENTICATED':
      case 'FORBIDDEN':
      case 'VALIDATION_ERROR':
      case 'NOT_FOUND':
        return 'warn';

      case 'RATE_LIMITED':
      case 'QUERY_TOO_COMPLEX':
        return 'debug';

      case 'TIMEOUT':
      case 'SERVICE_UNAVAILABLE':
      case 'INTERNAL_ERROR':
        return 'error';

      default:
        return 'log';
    }
  }

  /**
   * Checks if the operation is an introspection query
   */
  private isIntrospectionQuery(info: GraphQLInfo): boolean {
    if (!info?.operation?.selectionSet?.selections) {
      return false;
    }

    return info.operation.selectionSet.selections.some(
      (selection: GraphQLSelection) =>
        selection.name?.value === '__schema' ||
        selection.name?.value === '__type'
    );
  }
}
