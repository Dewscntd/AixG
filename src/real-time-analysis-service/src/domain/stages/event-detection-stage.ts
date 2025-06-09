import { AnalysisStage, StageInput, StageResult, EdgeMLInference } from '../entities/live-analysis-pipeline';
import { Player } from './player-detection-stage';
import { BallPosition } from './ball-tracking-stage';
import { PlayerDetection, BallDetection, EventDetection } from '../../infrastructure/ml/edge-ml-inference';

/**
 * Event Detection Stage
 * Detects football events like passes, shots, tackles, etc.
 */
export class EventDetectionStage implements AnalysisStage {
  public readonly name = 'EventDetection';

  constructor(private readonly mlInference: EdgeMLInference) {}

  async process(input: StageInput): Promise<StageResult> {
    const startTime = Date.now();
    
    try {
      const { context } = input;
      const playerDetections = context.classifiedPlayers || context.players || [];
      const players: Player[] = this.convertFromPlayerDetections(playerDetections);
      const ballDetection = context.ball;
      const ball: BallPosition | null = ballDetection ? this.convertBallDetectionToBallPosition(ballDetection) : null;

      // Detect events based on player and ball positions
      const events = await this.detectEvents(players, ball, context);
      
      // Calculate event statistics
      const eventStats = this.calculateEventStats(events);

      const processingTime = Date.now() - startTime;

      return {
        stageName: this.name,
        success: true,
        processingTimeMs: processingTime,
        output: {
          events: this.convertToEventDetections(events)
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
          events: []
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
   * Convert FootballEvent[] to EventDetection[] for output
   */
  private convertToEventDetections(events: FootballEvent[]): EventDetection[] {
    return events.map(event => ({
      eventType: event.type as 'pass' | 'shot' | 'tackle' | 'foul' | 'offside' | 'goal' | 'corner' | 'throw_in',
      confidence: event.confidence,
      processingTimeMs: 10, // Mock processing time
      timestamp: event.timestamp,
      position: event.position,
      metadata: event.metadata
    }));
  }

  /**
   * Detect football events
   */
  private async detectEvents(
    players: Player[],
    ball: BallPosition | null,
    context: any
  ): Promise<FootballEvent[]> {
    const events: FootballEvent[] = [];
    const timestamp = Date.now();

    // Ball possession detection
    if (ball && !ball.predicted) {
      const possessingPlayer = this.findPlayerNearBall(players, ball);
      if (possessingPlayer) {
        events.push({
          type: 'possession',
          timestamp,
          player: possessingPlayer,
          position: ball.position,
          confidence: 0.8,
          metadata: {
            ballSpeed: Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2)
          }
        });
      }
    }

    // Pass detection (simplified)
    if (ball && context.previousBall) {
      const passEvent = this.detectPass(players, ball, context.previousBall);
      if (passEvent) {
        events.push(passEvent);
      }
    }

    // Shot detection (ball moving towards goal)
    if (ball && this.isBallMovingTowardsGoal(ball)) {
      const shotEvent = this.detectShot(players, ball);
      if (shotEvent) {
        events.push(shotEvent);
      }
    }

    return events;
  }

  /**
   * Find player closest to ball
   */
  private findPlayerNearBall(players: Player[], ball: BallPosition): Player | null {
    let closestPlayer: Player | null = null;
    let minDistance = Infinity;
    const maxPossessionDistance = 50; // pixels

    for (const player of players) {
      const distance = this.calculateDistance(player.position, ball.position);
      if (distance < minDistance && distance < maxPossessionDistance) {
        minDistance = distance;
        closestPlayer = player;
      }
    }

    return closestPlayer;
  }

  /**
   * Detect pass events
   */
  private detectPass(
    players: Player[],
    currentBall: BallPosition,
    previousBall: BallPosition
  ): FootballEvent | null {
    // Simplified pass detection based on ball speed change
    const currentSpeed = Math.sqrt(currentBall.velocity.x ** 2 + currentBall.velocity.y ** 2);
    const previousSpeed = Math.sqrt(previousBall.velocity.x ** 2 + previousBall.velocity.y ** 2);
    
    // Detect significant speed increase (potential pass)
    if (currentSpeed > previousSpeed * 1.5 && currentSpeed > 100) {
      const passingPlayer = this.findPlayerNearBall(players, previousBall);
      
      if (passingPlayer) {
        return {
          type: 'pass',
          timestamp: Date.now(),
          player: passingPlayer,
          position: previousBall.position,
          confidence: 0.7,
          metadata: {
            ballSpeed: currentSpeed,
            direction: Math.atan2(currentBall.velocity.y, currentBall.velocity.x) * (180 / Math.PI)
          }
        };
      }
    }

    return null;
  }

  /**
   * Detect shot events
   */
  private detectShot(players: Player[], ball: BallPosition): FootballEvent | null {
    const shootingPlayer = this.findPlayerNearBall(players, ball);
    
    if (shootingPlayer) {
      return {
        type: 'shot',
        timestamp: Date.now(),
        player: shootingPlayer,
        position: ball.position,
        confidence: 0.6,
        metadata: {
          ballSpeed: Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2),
          direction: Math.atan2(ball.velocity.y, ball.velocity.x) * (180 / Math.PI)
        }
      };
    }

    return null;
  }

  /**
   * Check if ball is moving towards goal
   */
  private isBallMovingTowardsGoal(ball: BallPosition): boolean {
    // Simplified goal detection - check if ball is moving towards edges
    const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
    return speed > 150 && (ball.position.x < 200 || ball.position.x > 1720); // Near goal areas
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate event statistics
   */
  private calculateEventStats(events: FootballEvent[]): EventStats {
    const eventTypes: Record<string, number> = {};
    
    for (const event of events) {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      eventTypes
    };
  }
}

/**
 * Football event interface
 */
export interface FootballEvent {
  type: string;
  timestamp: number;
  player: Player;
  position: { x: number; y: number };
  confidence: number;
  metadata: Record<string, any>;
}

/**
 * Event statistics interface
 */
export interface EventStats {
  totalEvents: number;
  eventTypes: Record<string, number>;
}
