import { DataTypeEnum } from '../enums/data-type.enum';

/**
 * Sync Result Value Object
 * 
 * Immutable result of a sync operation with detailed metrics and error information.
 */
export class SyncResult {
  readonly isSuccess: boolean;
  readonly successfulDataTypes: DataTypeEnum[];
  readonly failedDataTypes: DataTypeEnum[];
  readonly recordsProcessed: number;
  readonly recordsCreated: number;
  readonly recordsUpdated: number;
  readonly recordsSkipped: number;
  readonly executionTimeMs: number;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly errors: SyncError[];
  readonly warnings: SyncWarning[];
  readonly metadata: Record<string, any>;

  constructor(
    isSuccess: boolean,
    successfulDataTypes: DataTypeEnum[],
    failedDataTypes: DataTypeEnum[],
    recordsProcessed: number,
    recordsCreated: number,
    recordsUpdated: number,
    recordsSkipped: number,
    executionTimeMs: number,
    startedAt: Date,
    completedAt: Date,
    errors: SyncError[] = [],
    warnings: SyncWarning[] = [],
    metadata: Record<string, any> = {}
  ) {
    this.isSuccess = isSuccess;
    this.successfulDataTypes = [...successfulDataTypes];
    this.failedDataTypes = [...failedDataTypes];
    this.recordsProcessed = recordsProcessed;
    this.recordsCreated = recordsCreated;
    this.recordsUpdated = recordsUpdated;
    this.recordsSkipped = recordsSkipped;
    this.executionTimeMs = executionTimeMs;
    this.startedAt = new Date(startedAt);
    this.completedAt = new Date(completedAt);
    this.errors = [...errors];
    this.warnings = [...warnings];
    this.metadata = { ...metadata };
  }

  /**
   * Factory method for successful sync result
   */
  static success(
    successfulDataTypes: DataTypeEnum[],
    recordsProcessed: number,
    recordsCreated: number,
    recordsUpdated: number,
    recordsSkipped: number,
    executionTimeMs: number,
    startedAt: Date,
    completedAt: Date,
    warnings: SyncWarning[] = [],
    metadata: Record<string, any> = {}
  ): SyncResult {
    return new SyncResult(
      true,
      successfulDataTypes,
      [],
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      executionTimeMs,
      startedAt,
      completedAt,
      [],
      warnings,
      metadata
    );
  }

  /**
   * Factory method for failed sync result
   */
  static failure(
    failedDataTypes: DataTypeEnum[],
    errors: SyncError[],
    executionTimeMs: number,
    startedAt: Date,
    completedAt: Date,
    partialResults?: {
      successfulDataTypes?: DataTypeEnum[];
      recordsProcessed?: number;
      recordsCreated?: number;
      recordsUpdated?: number;
      recordsSkipped?: number;
    }
  ): SyncResult {
    return new SyncResult(
      false,
      partialResults?.successfulDataTypes || [],
      failedDataTypes,
      partialResults?.recordsProcessed || 0,
      partialResults?.recordsCreated || 0,
      partialResults?.recordsUpdated || 0,
      partialResults?.recordsSkipped || 0,
      executionTimeMs,
      startedAt,
      completedAt,
      errors,
      [],
      {}
    );
  }

  /**
   * Factory method for partial sync result (some succeeded, some failed)
   */
  static partial(
    successfulDataTypes: DataTypeEnum[],
    failedDataTypes: DataTypeEnum[],
    recordsProcessed: number,
    recordsCreated: number,
    recordsUpdated: number,
    recordsSkipped: number,
    executionTimeMs: number,
    startedAt: Date,
    completedAt: Date,
    errors: SyncError[],
    warnings: SyncWarning[] = [],
    metadata: Record<string, any> = {}
  ): SyncResult {
    return new SyncResult(
      failedDataTypes.length === 0, // Success if no failures
      successfulDataTypes,
      failedDataTypes,
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      executionTimeMs,
      startedAt,
      completedAt,
      errors,
      warnings,
      metadata
    );
  }

  /**
   * Check if sync had any warnings
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Check if sync had any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get total records affected (created + updated)
   */
  getTotalRecordsAffected(): number {
    return this.recordsCreated + this.recordsUpdated;
  }

  /**
   * Get sync efficiency percentage
   */
  getEfficiencyPercentage(): number {
    if (this.recordsProcessed === 0) return 100;
    return Math.round((this.getTotalRecordsAffected() / this.recordsProcessed) * 100);
  }

  /**
   * Get human-readable summary
   */
  getSummary(): string {
    if (this.isSuccess) {
      return `Sync completed successfully. Processed ${this.recordsProcessed} records in ${this.executionTimeMs}ms`;
    } else {
      return `Sync failed with ${this.errors.length} errors. ${this.successfulDataTypes.length} data types succeeded, ${this.failedDataTypes.length} failed`;
    }
  }

  /**
   * Get detailed performance metrics
   */
  getPerformanceMetrics(): {
    recordsPerSecond: number;
    averageRecordProcessingTime: number;
    throughput: string;
  } {
    const recordsPerSecond = this.executionTimeMs > 0 
      ? Math.round((this.recordsProcessed / this.executionTimeMs) * 1000) 
      : 0;
    
    const averageRecordProcessingTime = this.recordsProcessed > 0 
      ? this.executionTimeMs / this.recordsProcessed 
      : 0;

    return {
      recordsPerSecond,
      averageRecordProcessingTime: Math.round(averageRecordProcessingTime * 100) / 100,
      throughput: `${recordsPerSecond} records/sec`
    };
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): Record<string, any> {
    return {
      isSuccess: this.isSuccess,
      successfulDataTypes: this.successfulDataTypes,
      failedDataTypes: this.failedDataTypes,
      recordsProcessed: this.recordsProcessed,
      recordsCreated: this.recordsCreated,
      recordsUpdated: this.recordsUpdated,
      recordsSkipped: this.recordsSkipped,
      executionTimeMs: this.executionTimeMs,
      startedAt: this.startedAt.toISOString(),
      completedAt: this.completedAt.toISOString(),
      errors: this.errors,
      warnings: this.warnings,
      metadata: this.metadata,
      summary: this.getSummary(),
      performanceMetrics: this.getPerformanceMetrics()
    };
  }
}

/**
 * Sync Error interface
 */
export interface SyncError {
  dataType: DataTypeEnum;
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * Sync Warning interface
 */
export interface SyncWarning {
  dataType: DataTypeEnum;
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}
