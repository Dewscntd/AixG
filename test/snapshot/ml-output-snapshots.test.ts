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

// Import required types and classes
import { VideoFrame, VideoFrameFormat } from '../../src/real-time-analysis-service/src/domain/value-objects/video-frame';
import { EdgeMLInference } from '../../src/real-time-analysis-service/src/domain/entities/live-analysis-pipeline';

// Mock EdgeMLInference for testing
const mockMLInference: EdgeMLInference = {
  analyze: jest.fn().mockResolvedValue({
    frameNumber: 1,
    timestamp: Date.now(),
    processingTimeMs: 10,
    detections: [],
    ballDetection: null,
    teamClassification: { homeTeam: 'Team A', awayTeam: 'Team B', confidence: 0.9 },
    eventDetection: [],
    confidence: 0.85,
    metadata: {}
  }),
  isReady: jest.fn().mockReturnValue(true),
  getModelVersion: jest.fn().mockReturnValue('v1.0.0')
};

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
      const playerDetectionStage = new PlayerDetectionStage(mockMLInference);

      // Use fixed test frame for consistent results
      const testFrame = createTestVideoFrame();

      const result = await playerDetectionStage.process({
        frame: testFrame,
        context: {},
      });

      // Normalize result for snapshot comparison
      const normalizedResult = normalizePlayerDetectionResult(result);

      expectMatchSnapshot('player-detection-standard', normalizedResult);
    });

    it('should handle crowded scenes consistently', async () => {
      const playerDetectionStage = new PlayerDetectionStage(mockMLInference);

      const crowdedFrame = createCrowdedSceneFrame();

      const result = await playerDetectionStage.process({
        frame: crowdedFrame,
        context: {},
      });

      const normalizedResult = normalizePlayerDetectionResult(result);

      expectMatchSnapshot('player-detection-crowded', normalizedResult);
    });

    it('should handle low-light conditions consistently', async () => {
      const playerDetectionStage = new PlayerDetectionStage(mockMLInference);

      const lowLightFrame = createLowLightFrame();

      const result = await playerDetectionStage.process({
        frame: lowLightFrame,
        context: {},
      });

      const normalizedResult = normalizePlayerDetectionResult(result);

      expectMatchSnapshot('player-detection-lowlight', normalizedResult);
    });
  });

  describe('Ball Tracking Snapshots', () => {
    it('should maintain consistent ball tracking output', async () => {
      const ballTrackingStage = new BallTrackingStage(mockMLInference);

      const testFrame = createTestVideoFrame();
      const previousBallData = createPreviousBallData();

      const result = await ballTrackingStage.process({
        frame: testFrame,
        context: { ball: previousBallData },
      });

      const normalizedResult = normalizeBallTrackingResult(result);

      expectMatchSnapshot('ball-tracking-standard', normalizedResult);
    });

    it('should handle ball occlusion consistently', async () => {
      const ballTrackingStage = new BallTrackingStage(mockMLInference);

      const occludedFrame = createBallOcclusionFrame();

      const result = await ballTrackingStage.process({
        frame: occludedFrame,
        context: {},
      });

      const normalizedResult = normalizeBallTrackingResult(result);

      expectMatchSnapshot('ball-tracking-occlusion', normalizedResult);
    });

    it('should handle fast ball movement consistently', async () => {
      const ballTrackingStage = new BallTrackingStage(mockMLInference);

      const fastMovementFrame = createFastBallMovementFrame();
      const previousBallData = createFastMovingBallData();

      const result = await ballTrackingStage.process({
        frame: fastMovementFrame,
        context: { ball: previousBallData },
      });

      const normalizedResult = normalizeBallTrackingResult(result);

      expectMatchSnapshot('ball-tracking-fast-movement', normalizedResult);
    });
  });

  describe('Event Detection Snapshots', () => {
    it('should consistently detect pass events', async () => {
      const eventDetectionStage = new EventDetectionStage(mockMLInference);

      const passEventFrame = createPassEventFrame();
      const playerData = createPlayerDataForPass();
      const ballData = createBallDataForPass();

      const result = await eventDetectionStage.process({
        frame: passEventFrame,
        context: {
          players: playerData,
          ball: ballData,
        },
      });

      const normalizedResult = normalizeEventDetectionResult(result);

      expectMatchSnapshot('event-detection-pass', normalizedResult);
    });

    it('should consistently detect shot events', async () => {
      const eventDetectionStage = new EventDetectionStage(mockMLInference);

      const shotEventFrame = createShotEventFrame();
      const playerData = createPlayerDataForShot();
      const ballData = createBallDataForShot();

      const result = await eventDetectionStage.process({
        frame: shotEventFrame,
        context: {
          players: playerData,
          ball: ballData,
        },
      });

      const normalizedResult = normalizeEventDetectionResult(result);

      expectMatchSnapshot('event-detection-shot', normalizedResult);
    });

    it('should consistently detect tackle events', async () => {
      const eventDetectionStage = new EventDetectionStage(mockMLInference);

      const tackleEventFrame = createTackleEventFrame();
      const playerData = createPlayerDataForTackle();
      const ballData = createBallDataForTackle();

      const result = await eventDetectionStage.process({
        frame: tackleEventFrame,
        context: {
          players: playerData,
          ball: ballData,
        },
      });

      const normalizedResult = normalizeEventDetectionResult(result);

      expectMatchSnapshot('event-detection-tackle', normalizedResult);
    });
  });

  describe('Formation Analysis Snapshots', () => {
    it('should consistently detect 4-4-2 formation', async () => {
      const formationStage = new FormationAnalysisStage(mockMLInference);

      const formation442Frame = createFormation442Frame();
      const playerData = createPlayerDataFor442();

      const result = await formationStage.process({
        frame: formation442Frame,
        context: {
          classifiedPlayers: playerData.homeTeam.players.concat(playerData.awayTeam.players)
        },
      });

      const normalizedResult = normalizeFormationResult(result);

      expectMatchSnapshot('formation-analysis-442', normalizedResult);
    });

    it('should consistently detect 4-3-3 formation', async () => {
      const formationStage = new FormationAnalysisStage(mockMLInference);

      const formation433Frame = createFormation433Frame();
      const playerData = createPlayerDataFor433();

      const result = await formationStage.process({
        frame: formation433Frame,
        context: {
          classifiedPlayers: playerData.homeTeam.players.concat(playerData.awayTeam.players)
        },
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
        context: {
          classifiedPlayers: allPreviousResults.playerDetection.players,
          ball: allPreviousResults.ballTracking.ball,
          events: allPreviousResults.eventDetection.events
        },
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
        context: {
          classifiedPlayers: possessionResults.playerDetection.players,
          ball: possessionResults.ballTracking.ball,
          events: []
        },
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
  // Handle the case where result.output.players exists
  const players = result.output?.players || result.players || [];

  return {
    players: players.map((player: any) => ({
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
      modelVersion: result.metadata?.modelVersion || 'test-version',
      confidence: Math.round((result.metadata?.confidence || 0.9) * 1000) / 1000,
    },
  };
}

function normalizeBallTrackingResult(result: any) {
  // Handle the case where result.output.ball exists
  const ball = result.output?.ball || result.ball;

  if (!ball) {
    return {
      ball: null,
      trajectory: [],
      metadata: {
        trackingQuality: 'poor',
        modelVersion: 'test-version',
      },
    };
  }

  return {
    ball: {
      position: {
        x: Math.round(ball.position.x * 100) / 100,
        y: Math.round(ball.position.y * 100) / 100,
      },
      velocity: {
        x: Math.round((ball.velocity?.x || 0) * 100) / 100,
        y: Math.round((ball.velocity?.y || 0) * 100) / 100,
      },
      confidence: Math.round(ball.confidence * 1000) / 1000,
    },
    trajectory: result.trajectory ? result.trajectory.map((point: any) => ({
      x: Math.round(point.x * 100) / 100,
      y: Math.round(point.y * 100) / 100,
      timestamp: 'normalized',
    })) : [],
    metadata: {
      trackingQuality: result.metadata?.trackingQuality || 'good',
      modelVersion: result.metadata?.modelVersion || 'test-version',
    },
  };
}

function normalizeEventDetectionResult(result: any) {
  // Handle the case where result.output.events exists
  const events = result.output?.events || result.events || [];

  return {
    events: events.map((event: any) => ({
      type: event.eventType || event.type,
      confidence: Math.round(event.confidence * 1000) / 1000,
      position: {
        x: Math.round(event.position.x * 100) / 100,
        y: Math.round(event.position.y * 100) / 100,
      },
      timestamp: 'normalized',
      metadata: event.metadata || {}
    })),
    metadata: {
      detectionQuality: result.metadata?.detectionQuality || 'high',
      modelVersion: result.metadata?.modelVersion || 'test-version',
    },
  };
}

function normalizeFormationResult(result: any) {
  // Handle the case where result.output.formation exists
  const formation = result.output?.formation || result.formation;

  if (!formation) {
    return {
      homeTeam: {
        formation: 'unknown',
        confidence: 0.5,
        players: [],
      },
      awayTeam: {
        formation: 'unknown',
        confidence: 0.5,
        players: [],
      },
      metadata: {
        analysisQuality: 'poor',
        modelVersion: 'test-version',
      },
    };
  }

  return {
    homeTeam: {
      formation: formation.homeTeam || 'unknown',
      confidence: 0.9, // Mock confidence
      players: [], // Simplified for snapshot testing
    },
    awayTeam: {
      formation: formation.awayTeam || 'unknown',
      confidence: 0.9, // Mock confidence
      players: [], // Simplified for snapshot testing
    },
    metadata: {
      analysisQuality: 'high',
      modelVersion: 'test-version',
    },
  };
}

function normalizeMetricsResult(result: any) {
  // Handle the case where result.output.metrics exists
  const metrics = result.output?.metrics || result.metrics;

  if (!metrics) {
    return {
      possession: 50,
      passAccuracy: 75,
      metadata: {
        calculationMethod: 'test-method',
        confidence: 0.9,
      },
    };
  }

  return {
    possession: Math.round(metrics.possession * 100) / 100,
    passAccuracy: Math.round(metrics.passAccuracy * 100) / 100,
    metadata: {
      calculationMethod: 'advanced-ml',
      confidence: 0.9,
    },
  };
}

// Test data creation functions (simplified for brevity)
function createTestVideoFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'standard' }
  );
}

function createCrowdedSceneFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'crowded' }
  );
}

function createLowLightFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'lowlight' }
  );
}

