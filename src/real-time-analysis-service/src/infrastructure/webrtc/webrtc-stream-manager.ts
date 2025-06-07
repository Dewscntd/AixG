import { EventEmitter } from 'events';
import * as SimplePeer from 'simple-peer';
import { StreamId } from '../../domain/value-objects/stream-id';
import { VideoFrame, VideoFrameFormat } from '../../domain/value-objects/video-frame';

/**
 * WebRTC Stream Manager
 * Manages WebRTC connections for low-latency video streaming
 */
export class WebRTCStreamManager extends EventEmitter {
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private streams: Map<string, MediaStream> = new Map();
  private frameCallbacks: Map<string, (frame: VideoFrame) => void> = new Map();
  private isInitialized: boolean = false;

  constructor(
    private readonly config: WebRTCConfig = DEFAULT_WEBRTC_CONFIG
  ) {
    super();
  }

  /**
   * Initialize WebRTC manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize WebRTC infrastructure
      await this.setupWebRTCInfrastructure();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize WebRTC: ${error.message}`));
      throw error;
    }
  }

  /**
   * Create a new WebRTC peer connection for streaming
   */
  async createPeerConnection(
    streamId: StreamId,
    isInitiator: boolean = false,
    constraints: MediaStreamConstraints = DEFAULT_MEDIA_CONSTRAINTS
  ): Promise<string> {
    const peerId = `peer_${streamId.value}_${Date.now()}`;

    try {
      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: true,
        config: {
          iceServers: this.config.iceServers
        }
      });

      // Set up peer event handlers
      this.setupPeerEventHandlers(peer, peerId, streamId);

      // Store peer connection
      this.peers.set(peerId, peer);

      // If not initiator, wait for stream
      if (!isInitiator) {
        this.setupStreamReceiver(peer, peerId, streamId);
      }

      this.emit('peerCreated', { peerId, streamId: streamId.value, isInitiator });
      return peerId;

    } catch (error) {
      this.emit('error', new Error(`Failed to create peer connection: ${error.message}`));
      throw error;
    }
  }

  /**
   * Add local media stream to peer connection
   */
  async addLocalStream(
    peerId: string,
    stream: MediaStream
  ): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    try {
      peer.addStream(stream);
      this.streams.set(peerId, stream);
      this.emit('streamAdded', { peerId, streamId: stream.id });
    } catch (error) {
      this.emit('error', new Error(`Failed to add stream: ${error.message}`));
      throw error;
    }
  }

  /**
   * Signal peer connection (exchange SDP/ICE candidates)
   */
  async signal(peerId: string, signalData: any): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    try {
      peer.signal(signalData);
    } catch (error) {
      this.emit('error', new Error(`Failed to signal peer: ${error.message}`));
      throw error;
    }
  }

  /**
   * Register frame callback for real-time processing
   */
  registerFrameCallback(
    streamId: StreamId,
    callback: (frame: VideoFrame) => void
  ): void {
    this.frameCallbacks.set(streamId.value, callback);
  }

  /**
   * Unregister frame callback
   */
  unregisterFrameCallback(streamId: StreamId): void {
    this.frameCallbacks.delete(streamId.value);
  }

  /**
   * Close peer connection
   */
  async closePeerConnection(peerId: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.destroy();
      this.peers.delete(peerId);
    }

    const stream = this.streams.get(peerId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.streams.delete(peerId);
    }

    this.emit('peerClosed', { peerId });
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(peerId: string): Promise<WebRTCStats | null> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      return null;
    }

    // Get WebRTC statistics
    // Note: SimplePeer doesn't expose getStats directly, 
    // in a real implementation you'd access the underlying RTCPeerConnection
    return {
      peerId,
      connectionState: 'connected', // Simplified
      bytesReceived: 0,
      bytesSent: 0,
      packetsLost: 0,
      roundTripTime: 0,
      jitter: 0
    };
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.peers.keys());
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    const peerIds = Array.from(this.peers.keys());
    
    for (const peerId of peerIds) {
      await this.closePeerConnection(peerId);
    }

    this.frameCallbacks.clear();
    this.isInitialized = false;
    this.emit('cleanup');
  }

  /**
   * Setup WebRTC infrastructure
   */
  private async setupWebRTCInfrastructure(): Promise<void> {
    // Initialize any required WebRTC infrastructure
    // This could include STUN/TURN server validation, etc.
  }

  /**
   * Setup peer event handlers
   */
  private setupPeerEventHandlers(
    peer: SimplePeer.Instance,
    peerId: string,
    streamId: StreamId
  ): void {
    peer.on('signal', (data) => {
      this.emit('signal', { peerId, streamId: streamId.value, data });
    });

    peer.on('connect', () => {
      this.emit('connected', { peerId, streamId: streamId.value });
    });

    peer.on('data', (data) => {
      this.emit('data', { peerId, streamId: streamId.value, data });
    });

    peer.on('stream', (stream) => {
      this.handleIncomingStream(stream, peerId, streamId);
    });

    peer.on('error', (error) => {
      this.emit('error', new Error(`Peer ${peerId} error: ${error.message}`));
    });

    peer.on('close', () => {
      this.emit('disconnected', { peerId, streamId: streamId.value });
      this.peers.delete(peerId);
    });
  }

  /**
   * Setup stream receiver for incoming video
   */
  private setupStreamReceiver(
    peer: SimplePeer.Instance,
    peerId: string,
    streamId: StreamId
  ): void {
    peer.on('stream', (stream) => {
      this.handleIncomingStream(stream, peerId, streamId);
    });
  }

  /**
   * Handle incoming video stream
   */
  private handleIncomingStream(
    stream: MediaStream,
    peerId: string,
    streamId: StreamId
  ): void {
    this.streams.set(peerId, stream);

    // Extract video track
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      return;
    }

    // Create video element for frame extraction
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    // Setup frame extraction
    this.setupFrameExtraction(video, streamId);

    this.emit('streamReceived', { peerId, streamId: streamId.value, stream });
  }

  /**
   * Setup frame extraction from video element
   */
  private setupFrameExtraction(
    video: HTMLVideoElement,
    streamId: StreamId
  ): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return;
    }

    let frameNumber = 0;
    const frameCallback = this.frameCallbacks.get(streamId.value);

    const extractFrame = () => {
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0);
        
        // Convert to VideoFrame
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const frameData = Buffer.from(imageData.data);
        
        const frame = new VideoFrame(
          Date.now(),
          frameNumber++,
          canvas.width,
          canvas.height,
          frameData,
          VideoFrameFormat.RGBA32,
          { source: 'webrtc', streamId: streamId.value }
        );

        // Call registered callback
        if (frameCallback) {
          frameCallback(frame);
        }

        this.emit('frameExtracted', { streamId: streamId.value, frame });
      }

      // Continue extraction at ~30fps
      setTimeout(extractFrame, 33);
    };

    // Start frame extraction when video is ready
    video.addEventListener('loadeddata', () => {
      extractFrame();
    });
  }
}

/**
 * WebRTC configuration interface
 */
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  maxBitrate?: number;
  frameRate?: number;
}

/**
 * WebRTC statistics interface
 */
export interface WebRTCStats {
  peerId: string;
  connectionState: string;
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  roundTripTime: number;
  jitter: number;
}

/**
 * Default WebRTC configuration
 */
const DEFAULT_WEBRTC_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  maxBitrate: 2000000, // 2 Mbps
  frameRate: 30
};

/**
 * Default media constraints
 */
const DEFAULT_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: false // Video analysis doesn't need audio
};
