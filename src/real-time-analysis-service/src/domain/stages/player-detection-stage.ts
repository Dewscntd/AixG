import {
  AnalysisStage,
  StageInput,
  StageResult,
  EdgeMLInference,
} from '../entities/live-analysis-pipeline';
import { PlayerDetection } from '../../infrastructure/ml/edge-ml-inference';

/**
 * Player Detection Stage
 * Detects and tracks players in real-time using ML inference
 */
export class PlayerDetectionStage implements AnalysisStage {
  public readonly name = 'PlayerDetection';

  constructor(private readonly mlInference: EdgeMLInference) {}

  async process(input: StageInput): Promise<StageResult> {
    const startTime = Date.now();

    try {
      const { frame, context } = input;
      const preprocessedFrame = context.preprocessedFrame || frame;

      // Perform player detection using ML inference
      const detectionResult = await this.mlInference.analyze(preprocessedFrame);

      // Process detection results
      const players = this.processDetections(detectionResult);

      // Track players across frames (using previous context if available)
      const previousPlayerDetections = context.previousPlayers;
      const trackedPlayers = this.trackPlayers(
        players,
        previousPlayerDetections
      );

      // Calculate player statistics
      const playerStats = this.calculatePlayerStats(trackedPlayers);

      const processingTime = Date.now() - startTime;

      return {
        stageName: this.name,
        success: true,
        processingTimeMs: processingTime,
        output: {
          players: this.convertToPlayerDetections(trackedPlayers),
          stats: playerStats,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        stageName: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime,
        output: {
          players: [],
        },
      };
    }
  }

  /**
   * Process raw ML detection results into player objects
   */
  private processDetections(detectionResult: any): Player[] {
    // In a real implementation, this would parse the ML model output
    // For now, we'll simulate player detections

    if (!detectionResult || !detectionResult.detections) {
      return [];
    }

    return detectionResult.detections
      .filter(
        (detection: any) =>
          detection.class === 'person' && detection.confidence > 0.5
      )
      .map((detection: any, index: number) => ({
        id: `player_${index}`,
        boundingBox: {
          x: detection.bbox.x,
          y: detection.bbox.y,
          width: detection.bbox.width,
          height: detection.bbox.height,
        },
        confidence: detection.confidence,
        position: {
          x: detection.bbox.x + detection.bbox.width / 2,
          y: detection.bbox.y + detection.bbox.height / 2,
        },
        team: null, // Will be determined in team classification stage
        jersey: null,
        pose: detection.pose || null,
        velocity: { x: 0, y: 0 }, // Will be calculated in tracking
        timestamp: Date.now(),
      }));
  }

  /**
   * Convert PlayerDetection[] to Player[] for internal processing
   */
  private convertFromPlayerDetections(
    playerDetections?: PlayerDetection[]
  ): Player[] {
    if (!playerDetections) return [];

    return playerDetections.map(detection => ({
      id: detection.playerId,
      boundingBox: detection.boundingBox,
      confidence: detection.confidence,
      position: detection.position,
      team: detection.teamId || null,
      jersey: detection.jerseyNumber?.toString() || null,
      pose: null,
      velocity: { x: 0, y: 0 },
      timestamp: Date.now(),
    }));
  }

  /**
   * Convert Player[] to PlayerDetection[] for output
   */
  private convertToPlayerDetections(players: Player[]): PlayerDetection[] {
    return players.map(player => ({
      playerId: player.id,
      boundingBox: player.boundingBox,
      confidence: player.confidence,
      position: player.position,
      ...(player.team && { teamId: player.team }),
      ...(player.jersey && { jerseyNumber: parseInt(player.jersey) }),
      processingTimeMs: 10, // Mock processing time
    }));
  }

  /**
   * Track players across frames using simple position-based matching
   */
  private trackPlayers(
    currentPlayers: Player[],
    previousPlayerDetections?: PlayerDetection[]
  ): Player[] {
    const previousPlayers = this.convertFromPlayerDetections(
      previousPlayerDetections
    );
    if (!previousPlayers || previousPlayers.length === 0) {
      return currentPlayers;
    }

    const trackedPlayers: Player[] = [];
    const usedPreviousPlayers = new Set<string>();

    for (const currentPlayer of currentPlayers) {
      let bestMatch: Player | null = null;
      let bestDistance = Infinity;

      // Find closest previous player
      for (const previousPlayer of previousPlayers) {
        if (usedPreviousPlayers.has(previousPlayer.id)) {
          continue;
        }

        const distance = this.calculateDistance(
          currentPlayer.position,
          previousPlayer.position
        );

        if (distance < bestDistance && distance < 100) {
          // Max tracking distance
          bestDistance = distance;
          bestMatch = previousPlayer;
        }
      }

      if (bestMatch) {
        // Update existing player
        const velocity = this.calculateVelocity(
          currentPlayer.position,
          bestMatch.position,
          currentPlayer.timestamp - bestMatch.timestamp
        );

        trackedPlayers.push({
          ...currentPlayer,
          id: bestMatch.id,
          velocity,
          team: bestMatch.team, // Preserve team assignment
          jersey: bestMatch.jersey,
        });

        usedPreviousPlayers.add(bestMatch.id);
      } else {
        // New player
        trackedPlayers.push({
          ...currentPlayer,
          id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      }
    }

    return trackedPlayers;
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate velocity between two positions
   */
  private calculateVelocity(
    currentPos: Position,
    previousPos: Position,
    timeDelta: number
  ): Velocity {
    if (timeDelta === 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: (currentPos.x - previousPos.x) / timeDelta,
      y: (currentPos.y - previousPos.y) / timeDelta,
    };
  }

  /**
   * Calculate average detection confidence
   */
  private calculateAverageConfidence(players: Player[]): number {
    if (players.length === 0) {
      return 0;
    }

    const totalConfidence = players.reduce(
      (sum, player) => sum + player.confidence,
      0
    );
    return totalConfidence / players.length;
  }

  /**
   * Calculate player statistics
   */
  private calculatePlayerStats(players: Player[]): PlayerStats {
    return {
      totalPlayers: players.length,
      averageConfidence: this.calculateAverageConfidence(players),
      playersWithTeam: players.filter(p => p.team !== null).length,
      playersWithJersey: players.filter(p => p.jersey !== null).length,
      averageVelocity: this.calculateAverageVelocity(players),
    };
  }

  /**
   * Calculate average player velocity
   */
  private calculateAverageVelocity(players: Player[]): number {
    if (players.length === 0) {
      return 0;
    }

    const totalVelocity = players.reduce((sum, player) => {
      const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
      return sum + speed;
    }, 0);

    return totalVelocity / players.length;
  }
}

/**
 * Player interface
 */
export interface Player {
  id: string;
  boundingBox: BoundingBox;
  confidence: number;
  position: Position;
  team: string | null;
  jersey: string | null;
  pose: any;
  velocity: Velocity;
  timestamp: number;
}

/**
 * Bounding box interface
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Position interface
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Velocity interface
 */
export interface Velocity {
  x: number;
  y: number;
}

/**
 * Player statistics interface
 */
export interface PlayerStats {
  totalPlayers: number;
  averageConfidence: number;
  playersWithTeam: number;
  playersWithJersey: number;
  averageVelocity: number;
}
