/**
 * Metrics Plugin
 * 
 * Apollo Server plugin for collecting comprehensive GraphQL operation metrics
 * Implements composition pattern for flexible metrics collection
 */

import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Logger } from '@nestjs/common';
import { MetricsService, OperationMetrics } from '../services/metrics.service';
import { GraphQLContext } from '../types/context';

export class MetricsPlugin implements ApolloServerPlugin<GraphQLContext> {
  private readonly logger = new Logger(MetricsPlugin.name);

  constructor(private readonly metricsService: MetricsService) {}

  async requestDidStart(): Promise<GraphQLRequestListener<GraphQLContext>> {
    let operationStartTime: number;
    let operationName: string;
    let operationType: 'query' | 'mutation' | 'subscription';
    let complexity: number;
    let depth: number;

    return {
      // Record operation start
      async didResolveOperation(requestContext) {
        const { request, context } = requestContext;
        
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
        complexity = this.calculateQueryComplexity(query);
        depth = this.calculateQueryDepth(query);

        this.logger.debug('Operation started', {
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
        const { context, response } = requestContext;
        
        if (operationStartTime) {
          const duration = Date.now() - operationStartTime;
          const success = !response.body.kind === 'single' || 
                         !(response.body as any).singleResult?.errors?.length;

          const metrics: OperationMetrics = {
            operationName,
            operationType,
            duration,
            complexity,
            depth,
            success,
            userId: context.user?.id,
            timestamp: new Date(),
          };

          // Record metrics
          this.metricsService.recordOperation(metrics);

          // Add performance headers
          response.http.headers.set('X-Response-Time', `${duration}ms`);
          response.http.headers.set('X-Query-Complexity', complexity.toString());
          response.http.headers.set('X-Query-Depth', depth.toString());

          this.logger.debug('Operation completed', {
            operationName,
            duration,
            success,
            correlationId: context.correlationId,
          });
        }
      },

      // Record operation errors
      async didEncounterErrors(requestContext) {
        const { errors, context } = requestContext;
        
        for (const error of errors) {
          this.metricsService.recordError(error, {
            operationName,
            userId: context.user?.id,
            context: {
              correlationId: context.correlationId,
              operationType,
              complexity,
              depth,
            },
          });
        }

        // Update operation metrics with error information
        if (operationStartTime) {
          const duration = Date.now() - operationStartTime;
          const errorCode = this.extractErrorCode(errors[0]);

          const metrics: OperationMetrics = {
            operationName,
            operationType,
            duration,
            complexity,
            depth,
            success: false,
            errorCode,
            userId: context.user?.id,
            timestamp: new Date(),
          };

          this.metricsService.recordOperation(metrics);
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
    
    return fieldMatches.length + (nestedFields.length * 2);
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
    
    // Check extensions for error code
    if (error.extensions?.code) {
      return error.extensions.code;
    }
    
    // Check error message for common patterns
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('authentication')) return 'AUTHENTICATION_ERROR';
    if (message.includes('authorization') || message.includes('permission')) return 'AUTHORIZATION_ERROR';
    if (message.includes('validation')) return 'VALIDATION_ERROR';
    if (message.includes('not found')) return 'NOT_FOUND';
    if (message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (message.includes('rate limit')) return 'RATE_LIMIT_ERROR';
    
    return 'INTERNAL_ERROR';
  }
}
