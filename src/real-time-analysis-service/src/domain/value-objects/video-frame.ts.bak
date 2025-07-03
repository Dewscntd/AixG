/**
 * Video Frame value object for real-time analysis
 * Represents a single frame in a video stream with metadata
 */
export class VideoFrame {
  private readonly _timestamp: number;
  private readonly _frameNumber: number;
  private readonly _width: number;
  private readonly _height: number;
  private readonly _data: Buffer;
  private readonly _format: VideoFrameFormat;
  private readonly _metadata: FrameMetadata;

  constructor(
    timestamp: number,
    frameNumber: number,
    width: number,
    height: number,
    data: Buffer,
    format: VideoFrameFormat,
    metadata: FrameMetadata = {}
  ) {
    this.validateInputs(timestamp, frameNumber, width, height, data);

    this._timestamp = timestamp;
    this._frameNumber = frameNumber;
    this._width = width;
    this._height = height;
    this._data = data;
    this._format = format;
    this._metadata = { ...metadata };
  }

  private validateInputs(
    timestamp: number,
    frameNumber: number,
    width: number,
    height: number,
    data: Buffer
  ): void {
    if (timestamp < 0) {
      throw new Error('Timestamp must be non-negative');
    }
    if (frameNumber < 0) {
      throw new Error('Frame number must be non-negative');
    }
    if (width <= 0 || height <= 0) {
      throw new Error('Width and height must be positive');
    }
    if (!data || data.length === 0) {
      throw new Error('Frame data cannot be empty');
    }
  }

  /**
   * Create a new VideoFrame with updated metadata
   */
  withMetadata(metadata: FrameMetadata): VideoFrame {
    return new VideoFrame(
      this._timestamp,
      this._frameNumber,
      this._width,
      this._height,
      this._data,
      this._format,
      { ...this._metadata, ...metadata }
    );
  }

  /**
   * Create a resized copy of the frame
   */
  resize(newWidth: number, newHeight: number): VideoFrame {
    // Note: In a real implementation, this would use image processing library
    // For now, we'll return a new frame with updated dimensions
    return new VideoFrame(
      this._timestamp,
      this._frameNumber,
      newWidth,
      newHeight,
      this._data, // In reality, this would be resized data
      this._format,
      {
        ...this._metadata,
        resized: true,
        originalWidth: this._width,
        originalHeight: this._height,
      }
    );
  }

  // Getters
  get timestamp(): number {
    return this._timestamp;
  }
  get frameNumber(): number {
    return this._frameNumber;
  }
  get width(): number {
    return this._width;
  }
  get height(): number {
    return this._height;
  }
  get data(): Buffer {
    return this._data;
  }
  get format(): VideoFrameFormat {
    return this._format;
  }
  get metadata(): FrameMetadata {
    return { ...this._metadata };
  }

  /**
   * Get frame size in bytes
   */
  get sizeBytes(): number {
    return this._data.length;
  }

  /**
   * Get frame aspect ratio
   */
  get aspectRatio(): number {
    return this._width / this._height;
  }

  /**
   * Check if frame is valid
   */
  isValid(): boolean {
    return (
      this._width > 0 &&
      this._height > 0 &&
      this._data.length > 0 &&
      this._timestamp >= 0 &&
      this._frameNumber >= 0
    );
  }

  /**
   * Convert to JSON representation (without binary data)
   */
  toJSON(): object {
    return {
      timestamp: this._timestamp,
      frameNumber: this._frameNumber,
      width: this._width,
      height: this._height,
      format: this._format,
      sizeBytes: this.sizeBytes,
      aspectRatio: this.aspectRatio,
      metadata: this._metadata,
    };
  }
}

/**
 * Supported video frame formats
 */
export enum VideoFrameFormat {
  RGB24 = 'rgb24',
  RGBA32 = 'rgba32',
  YUV420P = 'yuv420p',
  NV12 = 'nv12',
  JPEG = 'jpeg',
  PNG = 'png',
}

/**
 * Frame metadata interface
 */
export interface FrameMetadata {
  [key: string]: any;
  resized?: boolean;
  originalWidth?: number;
  originalHeight?: number;
  compressionRatio?: number;
  quality?: number;
  source?: string;
  cameraId?: string;
}
