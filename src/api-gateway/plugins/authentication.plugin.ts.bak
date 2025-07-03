/**
 * Authentication Plugin
 *
 * Apollo Server plugin for handling authentication and authorization
 * Implements composition pattern for flexible authentication strategies
 */

import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Logger } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { GraphQLContext } from '../types/context';

export class AuthenticationPlugin
  implements ApolloServerPlugin<GraphQLContext>
{
  private readonly logger = new Logger(AuthenticationPlugin.name);

  constructor(private readonly authService: AuthService) {}

  async requestDidStart(): Promise<GraphQLRequestListener<GraphQLContext>> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const plugin = this; // Capture reference to plugin instance

    return {
      // Validate authentication before parsing
      async didResolveOperation(requestContext) {
        const { request, contextValue: context } = requestContext;

        // Skip authentication for introspection queries
        if (plugin.isIntrospectionQuery(request.query)) {
          return;
        }

        // Skip authentication for health check queries
        if (plugin.isHealthCheckQuery(request.query)) {
          return;
        }

        // Check if operation requires authentication
        const requiresAuth = plugin.operationRequiresAuth(request.query);

        if (requiresAuth && !context.user) {
          throw new Error('Authentication required');
        }

        // Log authentication events
        if (context.user) {
          plugin.logger.debug(
            `Authenticated request from user: ${context.user.id}`,
            {
              operationName: request.operationName,
              userId: context.user.id,
              roles: context.user.roles,
            }
          );
        }
      },

      // Validate authorization before execution
      async willSendResponse(requestContext) {
        const { contextValue: context, response } = requestContext;

        // Add authentication headers to response
        if (context.user) {
          response.http.headers.set('X-User-ID', context.user.id);
          response.http.headers.set(
            'X-User-Roles',
            JSON.stringify(context.user.roles)
          );
        }

        // Add security headers
        response.http.headers.set('X-Content-Type-Options', 'nosniff');
        response.http.headers.set('X-Frame-Options', 'DENY');
        response.http.headers.set('X-XSS-Protection', '1; mode=block');
      },

      // Handle authentication errors
      async didEncounterErrors(requestContext) {
        const { errors, contextValue: context } = requestContext;

        for (const error of errors) {
          if (plugin.isAuthenticationError(error)) {
            plugin.logger.warn(`Authentication error: ${error.message}`, {
              userId: context.user?.id,
              operationName: requestContext.request.operationName,
            });
          }
        }
      },
    };
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

  /**
   * Checks if the query is a health check query
   */
  private isHealthCheckQuery(query?: string): boolean {
    if (!query) return false;

    return query.includes('healthCheck') || query.includes('health');
  }

  /**
   * Determines if an operation requires authentication
   */
  private operationRequiresAuth(query?: string): boolean {
    if (!query) return false;

    // Public operations that don't require authentication
    const publicOperations = [
      'healthCheck',
      'getPublicTeams',
      'getPublicMatches',
    ];

    // Check if query contains any public operations
    const hasPublicOperation = publicOperations.some(op => query.includes(op));

    // If it's a mutation, it always requires auth
    if (query.trim().startsWith('mutation')) {
      return true;
    }

    // If it's a subscription, it always requires auth
    if (query.trim().startsWith('subscription')) {
      return true;
    }

    // If it contains sensitive fields, it requires auth
    const sensitiveFields = [
      'analytics',
      'videoProcessing',
      'userProfile',
      'teamManagement',
      'adminPanel',
    ];

    const hasSensitiveField = sensitiveFields.some(field =>
      query.includes(field)
    );

    return hasSensitiveField && !hasPublicOperation;
  }

  /**
   * Checks if an error is authentication-related
   */
  private isAuthenticationError(error: Error): boolean {
    const authErrorMessages = [
      'Authentication required',
      'Invalid token',
      'Token has expired',
      'Token has been revoked',
      'User account is inactive',
      'Insufficient permissions',
      'Access denied',
    ];

    return authErrorMessages.some(msg => error.message?.includes(msg));
  }
}
