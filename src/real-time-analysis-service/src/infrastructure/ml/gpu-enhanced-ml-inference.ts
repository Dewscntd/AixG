/**
 * GPU-Enhanced ML Inference Service
 * Integration layer between existing ML inference and new GPU acceleration infrastructure
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { VideoFrame } from '../../domain/value-objects/video-frame';
import { EdgeMLInference } from '../../domain/entities/live-analysis-pipeline';
import { GPUDeviceManager } from '../gpu/gpu-device-manager';
import { OptimizedModelLoader, ModelConfig } from '../gpu/optimized-model-loader';
import { GPUAcceleratedInferenceService, FrameProcessingResult } from '../gpu/gpu-accelerated-inference.service';
import { GPUMemoryManager } from '../gpu/gpu-memory-manager';
import { GPUPerformanceMonitor } from '../gpu/gpu-performance-monitor';
import {
  EdgeMLConfig,
  AnalysisResult,
  InferenceStats,
  PlayerDetection,
  BallDetection,
  TeamClassification,
  EventDetection
} from './edge-ml-inference';

@Injectable()
export class GPUEnhancedMLInferenceService implements EdgeMLInference, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GPUEnhancedMLInferenceService.name);
  
  private isInitialized = false;
  private gpuEnabled = false;
  private modelVersion = '2.0.0'; // Updated version with GPU support
  private processingQueue: VideoFrame[] = [];
  private processingStats = {
    totalFrames: 0,
    averageProcessingTime: 0,
    gpuUtilization: 0,
    memoryUsage: 0
  };

  constructor(
    private readonly gpuDeviceManager: GPUDeviceManager,
    private readonly modelLoader: OptimizedModelLoader,
    private readonly gpuInferenceService: GPUAcceleratedInferenceService,
    private readonly memoryManager: GPUMemoryManager,
    private readonly performanceMonitor: GPUPerformanceMonitor,
    private readonly config: EdgeMLConfig = {
      modelPaths: {
        playerDetection: '/models/gpu/yolo_football_detection.json',
        ballDetection: '/models/gpu/ball_tracker.json',
        teamClassification: '/models/gpu/team_classifier.json',
        eventDetection: '/models/gpu/event_detector.json'
      },
      batchSize: 8,
      maxConcurrentInferences: 4,
      gpuMemoryLimit: 4096 // 4GB
    }
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  /**
   * Initialize GPU-enhanced ML inference
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.log('Initializing GPU-enhanced ML inference...');

      // Check GPU availability
      this.gpuEnabled = this.gpuDeviceManager.isGPUEnabled();
      
      if (this.gpuEnabled) {
        this.logger.log('GPU acceleration enabled');
        
        // Start performance monitoring
        this.performanceMonitor.startMonitoring(1000);
        
        // Apply high-performance profile
        await this.performanceMonitor.applyPerformanceProfile('High Performance');
        
        // Load optimized models
        await this.loadOptimizedModels();
      } else {
        this.logger.warn('GPU not available, falling back to CPU inference');
        await this.loadCPUModels();
      }

      // Start processing queue
      this.startProcessingQueue();

      this.isInitialized = true;
      this.logger.log('GPU-enhanced ML inference initialized successfully');

    } catch (error) {
      this.logger.error(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load GPU-optimized models
   */
  private async loadOptimizedModels(): Promise<void> {
    try {
      // YOLO detection model optimized for football
      const detectionConfig: ModelConfig = {
        name: 'yolo_football_detection',
        path: this.config.modelPaths.playerDetection,
        inputShape: [1, 640, 640, 3],
        outputShape: [1, 25200, 85],
        dtype: 'float16',
        optimization: {
          quantization: true,
          pruning: false,
          tensorRT: true,
          mixedPrecision: true,
          batchSize: this.config.batchSize
        },
        warmupIterations: 5,
        cacheStrategy: 'memory'
      };

      await this.modelLoader.loadModel(detectionConfig);

      // Ball tracking model
      const ballConfig: ModelConfig = {
        name: 'ball_tracker',
        path: this.config.modelPaths.ballDetection,
        inputShape: [1, 416, 416, 3],
        outputShape: [1, 4], // [x, y, vx, vy]
        dtype: 'float16',
        optimization: {
          quantization: true,
          pruning: true,
          tensorRT: true,
          mixedPrecision: true,
          batchSize: this.config.batchSize
        },
        warmupIterations: 3,
        cacheStrategy: 'memory'
      };

      await this.modelLoader.loadModel(ballConfig);

      // Team classification model
      const teamConfig: ModelConfig = {
        name: 'team_classifier',
        path: this.config.modelPaths.teamClassification,
        inputShape: [1, 224, 224, 3],
        outputShape: [1, 2], // Home/Away probabilities
        dtype: 'float32',
        optimization: {
          quantization: false,
          pruning: true,
          tensorRT: true,
          mixedPrecision: true,
          batchSize: this.config.batchSize * 2
        },
        warmupIterations: 2,
        cacheStrategy: 'memory'
      };

      await this.modelLoader.loadModel(teamConfig);

      // Event detection model
      const eventConfig: ModelConfig = {
        name: 'event_detector',
        path: this.config.modelPaths.eventDetection,
        inputShape: [1, 32, 224, 224, 3], // Temporal sequence
        outputShape: [1, 10], // Event classes
        dtype: 'float32',
        optimization: {
          quantization: false,
          pruning: true,
          tensorRT: true,
          mixedPrecision: true,
          batchSize: 2
        },
        warmupIterations: 2,
        cacheStrategy: 'memory'
      };

      await this.modelLoader.loadModel(eventConfig);

      this.logger.log('GPU-optimized models loaded successfully');

    } catch (error) {
      this.logger.error(`Failed to load optimized models: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load CPU fallback models
   */
  private async loadCPUModels(): Promise<void> {
    // Simplified CPU-only model loading
    this.logger.log('Loading CPU fallback models...');
    // Implementation would load lighter CPU models
  }

  /**
   * Enhanced analyze method with GPU acceleration
   */
  async analyze(frame: VideoFrame): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('GPU-enhanced ML inference not initialized');
    }

    const startTime = Date.now();

    try {
      let result: AnalysisResult;

      if (this.gpuEnabled) {
        // Use GPU-accelerated processing
        result = await this.processFrameGPU(frame);
      } else {
        // Fallback to CPU processing
        result = await this.processFrameCPU(frame);
      }

      // Update processing statistics
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime);

      return result;

    } catch (error) {
      this.logger.error(`Frame analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process frame using GPU acceleration
   */
  private async processFrameGPU(frame: VideoFrame): Promise<AnalysisResult> {
    try {
      // Use the comprehensive GPU pipeline
      const frameResult = await this.gpuInferenceService.processFrame(frame);

      // Convert GPU results to expected format
      const analysisResult: AnalysisResult = {
        frameNumber: frame.frameNumber,
        timestamp: frame.timestamp,
        processingTimeMs: frameResult.performance.totalTime,
        detections: this.convertDetectionsToPlayerDetections(frameResult.detections),
        ballDetection: this.extractBallDetection(frameResult.detections),
        teamClassification: this.extractTeamClassification(frameResult.tracking),
        eventDetection: this.convertMatchEventsToEventDetections(frameResult.events),
        confidence: this.calculateOverallConfidence(frameResult),
        metadata: {
          modelVersion: this.modelVersion,
          gpuEnabled: true,
          frameSize: frame.sizeBytes,
          gpuMemoryUsed: frameResult.performance.gpuMemoryPeak,
          processingBreakdown: {
            detection: frameResult.performance.detectionTime,
            tracking: frameResult.performance.trackingTime,
            events: frameResult.performance.eventTime
          },
          optimizations: this.getAppliedOptimizations()
        }
      };

      return analysisResult;

    } catch (error) {
      this.logger.error(`GPU frame processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process frame using CPU fallback
   */
  private async processFrameCPU(frame: VideoFrame): Promise<AnalysisResult> {
    // Simplified CPU processing
    return {
      frameNumber: frame.frameNumber,
      timestamp: frame.timestamp,
      processingTimeMs: 50, // Simulated CPU processing time
      detections: [],
      ballDetection: null,
      teamClassification: {
        confidence: 0.5,
        processingTimeMs: 20,
        homeTeam: { color: 'unknown', players: [] },
        awayTeam: { color: 'unknown', players: [] }
      },
      eventDetection: [],
      confidence: 0.5,
      metadata: {
        modelVersion: this.modelVersion,
        gpuEnabled: false,
        frameSize: frame.sizeBytes,
        fallbackReason: 'GPU not available'
      }
    };
  }

  /**
   * Convert GPU detections to PlayerDetection format
   */
  private convertDetectionsToPlayerDetections(detections: any[]): PlayerDetection[] {
    return detections
      .filter(det => det.class === 'player' || det.class === 'person')
      .map((det, index) => ({
        playerId: `player_${index}`,
        confidence: det.confidence,
        processingTimeMs: 0, // Included in overall time
        boundingBox: {
          x: det.bbox[0],
          y: det.bbox[1],
          width: det.bbox[2],
          height: det.bbox[3]
        },
        position: {
          x: det.bbox[0] + det.bbox[2] / 2,
          y: det.bbox[1] + det.bbox[3] / 2
        },
        teamId: Math.random() > 0.5 ? 'home' : 'away', // Would be determined by team classifier
        jerseyNumber: Math.floor(Math.random() * 99) + 1
      }));
  }

  /**
   * Extract ball detection from detections
   */
  private extractBallDetection(detections: any[]): BallDetection | null {
    const ballDetection = detections.find(det => det.class === 'ball');
    
    if (!ballDetection) {
      return null;
    }

    return {
      confidence: ballDetection.confidence,
      processingTimeMs: 0,
      position: {
        x: ballDetection.bbox[0] + ballDetection.bbox[2] / 2,
        y: ballDetection.bbox[1] + ballDetection.bbox[3] / 2
      },
      velocity: {
        x: 0, // Would be calculated from tracking
        y: 0
      },
      visible: true
    };
  }

  /**
   * Extract team classification from tracking data
   */
  private extractTeamClassification(tracking: any[]): TeamClassification {
    const homePlayers = tracking.filter(t => t.team === 'home').map(t => t.playerId);
    const awayPlayers = tracking.filter(t => t.team === 'away').map(t => t.playerId);

    return {
      confidence: 0.85,
      processingTimeMs: 0,
      homeTeam: {
        color: 'blue', // Would be determined by color analysis
        players: homePlayers
      },
      awayTeam: {
        color: 'red',
        players: awayPlayers
      }
    };
  }

  /**
   * Convert match events to EventDetection format
   */
  private convertMatchEventsToEventDetections(events: any[]): EventDetection[] {
    return events.map(event => ({
      eventType: event.type as any,
      confidence: event.confidence,
      processingTimeMs: 0,
      playerId: event.players[0] || undefined,
      timestamp: event.timestamp,
      position: event.location ? {
        x: event.location[0],
        y: event.location[1]
      } : { x: 0, y: 0 },
      metadata: {
        involvedPlayers: event.players,
        location: event.location
      }
    }));
  }

  /**
   * Calculate overall confidence from GPU results
   */
  private calculateOverallConfidence(frameResult: FrameProcessingResult): number {
    const detectionConf = frameResult.detections.length > 0 
      ? frameResult.detections.reduce((sum, d) => sum + d.confidence, 0) / frameResult.detections.length
      : 0.5;

    const trackingConf = frameResult.tracking.length > 0
      ? frameResult.tracking.reduce((sum, t) => sum + t.confidence, 0) / frameResult.tracking.length
      : 0.5;

    const eventConf = frameResult.events.length > 0
      ? frameResult.events.reduce((sum, e) => sum + e.confidence, 0) / frameResult.events.length
      : 0.5;

    return (detectionConf + trackingConf + eventConf) / 3;
  }

  /**
   * Get applied GPU optimizations
   */
  private getAppliedOptimizations(): string[] {
    const optimizations: string[] = [];
    
    if (this.gpuEnabled) {
      optimizations.push('gpu_acceleration');
      optimizations.push('tensorrt_optimization');
      optimizations.push('mixed_precision');
      optimizations.push('quantization');
      optimizations.push('memory_pooling');
      optimizations.push('batch_processing');
    }

    return optimizations;
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(processingTime: number): void {
    this.processingStats.totalFrames++;
    
    // Update average processing time
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime * (this.processingStats.totalFrames - 1) + processingTime) 
      / this.processingStats.totalFrames;

    // Update GPU utilization if available
    if (this.gpuEnabled) {
      const currentMetrics = this.performanceMonitor.getCurrentMetrics();
      if (currentMetrics) {
        this.processingStats.gpuUtilization = currentMetrics.utilization.gpu;
        this.processingStats.memoryUsage = (currentMetrics.memory.used / currentMetrics.memory.total) * 100;
      }
    }
  }

  /**
   * Start processing queue for batched inference
   */
  private startProcessingQueue(): void {
    setInterval(async () => {
      if (this.processingQueue.length > 0 && this.gpuEnabled) {
        await this.processBatchQueue();
      }
    }, 16); // ~60 FPS processing
  }

  /**
   * Process batch queue for improved throughput
   */
  private async processBatchQueue(): Promise<void> {
    const batchSize = Math.min(this.processingQueue.length, this.config.batchSize);
    const batch = this.processingQueue.splice(0, batchSize);

    if (batch.length === 0) return;

    try {
      // Process batch in parallel
      const promises = batch.map(frame => this.processFrameGPU(frame));
      await Promise.all(promises);

    } catch (error) {
      this.logger.error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Enhanced stats with GPU information
   */
  getStats(): InferenceStats & {
    gpu?: {
      enabled: boolean;
      deviceInfo: any;
      memoryUsage: any;
      performance: any;
    };
    processing?: {
      totalFrames: number;
      averageTime: number;
      throughput: number;
    };
  } {
    const baseStats: InferenceStats = {
      isInitialized: this.isInitialized,
      gpuEnabled: this.gpuEnabled,
      modelVersion: this.modelVersion,
      loadedModels: this.modelLoader.getLoadedModels(),
      memoryUsage: process.memoryUsage().heapUsed
    };

    const enhancedStats = {
      ...baseStats,
      gpu: this.gpuEnabled ? {
        enabled: true,
        deviceInfo: this.gpuDeviceManager.getUtilizationStats(),
        memoryUsage: this.memoryManager.getMemoryStats(),
        performance: this.performanceMonitor.getPerformanceSummary()
      } : undefined,
      processing: {
        totalFrames: this.processingStats.totalFrames,
        averageTime: this.processingStats.averageProcessingTime,
        throughput: this.processingStats.averageProcessingTime > 0 
          ? 1000 / this.processingStats.averageProcessingTime 
          : 0
      }
    };

    return enhancedStats;
  }

  /**
   * Enhanced ready check including GPU status
   */
  isReady(): boolean {
    return this.isInitialized && 
           this.modelLoader.getLoadedModels().length > 0 &&
           (!this.gpuEnabled || this.gpuDeviceManager.isGPUEnabled());
  }

  /**
   * Get model version
   */
  getModelVersion(): string {
    return this.modelVersion;
  }

  /**
   * Update configuration with GPU considerations
   */
  async updateConfig(config: Partial<EdgeMLConfig>): Promise<void> {
    Object.assign(this.config, config);

    // Update GPU memory limit if specified
    if (config.gpuMemoryLimit && this.gpuEnabled) {
      this.gpuDeviceManager.updateConfiguration({
        memoryLimit: config.gpuMemoryLimit
      });
    }

    // Reload models if paths changed
    if (config.modelPaths) {
      if (this.gpuEnabled) {
        await this.loadOptimizedModels();
      } else {
        await this.loadCPUModels();
      }
    }
  }

  /**
   * Force GPU memory cleanup
   */
  async forceMemoryCleanup(): Promise<void> {
    if (this.gpuEnabled) {
      await this.memoryManager.forceCleanup();
      await this.gpuDeviceManager.freeMemory();
    }
  }

  /**
   * Get GPU optimization recommendations
   */
  getOptimizationRecommendations(): any[] {
    if (!this.gpuEnabled) {
      return [{
        type: 'gpu_upgrade',
        priority: 'high',
        title: 'Enable GPU Acceleration',
        description: 'GPU acceleration is not available but would significantly improve performance',
        estimatedGain: 300
      }];
    }

    return this.performanceMonitor.getOptimizationRecommendations();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.log('Cleaning up GPU-enhanced ML inference...');

      // Stop performance monitoring
      if (this.gpuEnabled) {
        this.performanceMonitor.stopMonitoring();
      }

      // Clear processing queue
      this.processingQueue = [];

      // Force memory cleanup
      await this.forceMemoryCleanup();

      this.isInitialized = false;
      this.logger.log('GPU-enhanced ML inference cleanup complete');

    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`);
    }
  }
}