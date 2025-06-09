export interface VideoMetadataProps {
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  bitrate: number;
  codec: string;
  format: string;
  fileSize: number;
  checksum: string;
}

export class VideoMetadata {
  private readonly _duration: number;
  private readonly _resolution: { width: number; height: number };
  private readonly _frameRate: number;
  private readonly _bitrate: number;
  private readonly _codec: string;
  private readonly _format: string;
  private readonly _fileSize: number;
  private readonly _checksum: string;

  constructor(props: VideoMetadataProps) {
    this.validateProps(props);
    
    this._duration = props.duration;
    this._resolution = { ...props.resolution };
    this._frameRate = props.frameRate;
    this._bitrate = props.bitrate;
    this._codec = props.codec;
    this._format = props.format;
    this._fileSize = props.fileSize;
    this._checksum = props.checksum;
  }

  get duration(): number {
    return this._duration;
  }

  get resolution(): { width: number; height: number } {
    return { ...this._resolution };
  }

  get frameRate(): number {
    return this._frameRate;
  }

  get bitrate(): number {
    return this._bitrate;
  }

  get codec(): string {
    return this._codec;
  }

  get format(): string {
    return this._format;
  }

  get fileSize(): number {
    return this._fileSize;
  }

  get checksum(): string {
    return this._checksum;
  }

  isHighDefinition(): boolean {
    return this._resolution.width >= 1920 && this._resolution.height >= 1080;
  }

  getAspectRatio(): number {
    return this._resolution.width / this._resolution.height;
  }

  private validateProps(props: VideoMetadataProps): void {
    if (!props.duration || props.duration <= 0) {
      throw new Error('Duration must be greater than 0');
    }

    if (!props.resolution || props.resolution.width <= 0 || props.resolution.height <= 0) {
      throw new Error('Resolution must have positive width and height');
    }

    if (!props.frameRate || props.frameRate <= 0) {
      throw new Error('Frame rate must be greater than 0');
    }

    if (!props.bitrate || props.bitrate <= 0) {
      throw new Error('Bitrate must be greater than 0');
    }

    if (!props.codec || props.codec.trim().length === 0) {
      throw new Error('Codec is required');
    }

    if (!props.format || props.format.trim().length === 0) {
      throw new Error('Format is required');
    }

    if (!props.fileSize || props.fileSize <= 0) {
      throw new Error('File size must be greater than 0');
    }

    if (!props.checksum || props.checksum.trim().length === 0) {
      throw new Error('Checksum is required');
    }
  }

  // Snapshot methods for testing
  toSnapshot(): VideoMetadataSnapshot {
    return {
      duration: this._duration,
      resolution: { ...this._resolution },
      frameRate: this._frameRate,
      bitrate: this._bitrate,
      codec: this._codec,
      format: this._format,
      fileSize: this._fileSize,
      checksum: this._checksum
    };
  }

  static fromSnapshot(snapshot: VideoMetadataSnapshot): VideoMetadata {
    return new VideoMetadata({
      duration: snapshot.duration,
      resolution: { ...snapshot.resolution },
      frameRate: snapshot.frameRate,
      bitrate: snapshot.bitrate,
      codec: snapshot.codec,
      format: snapshot.format,
      fileSize: snapshot.fileSize,
      checksum: snapshot.checksum
    });
  }
}

export interface VideoMetadataSnapshot {
  duration: number;
  resolution: { width: number; height: number };
  frameRate: number;
  bitrate: number;
  codec: string;
  format: string;
  fileSize: number;
  checksum: string;
}
