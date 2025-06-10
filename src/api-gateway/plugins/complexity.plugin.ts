/**
 * Complexity Plugin
 *
 * Apollo Server plugin for query complexity analysis and protection
 * Implements composition pattern for flexible complexity rules
 */

import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../types/context';

export interface ComplexityConfig {
  maximumComplexity: number;
  variables: Record<string, unknown>;
  createError: (max: number, actual: number) => Error;
  introspection?: boolean;
  scalarCost?: number;
  objectCost?: number;
  listFactor?: number;
  depthCostFactor?: number;
}

export class ComplexityPlugin implements ApolloServerPlugin<GraphQLContext> {
  private readonly logger = new Logger(ComplexityPlugin.name);
  private readonly config: ComplexityConfig;

  constructor(config: ComplexityConfig) {
    this.config = {
      scalarCost: 1,
      objectCost: 2,
      listFactor: 10,
      depthCostFactor: 1.5,
      introspection: true,
      ...config,
    };
  }

  async requestDidStart(): Promise<GraphQLRequestListener<GraphQLContext>> {
    const plugin = this; // Capture reference to plugin instance

    return {
      // Analyze query complexity before execution
      async didResolveOperation(requestContext) {
        const { request, contextValue: context } = requestContext;

        // Skip complexity analysis for introspection queries if allowed
        if (
          plugin.config.introspection &&
          plugin.isIntrospectionQuery(request.query)
        ) {
          return;
        }

        try {
          const complexity = plugin.calculateComplexity(
            request.query || '',
            request.variables || {}
          );

          // Check if complexity exceeds maximum
          if (complexity > plugin.config.maximumComplexity) {
            const error = plugin.config.createError(
              plugin.config.maximumComplexity,
              complexity
            );

            plugin.logger.warn('Query complexity exceeded', {
              complexity,
              maximum: plugin.config.maximumComplexity,
              operationName: request.operationName,
              userId: context.user?.id,
              correlationId: context.correlationId,
            });

            throw error;
          }

          // Log complexity for monitoring
          plugin.logger.debug('Query complexity analyzed', {
            complexity,
            maximum: plugin.config.maximumComplexity,
            operationName: request.operationName,
            correlationId: context.correlationId,
          });

          // Store complexity in context for metrics
          context.metadata = {
            ...context.metadata,
            queryComplexity: complexity,
          };
        } catch (error: unknown) {
          if (error instanceof GraphQLError) {
            throw error;
          }

          plugin.logger.error('Failed to analyze query complexity', {
            error: (error as Error).message,
            operationName: request.operationName,
            correlationId: context.correlationId,
          });

          // Don't block the query if complexity analysis fails
        }
      },
    };
  }

  /**
   * Calculates query complexity using a simplified algorithm
   */
  private calculateComplexity(
    query: string,
    variables: Record<string, unknown>
  ): number {
    if (!query) return 0;

    let complexity = 0;
    let depth = 0;
    let currentDepth = 0;

    // Remove comments and normalize whitespace
    const normalizedQuery = query
      .replace(/#.*$/gm, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Parse the query structure
    const tokens = this.tokenizeQuery(normalizedQuery);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;

      switch (token.type) {
        case 'field':
          complexity += this.calculateFieldComplexity(
            token,
            currentDepth,
            variables
          );
          break;

        case 'open_brace':
          currentDepth++;
          depth = Math.max(depth, currentDepth);
          break;

        case 'close_brace':
          currentDepth--;
          break;

        case 'list':
          complexity *= this.config.listFactor!;
          break;
      }
    }

    // Apply depth cost factor
    complexity *= Math.pow(this.config.depthCostFactor!, depth);

    return Math.round(complexity);
  }

  /**
   * Tokenizes a GraphQL query for complexity analysis
   */
  private tokenizeQuery(
    query: string
  ): Array<{ type: string; value: string; args?: string }> {
    const tokens: Array<{ type: string; value: string; args?: string }> = [];

    // Simple tokenization - in production, use a proper GraphQL parser
    const fieldRegex = /(\w+)(\([^)]*\))?\s*{/g;
    const braceRegex = /[{}]/g;

    let match;

    // Find fields with arguments
    while ((match = fieldRegex.exec(query)) !== null) {
      if (match[1]) {
        const token: { type: string; value: string; args?: string } = {
          type: 'field',
          value: match[1],
        };
        if (match[2]) {
          token.args = match[2];
        }
        tokens.push(token);
      }
    }

    // Find braces
    while ((match = braceRegex.exec(query)) !== null) {
      tokens.push({
        type: match[0] === '{' ? 'open_brace' : 'close_brace',
        value: match[0],
      });
    }

    // Sort tokens by position
    tokens.sort((a, b) => {
      const aIndex = query.indexOf(a.value);
      const bIndex = query.indexOf(b.value);
      return aIndex - bIndex;
    });

    return tokens;
  }

  /**
   * Calculates complexity for a specific field
   */
  private calculateFieldComplexity(
    token: { type: string; value: string; args?: string },
    depth: number,
    variables: Record<string, unknown>
  ): number {
    let complexity = this.config.objectCost!;

    // Analyze field arguments for complexity multipliers
    if (token.args) {
      const args = this.parseArguments(token.args, variables);

      // Check for pagination arguments that might increase complexity
      if (args.first || args.last || args.limit) {
        const limitValue = args.first || args.last || args.limit || 10;
        const limit =
          typeof limitValue === 'number'
            ? limitValue
            : parseInt(String(limitValue), 10) || 10;
        complexity *= Math.min(limit, 100); // Cap at 100 to prevent abuse
      }

      // Check for filter arguments that might increase complexity
      if (args.where || args.filter) {
        complexity *= 2;
      }

      // Check for sorting arguments
      if (args.orderBy || args.sort) {
        complexity *= 1.5;
      }
    }

    // Apply depth multiplier
    complexity *= Math.pow(1.2, depth);

    return complexity;
  }

  /**
   * Parses GraphQL field arguments
   */
  private parseArguments(
    argsString: string,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const args: Record<string, unknown> = {};

    try {
      // Simple argument parsing - in production, use a proper GraphQL parser
      const argRegex = /(\w+):\s*([^,)]+)/g;
      let match;

      while ((match = argRegex.exec(argsString)) !== null) {
        const [, key, value] = match;

        if (key && value) {
          // Handle variables
          if (value.startsWith('$')) {
            const varName = value.substring(1);
            if (varName && varName in variables) {
              args[key] = variables[varName];
            }
          } else {
            // Parse simple values
            args[key] = this.parseValue(value.trim());
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to parse arguments: ${argsString}`);
    }

    return args;
  }

  /**
   * Parses a simple GraphQL value
   */
  private parseValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    return value;
  }

  /**
   * Checks if the query is an introspection query
   */
  private isIntrospectionQuery(query?: string): boolean {
    if (!query) return false;

    return (
      query.includes('__schema') ||
      query.includes('__type') ||
      query.includes('IntrospectionQuery')
    );
  }
}
