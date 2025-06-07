import { StreamId } from '../value-objects/stream-id';
import { VideoFrame } from '../value-objects/video-frame';
import { RingBuffer } from '../value-objects/ring-buffer';
import { DomainEvent } from '../events/domain-event';
import { FrameAnalyzedEvent } from '../events/frame-analyzed.event';

/**
 * Live Analysis Pipeline - Core component for real-time video analysis
 * Implements the composition pattern for stream processing stages
 */
export class LiveAnalysisPipeline {
  private readonly _streamId: StreamId;
  private readonly _frameBuffer: RingBuffer<VideoFrame>;
  private readonly _mlInference: EdgeMLInference;
  private readonly _eventStream: EventStream;
  private readonly _stages: AnalysisStage[];
  private _isRunning: boolean = false;
  private _processedFrameCount: number = 0;
  private _lastProcessedTimestamp?: number;
  private _domainEvents: DomainEvent[] = [];

  constructor(
    streamId: StreamId,
    mlInference: EdgeMLInference,
    eventStream: EventStream,
    bufferSize: number = 300
  ) {
    this._streamId = streamId;
    this._frameBuffer = new RingBuffer<VideoFrame>(bufferSize);
    this._mlInference = mlInference;
    this._eventStream = eventStream;
    this._stages = this.createAnalysisStages();
  }

  /**
   * Create the analysis pipeline stages using composition
   */
  private createAnalysisStages(): AnalysisStage[] {
    return [
      new FramePreprocessingStage(),
      new PlayerDetectionStage(this._mlInference),
      new BallTrackingStage(this._mlInference),
      new TeamClassificationStage(this._mlInference),
      new EventDetectionStage(this._mlInference),
      new FormationAnalysisStage(this._mlInference),
      new MetricsCalculationStage()
    ];
  }

  /**
   * Start the pipeline processing
   */
  async start(): Promise<void> {
    if (this._isRunning) {
      throw new Error('Pipeline is already running');
    }

    this._isRunning = true;
    
    // Start processing loop
    this.processFramesLoop();
  }

  /**
   * Stop the pipeline processing
   */
  async stop(): Promise<void> {
    this._isRunning = false;
  }

  /**
   * Process a single frame through the pipeline
   */
  async processFrame(frame: VideoFrame): Promise<FrameAnalysisResult> {
    if (!this._isRunning) {
      throw new Error('Pipeline is not running');
    }

    // Add frame to buffer
    this._frameBuffer.push(frame);

    // Process through all stages
    let stageInput: StageInput = { frame, context: {} };
    const stageResults: StageResult[] = [];

    for (const stage of this._stages) {
      try {
        const result = await stage.process(stageInput);
        stageResults.push(result);
        
        // Update input for next stage
        stageInput = {
          frame: stageInput.frame,
          context: { ...stageInput.context, ...result.output }
        };
      } catch (error) {
        // Handle stage failure gracefully
        console.error(`Stage ${stage.name} failed:`, error);
        stageResults.push({
          stageName: stage.name,
          success: false,
          error: error.message,
          processingTimeMs: 0,
          output: {}
        });
      }
    }

    const analysisResult = new FrameAnalysisResult(
      frame.frameNumber,
      frame.timestamp,
      stageResults,
      Date.now()
    );

    // Emit analysis event
    this._eventStream.emit(new FrameAnalyzedEvent(
      this._streamId.value,
      frame.frameNumber,
      frame.timestamp,
      analysisResult.toJSON()
    ));

    this._processedFrameCount++;
    this._lastProcessedTimestamp = frame.timestamp;

    return analysisResult;
  }

  /**
   * Continuous frame processing loop
   */
  private async processFramesLoop(): Promise<void> {
    while (this._isRunning) {
      const frame = this._frameBuffer.pop();
      
      if (frame) {
        try {
          await this.processFrame(frame);
        } catch (error) {
          console.error('Frame processing error:', error);
        }
      } else {
        // No frames available, wait briefly
        await this.sleep(1);
      }
    }
  }

  /**
   * Get pipeline performance metrics
   */
  getMetrics(): PipelineMetrics {
    const now = Date.now();
    const uptime = this._isRunning ? now - (this._lastProcessedTimestamp || now) : 0;
    
    return {
      streamId: this._streamId.value,
      isRunning: this._isRunning,
      processedFrameCount: this._processedFrameCount,
      bufferUtilization: this._frameBuffer.utilization,
      bufferSize: this._frameBuffer.size,
      bufferCapacity: this._frameBuffer.capacity,
      uptime,
      averageProcessingRate: uptime > 0 ? (this._processedFrameCount / uptime) * 1000 : 0
    };
  }

  /**
   * Get recent analysis results
   */
  getRecentResults(count: number): FrameAnalysisResult[] {
    // In a real implementation, this would retrieve from a results buffer
    return [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Getters
  get streamId(): StreamId { return this._streamId; }
  get isRunning(): boolean { return this._isRunning; }
  get processedFrameCount(): number { return this._processedFrameCount; }
}

/**
 * Analysis stage interface
 */
export interface AnalysisStage {
  readonly name: string;
  process(input: StageInput): Promise<StageResult>;
}

/**
 * Stage input data
 */
export interface StageInput {
  frame: VideoFrame;
  context: Record<string, any>;
}

/**
 * Stage processing result
 */
export interface StageResult {
  stageName: string;
  success: boolean;
  error?: string;
  processingTimeMs: number;
  output: Record<string, any>;
}

/**
 * Frame analysis result
 */
export class FrameAnalysisResult {
  constructor(
    public readonly frameNumber: number,
    public readonly timestamp: number,
    public readonly stageResults: StageResult[],
    public readonly completedAt: number
  ) {}

  toJSON(): Record<string, any> {
    return {
      frameNumber: this.frameNumber,
      timestamp: this.timestamp,
      completedAt: this.completedAt,
      processingTimeMs: this.completedAt - this.timestamp,
      stageResults: this.stageResults
    };
  }
}

/**
 * Pipeline performance metrics
 */
export interface PipelineMetrics {
  streamId: string;
  isRunning: boolean;
  processedFrameCount: number;
  bufferUtilization: number;
  bufferSize: number;
  bufferCapacity: number;
  uptime: number;
  averageProcessingRate: number;
}

/**
 * Edge ML Inference interface
 */
export interface EdgeMLInference {
  analyze(frame: VideoFrame): Promise<any>;
  isReady(): boolean;
  getModelVersion(): string;
}

/**
 * Event stream interface
 */
export interface EventStream {
  emit(event: DomainEvent): void;
  subscribe(eventType: string, handler: (event: DomainEvent) => void): void;
}
