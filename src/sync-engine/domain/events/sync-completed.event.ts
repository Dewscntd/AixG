import { DomainEvent } from '../../../integration-framework/domain/events/domain-event';
import { ExternalSystemType } from '../../../integration-framework/domain/value-objects/external-system-type';
import { DataTypeEnum } from '../enums/data-type.enum';

/**
 * Sync Completed Domain Event
 *
 * Published when a sync operation completes (successfully or with partial success)
 */
export class SyncCompletedEvent extends DomainEvent {
  readonly systemType: ExternalSystemType;
  readonly successfulDataTypes: DataTypeEnum[];
  readonly failedDataTypes: DataTypeEnum[];
  readonly recordsProcessed: number;
  readonly executionTimeMs: number;
  readonly timestamp: Date;

  constructor(
    systemType: ExternalSystemType,
    successfulDataTypes: DataTypeEnum[],
    failedDataTypes: DataTypeEnum[],
    recordsProcessed: number,
    executionTimeMs: number,
    timestamp: Date = new Date()
  ) {
    super();
    this.systemType = systemType;
    this.successfulDataTypes = [...successfulDataTypes];
    this.failedDataTypes = [...failedDataTypes];
    this.recordsProcessed = recordsProcessed;
    this.executionTimeMs = executionTimeMs;
    this.timestamp = timestamp;
  }

  getEventName(): string {
    return 'SyncCompleted';
  }

  getEventVersion(): string {
    return '1.0';
  }

  getAggregateId(): string {
    return `sync-${this.systemType.value}-${this.timestamp.getTime()}`;
  }

  getEventData(): Record<string, any> {
    return {
      systemType: this.systemType.value,
      successfulDataTypes: this.successfulDataTypes,
      failedDataTypes: this.failedDataTypes,
      recordsProcessed: this.recordsProcessed,
      executionTimeMs: this.executionTimeMs,
      timestamp: this.timestamp.toISOString(),
      isSuccess: this.failedDataTypes.length === 0,
    };
  }
}
