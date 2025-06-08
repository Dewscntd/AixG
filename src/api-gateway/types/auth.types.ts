// Authentication and authorization types for the API Gateway

export interface User {
  id: string;
  email: string;
  roles: UserRole[];
  teamIds: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  profile?: UserProfile;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone?: string;
  language?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  matchAlerts: boolean;
  systemUpdates: boolean;
}

export interface DashboardSettings {
  defaultView: 'matches' | 'analytics' | 'teams';
  refreshInterval: number;
  showAdvancedMetrics: boolean;
}

export type UserRole = 'user' | 'admin' | 'super_admin' | 'team_admin' | 'analyst';

export interface AuthContext {
  user?: User;
  token?: string;
  permissions: Permission[];
  teamAccess: string[];
  sessionId?: string;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface AuthDirectiveArgs {
  requires?: UserRole;
  teamAccess?: boolean;
  permissions?: string[];
}

export interface ServiceHealthDetails {
  version?: string;
  uptime?: number;
  memoryUsage?: MemoryUsage;
  cpuUsage?: number;
  activeConnections?: number;
  lastError?: string;
  dependencies?: ServiceDependency[];
  metrics?: ServiceMetrics;
}

export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  heap?: {
    used: number;
    total: number;
  };
}

export interface ServiceDependency {
  name: string;
  status: 'connected' | 'disconnected' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  errorCount?: number;
}

export interface ServiceMetrics {
  requestsPerSecond: number;
  errorRate: number;
  averageResponseTime: number;
  peakMemoryUsage: number;
  cacheHitRate?: number;
}

// GraphQL specific types
export interface GraphQLFieldArgs {
  [key: string]: unknown;
}

export interface GraphQLResolverSource {
  [key: string]: unknown;
}

export interface AuthenticationError extends Error {
  code: AuthErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;
}

export type AuthErrorCode = 
  | 'AUTHENTICATION_REQUIRED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'USER_INACTIVE'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'ACCESS_DENIED';

// Team access validation types
export interface TeamAccessContext {
  userId: string;
  teamId: string;
  action: string;
  resource: string;
}

export interface TeamAccessResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: UserRole;
}

// Authentication levels for backward compatibility
export interface AuthenticationLevels {
  USER: 1;
  ADMIN: 2;
  SUPER_ADMIN: 3;
}

export const AUTH_LEVELS: AuthenticationLevels = {
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
} as const;
