import { IsOptional, IsObject, IsNotEmpty } from 'class-validator';
// IsString import removed as it's not used
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for starting a new live analysis stream
 */
export class StartStreamDto {
  @ApiPropertyOptional({
    description: 'Optional metadata for the stream',
    example: {
      cameraId: 'camera_001',
      matchId: 'match_123',
      quality: 'HD',
      resolution: '1920x1080'
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for WebRTC peer signaling
 */
export class SignalPeerDto {
  @ApiProperty({
    description: 'WebRTC signal data (SDP offer/answer or ICE candidate)',
    example: {
      type: 'offer',
      sdp: 'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n...'
    }
  })
  @IsNotEmpty()
  @IsObject()
  signalData: any;
}

/**
 * Response DTO for stream creation
 */
export class StreamCreatedResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the created stream',
    example: 'stream_12345678-1234-1234-1234-123456789012'
  })
  streamId: string;

  @ApiProperty({
    description: 'WebRTC peer connection ID',
    example: 'peer_12345678-1234-1234-1234-123456789012_1640995200000'
  })
  peerId: string;
}

/**
 * Response DTO for stream metrics
 */
export class StreamMetricsResponseDto {
  @ApiProperty({
    description: 'Stream identifier',
    example: 'stream_12345678-1234-1234-1234-123456789012'
  })
  streamId: string;

  @ApiProperty({
    description: 'Current stream status',
    enum: ['created', 'active', 'stopped', 'error'],
    example: 'active'
  })
  status: string;

  @ApiProperty({
    description: 'Total number of frames processed',
    example: 1500
  })
  frameCount: number;

  @ApiProperty({
    description: 'Stream duration in milliseconds',
    example: 50000
  })
  duration: number;

  @ApiProperty({
    description: 'Current frame rate (frames per second)',
    example: 30.0
  })
  frameRate: number;

  @ApiProperty({
    description: 'Frame buffer utilization percentage',
    example: 75.5
  })
  bufferUtilization: number;

  @ApiProperty({
    description: 'Pipeline processing metrics',
    example: {
      isRunning: true,
      processedFrameCount: 1450,
      averageProcessingRate: 29.8
    }
  })
  pipelineMetrics: any;

  @ApiProperty({
    description: 'Whether the stream is healthy',
    example: true
  })
  isHealthy: boolean;
}

/**
 * Response DTO for active streams
 */
export class ActiveStreamsResponseDto {
  @ApiProperty({
    description: 'List of active stream IDs',
    example: [
      'stream_12345678-1234-1234-1234-123456789012',
      'stream_87654321-4321-4321-4321-210987654321'
    ]
  })
  activeStreams: string[];

  @ApiProperty({
    description: 'Number of active streams',
    example: 2
  })
  count: number;
}

/**
 * Response DTO for service statistics
 */
export class ServiceStatsResponseDto {
  @ApiProperty({
    description: 'Number of active streams',
    example: 3
  })
  activeStreams: number;

  @ApiProperty({
    description: 'Number of active analysis pipelines',
    example: 3
  })
  activePipelines: number;

  @ApiProperty({
    description: 'Number of WebRTC connections',
    example: 5
  })
  webrtcConnections: number;

  @ApiProperty({
    description: 'ML inference statistics',
    example: {
      isInitialized: true,
      gpuEnabled: true,
      modelVersion: '1.0.0',
      loadedModels: ['player_detection', 'ball_detection'],
      memoryUsage: 1024000000
    }
  })
  mlInferenceStats: any;
}

/**
 * Generic API response wrapper
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Response data'
  })
  data?: T;

  @ApiPropertyOptional({
    description: 'Response message',
    example: 'Operation completed successfully'
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Error details (only present when success is false)',
    example: 'Invalid stream ID provided'
  })
  error?: string;
}
