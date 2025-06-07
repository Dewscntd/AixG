/**
 * Auth Directive
 * 
 * GraphQL directive for declarative authorization
 * Implements composition pattern for flexible authorization rules
 */

import { Injectable, Logger } from '@nestjs/common';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import { GraphQLField, GraphQLObjectType, defaultFieldResolver } from 'graphql';
import { AuthService } from '../services/auth.service';
import { GraphQLContext } from '../types/context';

export interface AuthDirectiveArgs {
  requires?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  roles?: string[];
  permissions?: string[];
  teamAccess?: boolean;
}

@Injectable()
export class AuthDirective extends SchemaDirectiveVisitor {
  private readonly logger = new Logger(AuthDirective.name);

  constructor(private readonly authService: AuthService) {
    super();
  }

  visitFieldDefinition(field: GraphQLField<any, any>, details: { objectType: GraphQLObjectType }) {
    const { resolve = defaultFieldResolver } = field;
    const directiveArgs = this.args as AuthDirectiveArgs;

    field.resolve = async function (source, args, context: GraphQLContext, info) {
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
            throw new Error(`Insufficient authentication level. Required: ${directiveArgs.requires}`);
          }
        }

        // Check specific roles
        if (directiveArgs.roles && directiveArgs.roles.length > 0) {
          const hasRequiredRoles = this.authService.hasRoles(context.user, directiveArgs.roles);
          
          if (!hasRequiredRoles) {
            throw new Error(`Insufficient roles. Required: ${directiveArgs.roles.join(', ')}`);
          }
        }

        // Check specific permissions
        if (directiveArgs.permissions && directiveArgs.permissions.length > 0) {
          const hasRequiredPermissions = this.authService.hasPermissions(
            context.user,
            directiveArgs.permissions
          );
          
          if (!hasRequiredPermissions) {
            throw new Error(`Insufficient permissions. Required: ${directiveArgs.permissions.join(', ')}`);
          }
        }

        // Check team access if required
        if (directiveArgs.teamAccess) {
          const teamId = this.extractTeamId(args, source);
          
          if (teamId && !this.authService.canAccessTeam(context.user, teamId)) {
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
        return resolve.call(this, source, args, context, info);
      } catch (error) {
        // Log authorization failure
        this.logger.warn('Authorization failed', {
          userId: context.user?.id,
          field: info.fieldName,
          parentType: info.parentType.name,
          error: error.message,
          requires: directiveArgs.requires,
          roles: directiveArgs.roles,
          permissions: directiveArgs.permissions,
        });

        throw error;
      }
    }.bind(this);
  }

  /**
   * Checks if user meets the required authentication level
   */
  private checkAuthenticationLevel(user: any, required: string): boolean {
    const levels = {
      'USER': 1,
      'ADMIN': 2,
      'SUPER_ADMIN': 3,
    };

    const userLevel = this.getUserAuthLevel(user);
    const requiredLevel = levels[required] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Gets the user's authentication level
   */
  private getUserAuthLevel(user: any): number {
    if (user.roles.includes('super_admin')) return 3;
    if (user.roles.includes('admin') || user.roles.includes('team_admin')) return 2;
    return 1; // Regular user
  }

  /**
   * Extracts team ID from resolver arguments or source
   */
  private extractTeamId(args: any, source: any): string | undefined {
    // Check common argument names
    if (args.teamId) return args.teamId;
    if (args.input?.teamId) return args.input.teamId;
    
    // Check source object
    if (source?.teamId) return source.teamId;
    if (source?.team?.id) return source.team.id;
    
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
export function createAuthDirective(authService: AuthService) {
  return class extends AuthDirective {
    constructor() {
      super(authService);
    }
  };
}
