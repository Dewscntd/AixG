/**
 * Metrics Plugin
 *
 * Apollo Server plugin for collecting comprehensive GraphQL operation metrics
 * Implements composition pattern for flexible metrics collection
 */

import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { MetricsService, OperationMetrics } from '../services/metrics.service';
import { GraphQLContext } from '../types/context';

export class MetricsPlugin implements ApolloServerPlugin<GraphQLContext> {
  private readonly logger = new Logger(MetricsPlugin.name);

  constructor(private readonly metricsService: MetricsService) {}

  async requestDidStart(): Promise<GraphQLRequestListener<GraphQLContext>> {
    const plugin = this; // Capture reference to plugin instance
    let operationStartTime: number;
    let operationName: string;
    let operationType: 'query' | 'mutation' | 'subscription';
    let complexity: number;
    let depth: number;

    return {
      // Record operation start
      async didResolveOperation(requestContext) {
        const { request, contextValue: context } = requestContext;

        operationStartTime = Date.now();
        operationName = request.operationName || 'anonymous';

        // Determine operation type
        const query = request.query || '';
        if (query.trim().startsWith('mutation')) {
          operationType = 'mutation';
        } else if (query.trim().startsWith('subscription')) {
          operationType = 'subscription';
        } else {
          operationType = 'query';
        }

        // Calculate query complexity and depth (simplified)
        complexity = plugin.calculateQueryComplexity(query);
        depth = plugin.calculateQueryDepth(query);

        plugin.logger.debug('Operation started', {
          operationName,
          operationType,
          complexity,
          depth,
          correlationId: context.correlationId,
          userId: context.user?.id,
        });
      },

      // Record operation completion
      async willSendResponse(requestContext) {
        const { contextValue: context, response } = requestContext;

        if (operationStartTime) {
          const duration = Date.now() - operationStartTime;
          const success = response.body.kind === 'single' &&
            !(response.body.singleResult?.errors?.length);

          const metrics: Partial<OperationMetrics> = {
            operationName,
            operationType,
            duration,
            complexity,
            depth,
            success,
            timestamp: new Date(),
          };

          // Only add userId if it exists
          if (context.user?.id) {
            metrics.userId = context.user.id;
          }

          // Record metrics
          plugin.metricsService.recordOperation(metrics as OperationMetrics);

          // Add performance headers
          response.http.headers.set('X-Response-Time', `${duration}ms`);
          response.http.headers.set(
            'X-Query-Complexity',
            complexity.toString()
          );
          response.http.headers.set('X-Query-Depth', depth.toString());

          plugin.logger.debug('Operation completed', {
            operationName,
            duration,
            success,
            correlationId: context.correlationId,
          });
        }
      },

      // Record operation errors
      async didEncounterErrors(requestContext) {
        const { errors, contextValue: context } = requestContext;

        for (const error of errors) {
          const errorMetrics: any = {
            operationName,
            context: {
              correlationId: context.correlationId,
              operationType,
              complexity,
              depth,
            },
          };

          // Only add userId if it exists
          if (context.user?.id) {
            errorMetrics.userId = context.user.id;
          }

          plugin.metricsService.recordError(error, errorMetrics);
        }

        // Update operation metrics with error information
        if (operationStartTime && errors.length > 0) {
          const duration = Date.now() - operationStartTime;
          const errorCode = plugin.extractErrorCode(errors[0] as Error);

          const metrics: Partial<OperationMetrics> = {
            operationName,
            operationType,
            duration,
            complexity,
            depth,
            success: false,
            timestamp: new Date(),
          };

          // Only add optional properties if they exist
          if (errorCode) {
            metrics.errorCode = errorCode;
          }
          if (context.user?.id) {
            metrics.userId = context.user.id;
          }

          plugin.metricsService.recordOperation(metrics as OperationMetrics);
        }
      },
    };
  }

  /**
   * Calculates query complexity (simplified implementation)
   */
  private calculateQueryComplexity(query: string): number {
    if (!query) return 0;

    // Simple complexity calculation based on field count and nesting
    const fieldMatches = query.match(/\w+\s*{/g) || [];
    const nestedFields = query.match(/{[^{}]*{/g) || [];

    return fieldMatches.length + nestedFields.length * 2;
  }

  /**
   * Calculates query depth (simplified implementation)
   */
  private calculateQueryDepth(query: string): number {
    if (!query) return 0;

    let depth = 0;
    let currentDepth = 0;

    for (const char of query) {
      if (char === '{') {
        currentDepth++;
        depth = Math.max(depth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }

    return depth;
  }

  /**
   * Extracts error code from GraphQL error
   */
  private extractErrorCode(error: Error): string | undefined {
    if (!error) return undefined;

    // Check extensions for error code (GraphQLError has extensions)
    const graphqlError = error as GraphQLError;
    if (graphqlError.extensions?.code) {
      return graphqlError.extensions.code as string;
    }

    // Check error message for common patterns
    const message = error.message?.toLowerCase() || '';

    if (message.includes('authentication')) return 'AUTHENTICATION_ERROR';
    if (message.includes('authorization') || message.includes('permission'))
      return 'AUTHORIZATION_ERROR';
    if (message.includes('validation')) return 'VALIDATION_ERROR';
    if (message.includes('not found')) return 'NOT_FOUND';
    if (message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (message.includes('rate limit')) return 'RATE_LIMIT_ERROR';

    return 'INTERNAL_ERROR';
  }
}
