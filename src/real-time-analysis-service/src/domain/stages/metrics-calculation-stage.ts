import { AnalysisStage, StageInput, StageResult } from '../entities/live-analysis-pipeline';
import { Player } from './player-detection-stage';
import { BallPosition } from './ball-tracking-stage';
import { FootballEvent } from './event-detection-stage';
import { TeamFormation } from './formation-analysis-stage';
import { PlayerDetection, BallDetection, EventDetection } from '../../infrastructure/ml/edge-ml-inference';

/**
 * Metrics Calculation Stage
 * Calculates real-time football metrics and analytics
 */
export class MetricsCalculationStage implements AnalysisStage {
  public readonly name = 'MetricsCalculation';

  async process(input: StageInput): Promise<StageResult> {
    const startTime = Date.now();
    
    try {
      const { context } = input;
      
      // Extract data from previous stages
      const playerDetections = context.classifiedPlayers || context.players || [];
      const players: Player[] = this.convertFromPlayerDetections(playerDetections);
      const ballDetection = context.ball;
      const ball: BallPosition | null = ballDetection ? this.convertBallDetectionToBallPosition(ballDetection) : null;
      const eventDetections = context.events || [];
      const events: FootballEvent[] = this.convertFromEventDetections(eventDetections);

      // Formation data is simplified for now
      const teamAFormation: TeamFormation | null = null;
      const teamBFormation: TeamFormation | null = null;

      // Calculate various metrics
      const possessionMetrics = this.calculatePossessionMetrics(players, ball, events);
      const movementMetrics = this.calculateMovementMetrics(players);
      const spatialMetrics = this.calculateSpatialMetrics(players, teamAFormation, teamBFormation);
      const performanceMetrics = this.calculatePerformanceMetrics(events, players);

      // Combine all metrics
      const allMetrics: RealTimeMetrics = {
        timestamp: Date.now(),
        possession: possessionMetrics,
        movement: movementMetrics,
        spatial: spatialMetrics,
        performance: performanceMetrics,
        summary: this.calculateSummaryMetrics(possessionMetrics, movementMetrics, spatialMetrics)
      };

      const processingTime = Date.now() - startTime;

      return {
        stageName: this.name,
        success: true,
        processingTimeMs: processingTime,
        output: {
          metrics: {
            possession: allMetrics.possession.teamAPossessionPercentage,
            passAccuracy: allMetrics.performance.passAccuracy
          }
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        stageName: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime,
        output: {
          metrics: {
            possession: 50,
            passAccuracy: 0
          }
        }
      };
    }
  }

  /**
   * Convert PlayerDetection[] to Player[] for internal processing
   */
  private convertFromPlayerDetections(playerDetections: PlayerDetection[]): Player[] {
    return playerDetections.map(detection => ({
      id: detection.playerId,
      boundingBox: detection.boundingBox,
      confidence: detection.confidence,
      position: detection.position,
      team: detection.teamId || null,
      jersey: detection.jerseyNumber?.toString() || null,
      pose: null,
      velocity: { x: 0, y: 0 },
      timestamp: Date.now()
    }));
  }

  /**
   * Convert BallDetection to BallPosition for internal processing
   */
  private convertBallDetectionToBallPosition(ballDetection: BallDetection): BallPosition {
    return {
      position: ballDetection.position,
      velocity: ballDetection.velocity || { x: 0, y: 0 },
      confidence: ballDetection.confidence,
      radius: 0.5, // Default radius
      timestamp: Date.now(),
      predicted: false
    };
  }

  /**
   * Convert EventDetection[] to FootballEvent[] for internal processing
   */
  private convertFromEventDetections(eventDetections: EventDetection[]): FootballEvent[] {
    return eventDetections.map(detection => ({
      type: detection.eventType,
      confidence: detection.confidence,
      timestamp: detection.timestamp,
      position: detection.position,
      player: {
        id: 'unknown',
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
        confidence: 0.5,
        position: detection.position,
        team: 'unknown',
        jersey: null,
        pose: null,
        velocity: { x: 0, y: 0 },
        timestamp: detection.timestamp
      },
      metadata: detection.metadata || {}
    }));
  }

  /**
   * Calculate possession metrics
   */
  private calculatePossessionMetrics(
    players: Player[],
    ball: BallPosition | null,
    events: FootballEvent[]
  ): PossessionMetrics {
    // Team player filtering for future use
    players.filter(p => p.team === 'teamA');
    players.filter(p => p.team === 'teamB');

    // Determine current possession
    let currentPossession: string | null = null;
    if (ball && !ball.predicted) {
      const possessingPlayer = this.findPlayerNearBall(players, ball);
      currentPossession = possessingPlayer?.team || null;
    }

    // Calculate possession events
    const possessionEvents = events.filter(e => e.type === 'possession');
    const teamAPossessions = possessionEvents.filter(e => e.player.team === 'teamA').length;
    const teamBPossessions = possessionEvents.filter(e => e.player.team === 'teamB').length;
    const totalPossessions = teamAPossessions + teamBPossessions;

    return {
      currentPossession,
      teamAPossessionPercentage: totalPossessions > 0 ? (teamAPossessions / totalPossessions) * 100 : 50,
      teamBPossessionPercentage: totalPossessions > 0 ? (teamBPossessions / totalPossessions) * 100 : 50,
      totalPossessionChanges: totalPossessions,
      ballInPlay: ball !== null && !ball.predicted
    };
  }

  /**
   * Calculate movement metrics
   */
  private calculateMovementMetrics(players: Player[]): MovementMetrics {
    const teamAPlayers = players.filter(p => p.team === 'teamA');
    const teamBPlayers = players.filter(p => p.team === 'teamB');

    const teamASpeed = this.calculateAverageSpeed(teamAPlayers);
    const teamBSpeed = this.calculateAverageSpeed(teamBPlayers);
    const totalDistance = this.calculateTotalDistance(players);

    return {
      teamASpeed,
      teamBSpeed,
      averageSpeed: (teamASpeed + teamBSpeed) / 2,
      totalDistance,
      highIntensityRuns: this.countHighIntensityRuns(players),
      sprintCount: this.countSprints(players)
    };
  }

  /**
   * Calculate spatial metrics
   */
  private calculateSpatialMetrics(
    players: Player[],
    teamAFormation: TeamFormation | null,
    teamBFormation: TeamFormation | null
  ): SpatialMetrics {
    const fieldCoverage = this.calculateFieldCoverage(players);
    const teamSeparation = this.calculateTeamSeparation(players);

    return {
      fieldCoverage,
      teamSeparation,
      teamACompactness: teamAFormation?.metrics.compactness || 0,
      teamBCompactness: teamBFormation?.metrics.compactness || 0,
      teamAWidth: teamAFormation?.metrics.width || 0,
      teamBWidth: teamBFormation?.metrics.width || 0
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(events: FootballEvent[], players: Player[]): PerformanceMetrics {
    const passes = events.filter(e => e.type === 'pass');
    const shots = events.filter(e => e.type === 'shot');

    return {
      totalPasses: passes.length,
      totalShots: shots.length,
      passAccuracy: this.calculatePassAccuracy(passes),
      shotAccuracy: this.calculateShotAccuracy(shots),
      eventsPerMinute: events.length, // Simplified - would need time tracking
      playerEfficiency: this.calculatePlayerEfficiency(players, events)
    };
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(
    possession: PossessionMetrics,
    movement: MovementMetrics,
    spatial: SpatialMetrics
  ): SummaryMetrics {
    return {
      gameIntensity: (movement.averageSpeed + movement.sprintCount) / 2,
      tacticalBalance: Math.abs(spatial.teamACompactness - spatial.teamBCompactness),
      possessionBalance: Math.abs(possession.teamAPossessionPercentage - possession.teamBPossessionPercentage),
      overallActivity: movement.totalDistance + possession.totalPossessionChanges
    };
  }

  // Helper methods
  private findPlayerNearBall(players: Player[], ball: BallPosition): Player | null {
    let closestPlayer: Player | null = null;
    let minDistance = Infinity;
    const maxDistance = 50;

    for (const player of players) {
      const distance = Math.sqrt(
        Math.pow(player.position.x - ball.position.x, 2) +
        Math.pow(player.position.y - ball.position.y, 2)
      );
      
      if (distance < minDistance && distance < maxDistance) {
        minDistance = distance;
        closestPlayer = player;
      }
    }

    return closestPlayer;
  }

  private calculateAverageSpeed(players: Player[]): number {
    if (players.length === 0) return 0;
    
    const totalSpeed = players.reduce((sum, player) => sum + Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2), 0);
    
    return totalSpeed / players.length;
  }

  private calculateTotalDistance(players: Player[]): number {
    // Simplified - would need to track over time
    return players.reduce((sum, player) => sum + Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2), 0);
  }

  private countHighIntensityRuns(players: Player[]): number {
    return players.filter(player => {
      const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
      return speed > 200; // High intensity threshold
    }).length;
  }

  private countSprints(players: Player[]): number {
    return players.filter(player => {
      const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
      return speed > 300; // Sprint threshold
    }).length;
  }

  private calculateFieldCoverage(players: Player[]): number {
    // Simplified field coverage calculation
    if (players.length === 0) return 0;
    
    const xPositions = players.map(p => p.position.x);
    const yPositions = players.map(p => p.position.y);
    
    const xRange = Math.max(...xPositions) - Math.min(...xPositions);
    const yRange = Math.max(...yPositions) - Math.min(...yPositions);
    
    return (xRange * yRange) / (1920 * 1080); // Normalized to field size
  }

  private calculateTeamSeparation(players: Player[]): number {
    const teamAPlayers = players.filter(p => p.team === 'teamA');
    const teamBPlayers = players.filter(p => p.team === 'teamB');
    
    if (teamAPlayers.length === 0 || teamBPlayers.length === 0) return 0;
    
    // Calculate center of mass for each team
    const teamACenterX = teamAPlayers.reduce((sum, p) => sum + p.position.x, 0) / teamAPlayers.length;
    const teamBCenterX = teamBPlayers.reduce((sum, p) => sum + p.position.x, 0) / teamBPlayers.length;
    
    return Math.abs(teamACenterX - teamBCenterX);
  }

  private calculatePassAccuracy(passes: FootballEvent[]): number {
    // Simplified - would need success/failure tracking
    return passes.length > 0 ? 75 : 0; // Mock accuracy
  }

  private calculateShotAccuracy(shots: FootballEvent[]): number {
    // Simplified - would need goal tracking
    return shots.length > 0 ? 30 : 0; // Mock accuracy
  }

  private calculatePlayerEfficiency(players: Player[], events: FootballEvent[]): number {
    if (players.length === 0) return 0;
    return events.length / players.length;
  }

  private getEmptyMetrics(): RealTimeMetrics {
    return {
      timestamp: Date.now(),
      possession: {
        currentPossession: null,
        teamAPossessionPercentage: 50,
        teamBPossessionPercentage: 50,
        totalPossessionChanges: 0,
        ballInPlay: false
      },
      movement: {
        teamASpeed: 0,
        teamBSpeed: 0,
        averageSpeed: 0,
        totalDistance: 0,
        highIntensityRuns: 0,
        sprintCount: 0
      },
      spatial: {
        fieldCoverage: 0,
        teamSeparation: 0,
        teamACompactness: 0,
        teamBCompactness: 0,
        teamAWidth: 0,
        teamBWidth: 0
      },
      performance: {
        totalPasses: 0,
        totalShots: 0,
        passAccuracy: 0,
        shotAccuracy: 0,
        eventsPerMinute: 0,
        playerEfficiency: 0
      },
      summary: {
        gameIntensity: 0,
        tacticalBalance: 0,
        possessionBalance: 0,
        overallActivity: 0
      }
    };
  }
}

// Interfaces for metrics
export interface RealTimeMetrics {
  timestamp: number;
  possession: PossessionMetrics;
  movement: MovementMetrics;
  spatial: SpatialMetrics;
  performance: PerformanceMetrics;
  summary: SummaryMetrics;
}

export interface PossessionMetrics {
  currentPossession: string | null;
  teamAPossessionPercentage: number;
  teamBPossessionPercentage: number;
  totalPossessionChanges: number;
  ballInPlay: boolean;
}

export interface MovementMetrics {
  teamASpeed: number;
  teamBSpeed: number;
  averageSpeed: number;
  totalDistance: number;
  highIntensityRuns: number;
  sprintCount: number;
}

export interface SpatialMetrics {
  fieldCoverage: number;
  teamSeparation: number;
  teamACompactness: number;
  teamBCompactness: number;
  teamAWidth: number;
  teamBWidth: number;
}

export interface PerformanceMetrics {
  totalPasses: number;
  totalShots: number;
  passAccuracy: number;
  shotAccuracy: number;
  eventsPerMinute: number;
  playerEfficiency: number;
}

export interface SummaryMetrics {
  gameIntensity: number;
  tacticalBalance: number;
  possessionBalance: number;
  overallActivity: number;
}
