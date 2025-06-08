import { Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const readFile = promisify(fs.readFile);
// writeFile removed as unused

interface CDNConfig {
  provider: 'cloudfront' | 'cloudflare' | 'fastly';
  distributionId: string;
  originDomain: string;
  cacheBehaviors: CacheBehavior[];
  compressionEnabled: boolean;
  http2Enabled: boolean;
}

interface CacheBehavior {
  pathPattern: string;
  ttl: number;
  compress: boolean;
  allowedMethods: string[];
  cachedMethods: string[];
}

interface VideoOptimization {
  inputPath: string;
  outputFormats: VideoFormat[];
  adaptiveBitrates: BitrateConfig[];
  thumbnailConfig: ThumbnailConfig;
}

interface VideoFormat {
  format: 'mp4' | 'webm' | 'hls' | 'dash';
  codec: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

interface BitrateConfig {
  resolution: string;
  bitrate: string;
  fps: number;
}

interface ThumbnailConfig {
  count: number;
  width: number;
  height: number;
  format: 'jpg' | 'webp';
}

interface CDNMetrics {
  cacheHitRatio: number;
  bandwidth: number;
  requests: number;
  latency: number;
  errorRate: number;
  topUrls: Array<{ url: string; requests: number }>;
}

/**
 * CDN Optimization Service
 * Handles video delivery optimization, adaptive streaming, and CDN management
 */
@Injectable()
export class CDNOptimizer {
  private readonly logger = new Logger(CDNOptimizer.name);
  private readonly cloudfront: AWS.CloudFront;
  private readonly s3: AWS.S3;

  constructor(private readonly config: CDNConfig) {
    // Initialize AWS services
    this.cloudfront = new AWS.CloudFront({
      region: 'us-east-1' // CloudFront is global but API is in us-east-1
    });
    
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Optimize video for CDN delivery with adaptive streaming
   */
  async optimizeVideoForCDN(optimization: VideoOptimization): Promise<{
    manifestUrl: string;
    formats: Array<{ format: string; url: string; size: number }>;
    thumbnails: string[];
    totalSize: number;
  }> {
    this.logger.log(`Starting video optimization for: ${optimization.inputPath}`);

    try {
      const outputDir = `${path.dirname(optimization.inputPath)  }/optimized`;
      await fs.promises.mkdir(outputDir, { recursive: true });

      const results = {
        manifestUrl: '',
        formats: [] as Array<{ format: string; url: string; size: number }>,
        thumbnails: [] as string[],
        totalSize: 0
      };

      // Generate adaptive bitrate streams
      const hlsManifest = await this.generateAdaptiveStreams(
        optimization.inputPath,
        outputDir,
        optimization.adaptiveBitrates
      );
      results.manifestUrl = hlsManifest;

      // Generate different formats
      for (const format of optimization.outputFormats) {
        const outputPath = await this.transcodeVideo(
          optimization.inputPath,
          outputDir,
          format
        );
        
        const stats = await fs.promises.stat(outputPath);
        results.formats.push({
          format: format.format,
          url: outputPath,
          size: stats.size
        });
        results.totalSize += stats.size;
      }

      // Generate thumbnails
      results.thumbnails = await this.generateThumbnails(
        optimization.inputPath,
        outputDir,
        optimization.thumbnailConfig
      );

      // Upload to S3 and invalidate CDN cache
      await this.uploadToS3AndInvalidate(outputDir);

      this.logger.log(`Video optimization completed. Total size: ${results.totalSize} bytes`);
      return results;

    } catch (error) {
      this.logger.error(`Video optimization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate adaptive bitrate streaming (HLS)
   */
  private async generateAdaptiveStreams(
    inputPath: string,
    outputDir: string,
    bitrateConfigs: BitrateConfig[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const manifestPath = path.join(outputDir, 'playlist.m3u8');
      
      let command = ffmpeg(inputPath)
        .outputOptions([
          '-f hls',
          '-hls_time 6',
          '-hls_playlist_type vod',
          '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
          '-master_pl_name', 'master.m3u8'
        ]);

      // Add multiple bitrate streams
      bitrateConfigs.forEach((config, index) => {
        command = command
          .output(path.join(outputDir, `stream_${index}.m3u8`))
          .outputOptions([
            `-b:v ${config.bitrate}`,
            `-s ${config.resolution}`,
            `-r ${config.fps}`,
            '-c:v libx264',
            '-preset fast',
            '-crf 23'
          ]);
      });

      command
        .on('end', () => {
          this.logger.log('HLS generation completed');
          resolve(manifestPath);
        })
        .on('error', (error) => {
          this.logger.error(`HLS generation failed: ${error.message}`);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Transcode video to specific format
   */
  private async transcodeVideo(
    inputPath: string,
    outputDir: string,
    format: VideoFormat
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(outputDir, `video_${format.quality}.${format.format}`);
      
      let command = ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec(format.codec);

      // Set quality-specific options
      switch (format.quality) {
        case 'low':
          command = command.videoBitrate('500k').size('640x360');
          break;
        case 'medium':
          command = command.videoBitrate('1000k').size('1280x720');
          break;
        case 'high':
          command = command.videoBitrate('2000k').size('1920x1080');
          break;
        case 'ultra':
          command = command.videoBitrate('4000k').size('3840x2160');
          break;
      }

      // Format-specific options
      if (format.format === 'webm') {
        command = command.videoCodec('libvpx-vp9').audioCodec('libopus');
      } else if (format.format === 'mp4') {
        command = command.videoCodec('libx264').audioCodec('aac');
      }

      command
        .on('end', () => {
          this.logger.log(`Transcoding completed: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          this.logger.error(`Transcoding failed: ${error.message}`);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Generate video thumbnails
   */
  private async generateThumbnails(
    inputPath: string,
    outputDir: string,
    config: ThumbnailConfig
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const thumbnails: string[] = [];
      
      ffmpeg(inputPath)
        .on('end', () => {
          this.logger.log(`Generated ${thumbnails.length} thumbnails`);
          resolve(thumbnails);
        })
        .on('error', reject)
        .screenshots({
          count: config.count,
          folder: outputDir,
          filename: `thumb_%03d.${config.format}`,
          size: `${config.width}x${config.height}`
        });
    });
  }

  /**
   * Upload optimized content to S3 and invalidate CDN
   */
  private async uploadToS3AndInvalidate(outputDir: string): Promise<void> {
    const files = await fs.promises.readdir(outputDir);
    const uploadPromises = files.map(async (file) => {
      const filePath = path.join(outputDir, file);
      const fileContent = await readFile(filePath);
      
      const uploadParams = {
        Bucket: process.env.S3_BUCKET || 'footanalytics-videos',
        Key: `optimized/${file}`,
        Body: fileContent,
        ContentType: this.getContentType(file),
        CacheControl: this.getCacheControl(file)
      };
      
      return this.s3.upload(uploadParams).promise();
    });
    
    await Promise.all(uploadPromises);
    
    // Invalidate CDN cache
    await this.invalidateCDNCache(['/optimized/*']);
  }

  /**
   * Invalidate CDN cache
   */
  async invalidateCDNCache(paths: string[]): Promise<void> {
    if (this.config.provider === 'cloudfront') {
      const params = {
        DistributionId: this.config.distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: paths.length,
            Items: paths
          },
          CallerReference: Date.now().toString()
        }
      };
      
      try {
        const result = await this.cloudfront.createInvalidation(params).promise();
        this.logger.log(`CloudFront invalidation created: ${result.Invalidation?.Id}`);
      } catch (error) {
        this.logger.error(`CDN invalidation failed: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Get CDN performance metrics
   */
  async getCDNMetrics(startDate: Date, endDate: Date): Promise<CDNMetrics> {
    if (this.config.provider === 'cloudfront') {
      try {
        // Get CloudWatch metrics for CloudFront
        const cloudwatch = new AWS.CloudWatch({ region: 'us-east-1' });
        
        const metricsPromises = [
          this.getCloudWatchMetric(cloudwatch, 'AWS/CloudFront', 'Requests', startDate, endDate),
          this.getCloudWatchMetric(cloudwatch, 'AWS/CloudFront', 'BytesDownloaded', startDate, endDate),
          this.getCloudWatchMetric(cloudwatch, 'AWS/CloudFront', 'CacheHitRate', startDate, endDate),
          this.getCloudWatchMetric(cloudwatch, 'AWS/CloudFront', '4xxErrorRate', startDate, endDate)
        ];
        
        const [requests, bandwidth, cacheHitRate, errorRate] = await Promise.all(metricsPromises);
        
        return {
          cacheHitRatio: cacheHitRate || 0,
          bandwidth: bandwidth || 0,
          requests: requests || 0,
          latency: 0, // Would need additional monitoring
          errorRate: errorRate || 0,
          topUrls: [] // Would need additional analytics
        };
        
      } catch (error) {
        this.logger.error(`Failed to get CDN metrics: ${error.message}`);
        throw error;
      }
    }
    
    // Return empty metrics for other providers
    return {
      cacheHitRatio: 0,
      bandwidth: 0,
      requests: 0,
      latency: 0,
      errorRate: 0,
      topUrls: []
    };
  }

  /**
   * Get CloudWatch metric value
   */
  private async getCloudWatchMetric(
    cloudwatch: AWS.CloudWatch,
    namespace: string,
    metricName: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const params = {
      Namespace: namespace,
      MetricName: metricName,
      Dimensions: [
        {
          Name: 'DistributionId',
          Value: this.config.distributionId
        }
      ],
      StartTime: startDate,
      EndTime: endDate,
      Period: 3600, // 1 hour
      Statistics: ['Average']
    };
    
    const result = await cloudwatch.getMetricStatistics(params).promise();
    const datapoints = result.Datapoints || [];
    
    if (datapoints.length === 0) {
      return 0;
    }
    
    return datapoints.reduce((sum, point) => sum + (point.Average || 0), 0) / datapoints.length;
  }

  /**
   * Optimize CDN configuration
   */
  async optimizeCDNConfiguration(): Promise<{
    recommendations: string[];
    estimatedImprovement: string;
  }> {
    const recommendations: string[] = [];
    
    // Analyze current metrics
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    const metrics = await this.getCDNMetrics(startDate, endDate);
    
    // Check cache hit ratio
    if (metrics.cacheHitRatio < 0.85) {
      recommendations.push('Increase cache TTL for static assets');
      recommendations.push('Enable compression for text-based content');
    }
    
    // Check error rate
    if (metrics.errorRate > 0.01) {
      recommendations.push('Review origin server health');
      recommendations.push('Implement better error handling');
    }
    
    // General optimizations
    if (!this.config.compressionEnabled) {
      recommendations.push('Enable Gzip/Brotli compression');
    }
    
    if (!this.config.http2Enabled) {
      recommendations.push('Enable HTTP/2 support');
    }
    
    recommendations.push('Implement edge-side includes (ESI) for dynamic content');
    recommendations.push('Use WebP format for images where supported');
    
    return {
      recommendations,
      estimatedImprovement: '20-40% faster load times, 30-50% bandwidth reduction'
    };
  }

  /**
   * Get content type for file
   */
  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.m3u8': 'application/vnd.apple.mpegurl',
      '.ts': 'video/mp2t',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get cache control header for file
   */
  private getCacheControl(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    if (['.mp4', '.webm', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return 'public, max-age=31536000'; // 1 year for media files
    } else if (['.m3u8', '.ts'].includes(ext)) {
      return 'public, max-age=300'; // 5 minutes for streaming segments
    }
    
    return 'public, max-age=3600'; // 1 hour default
  }

  /**
   * Get CDN optimization report
   */
  async getOptimizationReport(): Promise<{
    currentMetrics: CDNMetrics;
    optimizationSuggestions: string[];
    estimatedSavings: {
      bandwidth: string;
      latency: string;
      costs: string;
    };
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    
    const currentMetrics = await this.getCDNMetrics(startDate, endDate);
    const optimization = await this.optimizeCDNConfiguration();
    
    return {
      currentMetrics,
      optimizationSuggestions: optimization.recommendations,
      estimatedSavings: {
        bandwidth: '30-50% reduction',
        latency: '20-40% improvement',
        costs: '25-35% reduction'
      }
    };
  }
}
