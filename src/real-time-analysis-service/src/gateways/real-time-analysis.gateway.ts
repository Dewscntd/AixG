import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { RealTimeAnalysisService } from '../application/services/real-time-analysis.service';
import { StreamId } from '../domain/value-objects/stream-id';

/**
 * Real-time Analysis WebSocket Gateway
 * Handles real-time communication for live video analysis
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/real-time-analysis',
})
export class RealTimeAnalysisGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(RealTimeAnalysisGateway.name);
  private connectedClients: Map<string, Socket> = new Map();
  private clientSubscriptions: Map<string, Set<string>> = new Map();

  constructor(
    private readonly realTimeAnalysisService: RealTimeAnalysisService
  ) {}

  /**
   * Gateway initialization
   */
  afterInit(_server: Server) {
    this.logger.log('Real-time Analysis WebSocket Gateway initialized');
  }

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
    this.clientSubscriptions.set(client.id, new Set());

    // Send welcome message
    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
      message: 'Connected to Real-time Analysis service',
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
    this.clientSubscriptions.delete(client.id);
  }

  /**
   * Subscribe to stream updates
   */
  @SubscribeMessage('subscribe_stream')
  handleSubscribeStream(
    @MessageBody() data: { streamId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { streamId } = data;

      // Validate stream exists
      const streamStatus = this.realTimeAnalysisService.getStreamStatus(
        StreamId.fromString(streamId)
      );

      if (!streamStatus) {
        client.emit('error', {
          message: `Stream ${streamId} not found`,
          code: 'STREAM_NOT_FOUND',
        });
        return;
      }

      // Add subscription
      const subscriptions = this.clientSubscriptions.get(client.id);
      if (subscriptions) {
        subscriptions.add(streamId);
      }

      this.logger.log(`Client ${client.id} subscribed to stream ${streamId}`);

      client.emit('subscribed', {
        streamId,
        status: streamStatus,
        message: 'Successfully subscribed to stream updates',
      });
    } catch (error) {
      this.logger.error(
        `Failed to subscribe client ${client.id} to stream: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to subscribe to stream',
        error: error.message,
      });
    }
  }

  /**
   * Unsubscribe from stream updates
   */
  @SubscribeMessage('unsubscribe_stream')
  handleUnsubscribeStream(
    @MessageBody() data: { streamId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { streamId } = data;

      // Remove subscription
      const subscriptions = this.clientSubscriptions.get(client.id);
      if (subscriptions) {
        subscriptions.delete(streamId);
      }

      this.logger.log(
        `Client ${client.id} unsubscribed from stream ${streamId}`
      );

      client.emit('unsubscribed', {
        streamId,
        message: 'Successfully unsubscribed from stream updates',
      });
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe client ${client.id} from stream: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to unsubscribe from stream',
        error: error.message,
      });
    }
  }

  /**
   * Get stream metrics
   */
  @SubscribeMessage('get_stream_metrics')
  handleGetStreamMetrics(
    @MessageBody() data: { streamId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { streamId } = data;
      const metrics = this.realTimeAnalysisService.getStreamMetrics(
        StreamId.fromString(streamId)
      );

      if (!metrics) {
        client.emit('error', {
          message: `Stream ${streamId} not found`,
          code: 'STREAM_NOT_FOUND',
        });
        return;
      }

      client.emit('stream_metrics', {
        streamId,
        metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to get stream metrics for client ${client.id}: ${error.message}`
      );
      client.emit('error', {
        message: 'Failed to get stream metrics',
        error: error.message,
      });
    }
  }

  /**
   * WebRTC signaling
   */
  @SubscribeMessage('webrtc_signal')
  handleWebRTCSignal(
    @MessageBody() data: { peerId: string; signalData: any },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { peerId, signalData } = data;

      // Forward signal to real-time analysis service
      this.realTimeAnalysisService.signalPeer(peerId, signalData);

      client.emit('webrtc_signal_sent', {
        peerId,
        message: 'Signal sent successfully',
      });
    } catch (error) {
      this.logger.error(
        `WebRTC signaling failed for client ${client.id}: ${error.message}`
      );
      client.emit('error', {
        message: 'WebRTC signaling failed',
        error: error.message,
      });
    }
  }

  // Event listeners for domain events

  /**
   * Handle stream started event
   */
  @OnEvent('stream.started')
  handleStreamStarted(payload: any) {
    this.logger.log(`Broadcasting stream started: ${payload.streamId}`);
    this.server.emit('stream_started', payload);
  }

  /**
   * Handle stream stopped event
   */
  @OnEvent('stream.stopped')
  handleStreamStopped(payload: any) {
    this.logger.log(`Broadcasting stream stopped: ${payload.streamId}`);
    this.server.emit('stream_stopped', payload);
  }

  /**
   * Handle frame extracted event
   */
  @OnEvent('frame.extracted')
  handleFrameExtracted(payload: any) {
    const { streamId } = payload;

    // Send to subscribed clients only
    this.broadcastToSubscribers(streamId, 'frame_extracted', {
      streamId,
      frameNumber: payload.frame.frameNumber,
      timestamp: payload.frame.timestamp,
      metadata: payload.frame.metadata,
    });
  }

  /**
   * Handle domain events
   */
  @OnEvent('domain.*')
  handleDomainEvent(payload: any) {
    const eventType = payload.eventType;
    const streamId = payload.aggregateId;

    // Broadcast domain events to subscribed clients
    this.broadcastToSubscribers(streamId, `domain_${eventType}`, payload);
  }

  /**
   * Handle WebRTC connection events
   */
  @OnEvent('webrtc.connected')
  handleWebRTCConnected(payload: any) {
    this.logger.log(`WebRTC connected: ${payload.peerId}`);
    this.server.emit('webrtc_connected', payload);
  }

  /**
   * Handle WebRTC disconnection events
   */
  @OnEvent('webrtc.disconnected')
  handleWebRTCDisconnected(payload: any) {
    this.logger.log(`WebRTC disconnected: ${payload.peerId}`);
    this.server.emit('webrtc_disconnected', payload);
  }

  /**
   * Handle frame processing errors
   */
  @OnEvent('frame.processing.error')
  handleFrameProcessingError(payload: any) {
    const { streamId } = payload;

    this.broadcastToSubscribers(streamId, 'frame_processing_error', payload);
  }

  /**
   * Broadcast message to clients subscribed to a specific stream
   */
  private broadcastToSubscribers(streamId: string, event: string, data: any) {
    for (const [clientId, subscriptions] of this.clientSubscriptions) {
      if (subscriptions.has(streamId)) {
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.emit(event, data);
        }
      }
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): any {
    const stats = {
      totalClients: this.connectedClients.size,
      totalSubscriptions: 0,
      streamSubscriptions: new Map<string, number>(),
    };

    for (const subscriptions of this.clientSubscriptions.values()) {
      stats.totalSubscriptions += subscriptions.size;

      for (const streamId of subscriptions) {
        const count = stats.streamSubscriptions.get(streamId) || 0;
        stats.streamSubscriptions.set(streamId, count + 1);
      }
    }

    return {
      ...stats,
      streamSubscriptions: Object.fromEntries(stats.streamSubscriptions),
    };
  }
}
