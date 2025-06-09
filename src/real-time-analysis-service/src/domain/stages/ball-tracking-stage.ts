import { AnalysisStage, StageInput, StageResult, EdgeMLInference } from '../entities/live-analysis-pipeline';
import { Position, Velocity } from './player-detection-stage';
import { BallDetection as MLBallDetection } from '../../infrastructure/ml/edge-ml-inference';

/**
 * Ball Tracking Stage
 * Detects and tracks the ball in real-time using ML inference
 */
export class BallTrackingStage implements AnalysisStage {
  public readonly name = 'BallTracking';

  private ballTrajectory: BallPosition[] = [];
  private readonly maxTrajectoryLength = 30; // Keep last 30 positions

  constructor(private readonly mlInference: EdgeMLInference) {}

  async process(input: StageInput): Promise<StageResult> {
    const startTime = Date.now();
    
    try {
      const { frame, context } = input;
      const preprocessedFrame = context.preprocessedFrame || frame;

      // Perform ball detection using ML inference
      const detectionResult = await this.mlInference.analyze(preprocessedFrame);
      
      // Process ball detection
      const ballDetection = this.processBallDetection(detectionResult);
      
      // Track ball across frames
      const previousBall = context.ball ? this.convertBallDetectionToBallPosition(context.ball) : undefined;
      const trackedBall = this.trackBall(ballDetection, previousBall);

      // Update trajectory
      if (trackedBall) {
        this.updateTrajectory(trackedBall);
      }

      // Calculate ball statistics
      const ballStats = this.calculateBallStats(trackedBall);

      const processingTime = Date.now() - startTime;

      return {
        stageName: this.name,
        success: true,
        processingTimeMs: processingTime,
        output: {
          ball: trackedBall ? this.convertBallPositionToBallDetection(trackedBall) : null,
          stats: ballStats
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
          ball: null
        }
      };
    }
  }

  /**
   * Convert MLBallDetection to BallPosition for internal processing
   */
  private convertBallDetectionToBallPosition(ballDetection: MLBallDetection): BallPosition {
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
   * Convert BallPosition to MLBallDetection for output
   */
  private convertBallPositionToBallDetection(ballPosition: BallPosition): MLBallDetection {
    return {
      position: ballPosition.position,
      velocity: ballPosition.velocity,
      confidence: ballPosition.confidence,
      visible: !ballPosition.predicted,
      processingTimeMs: 10 // Mock processing time
    };
  }

  /**
   * Process raw ML detection results for ball
   */
  private processBallDetection(detectionResult: any): BallDetection | null {
    if (!detectionResult || !detectionResult.detections) {
      return null;
    }

    // Find ball detection (highest confidence ball-like object)
    const ballDetections = detectionResult.detections
      .filter((detection: any) => 
        detection.class === 'ball' || 
        detection.class === 'sports ball' ||
        detection.class === 'soccer ball'
      )
      .sort((a: any, b: any) => b.confidence - a.confidence);

    if (ballDetections.length === 0) {
      return null;
    }

    const detection = ballDetections[0];
    
    return {
      boundingBox: {
        x: detection.bbox.x,
        y: detection.bbox.y,
        width: detection.bbox.width,
        height: detection.bbox.height
      },
      confidence: detection.confidence,
      position: {
        x: detection.bbox.x + detection.bbox.width / 2,
        y: detection.bbox.y + detection.bbox.height / 2
      },
      radius: Math.min(detection.bbox.width, detection.bbox.height) / 2,
      timestamp: Date.now()
    };
  }

  /**
   * Track ball across frames
   */
  private trackBall(
    currentDetection: BallDetection | null,
    previousBall?: BallPosition
  ): BallPosition | null {
    if (!currentDetection) {
      // Try to predict ball position based on trajectory
      return this.predictBallPosition(previousBall);
    }

    let velocity: Velocity = { x: 0, y: 0 };
    
    if (previousBall) {
      const timeDelta = currentDetection.timestamp - previousBall.timestamp;
      if (timeDelta > 0) {
        velocity = {
          x: (currentDetection.position.x - previousBall.position.x) / timeDelta,
          y: (currentDetection.position.y - previousBall.position.y) / timeDelta
        };
      }
    }

    return {
      position: currentDetection.position,
      velocity,
      confidence: currentDetection.confidence,
      radius: currentDetection.radius,
      timestamp: currentDetection.timestamp,
      predicted: false
    };
  }

  /**
   * Predict ball position when not detected
   */
  private predictBallPosition(previousBall?: BallPosition): BallPosition | null {
    if (!previousBall || this.ballTrajectory.length < 2) {
      return null;
    }

    // Simple linear prediction based on last velocity
    const timeDelta = 33; // Assume 30fps (33ms between frames)
    const predictedPosition: Position = {
      x: previousBall.position.x + previousBall.velocity.x * timeDelta,
      y: previousBall.position.y + previousBall.velocity.y * timeDelta
    };

    return {
      position: predictedPosition,
      velocity: previousBall.velocity,
      confidence: Math.max(0.1, previousBall.confidence * 0.8), // Reduce confidence
      radius: previousBall.radius,
      timestamp: Date.now(),
      predicted: true
    };
  }

  /**
   * Update ball trajectory history
   */
  private updateTrajectory(ball: BallPosition): void {
    this.ballTrajectory.push(ball);
    
    // Keep only recent positions
    if (this.ballTrajectory.length > this.maxTrajectoryLength) {
      this.ballTrajectory.shift();
    }
  }

  /**
   * Calculate ball statistics
   */
  private calculateBallStats(ball: BallPosition | null): BallStats {
    const speed = ball ? Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2) : 0;
    
    return {
      isVisible: ball !== null && !ball.predicted,
      isPredicted: ball?.predicted || false,
      confidence: ball?.confidence || 0,
      speed,
      trajectoryLength: this.ballTrajectory.length,
      averageSpeed: this.calculateAverageSpeed(),
      direction: ball ? this.calculateDirection(ball.velocity) : null
    };
  }

  /**
   * Calculate average speed from trajectory
   */
  private calculateAverageSpeed(): number {
    if (this.ballTrajectory.length < 2) {
      return 0;
    }

    const speeds = this.ballTrajectory.map(pos => 
      Math.sqrt(pos.velocity.x ** 2 + pos.velocity.y ** 2)
    );

    return speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  }

  /**
   * Calculate movement direction in degrees
   */
  private calculateDirection(velocity: Velocity): number {
    return Math.atan2(velocity.y, velocity.x) * (180 / Math.PI);
  }

  /**
   * Get ball trajectory for analysis
   */
  getBallTrajectory(): BallPosition[] {
    return [...this.ballTrajectory];
  }

  /**
   * Clear trajectory history
   */
  clearTrajectory(): void {
    this.ballTrajectory = [];
  }
}

/**
 * Ball detection interface
 */
export interface BallDetection {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  position: Position;
  radius: number;
  timestamp: number;
}

/**
 * Ball position interface
 */
export interface BallPosition {
  position: Position;
  velocity: Velocity;
  confidence: number;
  radius: number;
  timestamp: number;
  predicted: boolean;
}

/**
 * Ball statistics interface
 */
export interface BallStats {
  isVisible: boolean;
  isPredicted: boolean;
  confidence: number;
  speed: number;
  trajectoryLength: number;
  averageSpeed: number;
  direction: number | null;
}
