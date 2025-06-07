/**
 * Authentication Service
 * 
 * Handles JWT token validation, user authentication, and authorization
 * Implements composition pattern for maximum flexibility and testability
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import Redis from 'ioredis';

import { User } from '../types/context';

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  roles: string[];
  permissions: string[];
  teamId?: string;
  iat: number;
  exp: number;
}

export interface AuthenticationResult {
  user: User;
  token: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly redis: Redis;
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(this.configService.get<string>('redisUrl'));
    this.jwtSecret = this.configService.get<string>('jwtSecret');
  }

  /**
   * Validates an HTTP request and extracts user information
   */
  async validateRequest(req: Request): Promise<User | undefined> {
    try {
      const token = this.extractTokenFromRequest(req);
      if (!token) {
        return undefined;
      }

      return await this.validateToken(token);
    } catch (error) {
      this.logger.warn(`Request validation failed: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Validates a JWT token and returns user information
   */
  async validateToken(token: string): Promise<User> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Verify JWT token
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Check if user is still active
      const user = await this.getUserFromPayload(payload);
      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      throw error;
    }
  }

  /**
   * Generates a new JWT token for a user
   */
  async generateToken(user: User): Promise<string> {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      teamId: user.teamId,
    };

    const expiresIn = this.configService.get<string>('jwtExpiresIn', '24h');
    
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn,
      issuer: 'footanalytics-api-gateway',
      audience: 'footanalytics-platform',
    });
  }

  /**
   * Revokes a token by adding it to the blacklist
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const payload = jwt.decode(token) as JWTPayload;
      if (payload && payload.exp) {
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.setex(`blacklist:${token}`, ttl, '1');
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to revoke token: ${error.message}`);
    }
  }

  /**
   * Checks if a user has the required roles
   */
  hasRoles(user: User, requiredRoles: string[]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.some(role => user.roles.includes(role));
  }

  /**
   * Checks if a user has the required permissions
   */
  hasPermissions(user: User, requiredPermissions: string[]): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    return requiredPermissions.some(permission => user.permissions.includes(permission));
  }

  /**
   * Checks if a user can access a specific team's resources
   */
  canAccessTeam(user: User, teamId: string): boolean {
    // Super admin can access all teams
    if (user.roles.includes('super_admin')) {
      return true;
    }

    // Team admin can access their own team
    if (user.roles.includes('team_admin') && user.teamId === teamId) {
      return true;
    }

    // Coach can access their own team
    if (user.roles.includes('coach') && user.teamId === teamId) {
      return true;
    }

    // Analyst can access their own team
    if (user.roles.includes('analyst') && user.teamId === teamId) {
      return true;
    }

    return false;
  }

  /**
   * Extracts JWT token from request headers
   */
  private extractTokenFromRequest(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  /**
   * Checks if a token is blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await this.redis.get(`blacklist:${token}`);
      return result === '1';
    } catch (error) {
      this.logger.warn(`Failed to check token blacklist: ${error.message}`);
      return false;
    }
  }

  /**
   * Converts JWT payload to User object
   */
  private async getUserFromPayload(payload: JWTPayload): Promise<User> {
    // In a real implementation, this would fetch additional user data from the database
    // For now, we'll construct the user from the JWT payload
    
    // Check cache first
    const cacheKey = `user:${payload.sub}`;
    const cachedUser = await this.redis.get(cacheKey);
    
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch (error) {
        this.logger.warn(`Failed to parse cached user: ${error.message}`);
      }
    }

    // Construct user from payload (in real app, fetch from database)
    const user: User = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
      teamId: payload.teamId,
      isActive: true, // In real app, check database
      lastLoginAt: new Date(),
    };

    // Cache user for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(user));

    return user;
  }

  /**
   * Refreshes user data in cache
   */
  async refreshUserCache(userId: string): Promise<void> {
    const cacheKey = `user:${userId}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Health check for authentication service
   */
  async healthCheck(): Promise<{ redis: boolean; jwt: boolean }> {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Test JWT functionality
      const testPayload = { test: true };
      const testToken = jwt.sign(testPayload, this.jwtSecret);
      jwt.verify(testToken, this.jwtSecret);

      return { redis: true, jwt: true };
    } catch (error) {
      this.logger.error(`Auth service health check failed: ${error.message}`);
      return { redis: false, jwt: false };
    }
  }
}
