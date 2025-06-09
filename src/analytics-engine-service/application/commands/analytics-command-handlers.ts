/**
 * Command handlers for analytics operations using CQRS pattern
 */

import { EventStore } from '../../infrastructure/event-store/event-store.interface';
import {
  MatchAnalytics,
  MatchAnalyticsSnapshot,
} from '../../domain/entities/match-analytics';
import { MatchId } from '../../domain/value-objects/match-id';
import {
  XGValue,
  PossessionPercentage,
} from '../../domain/value-objects/analytics-metrics';
import { calculateTotalXG } from '../../domain/services/xg-calculation.service';
import {
  calculateBothTeamsPossession,
  PossessionSequence as ServicePossessionSequence,
  PossessionEvent as ServicePossessionEvent,
} from '../../domain/services/possession-calculation.service';
import {
  CreateMatchAnalyticsCommand,
  UpdateXGCommand,
  UpdatePossessionCommand,
  ProcessMLPipelineOutputCommand,
  CreateSnapshotCommand,
  AnalyticsCommand,
} from './analytics-commands';

export interface AnalyticsCommandHandler<T extends AnalyticsCommand> {
  handle(command: T): Promise<void>;
}

export class CreateMatchAnalyticsCommandHandler
  implements AnalyticsCommandHandler<CreateMatchAnalyticsCommand>
{
  constructor(private readonly eventStore: EventStore) {}

  async handle(command: CreateMatchAnalyticsCommand): Promise<void> {
    const matchId = MatchId.fromString(command.matchId);

    // Check if match analytics already exists
    const streamExists = await this.eventStore.streamExists(command.matchId);
    if (streamExists) {
      throw new Error(
        `Match analytics already exists for match ${command.matchId}`
      );
    }

    // Create new match analytics
    const matchAnalytics = MatchAnalytics.create(
      matchId,
      command.homeTeamId,
      command.awayTeamId
    );

    if (command.matchDuration > 0) {
      matchAnalytics.updateMatchDuration(command.matchDuration);
    }

    // Save events
    const events = [...matchAnalytics.uncommittedEvents];
    await this.eventStore.append(command.matchId, events);
    matchAnalytics.markEventsAsCommitted();
  }
}

export class UpdateXGCommandHandler
  implements AnalyticsCommandHandler<UpdateXGCommand>
{
  constructor(private readonly eventStore: EventStore) {}

  async handle(command: UpdateXGCommand): Promise<void> {
    // Load match analytics from event store
    const matchAnalytics = await this.loadMatchAnalytics(command.matchId);

    // Update xG
    const newXG = XGValue.fromNumber(command.newXG);
    matchAnalytics.updateTeamXG(command.teamId, newXG);

    // Save events
    const events = [...matchAnalytics.uncommittedEvents];
    await this.eventStore.append(
      command.matchId,
      events,
      matchAnalytics.version - events.length
    );
    matchAnalytics.markEventsAsCommitted();
  }

  private async loadMatchAnalytics(matchId: string): Promise<MatchAnalytics> {
    // Try to load from snapshot first
    const snapshot = await this.eventStore.getSnapshot<MatchAnalyticsSnapshot>(
      matchId
    );

    if (snapshot) {
      const matchAnalytics = MatchAnalytics.fromSnapshot(snapshot.snapshot);

      // Load events since snapshot
      const events = await this.eventStore.read(matchId, snapshot.version);
      events.forEach(event => matchAnalytics.applyEvent(event));

      return matchAnalytics;
    }

    // Load from events
    const events = await this.eventStore.read(matchId);
    if (events.length === 0) {
      throw new Error(`Match analytics not found for match ${matchId}`);
    }

    return MatchAnalytics.fromEvents(MatchId.fromString(matchId), events);
  }
}

