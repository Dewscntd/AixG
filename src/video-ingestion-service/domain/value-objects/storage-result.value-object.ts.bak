export interface StorageResultProps {
  uploadId: string;
  key: string;
  bucket: string;
  url: string;
  size: number;
  etag?: string | undefined;
  metadata?: Record<string, string> | undefined;
}

export class StorageResult {
  private readonly _uploadId: string;
  private readonly _key: string;
  private readonly _bucket: string;
  private readonly _url: string;
  private readonly _size: number;
  private readonly _etag?: string | undefined;
  private readonly _metadata: Record<string, string>;

  constructor(props: StorageResultProps) {
    this.validateProps(props);

    this._uploadId = props.uploadId;
    this._key = props.key;
    this._bucket = props.bucket;
    this._url = props.url;
    this._size = props.size;
    this._etag = props.etag;
    this._metadata = props.metadata || {};
  }

  get uploadId(): string {
    return this._uploadId;
  }

  get key(): string {
    return this._key;
  }

  get bucket(): string {
    return this._bucket;
  }

  get url(): string {
    return this._url;
  }

  get size(): number {
    return this._size;
  }

  get etag(): string | undefined {
    return this._etag;
  }

  get metadata(): Record<string, string> {
    return { ...this._metadata };
  }

  private validateProps(props: StorageResultProps): void {
    if (!props.uploadId || props.uploadId.trim().length === 0) {
      throw new Error('Upload ID is required');
    }

    if (!props.key || props.key.trim().length === 0) {
      throw new Error('Storage key is required');
    }

    if (!props.bucket || props.bucket.trim().length === 0) {
      throw new Error('Bucket name is required');
    }

    if (!props.url || props.url.trim().length === 0) {
      throw new Error('Storage URL is required');
    }

    if (!props.size || props.size <= 0) {
      throw new Error('File size must be greater than 0');
    }
  }

  // Snapshot methods for testing
  toSnapshot(): StorageResultSnapshot {
    return {
      uploadId: this._uploadId,
      key: this._key,
      bucket: this._bucket,
      url: this._url,
      size: this._size,
      etag: this._etag,
      metadata: { ...this._metadata },
    };
  }

  static fromSnapshot(snapshot: StorageResultSnapshot): StorageResult {
    return new StorageResult({
      uploadId: snapshot.uploadId,
      key: snapshot.key,
      bucket: snapshot.bucket,
      url: snapshot.url,
      size: snapshot.size,
      etag: snapshot.etag,
      metadata: snapshot.metadata,
    });
  }
}

export interface StorageResultSnapshot {
  uploadId: string;
  key: string;
  bucket: string;
  url: string;
  size: number;
  etag?: string | undefined;
  metadata: Record<string, string>;
}
