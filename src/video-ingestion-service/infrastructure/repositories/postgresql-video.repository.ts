import { Injectable, Logger } from '@nestjs/common';
import { VideoRepository } from '../../domain/ports/video.repository';
import { Video, VideoStatus } from '../../domain/entities/video.entity';
import { VideoId } from '../../domain/value-objects/video-id.value-object';
import { UploadMetadata } from '../../domain/value-objects/upload-metadata.value-object';
import { VideoMetadata } from '../../domain/value-objects/video-metadata.value-object';
import { StorageResult } from '../../domain/value-objects/storage-result.value-object';
import { Pool } from 'pg';

interface VideoRow {
  id: string;
  upload_id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  match_id?: string;
  team_id?: string;
  tags: string[];
  status: string;
  upload_progress: number;
  validation_errors: string[];
  validation_warnings: string[];
  storage_key?: string;
  storage_bucket?: string;
  storage_url?: string;
  storage_etag?: string;
  video_duration?: number;
  video_width?: number;
  video_height?: number;
  video_frame_rate?: number;
  video_bitrate?: number;
  video_codec?: string;
  video_format?: string;
  video_checksum?: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class PostgreSQLVideoRepository implements VideoRepository {
  private readonly logger = new Logger(PostgreSQLVideoRepository.name);
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'footanalytics',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async save(video: Video): Promise<Video> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO videos (
          id, upload_id, filename, mime_type, file_size, uploaded_by, 
          match_id, team_id, tags, status, upload_progress, 
          validation_errors, validation_warnings, storage_key, storage_bucket, 
          storage_url, storage_etag, video_duration, video_width, video_height,
          video_frame_rate, video_bitrate, video_codec, video_format, 
          video_checksum, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        )
      `;

      const values = [
        video.id.value,
        video.uploadMetadata.uploadId,
        video.uploadMetadata.filename,
        video.uploadMetadata.mimeType,
        video.uploadMetadata.size,
        video.uploadMetadata.uploadedBy,
        video.uploadMetadata.matchId,
        video.uploadMetadata.teamId,
        video.uploadMetadata.tags,
        video.status,
        video.uploadProgress,
        video.validationErrors,
        video.validationWarnings,
        video.storageResult?.key,
        video.storageResult?.bucket,
        video.storageResult?.url,
        video.storageResult?.etag,
        video.videoMetadata?.duration,
        video.videoMetadata?.resolution.width,
        video.videoMetadata?.resolution.height,
        video.videoMetadata?.frameRate,
        video.videoMetadata?.bitrate,
        video.videoMetadata?.codec,
        video.videoMetadata?.format,
        video.videoMetadata?.checksum,
        video.createdAt,
        video.updatedAt,
      ];

      await client.query(query, values);

      this.logger.log(`Video saved: ${video.id.value}`);

      return video;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to save video: ${errorMessage}`, errorStack);
      throw new Error(`Failed to save video: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  async findById(id: VideoId): Promise<Video | null> {
    const client = await this.pool.connect();

    try {
      const query = 'SELECT * FROM videos WHERE id = $1';
      const result = await client.query(query, [id.value]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToVideo(result.rows[0]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to find video by ID: ${errorMessage}`,
        errorStack
      );
      throw new Error(`Failed to find video: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  async findByUploadId(uploadId: string): Promise<Video | null> {
    const client = await this.pool.connect();

    try {
      const query = 'SELECT * FROM videos WHERE upload_id = $1';
      const result = await client.query(query, [uploadId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToVideo(result.rows[0]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to find video by upload ID: ${errorMessage}`,
        errorStack
      );
      throw new Error(`Failed to find video: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  async update(video: Video): Promise<Video> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE videos SET
          status = $2, upload_progress = $3, validation_errors = $4,
          validation_warnings = $5, storage_key = $6, storage_bucket = $7,
          storage_url = $8, storage_etag = $9, video_duration = $10,
          video_width = $11, video_height = $12, video_frame_rate = $13,
          video_bitrate = $14, video_codec = $15, video_format = $16,
          video_checksum = $17, updated_at = $18
        WHERE id = $1
      `;

      const values = [
        video.id.value,
        video.status,
        video.uploadProgress,
        video.validationErrors,
        video.validationWarnings,
        video.storageResult?.key,
        video.storageResult?.bucket,
        video.storageResult?.url,
        video.storageResult?.etag,
        video.videoMetadata?.duration,
        video.videoMetadata?.resolution.width,
        video.videoMetadata?.resolution.height,
        video.videoMetadata?.frameRate,
        video.videoMetadata?.bitrate,
        video.videoMetadata?.codec,
        video.videoMetadata?.format,
        video.videoMetadata?.checksum,
        video.updatedAt,
      ];

      const result = await client.query(query, values);

      if (result.rowCount === 0) {
        throw new Error(`Video not found: ${video.id.value}`);
      }

      this.logger.log(`Video updated: ${video.id.value}`);

      return video;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update video: ${errorMessage}`,
        errorStack
      );
      throw new Error(`Failed to update video: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  private mapRowToVideo(row: VideoRow): Video {
    const uploadMetadata = new UploadMetadata({
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.file_size,
      uploadedBy: row.uploaded_by,
      matchId: row.match_id,
      teamId: row.team_id,
      tags: row.tags,
    });

    let storageResult: StorageResult | undefined;
    if (row.storage_key && row.storage_bucket && row.storage_url) {
      storageResult = new StorageResult({
        uploadId: row.upload_id,
        key: row.storage_key,
        bucket: row.storage_bucket,
        url: row.storage_url,
        size: row.file_size,
        etag: row.storage_etag,
      });
    }

    let videoMetadata: VideoMetadata | undefined;
    if (row.video_duration && row.video_width && row.video_height) {
      videoMetadata = new VideoMetadata({
        duration: row.video_duration,
        resolution: { width: row.video_width, height: row.video_height },
        frameRate: row.video_frame_rate!,
        bitrate: row.video_bitrate!,
        codec: row.video_codec!,
        format: row.video_format!,
        fileSize: row.file_size,
        checksum: row.video_checksum!,
      });
    }

    return new Video({
      id: new VideoId(row.id),
      uploadMetadata,
      storageResult,
      videoMetadata,
      status: row.status as VideoStatus,
      uploadProgress: row.upload_progress,
      validationErrors: row.validation_errors,
      validationWarnings: row.validation_warnings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
