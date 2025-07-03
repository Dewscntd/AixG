/**
 * Real-time Analysis Service Barrel Exports
 * Provides centralized access to real-time analysis service components
 */

// Domain Stages - Core Pipeline Components
export * from './src/domain/stages';

// Domain Entities
export { LiveStream } from './src/domain/entities/live-stream';
export { LiveAnalysisPipeline } from './src/domain/entities/live-analysis-pipeline';

// Domain Value Objects
export { VideoFrame } from './src/domain/value-objects/video-frame';
export { StreamId } from './src/domain/value-objects/stream-id';
export { RingBuffer } from './src/domain/value-objects/ring-buffer';

// Domain Events
export { DomainEvent } from './src/domain/events/domain-event';
export { FrameAnalyzedEvent } from './src/domain/events/frame-analyzed.event';
export { FrameReceivedEvent } from './src/domain/events/frame-received.event';
export { StreamStartedEvent } from './src/domain/events/stream-started.event';
export { StreamStoppedEvent } from './src/domain/events/stream-stopped.event';

// Infrastructure - Stream Management
export { WebRTCStreamManager } from './src/infrastructure/webrtc/webrtc-stream-manager';
export { EventStreamService } from './src/infrastructure/events/event-stream.service';

// Infrastructure - ML
export { EdgeMLInferenceService } from './src/infrastructure/ml/edge-ml-inference';

// Application Layer - Services
export { RealTimeAnalysisService } from './src/application/services/real-time-analysis.service';

// API Layer
export { RealTimeAnalysisController } from './src/controllers/real-time-analysis.controller';
export { RealTimeAnalysisGateway } from './src/gateways/real-time-analysis.gateway';

// Configuration
export { default as configuration } from './src/config/configuration';
