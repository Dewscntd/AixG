import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StreamId } from '../../domain/value-objects/stream-id';
import { LiveStream, StreamStatus } from '../../domain/entities/live-stream';
import { LiveAnalysisPipeline } from '../../domain/entities/live-analysis-pipeline';
import { VideoFrame } from '../../domain/value-objects/video-frame';
import { WebRTCStreamManager, WebRTCSignalData } from '../../infrastructure/webrtc/webrtc-stream-manager';
import { EdgeMLInferenceService } from '../../infrastructure/ml/edge-ml-inference';
import { EventStreamService } from '../../infrastructure/events/event-stream.service';

/**
 * Stream metadata interface
 */
export interface StreamMetadata {
  matchId?: string;
  homeTeam?: string;
  awayTeam?: string;
  venue?: string;
  startTime?: Date;
  [key: string]: unknown;
}

/**
 * Stream metrics interface
 */
export interface StreamMetrics {
  streamId: string;
  status: StreamStatus;
  frameCount: number;
  processingRate: number;
  averageLatency: number;
  errorCount: number;
  uptime: number;
  lastFrameTimestamp?: number;
}

/**
 * Service statistics interface
 */
export interface ServiceStatistics {
  activeStreams: number;
  activePipelines: number;
  webrtcConnections: number;
  totalFramesProcessed: number;
  averageProcessingTime: number;
  errorRate: number;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * Real-time Analysis Service
 * Orchestrates live video analysis with WebRTC streaming
 */
@Injectable()
export class RealTimeAnalysisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealTimeAnalysisService.name);
  private activeStreams: Map<string, LiveStream> = new Map();
  private activePipelines: Map<string, LiveAnalysisPipeline> = new Map();
  private webrtcManager: WebRTCStreamManager;
  private mlInference: EdgeMLInferenceService;
  private eventStream: EventStreamService;

  constructor(
    private readonly eventEmitter: EventEmitter2
  ) {
    this.webrtcManager = new WebRTCStreamManager();
    this.mlInference = new EdgeMLInferenceService();
    this.eventStream = new EventStreamService(this.eventEmitter);
  }

  /**
   * Initialize service on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      // Initialize WebRTC manager
      await this.webrtcManager.initialize();
      
      // Initialize ML inference
      await this.mlInference.initialize();
      
      // Setup event handlers
      this.setupEventHandlers();

      this.logger.log('Real-time Analysis Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Real-time Analysis Service:', error);
      throw error;
    }
  }

  /**
   * Cleanup on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    // Stop all active streams
    const streamIds = Array.from(this.activeStreams.keys());
    for (const streamId of streamIds) {
      await this.stopStream(StreamId.fromString(streamId));
    }

    // Cleanup resources
    await this.webrtcManager.cleanup();
    await this.mlInference.cleanup();
  }

  /**
   * Start a new live analysis stream
   */
  async startStream(
    metadata?: StreamMetadata
  ): Promise<{ streamId: string; peerId: string }> {
    try {
      // Create new live stream
      const stream = LiveStream.create(300, metadata);
      
      // Create WebRTC peer connection
      const peerId = await this.webrtcManager.createPeerConnection(
        stream.id,
        false // Not initiator - waiting for incoming stream
      );

      // Create analysis pipeline
      const pipeline = new LiveAnalysisPipeline(
        stream.id,
        this.mlInference,
        this.eventStream
      );

      // Register frame callback
      this.webrtcManager.registerFrameCallback(
        stream.id,
        (frame: VideoFrame) => this.handleIncomingFrame(stream.id, frame)
      );

      // Start stream and pipeline
      stream.start();
      await pipeline.start();

      // Store active components
      this.activeStreams.set(stream.id.value, stream);
      this.activePipelines.set(stream.id.value, pipeline);

      // Publish domain events
      await this.publishDomainEvents(stream);

      this.eventEmitter.emit('stream.started', {
        streamId: stream.id.value,
        peerId,
        metadata
      });

      return {
        streamId: stream.id.value,
        peerId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start stream: ${errorMessage}`);
    }
  }

  /**
   * Stop a live analysis stream
   */
  async stopStream(streamId: StreamId): Promise<void> {
    const stream = this.activeStreams.get(streamId.value);
    const pipeline = this.activePipelines.get(streamId.value);

    if (!stream) {
      throw new Error(`Stream ${streamId.value} not found`);
    }

    try {
      // Stop pipeline
      if (pipeline) {
        await pipeline.stop();
        this.activePipelines.delete(streamId.value);
      }

      // Stop stream
      stream.stop();

      // Cleanup WebRTC connection
      const connections = this.webrtcManager.getActiveConnections();
      for (const peerId of connections) {
        // In a real implementation, you'd track which peer belongs to which stream
        await this.webrtcManager.closePeerConnection(peerId);
      }

      // Unregister frame callback
      this.webrtcManager.unregisterFrameCallback(streamId);

      // Remove from active streams
      this.activeStreams.delete(streamId.value);

      // Publish domain events
      await this.publishDomainEvents(stream);

      this.eventEmitter.emit('stream.stopped', {
        streamId: streamId.value
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to stop stream: ${errorMessage}`);
    }
  }

  /**
   * Signal WebRTC peer connection
   */
  async signalPeer(peerId: string, signalData: WebRTCSignalData): Promise<void> {
    try {
      await this.webrtcManager.signal(peerId, signalData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to signal peer: ${errorMessage}`);
    }
  }

  /**
   * Get stream status
   */
  getStreamStatus(streamId: StreamId): StreamStatus | null {
    const stream = this.activeStreams.get(streamId.value);
    return stream ? stream.status : null;
  }

  /**
   * Get stream metrics
   */
  getStreamMetrics(streamId: StreamId): StreamMetrics | null {
    const stream = this.activeStreams.get(streamId.value);

    if (!stream) {
      return null;
    }

    return {
      streamId: streamId.value,
      status: stream.status,
      frameCount: stream.frameCount,
      processingRate: stream.getCurrentFrameRate(),
      averageLatency: 0, // TODO: Implement in pipeline
      errorCount: 0, // TODO: Implement error tracking
      uptime: stream.getDuration()
      // lastFrameTimestamp is optional and undefined, so we omit it
    };
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  /**
   * Get service statistics
   */
  getServiceStats(): ServiceStatistics {
    const memoryUsage = process.memoryUsage();

    return {
      activeStreams: this.activeStreams.size,
      activePipelines: this.activePipelines.size,
      webrtcConnections: this.webrtcManager.getActiveConnections().length,
      totalFramesProcessed: 0, // TODO: Implement frame counting
      averageProcessingTime: 0, // TODO: Implement timing metrics
      errorRate: 0, // TODO: Implement error tracking
      uptime: process.uptime() * 1000, // Convert to milliseconds
      memoryUsage: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      }
    };
  }

  /**
   * Handle incoming video frame
   */
  private async handleIncomingFrame(streamId: StreamId, frame: VideoFrame): Promise<void> {
    const stream = this.activeStreams.get(streamId.value);
    const pipeline = this.activePipelines.get(streamId.value);

    if (!stream || !pipeline) {
      return;
    }

    try {
      // Add frame to stream
      stream.addFrame(frame);

      // Process frame through pipeline
      await pipeline.processFrame(frame);

      // Publish domain events
      await this.publishDomainEvents(stream);

    } catch (error) {
      this.logger.error(`Error processing frame for stream ${streamId.value}:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.eventEmitter.emit('frame.processing.error', {
        streamId: streamId.value,
        frameNumber: frame.frameNumber,
        error: errorMessage
      });
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // WebRTC event handlers
    this.webrtcManager.on('connected', (data) => {
      this.eventEmitter.emit('webrtc.connected', data);
    });

    this.webrtcManager.on('disconnected', (data) => {
      this.eventEmitter.emit('webrtc.disconnected', data);
    });

    this.webrtcManager.on('error', (error) => {
      this.eventEmitter.emit('webrtc.error', { error: error.message });
    });

    this.webrtcManager.on('frameExtracted', (data) => {
      this.eventEmitter.emit('frame.extracted', data);
    });
  }

  /**
   * Publish domain events from stream
   */
  private async publishDomainEvents(stream: LiveStream): Promise<void> {
    const events = stream.getUncommittedEvents();
    
    for (const event of events) {
      this.eventEmitter.emit(`domain.${event.eventType}`, event.toJSON());
    }
  }
}
