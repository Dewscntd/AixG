import { IEvent } from '@nestjs/cqrs';
import { DomainEvent } from '../../../shared/domain/base/aggregate-root';

export class TacticalAnalysisRequestedEvent implements IEvent, DomainEvent {
  readonly aggregateId: string;
  readonly eventType: string = 'TacticalAnalysisRequested';
  readonly occurredOn: Date;
  readonly eventVersion: number = 1;

  constructor(
    sessionId: string,
    public readonly matchId: string,
    public readonly requestedBy: string,
    public readonly analysisType: 'formation' | 'player_performance' | 'tactical_patterns' | 'full_analysis',
    public readonly hebrewQuery?: string,
    public readonly priority: 'low' | 'medium' | 'high' = 'medium',
    public readonly requestedAt: Date = new Date()
  ) {
    this.aggregateId = sessionId;
    this.occurredOn = requestedAt;
  }

  toString(): string {
    return `TacticalAnalysisRequestedEvent(sessionId=${this.aggregateId}, type=${this.analysisType})`;
  }
}