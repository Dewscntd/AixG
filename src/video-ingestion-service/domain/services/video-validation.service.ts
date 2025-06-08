import { VideoMetadata } from '../value-objects/video-metadata.value-object';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface VideoValidationService {
  validateVideo(filePath: string): Promise<ValidationResult>;
  extractMetadata(filePath: string): Promise<VideoMetadata>;
}

export class DefaultVideoValidationService implements VideoValidationService {
  private readonly MIN_DURATION = 30; // 30 seconds
  private readonly MAX_DURATION = 7200; // 2 hours
  private readonly MIN_RESOLUTION_WIDTH = 640;
  private readonly MIN_RESOLUTION_HEIGHT = 480;
  private readonly SUPPORTED_CODECS = ['h264', 'h265', 'vp8', 'vp9'];
  private readonly SUPPORTED_FORMATS = ['mp4', 'avi', 'mov', 'mkv', 'webm'];

  async validateVideo(filePath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const metadata = await this.extractMetadata(filePath);

      // Duration validation
      if (metadata.duration < this.MIN_DURATION) {
        errors.push(`Video duration (${metadata.duration}s) is below minimum required (${this.MIN_DURATION}s)`);
      }

      if (metadata.duration > this.MAX_DURATION) {
        errors.push(`Video duration (${metadata.duration}s) exceeds maximum allowed (${this.MAX_DURATION}s)`);
      }

      // Resolution validation
      if (metadata.resolution.width < this.MIN_RESOLUTION_WIDTH || 
          metadata.resolution.height < this.MIN_RESOLUTION_HEIGHT) {
        errors.push(`Video resolution (${metadata.resolution.width}x${metadata.resolution.height}) is below minimum required (${this.MIN_RESOLUTION_WIDTH}x${this.MIN_RESOLUTION_HEIGHT})`);
      }

      // Codec validation
      if (!this.SUPPORTED_CODECS.includes(metadata.codec.toLowerCase())) {
        errors.push(`Unsupported video codec: ${metadata.codec}. Supported codecs: ${this.SUPPORTED_CODECS.join(', ')}`);
      }

      // Format validation
      if (!this.SUPPORTED_FORMATS.includes(metadata.format.toLowerCase())) {
        errors.push(`Unsupported video format: ${metadata.format}. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`);
      }

      // Frame rate validation
      if (metadata.frameRate < 15) {
        warnings.push(`Low frame rate detected: ${metadata.frameRate} fps. Recommended minimum: 15 fps`);
      }

      if (metadata.frameRate > 60) {
        warnings.push(`High frame rate detected: ${metadata.frameRate} fps. This may increase processing time`);
      }

      // Bitrate validation
      const expectedBitrate = this.calculateExpectedBitrate(metadata.resolution, metadata.frameRate);
      if (metadata.bitrate < expectedBitrate * 0.5) {
        warnings.push(`Low bitrate detected: ${metadata.bitrate} bps. Expected minimum: ${expectedBitrate * 0.5} bps`);
      }

      // Aspect ratio validation
      const aspectRatio = metadata.getAspectRatio();
      if (aspectRatio < 1.3 || aspectRatio > 2.4) {
        warnings.push(`Unusual aspect ratio detected: ${aspectRatio.toFixed(2)}. Standard ratios are 4:3 (1.33) or 16:9 (1.78)`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to validate video: ${error.message}`],
        warnings: []
      };
    }
  }

  async extractMetadata(filePath: string): Promise<VideoMetadata> {
    // This would typically use FFmpeg or similar tool
    // For now, returning a mock implementation
    // In real implementation, you would use ffprobe or similar
    
    try {
      // Mock metadata extraction - replace with actual FFmpeg integration
      const mockMetadata = await this.extractMetadataWithFFprobe(filePath);
      
      return new VideoMetadata({
        duration: mockMetadata.duration,
        resolution: mockMetadata.resolution,
        frameRate: mockMetadata.frameRate,
        bitrate: mockMetadata.bitrate,
        codec: mockMetadata.codec,
        format: mockMetadata.format,
        fileSize: mockMetadata.fileSize,
        checksum: mockMetadata.checksum
      });
    } catch (error) {
      throw new Error(`Failed to extract video metadata: ${error.message}`);
    }
  }

  private async extractMetadataWithFFprobe(filePath: string): Promise<any> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const crypto = require('crypto');
    const fs = require('fs').promises;

    try {
      // Extract metadata using FFprobe
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
      const { stdout } = await execAsync(command);
      const metadata = JSON.parse(stdout);

      // Find video stream
      const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
      if (!videoStream) {
        throw new Error('No video stream found in file');
      }

      // Calculate file checksum
      const fileBuffer = await fs.readFile(filePath);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Extract relevant information
      const duration = parseFloat(metadata.format.duration);
      const resolution = {
        width: parseInt(videoStream.width),
        height: parseInt(videoStream.height)
      };
      const frameRate = this.parseFrameRate(videoStream.r_frame_rate);
      const bitrate = parseInt(metadata.format.bit_rate) || 0;
      const codec = videoStream.codec_name;
      const format = metadata.format.format_name.split(',')[0];
      const fileSize = parseInt(metadata.format.size);

      return {
        duration,
        resolution,
        frameRate,
        bitrate,
        codec,
        format,
        fileSize,
        checksum
      };

    } catch (error) {
      // Fallback to basic file information if FFprobe fails
      console.warn(`FFprobe failed for ${filePath}, using fallback: ${error.message}`);

      const stats = await fs.stat(filePath);
      const fileBuffer = await fs.readFile(filePath);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      return {
        duration: 0, // Unknown
        resolution: { width: 0, height: 0 }, // Unknown
        frameRate: 0, // Unknown
        bitrate: 0, // Unknown
        codec: 'unknown',
        format: 'unknown',
        fileSize: stats.size,
        checksum
      };
    }
  }

  private parseFrameRate(frameRateStr: string): number {
    if (!frameRateStr) return 0;

    const parts = frameRateStr.split('/');
    if (parts.length === 2) {
      const numerator = parseInt(parts[0]);
      const denominator = parseInt(parts[1]);
      return denominator > 0 ? numerator / denominator : 0;
    }

    return parseFloat(frameRateStr) || 0;
  }

  private calculateExpectedBitrate(resolution: { width: number; height: number }, frameRate: number): number {
    // Simple bitrate calculation based on resolution and frame rate
    const pixels = resolution.width * resolution.height;
    const baseRate = pixels * frameRate * 0.1; // 0.1 bits per pixel per frame
    
    // Adjust for common resolutions
    if (pixels >= 1920 * 1080) return Math.max(baseRate, 3000000); // 3 Mbps minimum for 1080p
    if (pixels >= 1280 * 720) return Math.max(baseRate, 1500000);  // 1.5 Mbps minimum for 720p
    return Math.max(baseRate, 500000); // 500 Kbps minimum for lower resolutions
  }
}
