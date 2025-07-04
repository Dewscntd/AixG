import { Injectable } from '@nestjs/common';
import { IConnector } from '../interfaces/connector.interface';
import { ExternalSystemType } from '../../../integration-framework/domain/value-objects/external-system-type';
import { SyncConfiguration } from '../value-objects/sync-configuration';
import {
  SyncResult,
  SyncError,
  SyncWarning,
} from '../value-objects/sync-result';
import { ConnectionStatus } from '../../../integration-framework/domain/value-objects/connection-status';
import { DataTypeEnum } from '../enums/data-type.enum';

/**
 * Base Connector Abstract Class
 *
 * Provides common functionality for all external system connectors,
 * implementing the Template Method pattern with hook methods for customization.
 */
@Injectable()
export abstract class BaseConnector implements IConnector {
  protected connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  protected configuration?: SyncConfiguration;
  protected lastSyncTimestamp?: Date;
  protected retryCount: number = 0;

  /**
   * Abstract methods to be implemented by concrete connectors
   */
  abstract getSystemType(): ExternalSystemType;
  abstract getSupportedDataTypes(): DataTypeEnum[];
  abstract getConfigurationSchema(): Record<string, any>;

  /**
   * Template method for connection establishment
   */
  async connect(configuration: SyncConfiguration): Promise<ConnectionStatus> {
    try {
      // Validate configuration first
      const isValid = await this.validateConfiguration(configuration);
      if (!isValid) {
        throw new Error('Invalid configuration provided');
      }

      this.configuration = configuration;

      // Hook method for specific connection logic
      await this.establishConnection();

      // Hook method for post-connection setup
      await this.postConnectionSetup();

      this.connectionStatus = ConnectionStatus.CONNECTED;
      return this.connectionStatus;
    } catch (error) {
      this.connectionStatus = ConnectionStatus.FAILED;
      throw new Error(
        `Failed to connect to ${this.getSystemType().value}: ${error}`
      );
    }
  }

  /**
   * Template method for disconnection
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connectionStatus === ConnectionStatus.CONNECTED) {
        // Hook method for cleanup before disconnection
        await this.preDisconnectionCleanup();

        // Hook method for specific disconnection logic
        await this.closeConnection();

        this.connectionStatus = ConnectionStatus.DISCONNECTED;
      }
    } catch (error) {
      console.error(
        `Error during disconnection from ${this.getSystemType().value}:`,
        error
      );
      // Still mark as disconnected even if cleanup failed
      this.connectionStatus = ConnectionStatus.DISCONNECTED;
    }
  }

  /**
   * Health check implementation with retry logic
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.connectionStatus !== ConnectionStatus.CONNECTED) {
        return false;
      }

      // Hook method for specific health check logic
      return await this.performHealthCheck();
    } catch (error) {
      console.error(
        `Health check failed for ${this.getSystemType().value}:`,
        error
      );
      return false;
    }
  }

  /**
   * Template method for synchronization with error handling and retry logic
   */
  async sync(
    dataTypes: DataTypeEnum[],
    lastSyncTimestamp?: Date
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const startedAt = new Date();

    if (this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Connector not connected. Call connect() first.');
    }

    // Validate data types are supported
    const unsupportedTypes = dataTypes.filter(
      dataType => !this.getSupportedDataTypes().includes(dataType)
    );

    if (unsupportedTypes.length > 0) {
      throw new Error(`Unsupported data types: ${unsupportedTypes.join(', ')}`);
    }

    const syncResults: {
      dataType: DataTypeEnum;
      success: boolean;
      records: number;
      error?: SyncError;
    }[] = [];
    const warnings: SyncWarning[] = [];

    // Sync each data type individually for better error isolation
    for (const dataType of dataTypes) {
      try {
        // Hook method for rate limiting
        await this.enforceRateLimit();

        // Hook method for specific sync logic
        const {
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsSkipped,
          warnings: typeWarnings,
        } = await this.syncDataType(dataType, lastSyncTimestamp);

        syncResults.push({
          dataType,
          success: true,
          records: recordsProcessed,
        });

        warnings.push(...typeWarnings);
      } catch (error) {
        const syncError: SyncError = {
          dataType,
          code: (error as any).code || 'SYNC_ERROR',
          message: (error as any).message || 'Unknown error',
          details: { originalError: error },
          timestamp: new Date(),
          recoverable: this.isRecoverableError(error),
        };

        syncResults.push({
          dataType,
          success: false,
          records: 0,
          error: syncError,
        });

        // Retry logic for recoverable errors
        if (
          syncError.recoverable &&
          this.retryCount < this.configuration!.retryAttempts
        ) {
          this.retryCount++;
          console.log(
            `Retrying ${dataType} sync (attempt ${this.retryCount}/${
              this.configuration!.retryAttempts
            })`
          );

          // Exponential backoff
          await this.sleep(Math.pow(2, this.retryCount) * 1000);

          // Recursive retry
          return this.sync([dataType], lastSyncTimestamp);
        }
      }
    }

    // Reset retry count on completion
    this.retryCount = 0;
    this.lastSyncTimestamp = new Date();

    const completedAt = new Date();
    const executionTimeMs = completedAt.getTime() - startedAt.getTime();

    const successfulResults = syncResults.filter(r => r.success);
    const failedResults = syncResults.filter(r => !r.success);

    const totalRecordsProcessed = successfulResults.reduce(
      (sum, r) => sum + r.records,
      0
    );

    // Create result based on success/failure ratio
    if (failedResults.length === 0) {
      return SyncResult.success(
        successfulResults.map(r => r.dataType),
        totalRecordsProcessed,
        0, // recordsCreated - would need to be tracked separately
        0, // recordsUpdated - would need to be tracked separately
        0, // recordsSkipped - would need to be tracked separately
        executionTimeMs,
        startedAt,
        completedAt,
        warnings
      );
    } else if (successfulResults.length === 0) {
      return SyncResult.failure(
        failedResults.map(r => r.dataType),
        failedResults.map(r => r.error!),
        executionTimeMs,
        startedAt,
        completedAt
      );
    } else {
      return SyncResult.partial(
        successfulResults.map(r => r.dataType),
        failedResults.map(r => r.dataType),
        totalRecordsProcessed,
        0, // recordsCreated
        0, // recordsUpdated
        0, // recordsSkipped
        executionTimeMs,
        startedAt,
        completedAt,
        failedResults.map(r => r.error!),
        warnings
      );
    }
  }

