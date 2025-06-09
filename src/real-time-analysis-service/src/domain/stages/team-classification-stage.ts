import { AnalysisStage, StageInput, StageResult, EdgeMLInference } from '../entities/live-analysis-pipeline';
import { Player } from './player-detection-stage';
import { PlayerDetection } from '../../infrastructure/ml/edge-ml-inference';

/**
 * Team Classification Stage
 * Classifies players into teams based on jersey colors and other features
 */
export class TeamClassificationStage implements AnalysisStage {
  public readonly name = 'TeamClassification';

  constructor(private readonly mlInference: EdgeMLInference) {}

  async process(input: StageInput): Promise<StageResult> {
    const startTime = Date.now();
    
    try {
      const { context } = input;
      const playerDetections = context.players || [];
      const players: Player[] = this.convertFromPlayerDetections(playerDetections);

      if (players.length === 0) {
        return {
          stageName: this.name,
          success: true,
          processingTimeMs: Date.now() - startTime,
          output: {
            classifiedPlayers: []
          }
        };
      }

      // Classify players into teams
      const classifiedPlayers = await this.classifyPlayers(players);
      
      // Calculate team statistics
      const teamStats = this.calculateTeamStats(classifiedPlayers);

      const processingTime = Date.now() - startTime;

      return {
        stageName: this.name,
        success: true,
        processingTimeMs: processingTime,
        output: {
          classifiedPlayers: this.convertToPlayerDetections(classifiedPlayers),
          stats: teamStats
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
          classifiedPlayers: input.context.players || []
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
      processingTimeMs: 10 // Mock processing time
    }));
  }

  /**
   * Classify players into teams using ML inference
   */
  private async classifyPlayers(players: Player[]): Promise<Player[]> {
    const classifiedPlayers: Player[] = [];

    for (const player of players) {
      try {
        // In a real implementation, this would extract jersey color/features
        // and use ML to classify the team
        const teamClassification = await this.classifyPlayerTeam(player);
        
        classifiedPlayers.push({
          ...player,
          team: teamClassification.team,
          jersey: teamClassification.jersey
        });
      } catch (error) {
        // Keep original player if classification fails
        classifiedPlayers.push(player);
      }
    }

    return classifiedPlayers;
  }

  /**
   * Classify individual player team
   */
  private async classifyPlayerTeam(player: Player): Promise<TeamClassification> {
    // Simplified team classification logic
    // In reality, this would use ML to analyze jersey colors, patterns, etc.
    
    // For demo purposes, randomly assign teams based on position
    const isLeftSide = player.position.x < 960; // Assuming 1920px width
    
    return {
      team: isLeftSide ? 'teamA' : 'teamB',
      jersey: isLeftSide ? 'blue' : 'red',
      confidence: 0.8
    };
  }

  /**
   * Calculate team statistics
   */
  private calculateTeamStats(players: Player[]): TeamStats {
    const stats = {
      teamA: 0,
      teamB: 0,
      unclassified: 0
    };

    for (const player of players) {
      if (player.team === 'teamA') {
        stats.teamA++;
      } else if (player.team === 'teamB') {
        stats.teamB++;
      } else {
        stats.unclassified++;
      }
    }

    return stats;
  }
}

/**
 * Team classification result
 */
export interface TeamClassification {
  team: string;
  jersey: string;
  confidence: number;
}

/**
 * Team statistics
 */
export interface TeamStats {
  teamA: number;
  teamB: number;
  unclassified: number;
}
