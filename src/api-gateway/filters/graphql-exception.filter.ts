/**
 * GraphQL Exception Filter
 * 
 * Global exception filter for handling GraphQL errors with proper formatting
 * Implements composition pattern for flexible error handling strategies
 */

import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { ConfigService } from '@nestjs/config';

// Exception type definitions
export interface GraphQLException extends Error {
  extensions?: {
    code?: string;
    exception?: {
      stacktrace?: string[];
    };
  };
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
}

export interface ErrorContext {
  operationName?: string;
  userId?: string;
  correlationId?: string;
  variables?: Record<string, unknown>;
  query?: string;
}

export interface ErrorExtensions {
  code: string;
  timestamp: string;
  correlationId?: string | undefined;
  operationName?: string | undefined;
  userId?: string | undefined;
  userMessage?: string | undefined;
  originalError?: {
    name: string;
    message: string;
    stack?: string | undefined;
  } | undefined;
  [key: string]: unknown;
}

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GraphQLExceptionFilter.name);
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('nodeEnv') === 'production';
  }

  catch(exception: GraphQLException, host: ArgumentsHost): GraphQLError {
    const gqlHost = GqlArgumentsHost.create(host);
    const context = gqlHost.getContext();
    const info = gqlHost.getInfo();

    // Extract error context
    const errorContext: ErrorContext = {
      operationName: info?.operation?.name?.value,
      userId: context?.user?.id,
      correlationId: context?.correlationId,
      variables: gqlHost.getArgs(),
      query: info?.operation?.loc?.source?.body,
    };

    // Log the error
    this.logError(exception, errorContext);

    // Format the error for the response
    return this.formatError(exception, errorContext);
  }

  /**
   * Logs the error with appropriate level and context
   */
  private logError(exception: GraphQLException, context: ErrorContext): void {
    const errorLevel = this.getErrorLevel(exception);
    const logData = {
      message: exception.message,
      stack: exception.stack,
      operationName: context.operationName,
      userId: context.userId,
      correlationId: context.correlationId,
      errorCode: this.getErrorCode(exception),
      timestamp: new Date().toISOString(),
    };

    switch (errorLevel) {
      case 'error':
        this.logger.error('GraphQL Error', logData);
        break;
      case 'warn':
        this.logger.warn('GraphQL Warning', logData);
        break;
      case 'debug':
        this.logger.debug('GraphQL Debug', logData);
        break;
      default:
        this.logger.log('GraphQL Info', logData);
    }
  }

  /**
   * Formats the error for the GraphQL response
   */
  private formatError(exception: GraphQLException, context: ErrorContext): GraphQLError {
    const errorCode = this.getErrorCode(exception);
    const message = this.sanitizeErrorMessage(exception.message, errorCode);

    const extensions: ErrorExtensions = {
      code: errorCode,
      timestamp: new Date().toISOString(),
      ...(context.correlationId && { correlationId: context.correlationId }),
    };

    // Add additional context in development
    if (!this.isProduction) {
      const originalError = {
        name: exception.constructor.name,
        message: exception.message,
        ...(exception.stack && { stack: exception.stack }),
      };
      extensions.originalError = originalError;
      
      if (context.operationName) {
        extensions.operationName = context.operationName;
      }
    }

    // Add user-safe error details
    if (this.isUserError(exception)) {
      extensions.userMessage = this.getUserFriendlyMessage(errorCode);
    }

    return new GraphQLError(message, {
      extensions,
      originalError: this.isProduction ? undefined : exception,
    });
  }

  /**
   * Determines the appropriate error code for the exception
   */
  private getErrorCode(exception: GraphQLException): string {
    // Check if the exception already has a code
    if (exception.extensions?.code) {
      return exception.extensions.code;
    }

    // Map common exception types to error codes
    const message = exception.message?.toLowerCase() || '';
    const exceptionName = exception.constructor.name;

    // Authentication and authorization errors
    if (message.includes('authentication') || message.includes('unauthenticated')) {
      return 'UNAUTHENTICATED';
    }
    if (message.includes('authorization') || message.includes('forbidden') || message.includes('access denied')) {
      return 'FORBIDDEN';
    }
    if (message.includes('invalid token') || message.includes('token expired')) {
      return 'INVALID_TOKEN';
    }

    // Validation errors
    if (message.includes('validation') || exceptionName.includes('Validation')) {
      return 'VALIDATION_ERROR';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'RATE_LIMITED';
    }

    // Query complexity
    if (message.includes('complexity') || message.includes('query too complex')) {
      return 'QUERY_TOO_COMPLEX';
    }

    // Not found errors
    if (message.includes('not found') || exceptionName.includes('NotFound')) {
      return 'NOT_FOUND';
    }

    // Timeout errors
    if (message.includes('timeout') || exceptionName.includes('Timeout')) {
      return 'TIMEOUT';
    }

    // Network/service errors
    if (message.includes('network') || message.includes('connection') || message.includes('service unavailable')) {
      return 'SERVICE_UNAVAILABLE';
    }

    // Default to internal error
    return 'INTERNAL_ERROR';
  }

  /**
   * Determines the appropriate log level for the error
   */
  private getErrorLevel(exception: GraphQLException): 'error' | 'warn' | 'debug' | 'log' {
    const errorCode = this.getErrorCode(exception);

    switch (errorCode) {
      case 'UNAUTHENTICATED':
      case 'FORBIDDEN':
      case 'INVALID_TOKEN':
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
   * Sanitizes error messages for production
   */
  private sanitizeErrorMessage(message: string, errorCode: string): string {
    if (!this.isProduction) {
      return message;
    }

    // Return generic messages for internal errors in production
    switch (errorCode) {
      case 'INTERNAL_ERROR':
        return 'An internal error occurred. Please try again later.';
      
      case 'SERVICE_UNAVAILABLE':
        return 'Service temporarily unavailable. Please try again later.';
      
      case 'TIMEOUT':
        return 'Request timed out. Please try again.';
      
      default:
        return message;
    }
  }

  /**
   * Checks if the error should be shown to users
   */
  private isUserError(exception: GraphQLException): boolean {
    const userErrorCodes = [
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'RATE_LIMITED',
      'QUERY_TOO_COMPLEX',
    ];

    const errorCode = this.getErrorCode(exception);
    return userErrorCodes.includes(errorCode);
  }

  /**
   * Gets user-friendly error messages
   */
  private getUserFriendlyMessage(errorCode: string): string {
    const messages: Record<string, string> = {
      'UNAUTHENTICATED': 'Please log in to access this resource.',
      'FORBIDDEN': 'You do not have permission to access this resource.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'NOT_FOUND': 'The requested resource was not found.',
      'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
      'QUERY_TOO_COMPLEX': 'Your query is too complex. Please simplify it and try again.',
      'TIMEOUT': 'The request took too long to complete. Please try again.',
      'SERVICE_UNAVAILABLE': 'The service is temporarily unavailable. Please try again later.',
      'INTERNAL_ERROR': 'An unexpected error occurred. Please try again later.',
    };

    return messages[errorCode] || 'An error occurred. Please try again.';
  }
}
