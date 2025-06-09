import {
  AnalysisStage,
  StageInput,
  StageResult,
  EdgeMLInference,
} from '../entities/live-analysis-pipeline';
import { Player } from './player-detection-stage';
import { PlayerDetection } from '../../infrastructure/ml/edge-ml-inference';

/**
 * Formation Analysis Stage
 * Analyzes team formations and tactical positioning
 */
export class FormationAnalysisStage implements AnalysisStage {
  public readonly name = 'FormationAnalysis';

  constructor(private readonly mlInference: EdgeMLInference) {}

  async process(input: StageInput): Promise<StageResult> {
    const startTime = Date.now();

    try {
      const { context } = input;
      const playerDetections =
        context.classifiedPlayers || context.players || [];
      const players: Player[] =
        this.convertFromPlayerDetections(playerDetections);

      // Analyze formations for each team
      const teamAPlayers = players.filter(p => p.team === 'teamA');
      const teamBPlayers = players.filter(p => p.team === 'teamB');

      const teamAFormation = this.analyzeTeamFormation(teamAPlayers, 'teamA');
      const teamBFormation = this.analyzeTeamFormation(teamBPlayers, 'teamB');

      // Calculate formation statistics
      const formationStats = this.calculateFormationStats(
        teamAFormation,
        teamBFormation
      );

      const processingTime = Date.now() - startTime;

      return {
        stageName: this.name,
        success: true,
        processingTimeMs: processingTime,
        output: {
          formation: {
            homeTeam: teamAFormation?.pattern || 'unknown',
            awayTeam: teamBFormation?.pattern || 'unknown',
          },
          stats: formationStats,
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
          formation: {
            homeTeam: 'unknown',
            awayTeam: 'unknown',
          },
        },
      };
    }
  }

