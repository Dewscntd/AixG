import { AggregateRoot } from '../base/aggregate-root';
import { DataSourceId } from '../value-objects/data-source-id';
import { ExternalSystemType } from '../value-objects/external-system-type';
import { IntegrationConfiguration } from '../value-objects/integration-configuration';
import { ApiCredentials } from '../value-objects/api-credentials';
import { SyncRule } from '../entities/sync-rule';
import { SyncSession } from '../entities/sync-session';
import { ConnectionStatus } from '../value-objects/connection-status';
import { SyncInitiatedEvent } from '../events/sync-initiated.event';
import { DataSourceRegisteredEvent } from '../events/data-source-registered.event';

/**
 * DataSource Aggregate - Core entity for external system integration
 * 
 * Implements DDD principles with rich domain behavior and clear separation of concerns.
 * Responsible for managing external data source connections and sync orchestration.
 */
export class DataSourceAggregate extends AggregateRoot {
  constructor(
    private readonly id: DataSourceId,
    private readonly systemType: ExternalSystemType,
    private readonly configuration: IntegrationConfiguration,
    private readonly credentials: ApiCredentials,
    private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED,
    private lastSyncAt?: Date
  ) {
    super();
  }

  /**
   * Factory method to create new data source
   */
  static create(
    systemType: ExternalSystemType,
    configuration: IntegrationConfiguration,
    credentials: ApiCredentials
  ): DataSourceAggregate {
    const id = DataSourceId.generate();
    const dataSource = new DataSourceAggregate(
      id,
      systemType,
      configuration,
      credentials
    );

    // Publish domain event
    dataSource.addDomainEvent(new DataSourceRegisteredEvent(
      id,
      systemType,
      configuration.supportedDataTypes,
      new Date()
    ));

    return dataSource;
  }

  /**
   * Initiate sync session with domain rules
   */
  initiateSync(syncRules: SyncRule[]): SyncSession {
    // Business rule: Can only sync if connected
    if (!this.isConnected()) {
      throw new Error('Cannot initiate sync - data source not connected');
    }

    // Business rule: Validate sync rules against supported data types
    this.validateSyncRules(syncRules);

    const session = SyncSession.create(this.id, syncRules);
    
    // Publish domain event
    this.addDomainEvent(new SyncInitiatedEvent(
      session.getId(),
      this.id,
      syncRules.length,
      new Date()
    ));

    this.lastSyncAt = new Date();
    return session;
  }

  /**
   * Validate connection to external system
   */
  async validateConnection(): Promise<ConnectionStatus> {
    // This will be implemented by infrastructure layer
    // Domain only defines the contract
    return this.connectionStatus;
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
  }

  /**
   * Business rule validation
   */
  private validateSyncRules(syncRules: SyncRule[]): void {
    const supportedTypes = this.configuration.supportedDataTypes;
    
    for (const rule of syncRules) {
      if (!supportedTypes.includes(rule.getDataType())) {
        throw new Error(
          `Data type ${rule.getDataType()} not supported by ${this.systemType.value}`
        );
      }
    }
  }

  /**
   * Check if data source is connected
   */
  isConnected(): boolean {
    return this.connectionStatus === ConnectionStatus.CONNECTED;
  }

  /**
   * Get configuration for external access (read-only)
   */
  getConfiguration(): IntegrationConfiguration {
    return this.configuration;
  }

  /**
   * Get system type
   */
  getSystemType(): ExternalSystemType {
    return this.systemType;
  }

  /**
   * Get data source ID
   */
  getId(): DataSourceId {
    return this.id;
  }

  /**
   * Get encrypted credentials (infrastructure handles decryption)
   */
  getCredentials(): ApiCredentials {
    return this.credentials;
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncAt(): Date | undefined {
    return this.lastSyncAt;
  }

  /**
   * Check if sync is overdue based on configuration
   */
  isSyncOverdue(): boolean {
    if (!this.lastSyncAt) return true;
    
    const scheduleInterval = this.configuration.syncSchedule.getIntervalMs();
    const timeSinceLastSync = Date.now() - this.lastSyncAt.getTime();
    
    return timeSinceLastSync > scheduleInterval;
  }
}
