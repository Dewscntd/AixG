/**
 * Shared Module Barrel Exports
 * Provides centralized access to shared utilities, types, and services
 */

// Common Types
export * from '../types/global';

// Domain Models (if they exist in shared)
export * from '../domain/models';

// Common Utilities (to be created)
// export * from './utils';
// export * from './constants';
// export * from './validators';
// export * from './helpers';

// Common Interfaces (to be created)
// export * from './interfaces';

// Re-export commonly used external types
export type { Request, Response, NextFunction } from 'express';
export type { Logger } from '@nestjs/common';
export type { ConfigService } from '@nestjs/config';