export class UpdatePossessionCommandHandler
  implements AnalyticsCommandHandler<UpdatePossessionCommand>
{
  constructor(private readonly eventStore: EventStore) {}

  async handle(command: UpdatePossessionCommand): Promise<void> {
    const matchAnalytics = await this.loadMatchAnalytics(command.matchId);

    const homePossession = PossessionPercentage.fromNumber(
      command.homeTeamPossession
    );
    const awayPossession = PossessionPercentage.fromNumber(
      command.awayTeamPossession
    );

    matchAnalytics.updatePossession(homePossession, awayPossession);

    const events = [...matchAnalytics.uncommittedEvents];
    await this.eventStore.append(
      command.matchId,
      events,
      matchAnalytics.version - events.length
    );
    matchAnalytics.markEventsAsCommitted();
  }

  private async loadMatchAnalytics(matchId: string): Promise<MatchAnalytics> {
    const snapshot = await this.eventStore.getSnapshot<MatchAnalyticsSnapshot>(
      matchId
    );

    if (snapshot) {
      const matchAnalytics = MatchAnalytics.fromSnapshot(snapshot.snapshot);
      const events = await this.eventStore.read(matchId, snapshot.version);
      events.forEach(event => matchAnalytics.applyEvent(event));
      return matchAnalytics;
    }

    const events = await this.eventStore.read(matchId);
    if (events.length === 0) {
      throw new Error(`Match analytics not found for match ${matchId}`);
    }

    return MatchAnalytics.fromEvents(MatchId.fromString(matchId), events);
  }
}

