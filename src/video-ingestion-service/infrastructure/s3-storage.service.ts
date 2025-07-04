import { StorageService } from '../domain/ports/storage.service';
import { UploadMetadata } from '../domain/value-objects/upload-metadata.value-object';
import { StorageResult } from '../domain/value-objects/storage-result.value-object';
import { Injectable, Logger } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { Readable } from 'stream';
import * as crypto from 'crypto';

@Injectable()
export class S3StorageService implements StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3: S3;
  private readonly bucketName: string;

  constructor() {
    const s3Config: Record<string, string> = {
      region: process.env.AWS_REGION || 'eu-west-1',
    };

    if (process.env.AWS_ACCESS_KEY_ID) {
      s3Config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    }

    if (process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    }

    this.s3 = new S3(s3Config);
    this.bucketName = process.env.S3_VIDEO_BUCKET || 'footanalytics-videos';
  }

  async upload(
    stream: ReadableStream,
    metadata: UploadMetadata
  ): Promise<StorageResult> {
    try {
      const key = this.generateStorageKey(metadata);

      // Convert ReadableStream to Node.js Readable if needed
      const nodeStream = this.convertToNodeStream(stream);

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: nodeStream,
        ContentType: metadata.mimeType,
        Metadata: {
          'original-filename': metadata.filename,
          'uploaded-by': metadata.uploadedBy,
          'upload-id': metadata.uploadId,
          ...(metadata.matchId && { 'match-id': metadata.matchId }),
          ...(metadata.teamId && { 'team-id': metadata.teamId }),
          tags: metadata.tags.join(','),
        },
        ServerSideEncryption: 'AES256',
      };

      this.logger.log(`Starting upload to S3: ${key}`);

      const result = await this.s3.upload(uploadParams).promise();

      this.logger.log(`Upload completed: ${key}`);

      return new StorageResult({
        uploadId: metadata.uploadId,
        key: result.Key!,
        bucket: result.Bucket!,
        url: result.Location!,
        size: metadata.size,
        etag: result.ETag,
        metadata: uploadParams.Metadata,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Upload failed: ${errorMessage}`, errorStack);
      throw new Error(`S3 upload failed: ${errorMessage}`);
    }
  }

  async resumeUpload(
    uploadId: string,
    stream: ReadableStream,
    offset: number
  ): Promise<StorageResult> {
    try {
      // For resumable uploads, we would typically use S3 multipart upload
      // This is a simplified implementation
      this.logger.log(`Resuming upload: ${uploadId} at offset ${offset}`);

      // In a real implementation, you would:
      // 1. List existing parts for the multipart upload
      // 2. Calculate which part to start from based on offset
      // 3. Continue uploading remaining parts

      // For now, we'll simulate by re-uploading from offset
      // This is not efficient and should be replaced with proper multipart upload

      throw new Error('Resumable upload not yet implemented for S3');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Resume upload failed: ${errorMessage}`, errorStack);
      throw new Error(`S3 resume upload failed: ${errorMessage}`);
    }
  }

  async getUploadProgress(uploadId: string): Promise<number> {
    try {
      // In a real implementation, you would track upload progress
      // This could be done through:
      // 1. Multipart upload progress tracking
      // 2. External progress tracking service
      // 3. Database records

      this.logger.log(`Getting upload progress for: ${uploadId}`);

      // For now, return a mock progress
      // In real implementation, query the actual progress
      return 100; // Assume completed for now
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Get upload progress failed: ${errorMessage}`,
        errorStack
      );
      throw new Error(`Failed to get upload progress: ${errorMessage}`);
    }
  }

  async deleteUpload(uploadId: string): Promise<void> {
    try {
      // Find and delete the object by upload ID
      // This would require maintaining a mapping of uploadId to S3 key
      this.logger.log(`Deleting upload: ${uploadId}`);

      // In real implementation:
      // 1. Query database/cache for S3 key by uploadId
      // 2. Delete the S3 object
      // 3. Clean up any multipart upload if incomplete

      throw new Error('Delete upload not yet implemented');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Delete upload failed: ${errorMessage}`, errorStack);
      throw new Error(`Failed to delete upload: ${errorMessage}`);
    }
  }

  async generatePresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn,
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);

      this.logger.log(`Generated presigned URL for: ${key}`);

      return url;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Generate presigned URL failed: ${errorMessage}`,
        errorStack
      );
      throw new Error(`Failed to generate presigned URL: ${errorMessage}`);
    }
  }

  private generateStorageKey(metadata: UploadMetadata): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hash = crypto
      .createHash('md5')
      .update(metadata.uploadId)
      .digest('hex')
      .substring(0, 8);
    const extension =
      metadata.filename.split('.').pop()?.toLowerCase() || 'mp4';

    let keyPath = `videos/${timestamp}/${hash}`;

    if (metadata.teamId) {
      keyPath = `teams/${metadata.teamId}/${keyPath}`;
    }

    if (metadata.matchId) {
      keyPath = `matches/${metadata.matchId}/${keyPath}`;
    }

    return `${keyPath}/video.${extension}`;
  }

  private convertToNodeStream(stream: ReadableStream): Readable {
    // Convert Web ReadableStream to Node.js Readable stream
    const reader = stream.getReader();

    return new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        } catch (error) {
          this.destroy(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      },
    });
  }
}