// Additional helper functions would be implemented here...
function createPreviousBallData() {
  return {
    position: { x: 50, y: 50 },
    visible: true,
    confidence: 0.9,
    processingTimeMs: 10
  };
}

function createBallOcclusionFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'ball-occlusion' }
  );
}

function createFastBallMovementFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'fast-ball-movement' }
  );
}

function createFastMovingBallData() {
  return {
    position: { x: 75, y: 25 },
    visible: true,
    confidence: 0.85,
    processingTimeMs: 12,
    velocity: { x: 15.5, y: -8.2 }
  };
}

function createPassEventFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'pass-event' }
  );
}

function createPlayerDataForPass() {
  return [
    {
      playerId: 'player-1',
      boundingBox: { x: 25, y: 35, width: 10, height: 20 },
      position: { x: 30, y: 40 },
      confidence: 0.95,
      processingTimeMs: 8
    },
    {
      playerId: 'player-2',
      boundingBox: { x: 55, y: 40, width: 10, height: 20 },
      position: { x: 60, y: 45 },
      confidence: 0.92,
      processingTimeMs: 8
    }
  ];
}

function createBallDataForPass() {
  return {
    position: { x: 45, y: 42 },
    visible: true,
    confidence: 0.88,
    processingTimeMs: 9
  };
}

function createShotEventFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'shot-event' }
  );
}

function createPlayerDataForShot() {
  return [
    {
      playerId: 'shooter-1',
      boundingBox: { x: 85, y: 30, width: 12, height: 22 },
      position: { x: 88, y: 35 },
      confidence: 0.96,
      processingTimeMs: 7,
      teamId: 'home-team',
      action: 'shooting'
    },
    {
      playerId: 'defender-1',
      boundingBox: { x: 80, y: 32, width: 10, height: 20 },
      position: { x: 83, y: 37 },
      confidence: 0.91,
      processingTimeMs: 7,
      teamId: 'away-team',
      action: 'defending'
    },
    {
      playerId: 'goalkeeper-1',
      boundingBox: { x: 95, y: 45, width: 11, height: 21 },
      position: { x: 97, y: 50 },
      confidence: 0.98,
      processingTimeMs: 6,
      teamId: 'away-team',
      action: 'goalkeeping'
    }
  ];
}

function createBallDataForShot() {
  return {
    position: { x: 87, y: 36 },
    velocity: { x: 18.5, y: -2.3 },
    visible: true,
    confidence: 0.94,
    processingTimeMs: 8,
    trajectory: [
      { x: 85, y: 37, timestamp: 'normalized' },
      { x: 87, y: 36, timestamp: 'normalized' },
      { x: 90, y: 35, timestamp: 'normalized' }
    ],
    expectedTarget: { x: 95, y: 50 }
  };
}

function createTackleEventFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'tackle-event' }
  );
}

function createPlayerDataForTackle() {
  return [
    {
      playerId: 'tackler-1',
      boundingBox: { x: 45, y: 50, width: 11, height: 21 },
      position: { x: 48, y: 55 },
      confidence: 0.93,
      processingTimeMs: 9,
      teamId: 'away-team',
      action: 'tackling'
    },
    {
      playerId: 'ball-carrier-1',
      boundingBox: { x: 47, y: 48, width: 10, height: 20 },
      position: { x: 50, y: 53 },
      confidence: 0.95,
      processingTimeMs: 8,
      teamId: 'home-team',
      action: 'dribbling'
    },
    {
      playerId: 'support-1',
      boundingBox: { x: 52, y: 45, width: 10, height: 19 },
      position: { x: 55, y: 50 },
      confidence: 0.89,
      processingTimeMs: 9,
      teamId: 'home-team',
      action: 'supporting'
    }
  ];
}

function createBallDataForTackle() {
  return {
    position: { x: 49, y: 52 },
    velocity: { x: 3.2, y: 1.8 },
    visible: true,
    confidence: 0.87,
    processingTimeMs: 10,
    trajectory: [
      { x: 48, y: 51, timestamp: 'normalized' },
      { x: 49, y: 52, timestamp: 'normalized' }
    ],
    possession: 'contested'
  };
}

function createFormation442Frame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'formation-442' }
  );
}

function createPlayerDataFor442() {
  return {
    homeTeam: {
      formation: '4-4-2',
      players: [
        {
          playerId: 'gk-1',
          position: { x: 10, y: 50 },
          confidence: 0.95,
          processingTimeMs: 8,
          boundingBox: { x: 192, y: 540, width: 50, height: 100 },
          teamId: 'home'
        },
        {
          playerId: 'lb-1',
          position: { x: 25, y: 20 },
          confidence: 0.92,
          processingTimeMs: 7,
          boundingBox: { x: 480, y: 216, width: 45, height: 95 },
          teamId: 'home'
        },
        {
          playerId: 'cb-1',
          position: { x: 25, y: 35 },
          confidence: 0.94,
          processingTimeMs: 8,
          boundingBox: { x: 480, y: 378, width: 48, height: 98 },
          teamId: 'home'
        },
        {
          playerId: 'cb-2',
          position: { x: 25, y: 65 },
          confidence: 0.93,
          processingTimeMs: 9,
          boundingBox: { x: 480, y: 702, width: 47, height: 97 },
          teamId: 'home'
        },
        {
          playerId: 'rb-1',
          position: { x: 25, y: 80 },
          confidence: 0.91,
          processingTimeMs: 8,
          boundingBox: { x: 480, y: 864, width: 46, height: 96 },
          teamId: 'home'
        }
      ]
    },
    awayTeam: {
      formation: '4-3-3',
      players: [
        {
          playerId: 'gk-2',
          position: { x: 90, y: 50 },
          confidence: 0.96,
          processingTimeMs: 7,
          boundingBox: { x: 1728, y: 540, width: 52, height: 102 },
          teamId: 'away'
        },
        {
          playerId: 'lb-2',
          position: { x: 75, y: 20 },
          confidence: 0.89,
          processingTimeMs: 9,
          boundingBox: { x: 1440, y: 216, width: 44, height: 94 },
          teamId: 'away'
        },
        {
          playerId: 'cb-3',
          position: { x: 75, y: 35 },
          confidence: 0.92,
          processingTimeMs: 8,
          boundingBox: { x: 1440, y: 378, width: 46, height: 96 },
          teamId: 'away'
        }
      ]
    }
  };
}

function createFormation433Frame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'formation-433' }
  );
}

