/**
 * Snapshot Test Setup for FootAnalytics Platform
 * Configures snapshot testing for ML outputs and UI components
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

// Snapshot configuration
const SNAPSHOT_CONFIG = {
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true',
  snapshotDir: '__snapshots__',
  snapshotExtension: '.snap.json',
  tolerance: 0.001, // Floating point comparison tolerance
};

// Snapshot test utilities
export const SnapshotTestUtils = {
  /**
   * Creates or compares a snapshot
   */
  expectMatchSnapshot: (testName: string, data: any, options: SnapshotOptions = {}) => {
    const snapshotPath = getSnapshotPath(testName, options.directory);
    const normalizedData = normalizeSnapshotData(data, options);
    const serializedData = serializeSnapshotData(normalizedData, options);
    
    if (existsSync(snapshotPath)) {
      if (SNAPSHOT_CONFIG.updateSnapshots) {
        updateSnapshot(snapshotPath, serializedData, testName);
      } else {
        compareSnapshot(snapshotPath, serializedData, testName);
      }
    } else {
      createSnapshot(snapshotPath, serializedData, testName);
    }
  },

  /**
   * Creates a snapshot hash for quick comparison
   */
  createSnapshotHash: (data: any) => {
    const serialized = JSON.stringify(data, null, 0);
    return createHash('sha256').update(serialized).digest('hex');
  },

  /**
   * Normalizes ML output data for consistent snapshots
   */
  normalizeMLOutput: (output: any) => ({
      ...output,
      // Remove timestamps and random IDs
      timestamp: 'normalized',
      id: output.id ? 'normalized-id' : undefined,
      
      // Round floating point numbers
      confidence: typeof output.confidence === 'number' 
        ? Math.round(output.confidence * 1000) / 1000 
        : output.confidence,
      
      // Normalize positions
      position: output.position ? {
        x: Math.round(output.position.x * 100) / 100,
        y: Math.round(output.position.y * 100) / 100,
      } : undefined,
      
      // Normalize arrays recursively
      players: output.players?.map((player: any) => 
        SnapshotTestUtils.normalizeMLOutput(player)
      ),
      
      events: output.events?.map((event: any) => 
        SnapshotTestUtils.normalizeMLOutput(event)
      ),
      
      // Remove processing times
      processingTime: 'normalized',
      metadata: output.metadata ? {
        ...output.metadata,
        processingTime: 'normalized',
        timestamp: 'normalized',
      } : undefined,
    }),

  /**
   * Normalizes analytics data for consistent snapshots
   */
  normalizeAnalyticsData: (data: any) => ({
      ...data,
      // Round metrics to consistent precision
      xG: typeof data.xG === 'number' ? Math.round(data.xG * 1000) / 1000 : data.xG,
      possession: typeof data.possession === 'number' 
        ? Math.round(data.possession * 100) / 100 
        : data.possession,
      
      // Normalize timestamps
      lastUpdated: 'normalized',
      createdAt: 'normalized',
      updatedAt: 'normalized',
      
      // Normalize IDs
      id: data.id ? 'normalized-id' : undefined,
      matchId: data.matchId ? 'normalized-match-id' : undefined,
      teamId: data.teamId ? 'normalized-team-id' : undefined,
      
      // Recursively normalize nested objects
      homeTeam: data.homeTeam ? SnapshotTestUtils.normalizeAnalyticsData(data.homeTeam) : undefined,
      awayTeam: data.awayTeam ? SnapshotTestUtils.normalizeAnalyticsData(data.awayTeam) : undefined,
    }),

  /**
   * Compares two snapshots with tolerance for floating point numbers
   */
  compareWithTolerance: (actual: any, expected: any, tolerance = SNAPSHOT_CONFIG.tolerance): boolean => {
    if (typeof actual === 'number' && typeof expected === 'number') {
      return Math.abs(actual - expected) <= tolerance;
    }
    
    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) return false;
      return actual.every((item, index) => 
        SnapshotTestUtils.compareWithTolerance(item, expected[index], tolerance)
      );
    }
    
    if (typeof actual === 'object' && typeof expected === 'object' && actual !== null && expected !== null) {
      const actualKeys = Object.keys(actual).sort();
      const expectedKeys = Object.keys(expected).sort();
      
      if (actualKeys.length !== expectedKeys.length) return false;
      if (!actualKeys.every(key => expectedKeys.includes(key))) return false;
      
      return actualKeys.every(key => 
        SnapshotTestUtils.compareWithTolerance(actual[key], expected[key], tolerance)
      );
    }
    
    return actual === expected;
  },

  /**
   * Validates snapshot structure
   */
  validateSnapshotStructure: (data: any, schema: any) => {
    const validate = (obj: any, schemaObj: any, path = '') => {
      for (const [key, expectedType] of Object.entries(schemaObj)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (!(key in obj)) {
          throw new Error(`Missing field in snapshot: ${fullPath}`);
        }
        
        const actualValue = obj[key];
        
        if (typeof expectedType === 'string') {
          if (typeof actualValue !== expectedType) {
            throw new Error(`Type mismatch in snapshot at ${fullPath}: expected ${expectedType}, got ${typeof actualValue}`);
          }
        } else if (typeof expectedType === 'object' && expectedType !== null) {
          if (Array.isArray(expectedType)) {
            if (!Array.isArray(actualValue)) {
              throw new Error(`Type mismatch in snapshot at ${fullPath}: expected array`);
            }
            if (expectedType.length > 0 && actualValue.length > 0) {
              validate(actualValue[0], expectedType[0], `${fullPath}[0]`);
            }
          } else {
            validate(actualValue, expectedType, fullPath);
          }
        }
      }
    };
    
    validate(data, schema);
  },
};