  /**
   * Default configuration validation
   */
  async validateConfiguration(
    configuration: SyncConfiguration
  ): Promise<boolean> {
    try {
      // Basic validation is handled by SyncConfiguration constructor
      // Hook method for connector-specific validation
      return await this.validateSpecificConfiguration(configuration);
    } catch (error) {
      console.error(
        `Configuration validation failed for ${this.getSystemType().value}:`,
        error
      );
      return false;
    }
  }

  /**
   * Default rate limiting implementation
   */
  getRateLimit(): {
    requestsPerMinute: number;
    burstSize: number;
    cooldownPeriod: number;
  } {
    return {
      requestsPerMinute: 60, // Default: 1 request per second
      burstSize: 10, // Allow burst of 10 requests
      cooldownPeriod: 1000, // 1 second cooldown
    };
  }

  /**
   * Default authentication refresh - override if needed
   */
  async refreshAuthentication(): Promise<boolean> {
    // Default implementation - no-op
    return true;
  }

  // Hook methods to be implemented by concrete connectors
  protected abstract establishConnection(): Promise<void>;
  protected abstract closeConnection(): Promise<void>;
  protected abstract performHealthCheck(): Promise<boolean>;
  protected abstract syncDataType(
    dataType: DataTypeEnum,
    lastSyncTimestamp?: Date
  ): Promise<{
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsSkipped: number;
    warnings: SyncWarning[];
  }>;
  protected abstract validateSpecificConfiguration(
    configuration: SyncConfiguration
  ): Promise<boolean>;

  // Optional hook methods with default implementations
  protected async postConnectionSetup(): Promise<void> {
    // Default: no-op
  }

  protected async preDisconnectionCleanup(): Promise<void> {
    // Default: no-op
  }

  protected async enforceRateLimit(): Promise<void> {
    // Default: simple delay based on rate limit
    const rateLimit = this.getRateLimit();
    const delayMs = (60 * 1000) / rateLimit.requestsPerMinute;
    await this.sleep(delayMs);
  }

  protected isRecoverableError(error: any): boolean {
    // Default logic for determining if error is recoverable
    const recoverableCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      '429',
      '503',
      '502',
    ];
    return recoverableCodes.some(
      code =>
        error.code === code ||
        error.status === code ||
        error.message?.includes(code)
    );
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility methods for concrete connectors
  protected isConnected(): boolean {
    return this.connectionStatus === ConnectionStatus.CONNECTED;
  }

  protected getLastSyncTimestamp(): Date | undefined {
    return this.lastSyncTimestamp;
  }

  protected createSyncError(
    dataType: DataTypeEnum,
    code: string,
    message: string,
    details?: Record<string, any>,
    recoverable: boolean = true
  ): SyncError {
    return {
      dataType,
      code,
      message,
      details: details || {},
      timestamp: new Date(),
      recoverable,
    };
  }

  protected createSyncWarning(
    dataType: DataTypeEnum,
    code: string,
    message: string,
    details?: Record<string, any>
  ): SyncWarning {
    return {
      dataType,
      code,
      message,
      details: details || {},
      timestamp: new Date(),
    };
  }
}