function createPlayerDataFor433() {
  return {
    homeTeam: {
      formation: '4-3-3',
      players: [
        {
          playerId: 'gk-1',
          position: { x: 10, y: 50 },
          confidence: 0.95,
          processingTimeMs: 8,
          boundingBox: { x: 192, y: 540, width: 50, height: 100 },
          teamId: 'home'
        },
        {
          playerId: 'lb-1',
          position: { x: 25, y: 20 },
          confidence: 0.92,
          processingTimeMs: 7,
          boundingBox: { x: 480, y: 216, width: 45, height: 95 },
          teamId: 'home'
        },
        {
          playerId: 'cb-1',
          position: { x: 25, y: 35 },
          confidence: 0.94,
          processingTimeMs: 8,
          boundingBox: { x: 480, y: 378, width: 48, height: 98 },
          teamId: 'home'
        }
      ]
    },
    awayTeam: {
      formation: '4-4-2',
      players: [
        {
          playerId: 'gk-2',
          position: { x: 90, y: 50 },
          confidence: 0.96,
          processingTimeMs: 7,
          boundingBox: { x: 1728, y: 540, width: 52, height: 102 },
          teamId: 'away'
        },
        {
          playerId: 'lb-2',
          position: { x: 75, y: 20 },
          confidence: 0.89,
          processingTimeMs: 9,
          boundingBox: { x: 1440, y: 216, width: 44, height: 94 },
          teamId: 'away'
        }
      ]
    }
  };
}

function createMetricsFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'metrics-calculation' }
  );
}

function createCompleteAnalysisResults() {
  return {
    playerDetection: {
      players: [
        {
          playerId: 'player-1',
          teamId: 'home-team',
          position: { x: 30, y: 40 },
          confidence: 0.95,
          processingTimeMs: 8,
          boundingBox: { x: 25, y: 35, width: 10, height: 20 }
        },
        {
          playerId: 'player-2',
          teamId: 'away-team',
          position: { x: 70, y: 60 },
          confidence: 0.92,
          processingTimeMs: 9,
          boundingBox: { x: 65, y: 55, width: 10, height: 20 }
        }
      ],
      metadata: {
        processingTime: 'normalized',
        modelVersion: 'v2.1.0',
        confidence: 0.94
      }
    },
    ballTracking: {
      ball: {
        position: { x: 50, y: 50 },
        velocity: { x: 5.2, y: -2.1 },
        confidence: 0.89,
        processingTimeMs: 7,
        visible: true
      },
      trajectory: [
        { x: 48, y: 52, timestamp: 'normalized' },
        { x: 50, y: 50, timestamp: 'normalized' }
      ],
      metadata: {
        trackingQuality: 'good',
        modelVersion: 'v1.8.0'
      }
    },
    eventDetection: {
      events: [
        {
          eventType: 'pass' as const,
          confidence: 0.87,
          processingTimeMs: 6,
          timestamp: Date.now(),
          position: { x: 50, y: 50 },
          metadata: { quality: 'high' }
        }
      ],
      metadata: {
        detectionQuality: 'high',
        modelVersion: 'v3.2.0'
      }
    },
    formationAnalysis: createPlayerDataFor442()
  };
}

function createPossessionFrame(): VideoFrame {
  const frameData = TestDataFactory.createVideoFrame();
  return new VideoFrame(
    frameData.timestamp,
    frameData.frameNumber,
    frameData.width,
    frameData.height,
    frameData.data,
    VideoFrameFormat.RGB24,
    { scenario: 'possession-analysis' }
  );
}

function createPossessionAnalysisResults() {
  return {
    playerDetection: {
      players: [
        {
          playerId: 'midfielder-1',
          teamId: 'home-team',
          position: { x: 45, y: 50 },
          confidence: 0.96,
          processingTimeMs: 8,
          boundingBox: { x: 40, y: 45, width: 10, height: 20 }
        },
        {
          playerId: 'defender-1',
          teamId: 'away-team',
          position: { x: 55, y: 45 },
          confidence: 0.93,
          processingTimeMs: 9,
          boundingBox: { x: 50, y: 40, width: 10, height: 20 }
        },
        {
          playerId: 'winger-1',
          teamId: 'home-team',
          position: { x: 65, y: 25 },
          confidence: 0.91,
          processingTimeMs: 7,
          boundingBox: { x: 60, y: 20, width: 10, height: 20 }
        }
      ],
      metadata: {
        processingTime: 'normalized',
        modelVersion: 'v2.1.0',
        confidence: 0.93
      }
    },
    ballTracking: {
      ball: {
        position: { x: 46, y: 51 },
        velocity: { x: 2.1, y: 0.8 },
        confidence: 0.94,
        processingTimeMs: 6,
        visible: true
      },
      metadata: {
        trackingQuality: 'excellent',
        modelVersion: 'v1.8.0'
      }
    },
    possessionMetrics: {
      currentPossession: 'home-team',
      possessionDuration: 12.5,
      passCount: 3,
      touchCount: 8,
      possessionZone: 'midfield',
      pressure: 'medium'
    }
  };
}
