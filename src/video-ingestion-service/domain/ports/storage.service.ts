import { UploadMetadata } from '../value-objects/upload-metadata.value-object';
import { StorageResult } from '../value-objects/storage-result.value-object';

export interface StorageService {
  upload(
    stream: ReadableStream,
    metadata: UploadMetadata
  ): Promise<StorageResult>;
  resumeUpload(
    uploadId: string,
    stream: ReadableStream,
    offset: number
  ): Promise<StorageResult>;
  getUploadProgress(uploadId: string): Promise<number>;
  deleteUpload(uploadId: string): Promise<void>;
  generatePresignedUrl(key: string, expiresIn?: number): Promise<string>;
}