export class ProcessMLPipelineOutputCommandHandler
  implements AnalyticsCommandHandler<ProcessMLPipelineOutputCommand>
{
  constructor(private readonly eventStore: EventStore) {}

  async handle(command: ProcessMLPipelineOutputCommand): Promise<void> {
    const matchAnalytics = await this.loadMatchAnalytics(command.matchId);
    const { pipelineOutput } = command;

    // Process shots and calculate xG
    if (pipelineOutput.shots && pipelineOutput.shots.length > 0) {
      await this.processShots(matchAnalytics, pipelineOutput.shots);
    }

    // Process possession sequences
    if (
      pipelineOutput.possessionSequences &&
      pipelineOutput.possessionSequences.length > 0
    ) {
      await this.processPossession(
        matchAnalytics,
        pipelineOutput.possessionSequences
      );
    }

    // Process formations
    if (pipelineOutput.formations && pipelineOutput.formations.length > 0) {
      await this.processFormations(matchAnalytics, pipelineOutput.formations);
    }

    // Save all events
    const events = [...matchAnalytics.uncommittedEvents];
    if (events.length > 0) {
      await this.eventStore.append(
        command.matchId,
        events,
        matchAnalytics.version - events.length
      );
      matchAnalytics.markEventsAsCommitted();
    }
  }

  private async processShots(
    matchAnalytics: MatchAnalytics,
    shots: unknown[]
  ): Promise<void> {
    // Group shots by team
    const shotsByTeam = shots.reduce<Record<string, Record<string, unknown>[]>>(
      (acc, shot) => {
        const shotData = shot as Record<string, unknown>;
        const teamId = shotData.teamId as string;
        if (!acc[teamId]) {
          acc[teamId] = [];
        }
        acc[teamId].push(shotData);
        return acc;
      },
      {}
    );

    // Calculate xG for each team
    for (const [teamId, teamShots] of Object.entries(shotsByTeam)) {
      const shotData = teamShots.map((shot: Record<string, unknown>) => {
        const position = shot.position as { x: number; y: number };
        const targetPosition = shot.targetPosition as { x: number; y: number };
        const bodyPart = (shot.bodyPart as string) || 'foot';
        const situation = (shot.situation as string) || 'open_play';

        return {
          position,
          targetPosition,
          distanceToGoal: this.calculateDistance(position, targetPosition),
          angle: this.calculateAngle(position, targetPosition),
          bodyPart: ['foot', 'head', 'other'].includes(bodyPart)
            ? (bodyPart as 'foot' | 'head' | 'other')
            : 'foot',
          situation: ['open_play', 'corner', 'free_kick', 'penalty'].includes(
            situation
          )
            ? (situation as 'open_play' | 'corner' | 'free_kick' | 'penalty')
            : 'open_play',
          defenderCount: (shot.defenderCount as number) || 1,
          gameState: {
            minute: Math.floor((shot.timestamp as number) / 60),
            scoreDifference: 0, // Would need actual score
            isHome: teamId === matchAnalytics.homeTeam.teamId,
          },
        };
      });

      const totalXGValue = calculateTotalXG(shotData);
      const totalXG = XGValue.fromNumber(totalXGValue);
      matchAnalytics.updateTeamXG(teamId, totalXG);
    }
  }

  private async processPossession(
    matchAnalytics: MatchAnalytics,
    sequences: unknown[]
  ): Promise<void> {
    const possessionSequences: ServicePossessionSequence[] = sequences.map(
      seq => {
        const sequence = seq as Record<string, unknown>;
        const events =
          (sequence.events as unknown[])?.map(event => {
            const evt = event as Record<string, unknown>;
            return {
              timestamp: evt.timestamp as number,
              teamId: evt.teamId as string,
              playerId: evt.playerId as string,
              eventType: evt.eventType as ServicePossessionEvent['eventType'],
              position: evt.position as { x: number; y: number },
              successful: evt.successful as boolean,
              duration: evt.duration as number | undefined,
            } as ServicePossessionEvent;
          }) || [];

        return {
          teamId: sequence.teamId as string,
          startTime: sequence.startTime as number,
          endTime: sequence.endTime as number,
          events,
          endReason:
            (sequence.endReason as ServicePossessionSequence['endReason']) ||
            'lost_ball',
        };
      }
    );

    const possession = calculateBothTeamsPossession(
      possessionSequences,
      matchAnalytics.homeTeam.teamId,
      matchAnalytics.awayTeam.teamId
    );

    matchAnalytics.updatePossession(possession.home, possession.away);
  }

  private async processFormations(
    _matchAnalytics: MatchAnalytics,
    formations: unknown[]
  ): Promise<void> {
    // Process latest formation for each team
    formations.reduce<Record<string, Record<string, unknown>>>(
      (acc, formation) => {
        const formationData = formation as Record<string, unknown>;
        const teamId = formationData.teamId as string;
        const timestamp = formationData.timestamp as number;

        if (!acc[teamId] || timestamp > (acc[teamId].timestamp as number)) {
          acc[teamId] = formationData;
        }
        return acc;
      },
      {}
    );

    // Update formations (this would trigger FormationDetectedEvent)
    // Formation detection would be implemented here
    // Currently skipping formation processing
  }

  private calculateDistance(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateAngle(
    shotPosition: { x: number; y: number },
    goalPosition: { x: number; y: number }
  ): number {
    // Simplified angle calculation
    const dx = goalPosition.x - shotPosition.x;
    const dy = goalPosition.y - shotPosition.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  private async loadMatchAnalytics(matchId: string): Promise<MatchAnalytics> {
    const snapshot = await this.eventStore.getSnapshot<MatchAnalyticsSnapshot>(
      matchId
    );

    if (snapshot) {
      const matchAnalytics = MatchAnalytics.fromSnapshot(snapshot.snapshot);
      const events = await this.eventStore.read(matchId, snapshot.version);
      events.forEach(event => matchAnalytics.applyEvent(event));
      return matchAnalytics;
    }

    const events = await this.eventStore.read(matchId);
    if (events.length === 0) {
      throw new Error(`Match analytics not found for match ${matchId}`);
    }

    return MatchAnalytics.fromEvents(MatchId.fromString(matchId), events);
  }
}

export class CreateSnapshotCommandHandler
  implements AnalyticsCommandHandler<CreateSnapshotCommand>
{
  constructor(private readonly eventStore: EventStore) {}

  async handle(command: CreateSnapshotCommand): Promise<void> {
    const matchAnalytics = await this.loadMatchAnalytics(command.matchId);
    const snapshot = matchAnalytics.createSnapshot();

    await this.eventStore.createSnapshot(
      command.matchId,
      snapshot,
      matchAnalytics.version
    );
  }

  private async loadMatchAnalytics(matchId: string): Promise<MatchAnalytics> {
    const events = await this.eventStore.read(matchId);
    if (events.length === 0) {
      throw new Error(`Match analytics not found for match ${matchId}`);
    }

    return MatchAnalytics.fromEvents(MatchId.fromString(matchId), events);
  }
}