// Snapshot options interface
interface SnapshotOptions {
  directory?: string;
  normalizer?: (data: any) => any;
  tolerance?: number;
  schema?: any;
}

// Helper functions
function getSnapshotPath(testName: string, directory?: string): string {
  const snapshotDir = directory || join(process.cwd(), 'test', SNAPSHOT_CONFIG.snapshotDir);
  
  if (!existsSync(snapshotDir)) {
    mkdirSync(snapshotDir, { recursive: true });
  }
  
  return join(snapshotDir, `${testName}${SNAPSHOT_CONFIG.snapshotExtension}`);
}

function normalizeSnapshotData(data: any, options: SnapshotOptions): any {
  if (options.normalizer) {
    return options.normalizer(data);
  }
  
  // Default normalization
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // Remove functions
    if (typeof value === 'function') {
      return '[Function]';
    }
    
    // Normalize dates
    if (value instanceof Date) {
      return 'normalized-date';
    }
    
    // Round numbers to avoid floating point issues
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return Math.round(value * 1000) / 1000;
    }
    
    return value;
  }));
}

function serializeSnapshotData(data: any, options: SnapshotOptions): string {
  return JSON.stringify(data, null, 2);
}

function createSnapshot(path: string, data: string, testName: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(path, data, 'utf8');
  console.log(`📸 Created snapshot: ${testName}`);
}

function updateSnapshot(path: string, data: string, testName: string): void {
  writeFileSync(path, data, 'utf8');
  console.log(`📸 Updated snapshot: ${testName}`);
}

function compareSnapshot(path: string, data: string, testName: string): void {
  const existingSnapshot = readFileSync(path, 'utf8');
  
  if (data !== existingSnapshot) {
    // Try parsing and comparing with tolerance
    try {
      const actualData = JSON.parse(data);
      const expectedData = JSON.parse(existingSnapshot);
      
      if (!SnapshotTestUtils.compareWithTolerance(actualData, expectedData)) {
        throw new Error(`Snapshot mismatch for ${testName}. Run with UPDATE_SNAPSHOTS=true to update.`);
      }
    } catch (parseError) {
      throw new Error(`Snapshot mismatch for ${testName}. Run with UPDATE_SNAPSHOTS=true to update.`);
    }
  }
}

// Common snapshot schemas
export const SnapshotSchemas = {
  playerDetection: {
    players: [{
      id: 'string',
      teamId: 'string',
      position: { x: 'number', y: 'number' },
      confidence: 'number',
    }],
    metadata: {
      modelVersion: 'string',
      confidence: 'number',
    },
  },

  ballTracking: {
    ball: {
      position: { x: 'number', y: 'number' },
      velocity: { x: 'number', y: 'number' },
      confidence: 'number',
    },
    metadata: {
      trackingQuality: 'string',
      modelVersion: 'string',
    },
  },

  eventDetection: {
    events: [{
      type: 'string',
      confidence: 'number',
      location: { x: 'number', y: 'number' },
    }],
    metadata: {
      detectionQuality: 'string',
      modelVersion: 'string',
    },
  },

  analytics: {
    xG: { homeTeam: 'number', awayTeam: 'number' },
    possession: { homeTeam: 'number', awayTeam: 'number' },
    metadata: {
      calculationMethod: 'string',
      confidence: 'number',
    },
  },
};

// Setup snapshot testing environment
beforeEach(() => {
  // Reset snapshot configuration for each test
  if (process.env.UPDATE_SNAPSHOTS === 'true') {
    console.log('📸 Running in snapshot update mode');
  }
});

console.log('📸 Snapshot test setup completed');
