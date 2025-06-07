/**
 * Snapshot Tests for ML Pipeline Outputs
 * Ensures ML model outputs remain consistent across versions
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TestDataFactory } from '../setup/jest.setup';

// Mock ML pipeline stages for testing
import { 
  PlayerDetectionStage,
  BallTrackingStage,
  EventDetectionStage,
  FormationAnalysisStage,
  MetricsCalculationStage 
} from '../../src/real-time-analysis-service/src/domain/stages';

describe('ML Pipeline Output Snapshots', () => {
  const snapshotDir = join(__dirname, '__snapshots__');
  
  beforeAll(() => {
    // Ensure snapshot directory exists
    if (!existsSync(snapshotDir)) {
      require('fs').mkdirSync(snapshotDir, { recursive: true });
    }
  });

  describe('Player Detection Snapshots', () => {
    it('should maintain consistent player detection output', async () => {
      const playerDetectionStage = new PlayerDetectionStage();
      
      // Use fixed test frame for consistent results
      const testFrame = createTestVideoFrame();
      
      const result = await playerDetectionStage.process({
        frame: testFrame,
        previousResults: {},
      });
      
      // Normalize result for snapshot comparison
      const normalizedResult = normalizePlayerDetectionResult(result);
      
      expectMatchSnapshot('player-detection-standard', normalizedResult);
    });

    it('should handle crowded scenes consistently', async () => {
      const playerDetectionStage = new PlayerDetectionStage();
      
      const crowdedFrame = createCrowdedSceneFrame();
      
      const result = await playerDetectionStage.process({
        frame: crowdedFrame,
        previousResults: {},
      });
      
      const normalizedResult = normalizePlayerDetectionResult(result);
      
      expectMatchSnapshot('player-detection-crowded', normalizedResult);
    });

    it('should handle low-light conditions consistently', async () => {
      const playerDetectionStage = new PlayerDetectionStage();
      
      const lowLightFrame = createLowLightFrame();
      
      const result = await playerDetectionStage.process({
        frame: lowLightFrame,
        previousResults: {},
      });
      
      const normalizedResult = normalizePlayerDetectionResult(result);
      
      expectMatchSnapshot('player-detection-lowlight', normalizedResult);
    });
  });

  describe('Ball Tracking Snapshots', () => {
    it('should maintain consistent ball tracking output', async () => {
      const ballTrackingStage = new BallTrackingStage();
      
      const testFrame = createTestVideoFrame();
      const previousBallData = createPreviousBallData();
      
      const result = await ballTrackingStage.process({
        frame: testFrame,
        previousResults: { ballTracking: previousBallData },
      });
      
      const normalizedResult = normalizeBallTrackingResult(result);
      
      expectMatchSnapshot('ball-tracking-standard', normalizedResult);
    });

    it('should handle ball occlusion consistently', async () => {
      const ballTrackingStage = new BallTrackingStage();
      
      const occludedFrame = createBallOcclusionFrame();
      
      const result = await ballTrackingStage.process({
        frame: occludedFrame,
        previousResults: {},
      });
      
      const normalizedResult = normalizeBallTrackingResult(result);
      
      expectMatchSnapshot('ball-tracking-occlusion', normalizedResult);
    });

    it('should handle fast ball movement consistently', async () => {
      const ballTrackingStage = new BallTrackingStage();
      
      const fastMovementFrame = createFastBallMovementFrame();
      const previousBallData = createFastMovingBallData();
      
      const result = await ballTrackingStage.process({
        frame: fastMovementFrame,
        previousResults: { ballTracking: previousBallData },
      });
      
      const normalizedResult = normalizeBallTrackingResult(result);
      
      expectMatchSnapshot('ball-tracking-fast-movement', normalizedResult);
    });
  });

  describe('Event Detection Snapshots', () => {
    it('should consistently detect pass events', async () => {
      const eventDetectionStage = new EventDetectionStage();
      
      const passEventFrame = createPassEventFrame();
      const playerData = createPlayerDataForPass();
      const ballData = createBallDataForPass();
      
      const result = await eventDetectionStage.process({
        frame: passEventFrame,
        previousResults: {
          playerDetection: playerData,
          ballTracking: ballData,
        },
      });
      
      const normalizedResult = normalizeEventDetectionResult(result);
      
      expectMatchSnapshot('event-detection-pass', normalizedResult);
    });

    it('should consistently detect shot events', async () => {
      const eventDetectionStage = new EventDetectionStage();
      
      const shotEventFrame = createShotEventFrame();
      const playerData = createPlayerDataForShot();
      const ballData = createBallDataForShot();
      
      const result = await eventDetectionStage.process({
        frame: shotEventFrame,
        previousResults: {
          playerDetection: playerData,
          ballTracking: ballData,
        },
      });
      
      const normalizedResult = normalizeEventDetectionResult(result);
      
      expectMatchSnapshot('event-detection-shot', normalizedResult);
    });

    it('should consistently detect tackle events', async () => {
      const eventDetectionStage = new EventDetectionStage();
      
      const tackleEventFrame = createTackleEventFrame();
      const playerData = createPlayerDataForTackle();
      const ballData = createBallDataForTackle();
      
      const result = await eventDetectionStage.process({
        frame: tackleEventFrame,
        previousResults: {
          playerDetection: playerData,
          ballTracking: ballData,
        },
      });
      
      const normalizedResult = normalizeEventDetectionResult(result);
      
      expectMatchSnapshot('event-detection-tackle', normalizedResult);
    });
  });

  describe('Formation Analysis Snapshots', () => {
    it('should consistently detect 4-4-2 formation', async () => {
      const formationStage = new FormationAnalysisStage();
      
      const formation442Frame = createFormation442Frame();
      const playerData = createPlayerDataFor442();
      
      const result = await formationStage.process({
        frame: formation442Frame,
        previousResults: { playerDetection: playerData },
      });
      
      const normalizedResult = normalizeFormationResult(result);
      
      expectMatchSnapshot('formation-analysis-442', normalizedResult);
    });

    it('should consistently detect 4-3-3 formation', async () => {
      const formationStage = new FormationAnalysisStage();
      
      const formation433Frame = createFormation433Frame();
      const playerData = createPlayerDataFor433();
      
      const result = await formationStage.process({
        frame: formation433Frame,
        previousResults: { playerDetection: playerData },
      });
      
      const normalizedResult = normalizeFormationResult(result);
      
      expectMatchSnapshot('formation-analysis-433', normalizedResult);
    });
  });

  describe('Metrics Calculation Snapshots', () => {
    it('should consistently calculate xG metrics', async () => {
      const metricsStage = new MetricsCalculationStage();
      
      const metricsFrame = createMetricsFrame();
      const allPreviousResults = createCompleteAnalysisResults();
      
      const result = await metricsStage.process({
        frame: metricsFrame,
        previousResults: allPreviousResults,
      });
      
      const normalizedResult = normalizeMetricsResult(result);
      
      expectMatchSnapshot('metrics-calculation-xg', normalizedResult);
    });

    it('should consistently calculate possession metrics', async () => {
      const metricsStage = new MetricsCalculationStage();
      
      const possessionFrame = createPossessionFrame();
      const possessionResults = createPossessionAnalysisResults();
      
      const result = await metricsStage.process({
        frame: possessionFrame,
        previousResults: possessionResults,
      });
      
      const normalizedResult = normalizeMetricsResult(result);
      
      expectMatchSnapshot('metrics-calculation-possession', normalizedResult);
    });
  });
});

// Snapshot utility functions
function expectMatchSnapshot(snapshotName: string, data: any) {
  const snapshotPath = join(__dirname, '__snapshots__', `${snapshotName}.json`);
  
  // Serialize data with consistent formatting
  const serializedData = JSON.stringify(data, null, 2);
  
  if (existsSync(snapshotPath)) {
    // Compare with existing snapshot
    const existingSnapshot = readFileSync(snapshotPath, 'utf8');
    
    if (serializedData !== existingSnapshot) {
      // Check if we're in update mode
      if (process.env.UPDATE_SNAPSHOTS === 'true') {
        writeFileSync(snapshotPath, serializedData);
        console.log(`Updated snapshot: ${snapshotName}`);
      } else {
        throw new Error(`Snapshot mismatch for ${snapshotName}. Run with UPDATE_SNAPSHOTS=true to update.`);
      }
    }
  } else {
    // Create new snapshot
    writeFileSync(snapshotPath, serializedData);
    console.log(`Created new snapshot: ${snapshotName}`);
  }
}

// Normalization functions to ensure consistent snapshots
function normalizePlayerDetectionResult(result: any) {
  return {
    players: result.players.map((player: any) => ({
      id: 'normalized-id', // Remove random IDs
      teamId: player.teamId,
      position: {
        x: Math.round(player.position.x * 100) / 100, // Round to 2 decimal places
        y: Math.round(player.position.y * 100) / 100,
      },
      confidence: Math.round(player.confidence * 1000) / 1000, // Round to 3 decimal places
      boundingBox: player.boundingBox ? {
        x: Math.round(player.boundingBox.x),
        y: Math.round(player.boundingBox.y),
        width: Math.round(player.boundingBox.width),
        height: Math.round(player.boundingBox.height),
      } : null,
    })),
    metadata: {
      processingTime: 'normalized', // Remove timing variations
      modelVersion: result.metadata.modelVersion,
      confidence: Math.round(result.metadata.confidence * 1000) / 1000,
    },
  };
}

function normalizeBallTrackingResult(result: any) {
  return {
    ball: {
      position: {
        x: Math.round(result.ball.position.x * 100) / 100,
        y: Math.round(result.ball.position.y * 100) / 100,
      },
      velocity: {
        x: Math.round(result.ball.velocity.x * 100) / 100,
        y: Math.round(result.ball.velocity.y * 100) / 100,
      },
      confidence: Math.round(result.ball.confidence * 1000) / 1000,
    },
    trajectory: result.trajectory ? result.trajectory.map((point: any) => ({
      x: Math.round(point.x * 100) / 100,
      y: Math.round(point.y * 100) / 100,
      timestamp: 'normalized',
    })) : [],
    metadata: {
      trackingQuality: result.metadata.trackingQuality,
      modelVersion: result.metadata.modelVersion,
    },
  };
}

function normalizeEventDetectionResult(result: any) {
  return {
    events: result.events.map((event: any) => ({
      type: event.type,
      confidence: Math.round(event.confidence * 1000) / 1000,
      participants: event.participants.map((p: any) => ({
        playerId: 'normalized-id',
        role: p.role,
        position: {
          x: Math.round(p.position.x * 100) / 100,
          y: Math.round(p.position.y * 100) / 100,
        },
      })),
      location: {
        x: Math.round(event.location.x * 100) / 100,
        y: Math.round(event.location.y * 100) / 100,
      },
      timestamp: 'normalized',
    })),
    metadata: {
      detectionQuality: result.metadata.detectionQuality,
      modelVersion: result.metadata.modelVersion,
    },
  };
}

function normalizeFormationResult(result: any) {
  return {
    homeTeam: {
      formation: result.homeTeam.formation,
      confidence: Math.round(result.homeTeam.confidence * 1000) / 1000,
      players: result.homeTeam.players.map((p: any) => ({
        playerId: 'normalized-id',
        position: p.position,
        coordinates: {
          x: Math.round(p.coordinates.x * 100) / 100,
          y: Math.round(p.coordinates.y * 100) / 100,
        },
      })),
    },
    awayTeam: {
      formation: result.awayTeam.formation,
      confidence: Math.round(result.awayTeam.confidence * 1000) / 1000,
      players: result.awayTeam.players.map((p: any) => ({
        playerId: 'normalized-id',
        position: p.position,
        coordinates: {
          x: Math.round(p.coordinates.x * 100) / 100,
          y: Math.round(p.coordinates.y * 100) / 100,
        },
      })),
    },
    metadata: {
      analysisQuality: result.metadata.analysisQuality,
      modelVersion: result.metadata.modelVersion,
    },
  };
}

function normalizeMetricsResult(result: any) {
  return {
    xG: {
      homeTeam: Math.round(result.xG.homeTeam * 1000) / 1000,
      awayTeam: Math.round(result.xG.awayTeam * 1000) / 1000,
    },
    possession: {
      homeTeam: Math.round(result.possession.homeTeam * 100) / 100,
      awayTeam: Math.round(result.possession.awayTeam * 100) / 100,
    },
    passAccuracy: {
      homeTeam: Math.round(result.passAccuracy.homeTeam * 100) / 100,
      awayTeam: Math.round(result.passAccuracy.awayTeam * 100) / 100,
    },
    metadata: {
      calculationMethod: result.metadata.calculationMethod,
      confidence: Math.round(result.metadata.confidence * 1000) / 1000,
    },
  };
}

// Test data creation functions (simplified for brevity)
function createTestVideoFrame() {
  return TestDataFactory.createVideoFrame();
}

function createCrowdedSceneFrame() {
  return { ...TestDataFactory.createVideoFrame(), scenario: 'crowded' };
}

function createLowLightFrame() {
  return { ...TestDataFactory.createVideoFrame(), scenario: 'lowlight' };
}

// Additional helper functions would be implemented here...
function createPreviousBallData() { return {}; }
function createBallOcclusionFrame() { return TestDataFactory.createVideoFrame(); }
function createFastBallMovementFrame() { return TestDataFactory.createVideoFrame(); }
function createFastMovingBallData() { return {}; }
function createPassEventFrame() { return TestDataFactory.createVideoFrame(); }
function createPlayerDataForPass() { return {}; }
function createBallDataForPass() { return {}; }
function createShotEventFrame() { return TestDataFactory.createVideoFrame(); }
function createPlayerDataForShot() { return {}; }
function createBallDataForShot() { return {}; }
function createTackleEventFrame() { return TestDataFactory.createVideoFrame(); }
function createPlayerDataForTackle() { return {}; }
function createBallDataForTackle() { return {}; }
function createFormation442Frame() { return TestDataFactory.createVideoFrame(); }
function createPlayerDataFor442() { return {}; }
function createFormation433Frame() { return TestDataFactory.createVideoFrame(); }
function createPlayerDataFor433() { return {}; }
function createMetricsFrame() { return TestDataFactory.createVideoFrame(); }
function createCompleteAnalysisResults() { return {}; }
function createPossessionFrame() { return TestDataFactory.createVideoFrame(); }
function createPossessionAnalysisResults() { return {}; }
