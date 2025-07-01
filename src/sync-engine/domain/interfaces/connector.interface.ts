import { ExternalSystemType } from '../../../integration-framework/domain/value-objects/external-system-type';
import { SyncResult } from '../value-objects/sync-result';
import { SyncConfiguration } from '../value-objects/sync-configuration';
import { ConnectionStatus } from '../../../integration-framework/domain/value-objects/connection-status';
import { DataTypeEnum } from '../enums/data-type.enum';

/**
 * Connector Interface - Defines contract for external system connectors
 * 
 * Implements the Strategy pattern to allow different external system integrations
 * while maintaining consistent behavior and error handling.
 */
export interface IConnector {
  /**
   * Get the external system type this connector handles
   */
  getSystemType(): ExternalSystemType;

  /**
   * Get supported data types for this connector
   */
  getSupportedDataTypes(): DataTypeEnum[];

  /**
   * Establish connection to external system
   */
  connect(configuration: SyncConfiguration): Promise<ConnectionStatus>;

  /**
   * Disconnect from external system
   */
  disconnect(): Promise<void>;

  /**
   * Test connection health
   */
  healthCheck(): Promise<boolean>;

  /**
   * Synchronize data from external system
   */
  sync(dataTypes: DataTypeEnum[], lastSyncTimestamp?: Date): Promise<SyncResult>;

  /**
   * Get connector configuration requirements
   */
  getConfigurationSchema(): Record<string, any>;

  /**
   * Validate configuration before connection
   */
  validateConfiguration(configuration: SyncConfiguration): Promise<boolean>;

  /**
   * Get rate limiting information
   */
  getRateLimit(): {
    requestsPerMinute: number;
    burstSize: number;
    cooldownPeriod: number;
  };

  /**
   * Handle authentication refresh if needed
   */
  refreshAuthentication(): Promise<boolean>;
}

/**
 * Async Connector Interface - For connectors that support real-time data
 */
export interface IAsyncConnector extends IConnector {
  /**
   * Subscribe to real-time data updates
   */
  subscribe(dataTypes: DataTypeEnum[], callback: (data: any) => void): Promise<string>;

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Check if real-time connection is active
   */
  isRealtimeConnected(): boolean;
}

/**
 * Bulk Connector Interface - For connectors that support batch operations
 */
export interface IBulkConnector extends IConnector {
  /**
   * Perform bulk data synchronization
   */
  bulkSync(dataTypes: DataTypeEnum[], batchSize: number): Promise<SyncResult[]>;

  /**
   * Get optimal batch size for this connector
   */
  getOptimalBatchSize(): number;

  /**
   * Check if bulk operation is supported
   */
  supportsBulkOperations(): boolean;
}
