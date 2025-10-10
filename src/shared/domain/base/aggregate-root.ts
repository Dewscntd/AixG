import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DomainEvent {
  readonly aggregateId: string;
  readonly eventType: string;
  readonly occurredOn: Date;
  readonly eventVersion: number;
}

export abstract class AggregateRoot {
  private readonly _domainEvents: DomainEvent[] = [];
  private _version: number = 0;

  protected constructor(public readonly id: string) {}

  get version(): number {
    return this._version;
  }

  get domainEvents(): DomainEvent[] {
    return this._domainEvents.slice();
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  public markEventsAsHandled(): void {
    this._version++;
    this.clearDomainEvents();
  }

  protected static createEventFromAggregate<T extends AggregateRoot>(
    aggregate: T,
    eventType: string,
    eventData: any
  ): DomainEvent {
    return {
      aggregateId: aggregate.id,
      eventType,
      occurredOn: new Date(),
      eventVersion: aggregate.version + 1,
      ...eventData,
    };
  }
}

export abstract class Entity {
  protected constructor(public readonly id: string) {}

  equals(entity: Entity): boolean {
    if (!(entity instanceof this.constructor)) {
      return false;
    }
    return this.id === entity.id;
  }
}

export abstract class ValueObject {
  protected abstract getEqualityComponents(): any[];

  equals(other: ValueObject): boolean {
    if (!(other instanceof this.constructor)) {
      return false;
    }

    const thisComponents = this.getEqualityComponents();
    const otherComponents = other.getEqualityComponents();

    if (thisComponents.length !== otherComponents.length) {
      return false;
    }

    return thisComponents.every((component, index) => 
      component === otherComponents[index]
    );
  }
}