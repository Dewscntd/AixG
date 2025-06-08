/**
 * DataLoader Plugin
 * 
 * Apollo Server plugin for managing DataLoader lifecycle and performance monitoring
 * Implements composition pattern for efficient data loading
 */

import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Logger } from '@nestjs/common';
import { DataLoaderService } from '../services/dataloader.service';
import { GraphQLContext } from '../types/context';

export class DataLoaderPlugin implements ApolloServerPlugin<GraphQLContext> {
  private readonly logger = new Logger(DataLoaderPlugin.name);

  constructor(private readonly dataLoaderService: DataLoaderService) {}

  async requestDidStart(): Promise<GraphQLRequestListener<GraphQLContext>> {
    return {
      // Initialize DataLoaders for each request
      async didResolveOperation(requestContext) {
        const { context } = requestContext;
        
        // DataLoaders are already created in the context factory
        // This is where we could add additional initialization if needed
        
        this.logger.debug('DataLoaders initialized for request', {
          correlationId: context.correlationId,
          userId: context.user?.id,
        });
      },

      // Monitor DataLoader performance
      async willSendResponse(requestContext) {
        const { context, response } = requestContext;
        
        try {
          // Collect DataLoader statistics
          const stats = this.collectDataLoaderStats(context);
          
          // Add performance headers
          if (stats.totalLoads > 0) {
            response.http.headers.set('X-DataLoader-Loads', stats.totalLoads.toString());
            response.http.headers.set('X-DataLoader-Cache-Hits', stats.cacheHits.toString());
            response.http.headers.set('X-DataLoader-Cache-Hit-Rate', 
              `${((stats.cacheHits / stats.totalLoads) * 100).toFixed(2)  }%`
            );
          }

          // Log performance metrics
          this.logger.debug('DataLoader performance stats', {
            correlationId: context.correlationId,
            ...stats,
          });

          // Warn about potential N+1 queries
          if (stats.totalLoads > 100) {
            this.logger.warn('High number of DataLoader loads detected', {
              correlationId: context.correlationId,
              totalLoads: stats.totalLoads,
              operationName: requestContext.request.operationName,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to collect DataLoader stats: ${error.message}`);
        }
      },

      // Handle DataLoader errors
      async didEncounterErrors(requestContext) {
        const { errors, context } = requestContext;
        
        for (const error of errors) {
          if (this.isDataLoaderError(error)) {
            this.logger.error('DataLoader error encountered', {
              error: error.message,
              correlationId: context.correlationId,
              operationName: requestContext.request.operationName,
              stack: error.stack,
            });
          }
        }
      },
    };
  }

  /**
   * Collects statistics from all DataLoaders in the context
   */
  private collectDataLoaderStats(context: GraphQLContext): {
    totalLoads: number;
    cacheHits: number;
    cacheMisses: number;
    batchLoads: number;
  } {
    let totalLoads = 0;
    let cacheHits = 0;
    let cacheMisses = 0;
    let batchLoads = 0;

    try {
      const { dataSources } = context;
      
      // Iterate through all DataLoaders and collect stats
      Object.values(dataSources).forEach(dataLoader => {
        if (dataLoader && typeof dataLoader === 'object' && 'stats' in dataLoader) {
          const stats = (dataLoader as {
            stats?: {
              totalLoads?: number;
              cacheHits?: number;
              cacheMisses?: number;
              batchLoads?: number;
            }
          }).stats;
          if (stats) {
            totalLoads += stats.totalLoads || 0;
            cacheHits += stats.cacheHits || 0;
            cacheMisses += stats.cacheMisses || 0;
            batchLoads += stats.batchLoads || 0;
          }
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to collect DataLoader stats: ${error.message}`);
    }

    return {
      totalLoads,
      cacheHits,
      cacheMisses,
      batchLoads,
    };
  }

  /**
   * Checks if an error is DataLoader-related
   */
  private isDataLoaderError(error: Error): boolean {
    const dataLoaderErrorIndicators = [
      'DataLoader',
      'batch loading',
      'batch function',
      'cache key',
      'load function',
    ];

    return dataLoaderErrorIndicators.some(indicator => 
      error.message?.includes(indicator) || 
      error.stack?.includes(indicator)
    );
  }
}
