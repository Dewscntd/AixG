import { StreamId } from '../value-objects/stream-id';
import { VideoFrame } from '../value-objects/video-frame';
import { RingBuffer } from '../value-objects/ring-buffer';
import { DomainEvent } from '../events/domain-event';
import { StreamStartedEvent } from '../events/stream-started.event';
import { StreamStoppedEvent } from '../events/stream-stopped.event';
import { FrameReceivedEvent } from '../events/frame-received.event';

/**
 * Live Stream aggregate root
 * Manages real-time video stream state and frame processing
 */
export class LiveStream {
  private readonly _id: StreamId;
  private readonly _frameBuffer: RingBuffer<VideoFrame>;
  private _status: StreamStatus;
  private _startedAt?: Date;
  private _stoppedAt?: Date;
  private _frameCount: number = 0;
  private _lastFrameTimestamp?: number;
  private _metadata: StreamMetadata;
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    id: StreamId,
    bufferSize: number = 300, // 10 seconds at 30fps
    metadata: StreamMetadata = {}
  ) {
    this._id = id;
    this._frameBuffer = new RingBuffer<VideoFrame>(bufferSize);
    this._status = StreamStatus.CREATED;
    this._metadata = { ...metadata };
  }

  /**
   * Create a new live stream
   */
  static create(bufferSize?: number, metadata?: StreamMetadata): LiveStream {
    const id = StreamId.generate();
    return new LiveStream(id, bufferSize, metadata);
  }

  /**
   * Reconstitute from persistence
   */
  static fromSnapshot(
    id: StreamId,
    status: StreamStatus,
    frameCount: number,
    startedAt?: Date,
    stoppedAt?: Date,
    metadata?: StreamMetadata
  ): LiveStream {
    const stream = new LiveStream(id, 300, metadata);
    stream._status = status;
    stream._frameCount = frameCount;
    stream._startedAt = startedAt;
    stream._stoppedAt = stoppedAt;
    return stream;
  }

  /**
   * Start the live stream
   */
  start(): void {
    if (this._status !== StreamStatus.CREATED) {
      throw new Error(`Cannot start stream in ${this._status} status`);
    }

    this._status = StreamStatus.ACTIVE;
    this._startedAt = new Date();

    this.addDomainEvent(
      new StreamStartedEvent(this._id.value, this._startedAt, this._metadata)
    );
  }

  /**
   * Stop the live stream
   */
  stop(): void {
    if (this._status !== StreamStatus.ACTIVE) {
      throw new Error(`Cannot stop stream in ${this._status} status`);
    }

    this._status = StreamStatus.STOPPED;
    this._stoppedAt = new Date();

    this.addDomainEvent(
      new StreamStoppedEvent(
        this._id.value,
        this._stoppedAt,
        this._frameCount,
        this.getDuration()
      )
    );
  }

  /**
   * Add a new frame to the stream
   */
  addFrame(frame: VideoFrame): void {
    if (this._status !== StreamStatus.ACTIVE) {
      throw new Error(`Cannot add frame to stream in ${this._status} status`);
    }

    // Validate frame timestamp ordering
    if (
      this._lastFrameTimestamp &&
      frame.timestamp < this._lastFrameTimestamp
    ) {
      throw new Error('Frame timestamp must be greater than previous frame');
    }

    this._frameBuffer.push(frame);
    this._frameCount++;
    this._lastFrameTimestamp = frame.timestamp;

    this.addDomainEvent(
      new FrameReceivedEvent(
        this._id.value,
        frame.frameNumber,
        frame.timestamp,
        frame.width,
        frame.height,
        frame.sizeBytes
      )
    );
  }

  /**
   * Get the most recent frames
   */
  getRecentFrames(count: number): VideoFrame[] {
    return this._frameBuffer.getLast(count);
  }

  /**
   * Get the latest frame
   */
  getLatestFrame(): VideoFrame | undefined {
    return this._frameBuffer.peek();
  }

  /**
   * Get stream duration in milliseconds
   */
  getDuration(): number {
    if (!this._startedAt) {
      return 0;
    }

    const endTime = this._stoppedAt || new Date();
    return endTime.getTime() - this._startedAt.getTime();
  }

  /**
   * Get current frame rate (frames per second)
   */
  getCurrentFrameRate(): number {
    const duration = this.getDuration();
    if (duration === 0) {
      return 0;
    }

    return (this._frameCount / duration) * 1000;
  }

  /**
   * Update stream metadata
   */
  updateMetadata(metadata: Partial<StreamMetadata>): void {
    this._metadata = { ...this._metadata, ...metadata };
  }

  /**
   * Check if stream is healthy (receiving frames regularly)
   */
  isHealthy(maxFrameGapMs: number = 5000): boolean {
    if (this._status !== StreamStatus.ACTIVE) {
      return false;
    }

    if (!this._lastFrameTimestamp) {
      return true; // No frames yet, but stream is active
    }

    const now = Date.now();
    return now - this._lastFrameTimestamp <= maxFrameGapMs;
  }

  // Getters
  get id(): StreamId {
    return this._id;
  }
  get status(): StreamStatus {
    return this._status;
  }
  get frameCount(): number {
    return this._frameCount;
  }
  get startedAt(): Date | undefined {
    return this._startedAt;
  }
  get stoppedAt(): Date | undefined {
    return this._stoppedAt;
  }
  get metadata(): StreamMetadata {
    return { ...this._metadata };
  }
  get bufferUtilization(): number {
    return this._frameBuffer.utilization;
  }

  /**
   * Get and clear domain events
   */
  getUncommittedEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }
}

/**
 * Stream status enumeration
 */
export enum StreamStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * Stream metadata interface
 */
export interface StreamMetadata {
  cameraId?: string;
  matchId?: string;
  quality?: string;
  resolution?: string;
  codec?: string;
  bitrate?: number;
  [key: string]: any;
}
