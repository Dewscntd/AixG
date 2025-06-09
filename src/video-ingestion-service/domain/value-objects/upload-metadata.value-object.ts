export interface UploadMetadataProps {
  filename: string;
  mimeType: string;
  size: number;
  matchId?: string | undefined;
  teamId?: string | undefined;
  uploadedBy: string;
  tags?: string[] | undefined;
}

export class UploadMetadata {
  private readonly _filename: string;
  private readonly _mimeType: string;
  private readonly _size: number;
  private readonly _matchId?: string | undefined;
  private readonly _teamId?: string | undefined;
  private readonly _uploadedBy: string;
  private readonly _tags: string[];
  private readonly _uploadId: string;

  constructor(props: UploadMetadataProps) {
    this.validateProps(props);
    
    this._filename = props.filename;
    this._mimeType = props.mimeType;
    this._size = props.size;
    this._matchId = props.matchId;
    this._teamId = props.teamId;
    this._uploadedBy = props.uploadedBy;
    this._tags = props.tags || [];
    this._uploadId = this.generateUploadId();
  }

  get filename(): string {
    return this._filename;
  }

  get mimeType(): string {
    return this._mimeType;
  }

  get size(): number {
    return this._size;
  }

  get matchId(): string | undefined {
    return this._matchId;
  }

  get teamId(): string | undefined {
    return this._teamId;
  }

  get uploadedBy(): string {
    return this._uploadedBy;
  }

  get tags(): string[] {
    return [...this._tags];
  }

  get uploadId(): string {
    return this._uploadId;
  }

  private validateProps(props: UploadMetadataProps): void {
    if (!props.filename || props.filename.trim().length === 0) {
      throw new Error('Filename is required');
    }

    if (!props.mimeType || !this.isValidVideoMimeType(props.mimeType)) {
      throw new Error('Invalid or unsupported video mime type');
    }

    if (!props.size || props.size <= 0) {
      throw new Error('File size must be greater than 0');
    }

    if (props.size > 10 * 1024 * 1024 * 1024) { // 10GB limit
      throw new Error('File size exceeds maximum limit of 10GB');
    }

    if (!props.uploadedBy || props.uploadedBy.trim().length === 0) {
      throw new Error('UploadedBy is required');
    }
  }

  private isValidVideoMimeType(mimeType: string): boolean {
    const validMimeTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ];
    return validMimeTypes.includes(mimeType.toLowerCase());
  }

  private generateUploadId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `upload_${timestamp}_${random}`;
  }

  // Snapshot methods for testing
  toSnapshot(): UploadMetadataSnapshot {
    return {
      filename: this._filename,
      mimeType: this._mimeType,
      size: this._size,
      matchId: this._matchId,
      teamId: this._teamId,
      uploadedBy: this._uploadedBy,
      tags: [...this._tags],
      uploadId: this._uploadId
    };
  }

  static fromSnapshot(snapshot: UploadMetadataSnapshot): UploadMetadata {
    const metadata = new UploadMetadata({
      filename: snapshot.filename,
      mimeType: snapshot.mimeType,
      size: snapshot.size,
      matchId: snapshot.matchId,
      teamId: snapshot.teamId,
      uploadedBy: snapshot.uploadedBy,
      tags: snapshot.tags
    });
    // Override the generated uploadId with the snapshot value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (metadata as any)._uploadId = snapshot.uploadId;
    return metadata;
  }
}

export interface UploadMetadataSnapshot {
  filename: string;
  mimeType: string;
  size: number;
  matchId?: string | undefined;
  teamId?: string | undefined;
  uploadedBy: string;
  tags: string[];
  uploadId: string;
}
