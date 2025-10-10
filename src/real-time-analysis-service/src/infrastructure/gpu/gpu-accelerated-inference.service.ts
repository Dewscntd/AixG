/**
 * GPU-Accelerated Inference Service
 * High-performance inference engine with GPU optimization and real-time processing
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node-gpu';
import { GPUDeviceManager } from './gpu-device-manager';
import { OptimizedModelLoader, ModelConfig } from './optimized-model-loader';
import { VideoFrame } from '../../domain/value-objects/video-frame';

export interface InferenceRequest {
  id: string;
  modelName: string;
  input: tf.Tensor | VideoFrame;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface InferenceResult {
  requestId: string;
  modelName: string;
  output: tf.Tensor;
  confidence: number;
  processingTime: number;
  gpuMemoryUsed: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface FrameProcessingResult {
  frameId: string;
  detections: ObjectDetection[];
  tracking: PlayerTracking[];
  events: MatchEvent[];
  performance: ProcessingMetrics;
}

export interface ObjectDetection {
  id: string;
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  features: Float32Array;
}

export interface PlayerTracking {
  playerId: string;
  position: [number, number]; // [x, y]
  velocity: [number, number]; // [vx, vy]
  confidence: number;
  team: 'home' | 'away';
  jersey?: string;
}

export interface MatchEvent {
  type: 'goal' | 'foul' | 'offside' | 'substitution' | 'card';
  confidence: number;
  timestamp: number;
  players: string[];
  location?: [number, number];
}

export interface ProcessingMetrics {
  totalTime: number;
  detectionTime: number;
  trackingTime: number;
  eventTime: number;
  gpuMemoryPeak: number;
  throughput: number;
}

export interface PipelineConfig {
  detection: {
    modelName: string;
    threshold: number;
    nmsThreshold: number;
    maxDetections: number;
  };
  tracking: {
    modelName: string;
    maxTracks: number;
    trackingHistory: number;
  };
  events: {
    modelName: string;
    temporal_window: number;
    confidence_threshold: number;
  };
  performance: {
    targetFPS: number;
    maxLatency: number;
    enableProfiling: boolean;
  };
}

@Injectable()
export class GPUAcceleratedInferenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GPUAcceleratedInferenceService.name);
  
  private isInitialized = false;
  private processingQueue: InferenceRequest[] = [];
  private results = new Map<string, InferenceResult>();
  
  // Performance tracking
  private frameProcessingTimes: number[] = [];
  private throughputHistory: number[] = [];
  private memoryUsageHistory: number[] = [];
  
  // Pipeline models
  private pipelineConfig: PipelineConfig = {
    detection: {
      modelName: 'yolo_football_detection',
      threshold: 0.5,
      nmsThreshold: 0.4,
      maxDetections: 100
    },
    tracking: {
      modelName: 'deepsort_player_tracking',
      maxTracks: 22,
      trackingHistory: 30
    },
    events: {
      modelName: 'event_classification',
      temporal_window: 150, // 5 seconds at 30fps
      confidence_threshold: 0.7
    },
    performance: {
      targetFPS: 30,
      maxLatency: 33, // ~33ms for 30fps
      enableProfiling: true
    }
  };

  constructor(
    private readonly gpuManager: GPUDeviceManager,
    private readonly modelLoader: OptimizedModelLoader
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  /**
   * Initialize the GPU-accelerated inference service
   */
  private async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing GPU-accelerated inference service...');

      // Load football detection models
      await this.loadFootballModels();

      // Start processing queue
      this.startProcessingQueue();

      // Start performance monitoring
      if (this.pipelineConfig.performance.enableProfiling) {
        this.startPerformanceMonitoring();
      }

      this.isInitialized = true;
      this.logger.log('GPU-accelerated inference service initialized successfully');

    } catch (error) {
      this.logger.error(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load football-specific models optimized for GPU
   */
  private async loadFootballModels(): Promise<void> {
    try {
      // YOLO detection model for players, ball, and field elements
      const detectionConfig: ModelConfig = {
        name: 'yolo_football_detection',
        path: '/models/football/yolo_v8_football.json',
        inputShape: [1, 640, 640, 3],
        outputShape: [1, 25200, 85], // YOLO output format
        dtype: 'float16',
        optimization: {
          quantization: true,
          pruning: false,
          tensorRT: true,
          mixedPrecision: true,
          batchSize: 4
        },
        warmupIterations: 5,
        cacheStrategy: 'memory'
      };

      await this.modelLoader.loadModel(detectionConfig);

      // DeepSORT tracking model
      const trackingConfig: ModelConfig = {
        name: 'deepsort_player_tracking',
        path: '/models/football/deepsort_features.json',
        inputShape: [1, 128, 64, 3],
        outputShape: [1, 512], // Feature vector
        dtype: 'float16',
        optimization: {
          quantization: true,
          pruning: true,
          tensorRT: true,
          mixedPrecision: true,
          batchSize: 8
        },
        warmupIterations: 3,
        cacheStrategy: 'memory'
      };

      await this.modelLoader.loadModel(trackingConfig);

      // Event classification model
      const eventConfig: ModelConfig = {
        name: 'event_classification',
        path: '/models/football/event_classifier.json',
        inputShape: [1, 150, 224, 224, 3], // Temporal sequence
        outputShape: [1, 10], // Event classes
        dtype: 'float32', // Higher precision for classification
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

      this.logger.log('All football models loaded and optimized');

    } catch (error) {
      this.logger.error(`Model loading failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process video frame with full football analysis pipeline
   */
  public async processFrame(frame: VideoFrame): Promise<FrameProcessingResult> {
    const startTime = Date.now();
    const frameId = `frame_${frame.frameNumber}_${Date.now()}`;

    try {
      // Convert frame to tensor
      const frameTensor = await this.frameToTensor(frame);

      // Object detection
      const detectionStart = Date.now();
      const detections = await this.detectObjects(frameTensor);
      const detectionTime = Date.now() - detectionStart;

      // Player tracking
      const trackingStart = Date.now();
      const tracking = await this.trackPlayers(detections, frame.frameNumber);
      const trackingTime = Date.now() - trackingStart;

      // Event detection
      const eventStart = Date.now();
      const events = await this.detectEvents(detections, tracking, frame);
      const eventTime = Date.now() - eventStart;

      // Get memory usage
      const memoryInfo = await this.gpuManager.getMemoryUsage();

      // Calculate metrics
      const totalTime = Date.now() - startTime;
      const performance: ProcessingMetrics = {
        totalTime,
        detectionTime,
        trackingTime,
        eventTime,
        gpuMemoryPeak: memoryInfo.allocated,
        throughput: 1000 / totalTime
      };

      // Update performance history
      this.updatePerformanceMetrics(performance);

      // Cleanup tensors
      frameTensor.dispose();

      const result: FrameProcessingResult = {
        frameId,
        detections,
        tracking,
        events,
        performance
      };

      this.logger.debug(`Processed frame ${frameId} in ${totalTime}ms (${performance.throughput.toFixed(1)} FPS)`);

      return result;

    } catch (error) {
      this.logger.error(`Frame processing failed for ${frameId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert video frame to GPU tensor
   */
  private async frameToTensor(frame: VideoFrame): Promise<tf.Tensor> {
    return this.gpuManager.executeInference(async () => {
      // Convert frame buffer to tensor
      const tensor = tf.browser.fromPixels(frame.data as any, 3);
      
      // Resize to model input size
      const resized = tf.image.resizeBilinear(tensor, [640, 640]);
      
      // Normalize pixel values
      const normalized = resized.div(255.0);
      
      // Add batch dimension
      const batched = normalized.expandDims(0);
      
      // Cleanup intermediate tensors
      tensor.dispose();
      resized.dispose();
      normalized.dispose();
      
      return batched;
    }, 'high');
  }

  /**
   * Detect objects (players, ball, field elements) using YOLO
   */
  private async detectObjects(frameTensor: tf.Tensor): Promise<ObjectDetection[]> {
    try {
      // Run YOLO detection
      const predictions = await this.modelLoader.executeInference(
        this.pipelineConfig.detection.modelName,
        frameTensor,
        { useBatching: false, priority: 'high' }
      );

      // Post-process YOLO output
      const detections = await this.postProcessYOLO(predictions);
      
      predictions.dispose();
      
      return detections;

    } catch (error) {
      this.logger.error(`Object detection failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Post-process YOLO output to extract detections
   */
  private async postProcessYOLO(predictions: tf.Tensor): Promise<ObjectDetection[]> {
    const detections: ObjectDetection[] = [];
    
    try {
      // Get predictions data
      const data = await predictions.data();
      const shape = predictions.shape;
      
      // YOLO output format: [batch, 25200, 85]
      // 85 = 4 (bbox) + 1 (objectness) + 80 (classes)
      const numDetections = shape[1];
      const numFeatures = shape[2];
      
      for (let i = 0; i < numDetections; i++) {
        const offset = i * numFeatures;
        
        // Extract bbox coordinates
        const x = data[offset + 0];
        const y = data[offset + 1];
        const w = data[offset + 2];
        const h = data[offset + 3];
        
        // Extract objectness score
        const objectness = data[offset + 4];
        
        if (objectness > this.pipelineConfig.detection.threshold) {
          // Find best class
          let bestClass = 0;
          let bestScore = 0;
          
          for (let c = 0; c < 80; c++) {
            const score = data[offset + 5 + c] * objectness;
            if (score > bestScore) {
              bestScore = score;
              bestClass = c;
            }
          }
          
          if (bestScore > this.pipelineConfig.detection.threshold) {
            // Map class index to football-specific classes
            const className = this.mapClassIndex(bestClass);
            
            detections.push({
              id: `det_${i}_${Date.now()}`,
              class: className,
              confidence: bestScore,
              bbox: [x - w/2, y - h/2, w, h],
              features: new Float32Array(data.slice(offset + 5, offset + 5 + 80))
            });
          }
        }
      }
      
      // Apply Non-Maximum Suppression
      return this.applyNMS(detections);
      
    } catch (error) {
      this.logger.error(`YOLO post-processing failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Apply Non-Maximum Suppression to remove overlapping detections
   */
  private applyNMS(detections: ObjectDetection[]): ObjectDetection[] {
    // Sort by confidence
    const sorted = detections.sort((a, b) => b.confidence - a.confidence);
    const result: ObjectDetection[] = [];
    
    for (const detection of sorted) {
      let shouldKeep = true;
      
      for (const kept of result) {
        const iou = this.calculateIoU(detection.bbox, kept.bbox);
        if (iou > this.pipelineConfig.detection.nmsThreshold) {
          shouldKeep = false;
          break;
        }
      }
      
      if (shouldKeep) {
        result.push(detection);
        if (result.length >= this.pipelineConfig.detection.maxDetections) {
          break;
        }
      }
    }
    
    return result;
  }

  /**
   * Calculate Intersection over Union (IoU) for two bounding boxes
   */
  private calculateIoU(bbox1: number[], bbox2: number[]): number {
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;
    
    const intersectX = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2));
    const intersectY = Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
    const intersectArea = intersectX * intersectY;
    
    const bbox1Area = w1 * h1;
    const bbox2Area = w2 * h2;
    const unionArea = bbox1Area + bbox2Area - intersectArea;
    
    return unionArea > 0 ? intersectArea / unionArea : 0;
  }

  /**
   * Track players across frames using DeepSORT
   */
  private async trackPlayers(
    detections: ObjectDetection[], 
    frameNumber: number
  ): Promise<PlayerTracking[]> {
    try {
      // Filter player detections
      const playerDetections = detections.filter(det => 
        det.class === 'player' || det.class === 'person'
      );

      // Extract features for tracking
      const trackingResults: PlayerTracking[] = [];
      
      for (const detection of playerDetections) {
        // Create crop tensor from detection
        const cropTensor = this.createCropTensor(detection);
        
        // Get tracking features
        const features = await this.modelLoader.executeInference(
          this.pipelineConfig.tracking.modelName,
          cropTensor,
          { useBatching: true, priority: 'medium' }
        );
        
        // Update tracker with features
        const trackingResult = await this.updateTracker(detection, features, frameNumber);
        
        if (trackingResult) {
          trackingResults.push(trackingResult);
        }
        
        cropTensor.dispose();
        features.dispose();
      }
      
      return trackingResults;
      
    } catch (error) {
      this.logger.error(`Player tracking failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Create crop tensor from detection for tracking
   */
  private createCropTensor(detection: ObjectDetection): tf.Tensor {
    // Create a dummy tensor for the crop
    // In real implementation, this would crop from the original frame
    return tf.zeros([1, 128, 64, 3]);
  }

  /**
   * Update tracker with new detection and features
   */
  private async updateTracker(
    detection: ObjectDetection,
    features: tf.Tensor,
    frameNumber: number
  ): Promise<PlayerTracking | null> {
    // Simplified tracking logic
    // In real implementation, this would use Kalman filtering and Hungarian algorithm
    
    return {
      playerId: `player_${detection.id}`,
      position: [detection.bbox[0] + detection.bbox[2]/2, detection.bbox[1] + detection.bbox[3]/2],
      velocity: [0, 0], // Would be calculated from previous positions
      confidence: detection.confidence,
      team: this.inferTeam(detection),
      jersey: this.extractJerseyNumber(detection)
    };
  }

  /**
   * Detect match events using temporal analysis
   */
  private async detectEvents(
    detections: ObjectDetection[],
    tracking: PlayerTracking[],
    frame: VideoFrame
  ): Promise<MatchEvent[]> {
    try {
      // Create temporal sequence tensor
      const sequenceTensor = this.createTemporalSequence(detections, tracking);
      
      // Run event classification
      const eventPredictions = await this.modelLoader.executeInference(
        this.pipelineConfig.events.modelName,
        sequenceTensor,
        { useBatching: false, priority: 'low' }
      );
      
      // Post-process event predictions
      const events = await this.postProcessEvents(eventPredictions, tracking);
      
      sequenceTensor.dispose();
      eventPredictions.dispose();
      
      return events;
      
    } catch (error) {
      this.logger.error(`Event detection failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Create temporal sequence for event detection
   */
  private createTemporalSequence(
    detections: ObjectDetection[],
    tracking: PlayerTracking[]
  ): tf.Tensor {
    // Create dummy temporal sequence
    // In real implementation, this would aggregate frames over time
    return tf.zeros([1, 150, 224, 224, 3]);
  }

  /**
   * Post-process event classification results
   */
  private async postProcessEvents(
    predictions: tf.Tensor,
    tracking: PlayerTracking[]
  ): Promise<MatchEvent[]> {
    const events: MatchEvent[] = [];
    
    try {
      const data = await predictions.data();
      const eventClasses = ['goal', 'foul', 'offside', 'substitution', 'card'];
      
      for (let i = 0; i < eventClasses.length; i++) {
        const confidence = data[i];
        
        if (confidence > this.pipelineConfig.events.confidence_threshold) {
          events.push({
            type: eventClasses[i] as any,
            confidence,
            timestamp: Date.now(),
            players: tracking.map(t => t.playerId).slice(0, 3), // Top 3 involved players
            location: tracking.length > 0 ? tracking[0].position : undefined
          });
        }
      }
      
    } catch (error) {
      this.logger.error(`Event post-processing failed: ${error.message}`);
    }
    
    return events;
  }

  /**
   * Map class index to football-specific class names
   */
  private mapClassIndex(classIndex: number): string {
    const footballClasses: Record<number, string> = {
      0: 'player',
      1: 'ball',
      2: 'referee',
      3: 'goalpost',
      4: 'field_line',
      // ... more mappings
    };
    
    return footballClasses[classIndex] || 'unknown';
  }

  /**
   * Infer team based on detection features
   */
  private inferTeam(detection: ObjectDetection): 'home' | 'away' {
    // Simplified team inference
    // In real implementation, would use jersey color analysis
    return Math.random() > 0.5 ? 'home' : 'away';
  }

  /**
   * Extract jersey number from detection
   */
  private extractJerseyNumber(detection: ObjectDetection): string | undefined {
    // Placeholder for jersey number extraction
    // Would use OCR or specialized model
    return Math.floor(Math.random() * 99 + 1).toString();
  }

  /**
   * Start processing queue for batched inference
   */
  private startProcessingQueue(): void {
    setInterval(async () => {
      if (this.processingQueue.length > 0) {
        await this.processBatch();
      }
    }, 10); // Process every 10ms
  }

  /**
   * Process batch of inference requests
   */
  private async processBatch(): Promise<void> {
    const batch = this.processingQueue.splice(0, 8); // Process up to 8 at once
    
    if (batch.length === 0) return;

    try {
      // Group by model
      const byModel = new Map<string, InferenceRequest[]>();
      
      for (const request of batch) {
        if (!byModel.has(request.modelName)) {
          byModel.set(request.modelName, []);
        }
        byModel.get(request.modelName)!.push(request);
      }

      // Process each model group
      for (const [modelName, requests] of byModel) {
        await this.processBatchForModel(modelName, requests);
      }

    } catch (error) {
      this.logger.error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Process batch for specific model
   */
  private async processBatchForModel(
    modelName: string, 
    requests: InferenceRequest[]
  ): Promise<void> {
    try {
      // Execute batch inference
      for (const request of requests) {
        const startTime = Date.now();
        
        let input: tf.Tensor;
        if (request.input instanceof VideoFrame) {
          input = await this.frameToTensor(request.input);
        } else {
          input = request.input;
        }

        const output = await this.modelLoader.executeInference(
          modelName,
          input,
          { useBatching: true, priority: request.priority }
        );

        const result: InferenceResult = {
          requestId: request.id,
          modelName,
          output,
          confidence: 0.95, // Would be extracted from output
          processingTime: Date.now() - startTime,
          gpuMemoryUsed: (await this.gpuManager.getMemoryUsage()).allocated,
          timestamp: Date.now(),
          metadata: request.metadata
        };

        this.results.set(request.id, result);

        if (request.input instanceof VideoFrame) {
          input.dispose();
        }
      }

    } catch (error) {
      this.logger.error(`Batch processing failed for model ${modelName}: ${error.message}`);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(metrics: ProcessingMetrics): void {
    this.frameProcessingTimes.push(metrics.totalTime);
    this.throughputHistory.push(metrics.throughput);
    this.memoryUsageHistory.push(metrics.gpuMemoryPeak);

    // Keep only recent history
    const maxHistory = 1000;
    if (this.frameProcessingTimes.length > maxHistory) {
      this.frameProcessingTimes.shift();
    }
    if (this.throughputHistory.length > maxHistory) {
      this.throughputHistory.shift();
    }
    if (this.memoryUsageHistory.length > maxHistory) {
      this.memoryUsageHistory.shift();
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      const avgProcessingTime = this.frameProcessingTimes.length > 0 
        ? this.frameProcessingTimes.reduce((a, b) => a + b, 0) / this.frameProcessingTimes.length
        : 0;

      const avgThroughput = this.throughputHistory.length > 0
        ? this.throughputHistory.reduce((a, b) => a + b, 0) / this.throughputHistory.length
        : 0;

      const avgMemory = this.memoryUsageHistory.length > 0
        ? this.memoryUsageHistory.reduce((a, b) => a + b, 0) / this.memoryUsageHistory.length
        : 0;

      this.logger.log(
        `Performance: ${avgProcessingTime.toFixed(1)}ms/frame, ` +
        `${avgThroughput.toFixed(1)} FPS, ` +
        `${(avgMemory / 1024 / 1024).toFixed(1)}MB GPU memory`
      );

      // Alert on performance issues
      if (avgProcessingTime > this.pipelineConfig.performance.maxLatency) {
        this.logger.warn(`High latency detected: ${avgProcessingTime.toFixed(1)}ms`);
      }

      if (avgThroughput < this.pipelineConfig.performance.targetFPS * 0.8) {
        this.logger.warn(`Low throughput detected: ${avgThroughput.toFixed(1)} FPS`);
      }

    }, 30000); // Every 30 seconds
  }

  /**
   * Get comprehensive performance statistics
   */
  public getPerformanceStats(): any {
    const avgProcessingTime = this.frameProcessingTimes.length > 0 
      ? this.frameProcessingTimes.reduce((a, b) => a + b, 0) / this.frameProcessingTimes.length
      : 0;

    const avgThroughput = this.throughputHistory.length > 0
      ? this.throughputHistory.reduce((a, b) => a + b, 0) / this.throughputHistory.length
      : 0;

    return {
      isGPUEnabled: this.gpuManager.isGPUEnabled(),
      modelStats: this.modelLoader.getStatistics(),
      gpuStats: this.gpuManager.getUtilizationStats(),
      performance: {
        averageProcessingTime: avgProcessingTime,
        averageThroughput: avgThroughput,
        targetFPS: this.pipelineConfig.performance.targetFPS,
        queueLength: this.processingQueue.length,
        totalFramesProcessed: this.frameProcessingTimes.length
      },
      memory: {
        current: this.memoryUsageHistory[this.memoryUsageHistory.length - 1] || 0,
        average: this.memoryUsageHistory.length > 0
          ? this.memoryUsageHistory.reduce((a, b) => a + b, 0) / this.memoryUsageHistory.length
          : 0,
        peak: Math.max(...this.memoryUsageHistory)
      }
    };
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      this.logger.log('Cleaning up GPU-accelerated inference service...');
      
      // Clear processing queue
      this.processingQueue = [];
      
      // Dispose results
      for (const result of this.results.values()) {
        result.output.dispose();
      }
      this.results.clear();
      
      this.logger.log('GPU inference service cleanup complete');
      
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`);
    }
  }
}