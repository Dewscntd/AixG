import { Injectable } from '@nestjs/common';
import { VideoRepository } from '../../domain/ports/video.repository';
import { Video } from '../../domain/entities/video.entity';
import { VideoId } from '../../domain/value-objects/video-id.value-object';

@Injectable()
export class InMemoryVideoRepository implements VideoRepository {
  private readonly videos = new Map<string, Video>();

  async save(video: Video): Promise<Video> {
    this.videos.set(video.id.value, video);
    return video;
  }

  async findById(id: VideoId): Promise<Video | null> {
    return this.videos.get(id.value) || null;
  }

  async findByUploadId(uploadId: string): Promise<Video | null> {
    for (const video of this.videos.values()) {
      if (video.uploadMetadata.uploadId === uploadId) {
        return video;
      }
    }
    return null;
  }

  async update(video: Video): Promise<Video> {
    if (!this.videos.has(video.id.value)) {
      throw new Error(`Video not found: ${video.id.value}`);
    }
    this.videos.set(video.id.value, video);
    return video;
  }

  // Test helper methods
  clear(): void {
    this.videos.clear();
  }

  getAll(): Video[] {
    return Array.from(this.videos.values());
  }

  size(): number {
    return this.videos.size;
  }
}
