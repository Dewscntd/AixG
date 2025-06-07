import { DomainEvent } from '../events/domain-event.interface';

export interface EventPublisher {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  publishBatch<T extends DomainEvent>(events: T[]): Promise<void>;
}
