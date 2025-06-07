import { Video } from '../entities/video.entity';
import { VideoId } from '../value-objects/video-id.value-object';

export interface VideoRepository {
  save(video: Video): Promise<Video>;
  findById(id: VideoId): Promise<Video | null>;
  findByUploadId(uploadId: string): Promise<Video | null>;
  update(video: Video): Promise<Video>;
}