import { DataTypeEnum } from '../enums/data-type.enum';

/**
 * Sync Configuration Value Object
 * 
 * Immutable configuration for sync operations with validation rules.
 */
export class SyncConfiguration {
  readonly dataTypes: DataTypeEnum[];
  readonly apiEndpoint: string;
  readonly credentials: Record<string, string>;
  readonly syncInterval: number; // minutes
  readonly batchSize: number;
  readonly timeout: number; // milliseconds
  readonly retryAttempts: number;
  readonly enableRealtime: boolean;
  readonly filters: Record<string, any>;

  constructor(
    dataTypes: DataTypeEnum[],
    apiEndpoint: string,
    credentials: Record<string, string>,
    syncInterval: number = 60,
    batchSize: number = 100,
    timeout: number = 30000,
    retryAttempts: number = 3,
    enableRealtime: boolean = false,
    filters: Record<string, any> = {}
  ) {
    this.validateConfiguration(dataTypes, apiEndpoint, credentials, syncInterval, batchSize, timeout, retryAttempts);
    
    this.dataTypes = [...dataTypes]; // Ensure immutability
    this.apiEndpoint = apiEndpoint;
    this.credentials = { ...credentials }; // Ensure immutability
    this.syncInterval = syncInterval;
    this.batchSize = batchSize;
    this.timeout = timeout;
    this.retryAttempts = retryAttempts;
    this.enableRealtime = enableRealtime;
    this.filters = filters ? { ...filters } : {};
  }

  /**
   * Validate configuration parameters
   */
  private validateConfiguration(
    dataTypes: DataTypeEnum[],
    apiEndpoint: string,
    credentials: Record<string, string>,
    syncInterval: number,
    batchSize: number,
    timeout: number,
    retryAttempts: number
  ): void {
    if (!dataTypes || dataTypes.length === 0) {
      throw new Error('At least one data type must be specified');
    }

    if (!apiEndpoint || apiEndpoint.trim() === '') {
      throw new Error('API endpoint must be provided');
    }

    if (!this.isValidUrl(apiEndpoint)) {
      throw new Error('API endpoint must be a valid URL');
    }

    if (!credentials || Object.keys(credentials).length === 0) {
      throw new Error('Credentials must be provided');
    }

    if (syncInterval < 1 || syncInterval > 1440) { // Between 1 minute and 24 hours
      throw new Error('Sync interval must be between 1 and 1440 minutes');
    }

    if (batchSize < 1 || batchSize > 10000) {
      throw new Error('Batch size must be between 1 and 10000');
    }

    if (timeout < 1000 || timeout > 300000) { // Between 1 second and 5 minutes
      throw new Error('Timeout must be between 1000 and 300000 milliseconds');
    }

    if (retryAttempts < 0 || retryAttempts > 10) {
      throw new Error('Retry attempts must be between 0 and 10');
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new configuration with updated data types
   */
  withDataTypes(dataTypes: DataTypeEnum[]): SyncConfiguration {
    return new SyncConfiguration(
      dataTypes,
      this.apiEndpoint,
      this.credentials,
      this.syncInterval,
      this.batchSize,
      this.timeout,
      this.retryAttempts,
      this.enableRealtime,
      this.filters
    );
  }

  /**
   * Create a new configuration with updated sync interval
   */
  withSyncInterval(syncInterval: number): SyncConfiguration {
    return new SyncConfiguration(
      this.dataTypes,
      this.apiEndpoint,
      this.credentials,
      syncInterval,
      this.batchSize,
      this.timeout,
      this.retryAttempts,
      this.enableRealtime,
      this.filters
    );
  }

  /**
   * Create a new configuration with filters
   */
  withFilters(filters: Record<string, any>): SyncConfiguration {
    return new SyncConfiguration(
      this.dataTypes,
      this.apiEndpoint,
      this.credentials,
      this.syncInterval,
      this.batchSize,
      this.timeout,
      this.retryAttempts,
      this.enableRealtime,
      filters
    );
  }

  /**
   * Check if configuration is for real-time sync
   */
  isRealtimeEnabled(): boolean {
    return this.enableRealtime;
  }

  /**
   * Get sanitized configuration for logging (without credentials)
   */
  toSanitizedObject(): Omit<SyncConfiguration, 'credentials'> {
    return {
      dataTypes: this.dataTypes,
      apiEndpoint: this.apiEndpoint,
      syncInterval: this.syncInterval,
      batchSize: this.batchSize,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      enableRealtime: this.enableRealtime,
      filters: this.filters,
      withDataTypes: this.withDataTypes.bind(this),
      withSyncInterval: this.withSyncInterval.bind(this),
      withFilters: this.withFilters.bind(this),
      isRealtimeEnabled: this.isRealtimeEnabled.bind(this),
      toSanitizedObject: this.toSanitizedObject.bind(this),
      equals: this.equals.bind(this)
    };
  }

  /**
   * Check equality with another configuration
   */
  equals(other: SyncConfiguration): boolean {
    return (
      JSON.stringify(this.dataTypes.sort()) === JSON.stringify(other.dataTypes.sort()) &&
      this.apiEndpoint === other.apiEndpoint &&
      JSON.stringify(this.credentials) === JSON.stringify(other.credentials) &&
      this.syncInterval === other.syncInterval &&
      this.batchSize === other.batchSize &&
      this.timeout === other.timeout &&
      this.retryAttempts === other.retryAttempts &&
      this.enableRealtime === other.enableRealtime &&
      JSON.stringify(this.filters) === JSON.stringify(other.filters)
    );
  }
}
