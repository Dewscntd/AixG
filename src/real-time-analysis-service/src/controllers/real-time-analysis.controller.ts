import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RealTimeAnalysisService } from '../application/services/real-time-analysis.service';
import { StreamId } from '../domain/value-objects/stream-id';
import { WebRTCSignalData } from '../infrastructure/webrtc/webrtc-stream-manager';
import { StartStreamDto, SignalPeerDto } from './dto/real-time-analysis.dto';

/**
 * Real-time Analysis Controller
 * Handles HTTP endpoints for live video analysis
 */
@ApiTags('Real-time Analysis')
@Controller('real-time-analysis')
export class RealTimeAnalysisController {
  private readonly logger = new Logger(RealTimeAnalysisController.name);

  constructor(
    private readonly realTimeAnalysisService: RealTimeAnalysisService
  ) {}

  /**
   * Start a new live analysis stream
   */
  @Post('streams')
  @ApiOperation({ summary: 'Start a new live analysis stream' })
  @ApiResponse({ status: 201, description: 'Stream started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async startStream(@Body() startStreamDto: StartStreamDto) {
    try {
      this.logger.log('Starting new live analysis stream');

      const result = await this.realTimeAnalysisService.startStream(
        startStreamDto.metadata
      );

      this.logger.log(`Stream started: ${result.streamId}`);

      return {
        success: true,
        data: result,
        message: 'Live analysis stream started successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to start stream: ${errorMessage}`, errorStack);
      throw new HttpException(
        `Failed to start stream: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Stop a live analysis stream
   */
  @Delete('streams/:streamId')
  @ApiOperation({ summary: 'Stop a live analysis stream' })
  @ApiParam({ name: 'streamId', description: 'Stream ID to stop' })
  @ApiResponse({ status: 200, description: 'Stream stopped successfully' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async stopStream(@Param('streamId') streamId: string) {
    try {
      this.logger.log(`Stopping stream: ${streamId}`);

      const streamIdObj = StreamId.fromString(streamId);
      await this.realTimeAnalysisService.stopStream(streamIdObj);

      this.logger.log(`Stream stopped: ${streamId}`);

      return {
        success: true,
        message: 'Live analysis stream stopped successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to stop stream ${streamId}: ${errorMessage}`,
        errorStack
      );

      if (errorMessage.includes('not found')) {
        throw new HttpException(
          `Stream ${streamId} not found`,
          HttpStatus.NOT_FOUND
        );
      }

      throw new HttpException(
        `Failed to stop stream: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get stream status and metrics
   */
  @Get('streams/:streamId')
  @ApiOperation({ summary: 'Get stream status and metrics' })
  @ApiParam({ name: 'streamId', description: 'Stream ID to query' })
  @ApiResponse({
    status: 200,
    description: 'Stream metrics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  async getStreamMetrics(@Param('streamId') streamId: string) {
    try {
      const streamIdObj = StreamId.fromString(streamId);
      const metrics =
        this.realTimeAnalysisService.getStreamMetrics(streamIdObj);

      if (!metrics) {
        throw new HttpException(
          `Stream ${streamId} not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get stream metrics ${streamId}: ${errorMessage}`,
        errorStack
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get stream metrics: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get all active streams
   */
  @Get('streams')
  @ApiOperation({ summary: 'Get all active streams' })
  @ApiResponse({
    status: 200,
    description: 'Active streams retrieved successfully',
  })
  async getActiveStreams() {
    try {
      const activeStreams = this.realTimeAnalysisService.getActiveStreams();

      return {
        success: true,
        data: {
          activeStreams,
          count: activeStreams.length,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get active streams: ${errorMessage}`,
        errorStack
      );
      throw new HttpException(
        `Failed to get active streams: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Signal WebRTC peer connection
   */
  @Post('peers/:peerId/signal')
  @ApiOperation({ summary: 'Signal WebRTC peer connection' })
  @ApiParam({ name: 'peerId', description: 'Peer ID to signal' })
  @ApiResponse({ status: 200, description: 'Peer signaled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signal data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async signalPeer(
    @Param('peerId') peerId: string,
    @Body() signalDto: SignalPeerDto
  ) {
    try {
      this.logger.log(`Signaling peer: ${peerId}`);

      await this.realTimeAnalysisService.signalPeer(
        peerId,
        signalDto.signalData as WebRTCSignalData
      );

      return {
        success: true,
        message: 'Peer signaled successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to signal peer ${peerId}: ${errorMessage}`,
        errorStack
      );
      throw new HttpException(
        `Failed to signal peer: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get service statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get service statistics' })
  @ApiResponse({
    status: 200,
    description: 'Service statistics retrieved successfully',
  })
  async getServiceStats() {
    try {
      const stats = this.realTimeAnalysisService.getServiceStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get service stats: ${errorMessage}`,
        errorStack
      );
      throw new HttpException(
        `Failed to get service statistics: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'real-time-analysis-service',
    };
  }
}
