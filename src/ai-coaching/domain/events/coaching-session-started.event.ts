import { IEvent } from '@nestjs/cqrs';
import { DomainEvent } from '../../../shared/domain/base/aggregate-root';

export class CoachingSessionStartedEvent implements IEvent, DomainEvent {
  readonly aggregateId: string;
  readonly eventType: string = 'CoachingSessionStarted';
  readonly occurredOn: Date;
  readonly eventVersion: number = 1;

  constructor(
    sessionId: string,
    public readonly coachId: string,
    public readonly matchId: string,
    public readonly sessionType: 'live' | 'post_match' | 'training' | 'tactical_review',
    public readonly language: 'hebrew' | 'english' | 'mixed' = 'hebrew',
    public readonly expectedDuration?: number, // in minutes
    public readonly startedAt: Date = new Date()
  ) {
    this.aggregateId = sessionId;
    this.occurredOn = startedAt;
  }

  toString(): string {
    return `CoachingSessionStartedEvent(sessionId=${this.aggregateId}, type=${this.sessionType})`;
  }
}