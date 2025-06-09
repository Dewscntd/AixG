/**
 * Auth Directive Transformer
 *
 * Modern GraphQL directive implementation using mapSchema
 * Replaces deprecated SchemaDirectiveVisitor approach
 */

import { Injectable, Logger } from '@nestjs/common';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { GraphQLSchema, defaultFieldResolver } from 'graphql';
import { AuthService } from '../services/auth.service';
import { GraphQLContext, User } from '../types/context';

export interface AuthDirectiveArgs {
  requires?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  roles?: string[];
  permissions?: string[];
  teamAccess?: boolean;
}

export interface GraphQLResolverArgs {
  [key: string]: unknown;
}

export interface GraphQLResolverSource {
  [key: string]: unknown;
  teamId?: string;
  team?: { id: string };
  matchId?: string;
}

@Injectable()
export class AuthDirectiveTransformer {
  private readonly logger = new Logger(AuthDirectiveTransformer.name);

  constructor(private readonly authService: AuthService) {}

  createTransformer() {
    return (schema: GraphQLSchema) =>
      mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, _typeName) => {
          const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0];
          if (authDirective) {
            const { resolve = defaultFieldResolver } = fieldConfig;
            const directiveArgs = authDirective as AuthDirectiveArgs;

            fieldConfig.resolve = async (
              source: GraphQLResolverSource,
              args: GraphQLResolverArgs,
              context: GraphQLContext,
              info
            ) => {
              try {
                // Check if user is authenticated
                if (!context.user) {
                  throw new Error('Authentication required');
                }

                // Check basic authentication level
                if (directiveArgs.requires) {
                  const hasRequiredLevel = this.checkAuthenticationLevel(
                    context.user,
                    directiveArgs.requires
                  );

                  if (!hasRequiredLevel) {
                    throw new Error(
                      `Insufficient authentication level. Required: ${directiveArgs.requires}`
                    );
                  }
                }

                // Check specific roles
                if (directiveArgs.roles && directiveArgs.roles.length > 0) {
                  const hasRequiredRoles = this.authService.hasRoles(
                    context.user,
                    directiveArgs.roles
                  );

                  if (!hasRequiredRoles) {
                    throw new Error(
                      `Insufficient roles. Required: ${directiveArgs.roles.join(
                        ', '
                      )}`
                    );
                  }
                }

                // Check specific permissions
                if (
                  directiveArgs.permissions &&
                  directiveArgs.permissions.length > 0
                ) {
                  const hasRequiredPermissions =
                    this.authService.hasPermissions(
                      context.user,
                      directiveArgs.permissions
                    );

                  if (!hasRequiredPermissions) {
                    throw new Error(
                      `Insufficient permissions. Required: ${directiveArgs.permissions.join(
                        ', '
                      )}`
                    );
                  }
                }

                // Check team access if required
                if (directiveArgs.teamAccess) {
                  const teamId = this.extractTeamId(args, source);

                  if (
                    teamId &&
                    !this.authService.canAccessTeam(context.user, teamId)
                  ) {
                    throw new Error('Access denied to team resources');
                  }
                }

                // Log authorization success
                this.logger.debug('Authorization successful', {
                  userId: context.user.id,
                  field: info.fieldName,
                  parentType: info.parentType.name,
                  requires: directiveArgs.requires,
                  roles: directiveArgs.roles,
                  permissions: directiveArgs.permissions,
                });

                // Call the original resolver
                return resolve(source, args, context, info);
              } catch (error) {
                // Log authorization failure
                this.logger.warn('Authorization failed', {
                  userId: context.user?.id,
                  field: info.fieldName,
                  error: (error as Error).message,
                  requires: directiveArgs.requires,
                  roles: directiveArgs.roles,
                  permissions: directiveArgs.permissions,
                });

                throw error;
              }
            };
          }
          return fieldConfig;
        },
      });
  }

  /**
   * Checks if user has required authentication level
   */
  private checkAuthenticationLevel(user: User, requiredLevel: string): boolean {
    const levels = {
      USER: 1,
      ADMIN: 2,
      SUPER_ADMIN: 3,
    };

    const userLevel = levels[user.role as keyof typeof levels] || 0;
    const required = levels[requiredLevel as keyof typeof levels] || 0;

    return userLevel >= required;
  }

  /**
   * Extracts team ID from resolver arguments or source
   */
  private extractTeamId(
    args: GraphQLResolverArgs,
    source: GraphQLResolverSource
  ): string | undefined {
    // Check args first
    if (args.teamId && typeof args.teamId === 'string') {
      return args.teamId;
    }

    // Check source object
    if (source?.teamId && typeof source.teamId === 'string') {
      return source.teamId;
    }

    // Check nested team object
    if (
      source?.team &&
      typeof source.team === 'object' &&
      source.team !== null
    ) {
      const team = source.team as { id?: string };
      if (team.id && typeof team.id === 'string') {
        return team.id;
      }
    }

    // Check for match-related team access
    if (args.matchId || source?.matchId) {
      // In a real implementation, you would fetch the match and check team ownership
      // For now, we'll return undefined to skip team access check
      return undefined;
    }

    return undefined;
  }
}

/**
 * Schema directive definition for GraphQL schema
 */
export const authDirectiveTypeDefs = `
  enum AuthLevel {
    USER
    ADMIN
    SUPER_ADMIN
  }

  directive @auth(
    requires: AuthLevel
    roles: [String!]
    permissions: [String!]
    teamAccess: Boolean = false
  ) on FIELD_DEFINITION | OBJECT
`;

/**
 * Factory function to create auth directive transformer
 */
export function createAuthDirectiveTransformer(authService: AuthService) {
  return new AuthDirectiveTransformer(authService);
}