  /**
   * Convert PlayerDetection[] to Player[] for internal processing
   */
  private convertFromPlayerDetections(
    playerDetections: PlayerDetection[]
  ): Player[] {
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
   * Analyze team formation
   */
  private analyzeTeamFormation(
    players: Player[],
    team: string
  ): TeamFormation | null {
    if (players.length < 3) {
      return null; // Need minimum players to determine formation
    }

    // Group players by field zones
    const zones = this.groupPlayersByZones(players);

    // Determine formation pattern
    const formationPattern = this.determineFormationPattern(zones);

    // Calculate formation metrics
    const metrics = this.calculateFormationMetrics(players, zones);

    return {
      team,
      pattern: formationPattern,
      zones,
      metrics,
      playerCount: players.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Group players by field zones
   */
  private groupPlayersByZones(players: Player[]): FormationZones {
    const zones: FormationZones = {
      defense: [],
      midfield: [],
      attack: [],
    };

    // Simplified zone classification based on Y position
    // Assuming field runs vertically with goals at top/bottom
    for (const player of players) {
      if (player.position.y < 360) {
        // Top third
        zones.attack.push(player);
      } else if (player.position.y < 720) {
        // Middle third
        zones.midfield.push(player);
      } else {
        // Bottom third
        zones.defense.push(player);
      }
    }

    return zones;
  }

  /**
   * Determine formation pattern (e.g., 4-4-2, 4-3-3)
   */
  private determineFormationPattern(zones: FormationZones): string {
    const defense = zones.defense.length;
    const midfield = zones.midfield.length;
    const attack = zones.attack.length;

    // Common formation patterns
    if (defense === 4 && midfield === 4 && attack === 2) return '4-4-2';
    if (defense === 4 && midfield === 3 && attack === 3) return '4-3-3';
    if (defense === 3 && midfield === 5 && attack === 2) return '3-5-2';
    if (defense === 5 && midfield === 3 && attack === 2) return '5-3-2';
    if (defense === 4 && midfield === 5 && attack === 1) return '4-5-1';

    // Default pattern
    return `${defense}-${midfield}-${attack}`;
  }

  /**
   * Calculate formation metrics
   */
  private calculateFormationMetrics(
    players: Player[],
    zones: FormationZones
  ): FormationMetrics {
    // Calculate team compactness
    const compactness = this.calculateCompactness(players);

    // Calculate width and depth
    const width = this.calculateTeamWidth(players);
    const depth = this.calculateTeamDepth(players);

    // Calculate center of mass
    const centerOfMass = this.calculateCenterOfMass(players);

    return {
      compactness,
      width,
      depth,
      centerOfMass,
      defensiveLineHeight: this.calculateDefensiveLineHeight(zones.defense),
      offensiveLineHeight: this.calculateOffensiveLineHeight(zones.attack),
    };
  }

  /**
   * Calculate team compactness (average distance between players)
   */
  private calculateCompactness(players: Player[]): number {
    if (players.length < 2) return 0;

    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const player1 = players[i];
        const player2 = players[j];
        if (player1?.position && player2?.position) {
          const distance = this.calculateDistance(
            player1.position,
            player2.position
          );
          totalDistance += distance;
          pairCount++;
        }
      }
    }

    return pairCount > 0 ? totalDistance / pairCount : 0;
  }

  /**
   * Calculate team width (horizontal spread)
   */
  private calculateTeamWidth(players: Player[]): number {
    if (players.length === 0) return 0;

    const xPositions = players.map(p => p.position.x);
    return Math.max(...xPositions) - Math.min(...xPositions);
  }

  /**
   * Calculate team depth (vertical spread)
   */
  private calculateTeamDepth(players: Player[]): number {
    if (players.length === 0) return 0;

    const yPositions = players.map(p => p.position.y);
    return Math.max(...yPositions) - Math.min(...yPositions);
  }

  /**
   * Calculate center of mass
   */
  private calculateCenterOfMass(players: Player[]): { x: number; y: number } {
    if (players.length === 0) return { x: 0, y: 0 };

    const totalX = players.reduce((sum, p) => sum + p.position.x, 0);
    const totalY = players.reduce((sum, p) => sum + p.position.y, 0);

    return {
      x: totalX / players.length,
      y: totalY / players.length,
    };
  }

  /**
   * Calculate defensive line height
   */
  private calculateDefensiveLineHeight(defenders: Player[]): number {
    if (defenders.length === 0) return 0;

    const yPositions = defenders.map(p => p.position.y);
    return yPositions.reduce((sum, y) => sum + y, 0) / yPositions.length;
  }

  /**
   * Calculate offensive line height
   */
  private calculateOffensiveLineHeight(attackers: Player[]): number {
    if (attackers.length === 0) return 0;

    const yPositions = attackers.map(p => p.position.y);
    return yPositions.reduce((sum, y) => sum + y, 0) / yPositions.length;
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate formation statistics
   */
  private calculateFormationStats(
    teamAFormation: TeamFormation | null,
    teamBFormation: TeamFormation | null
  ): FormationStats {
    return {
      teamAPattern: teamAFormation?.pattern || 'unknown',
      teamBPattern: teamBFormation?.pattern || 'unknown',
      teamACompactness: teamAFormation?.metrics.compactness || 0,
      teamBCompactness: teamBFormation?.metrics.compactness || 0,
      formationBalance: this.calculateFormationBalance(
        teamAFormation,
        teamBFormation
      ),
    };
  }

  /**
   * Calculate formation balance between teams
   */
  private calculateFormationBalance(
    teamA: TeamFormation | null,
    teamB: TeamFormation | null
  ): number {
    if (!teamA || !teamB) return 0;

    // Simple balance calculation based on player distribution
    const teamASpread = teamA.metrics.width + teamA.metrics.depth;
    const teamBSpread = teamB.metrics.width + teamB.metrics.depth;

    return teamASpread > 0 && teamBSpread > 0
      ? Math.min(teamASpread, teamBSpread) / Math.max(teamASpread, teamBSpread)
      : 0;
  }
}

/**
 * Formation zones interface
 */
export interface FormationZones {
  defense: Player[];
  midfield: Player[];
  attack: Player[];
}

/**
 * Formation metrics interface
 */
export interface FormationMetrics {
  compactness: number;
  width: number;
  depth: number;
  centerOfMass: { x: number; y: number };
  defensiveLineHeight: number;
  offensiveLineHeight: number;
}

/**
 * Team formation interface
 */
export interface TeamFormation {
  team: string;
  pattern: string;
  zones: FormationZones;
  metrics: FormationMetrics;
  playerCount: number;
  timestamp: number;
}

/**
 * Formation statistics interface
 */
export interface FormationStats {
  teamAPattern: string;
  teamBPattern: string;
  teamACompactness: number;
  teamBCompactness: number;
  formationBalance: number;
}
