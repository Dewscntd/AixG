import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';

interface LiveAnalysisViewerProps {
  streamId?: string;
  onStreamStarted?: (streamId: string) => void;
  onStreamStopped?: () => void;
  onError?: (error: string) => void;
}

interface StreamMetrics {
  streamId: string;
  status: string;
  frameCount: number;
  frameRate: number;
  bufferUtilization: number;
  isHealthy: boolean;
}

interface AnalysisResult {
  frameNumber: number;
  timestamp: number;
  players: any[];
  ball: any;
  events: any[];
  metrics: any;
}

/**
 * Live Analysis Viewer Component
 * Displays real-time football analysis with WebRTC video streaming
 */
export const LiveAnalysisViewer: React.FC<LiveAnalysisViewerProps> = ({
  streamId: initialStreamId,
  onStreamStarted,
  onStreamStopped,
  onError
}) => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(initialStreamId || null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const socket = io('ws://localhost:3003/real-time-analysis');
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to real-time analysis service');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from real-time analysis service');
    });

    socket.on('stream_started', (data) => {
      console.log('Stream started:', data);
      setStreamId(data.streamId);
      setPeerId(data.peerId);
      onStreamStarted?.(data.streamId);
    });

    socket.on('stream_stopped', (data) => {
      console.log('Stream stopped:', data);
      setStreamId(null);
      setPeerId(null);
      setIsStreaming(false);
      onStreamStopped?.();
    });

    socket.on('stream_metrics', (data) => {
      setMetrics(data.metrics);
    });

    socket.on('domain_FrameAnalyzed', (event) => {
      setAnalysisResult(event.payload.analysisResult);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      onError?.(error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [onStreamStarted, onStreamStopped, onError]);

  // Subscribe to stream updates when streamId changes
  useEffect(() => {
    if (streamId && socketRef.current) {
      socketRef.current.emit('subscribe_stream', { streamId });
    }
  }, [streamId]);

  // Start live analysis stream
  const startStream = async () => {
    try {
      const response = await fetch('/api/v1/real-time-analysis/streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            cameraId: 'camera_001',
            quality: 'HD',
            resolution: '1920x1080'
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setStreamId(result.data.streamId);
        setPeerId(result.data.peerId);
        
        // Start WebRTC connection
        await initializeWebRTC(result.data.peerId);
      } else {
        onError?.('Failed to start stream');
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      onError?.('Failed to start stream');
    }
  };

  // Stop live analysis stream
  const stopStream = async () => {
    if (!streamId) return;

    try {
      await fetch(`/api/v1/real-time-analysis/streams/${streamId}`, {
        method: 'DELETE',
      });

      // Cleanup WebRTC
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      setStreamId(null);
      setPeerId(null);
      setIsStreaming(false);
    } catch (error) {
      console.error('Error stopping stream:', error);
      onError?.('Failed to stop stream');
    }
  };

  // Initialize WebRTC connection
  const initializeWebRTC = async (peerId: string) => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      // Display local video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create WebRTC peer
      const peer = new SimplePeer({
        initiator: true,
        trickle: true,
        stream: stream
      });

      peerRef.current = peer;

      // Handle signaling
      peer.on('signal', (data) => {
        if (socketRef.current) {
          socketRef.current.emit('webrtc_signal', {
            peerId,
            signalData: data
          });
        }
      });

      peer.on('connect', () => {
        console.log('WebRTC peer connected');
        setIsStreaming(true);
      });

      peer.on('error', (error) => {
        console.error('WebRTC error:', error);
        onError?.('WebRTC connection failed');
      });

      // Listen for signaling responses
      if (socketRef.current) {
        socketRef.current.on('webrtc_signal_response', (data) => {
          if (data.peerId === peerId) {
            peer.signal(data.signalData);
          }
        });
      }

    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      onError?.('Failed to access camera');
    }
  };

  // Render analysis overlay on canvas
  useEffect(() => {
    if (!analysisResult || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player bounding boxes
    if (analysisResult.players) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      
      analysisResult.players.forEach((player) => {
        if (player.boundingBox) {
          ctx.strokeRect(
            player.boundingBox.x,
            player.boundingBox.y,
            player.boundingBox.width,
            player.boundingBox.height
          );
          
          // Draw player ID
          ctx.fillStyle = '#00ff00';
          ctx.font = '16px Arial';
          ctx.fillText(
            player.id,
            player.boundingBox.x,
            player.boundingBox.y - 5
          );
        }
      });
    }

    // Draw ball
    if (analysisResult.ball && analysisResult.ball.position) {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(
        analysisResult.ball.position.x,
        analysisResult.ball.position.y,
        10,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }

  }, [analysisResult]);

  return (
    <div className="live-analysis-viewer">
      <div className="controls">
        <button
          onClick={isStreaming ? stopStream : startStream}
          disabled={!isConnected}
          className={`btn ${isStreaming ? 'btn-danger' : 'btn-primary'}`}
        >
          {isStreaming ? 'Stop Stream' : 'Start Stream'}
        </button>
        
        <div className="status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {streamId && (
            <span className="stream-id">Stream: {streamId.slice(0, 8)}...</span>
          )}
        </div>
      </div>

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="video-stream"
        />
        <canvas
          ref={canvasRef}
          className="analysis-overlay"
        />
      </div>

      {metrics && (
        <div className="metrics-panel">
          <h3>Stream Metrics</h3>
          <div className="metrics-grid">
            <div className="metric">
              <label>Status:</label>
              <span className={`status ${metrics.status}`}>{metrics.status}</span>
            </div>
            <div className="metric">
              <label>Frame Rate:</label>
              <span>{metrics.frameRate.toFixed(1)} FPS</span>
            </div>
            <div className="metric">
              <label>Frames Processed:</label>
              <span>{metrics.frameCount}</span>
            </div>
            <div className="metric">
              <label>Buffer Usage:</label>
              <span>{metrics.bufferUtilization.toFixed(1)}%</span>
            </div>
            <div className="metric">
              <label>Health:</label>
              <span className={metrics.isHealthy ? 'healthy' : 'unhealthy'}>
                {metrics.isHealthy ? 'Healthy' : 'Unhealthy'}
              </span>
            </div>
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="analysis-panel">
          <h3>Live Analysis</h3>
          <div className="analysis-data">
            <div className="analysis-item">
              <label>Players Detected:</label>
              <span>{analysisResult.players?.length || 0}</span>
            </div>
            <div className="analysis-item">
              <label>Ball Visible:</label>
              <span>{analysisResult.ball ? 'Yes' : 'No'}</span>
            </div>
            <div className="analysis-item">
              <label>Events:</label>
              <span>{analysisResult.events?.length || 0}</span>
            </div>
            <div className="analysis-item">
              <label>Frame:</label>
              <span>{analysisResult.frameNumber}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
