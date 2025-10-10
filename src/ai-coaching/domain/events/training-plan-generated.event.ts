import { IEvent } from '@nestjs/cqrs';
import { DomainEvent } from '../../../shared/domain/base/aggregate-root';

export class TrainingPlanGeneratedEvent implements IEvent, DomainEvent {
  readonly aggregateId: string;
  readonly eventType: string = 'TrainingPlanGenerated';
  readonly occurredOn: Date;
  readonly eventVersion: number = 1;

  constructor(
    sessionId: string,
    public readonly trainingPlanId: string,
    public readonly playerId: string,
    public readonly coachId: string,
    public readonly planTitle: string,
    public readonly hebrewPlanTitle: string,
    public readonly sessionsCount: number,
    public readonly duration: number, // in days
    public readonly generatedAt: Date = new Date()
  ) {
    this.aggregateId = sessionId;
    this.occurredOn = generatedAt;
  }

  toString(): string {
    return `TrainingPlanGeneratedEvent(planId=${this.trainingPlanId}, player=${this.playerId})`;
  }
}