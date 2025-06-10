// Core Domain Types

type UUID = string;
type HebrewString = string;
type Timestamp = number;
type TeamId = string;
type PlayerId = string;

type TeamFormation = '4-3-3' | '4-4-2' | '3-5-2';

// Missing Type Definitions
export interface FrameMetadata {
  frameNumber: number;
  timestamp: Timestamp;
  resolution: [number, number];
  quality: 'low' | 'medium' | 'high';
  detectedObjects: number;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'foul' | 'card' | 'substitution' | 'offside';
  timestamp: Timestamp;
  playerId?: PlayerId;
  teamId: TeamId;
  position: SpatialPosition;
  metadata: Record<string, unknown>;
}

export interface Player {
  id: PlayerId;
  name: HebrewString;
  jerseyNumber: number;
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  teamId: TeamId;
}

export interface VideoMetadata {
  videoId: VideoId;
  filename: string;
  duration: number;
  resolution: [number, number];
  frameRate: number;
  codec: string;
  size: number;
  uploadedAt: Date;
}

export interface MatchCriteria {
  teamIds?: TeamId[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  venue?: string;
  competition?: string;
}

// EventType removed as it's not used in the codebase
// If needed in the future, it can be re-added

// =======================
// Shared Kernel
// =======================
export class VideoId {
  constructor(public readonly value: UUID) {}
}
export class MatchId {
  constructor(public readonly value: UUID) {}
}
export class AnalyticsId {
  constructor(public readonly value: UUID) {}
}

// =======================
// Video Processing Context
// =======================
export class VideoSegment {
  constructor(
    public readonly id: UUID,
    public readonly startTime: Timestamp,
    public readonly endTime: Timestamp,
    public readonly keyFrames: VideoFrame[]
  ) {}

  duration(): number {
    return this.endTime - this.startTime;
  }
}

export class VideoFrame {
  constructor(
    public readonly timestamp: Timestamp,
    public readonly spatialData: SpatialPosition[],
    public readonly metadata: FrameMetadata
  ) {}
}

// =======================
// Match Analysis Context
// =======================
export class Match {
  private pendingEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: MatchId,
    public readonly teams: [Team, Team],
    private timeline: MatchEvent[] = [],
    public readonly analytics: MatchAnalytics
  ) {}

  static create(matchId: MatchId, teamA: Team, teamB: Team): Match {
    const match = new Match(
      matchId,
      [teamA, teamB],
      [],
      MatchAnalytics.empty()
    );
    match.pendingEvents.push(new MatchCreated(matchId, Date.now(), 1));
    return match;
  }

  addMatchEvent(event: MatchEvent): void {
    this.timeline.push(event);
    // Convert MatchEvent to DomainEvent for pending events
    const domainEvent = new VideoProcessed(
      new VideoId('temp'),
      this.id,
      event.timestamp,
      1
    );
    this.pendingEvents.push(domainEvent);
    this.analytics.updateWithEvent(event);
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.pendingEvents];
  }

  clearPendingEvents(): void {
    this.pendingEvents = [];
  }
}

// =======================
// Analytics Context
// =======================
export class MatchAnalytics {
  private constructor(
    public readonly xG: number,
    public readonly possession: Record<TeamId, number>,
    public readonly formations: TeamFormation[]
  ) {}

  static empty(): MatchAnalytics {
    return new MatchAnalytics(0, {}, []);
  }

  updateWithEvent(_event: MatchEvent): void {
    // Implementation omitted for brevity
  }
}

// =======================
// Domain Events
// =======================
export interface DomainEvent {
  occurredOn: Timestamp;
  version: number;
}

export class MatchCreated implements DomainEvent {
  public readonly eventType = 'MATCH_CREATED' as const;

  constructor(
    public readonly matchId: MatchId,
    public readonly occurredOn: Timestamp,
    public readonly version: number
  ) {}
}

export class VideoProcessed implements DomainEvent {
  constructor(
    public readonly videoId: VideoId,
    public readonly matchId: MatchId,
    public readonly occurredOn: Timestamp,
    public readonly version: number
  ) {}
}

// =======================
// Team Management Context
// =======================
export class Team {
  constructor(
    public readonly id: TeamId,
    public readonly players: Player[],
    public readonly formation: TeamFormation,
    public readonly coach: Coach
  ) {}

  validateFormation(): boolean {
    return this.players.length === 11; // Simplified validation
  }
}

export class Coach {
  constructor(
    public readonly id: UUID,
    public readonly name: HebrewString,
    public readonly licenseNumber: string
  ) {}
}

// =======================
// Value Objects
// =======================
export class SpatialPosition {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number
  ) {}

  distanceTo(other: SpatialPosition): number {
    return Math.sqrt(
      Math.pow(this.x - other.x, 2) +
        Math.pow(this.y - other.y, 2) +
        Math.pow(this.z - other.z, 2)
    );
  }
}

export class TimeInterval {
  constructor(
    public readonly start: Timestamp,
    public readonly end: Timestamp
  ) {
    if (start >= end) throw new Error('Invalid time interval');
  }

  duration(): number {
    return this.end - this.start;
  }
}

// =======================
// Repository Interfaces
// =======================
export interface MatchRepository {
  findById(id: MatchId): Promise<Match | null>;
  save(match: Match): Promise<void>;
  findByCriteria(criteria: MatchCriteria): Promise<Match[]>;
}

export interface VideoRepository {
  storeVideo(metadata: VideoMetadata): Promise<VideoId>;
  linkToMatch(videoId: VideoId, matchId: MatchId): Promise<void>;
  findVideosByMatch(matchId: MatchId): Promise<VideoSegment[]>;
}

export interface AnalyticsRepository {
  save(analytics: MatchAnalytics): Promise<AnalyticsId>;
  getMatchAnalytics(matchId: MatchId): Promise<MatchAnalytics>;
}

// =======================
// Event-Driven Architecture
// =======================

type EventSchema<T extends string> = {
  eventType: T;
  correlationId: UUID;
  timestamp: Timestamp;
};

// Core Event Schemas
export type VideoUploadedEvent = EventSchema<'VIDEO_UPLOADED'> & {
  videoId: VideoId;
  matchId: MatchId;
  storagePath: string;
  resolution: [number, number];
};

export type MLProcessingCompleteEvent =
  EventSchema<'ML_PROCESSING_COMPLETE'> & {
    videoId: VideoId;
    matchId: MatchId;
    detectedEvents: MatchEvent[];
    modelVersion: string;
  };

export type AnalyticsUpdatedEvent = EventSchema<'ANALYTICS_UPDATED'> & {
  matchId: MatchId;
  xG: number;
  possessionStats: Record<TeamId, number>;
  formationChanges: TeamFormation[];
};

type MatchCreatedEvent = EventSchema<'MATCH_CREATED'> & {
  matchId: MatchId;
};

type DomainEventSchema =
  | VideoUploadedEvent
  | MLProcessingCompleteEvent
  | AnalyticsUpdatedEvent
  | MatchCreatedEvent;

// Saga Implementation
export class VideoProcessingSaga {
  private constructor(
    public readonly correlationId: UUID,
    public readonly videoId: VideoId,
    public readonly matchId: MatchId,
    public state: 'STARTED' | 'ML_PROCESSING' | 'ANALYSIS_PENDING' | 'COMPLETED'
  ) {}

  static start(
    correlationId: UUID,
    videoId: VideoId,
    matchId: MatchId
  ): VideoProcessingSaga {
    return new VideoProcessingSaga(correlationId, videoId, matchId, 'STARTED');
  }

  handleEvent(event: DomainEventSchema): VideoProcessingSaga {
    switch (event.eventType) {
      case 'VIDEO_UPLOADED':
        return new VideoProcessingSaga(
          this.correlationId,
          this.videoId,
          this.matchId,
          'ML_PROCESSING'
        );
      case 'ML_PROCESSING_COMPLETE':
        return new VideoProcessingSaga(
          this.correlationId,
          this.videoId,
          this.matchId,
          'ANALYSIS_PENDING'
        );
      case 'ANALYTICS_UPDATED':
        return new VideoProcessingSaga(
          this.correlationId,
          this.videoId,
          this.matchId,
          'COMPLETED'
        );
      case 'MATCH_CREATED':
        return new VideoProcessingSaga(
          this.correlationId,
          this.videoId,
          this.matchId,
          'STARTED'
        );
      default:
        return this;
    }
  }
}

// Service Definitions
export interface ServiceDefinition {
  boundedContext: string;
  commandHandlers: Record<string, (payload: unknown) => Promise<void>>;
  eventHandlers: Record<string, (event: DomainEventSchema) => Promise<void>>;
  apiEndpoints: Record<string, { method: 'GET' | 'POST'; path: string }>;
  database: {
    writeModel: 'Document' | 'Relational' | 'TimeSeries';
    readModel: 'OLAP' | 'Search' | 'Cache';
    tech: 'PostgreSQL' | 'MongoDB' | 'TimescaleDB' | 'Redis' | 'Elasticsearch';
  };
  techStack: string[];
}

export const ServiceRegistry: Record<string, ServiceDefinition> = {
  API_GATEWAY: {
    boundedContext: 'API Composition',
    commandHandlers: {},
    eventHandlers: {},
    apiEndpoints: {
      federatedGraphQL: { method: 'POST', path: '/graphql' },
      videoUpload: { method: 'POST', path: '/api/videos/upload' },
    },
    database: {
      writeModel: 'Document',
      readModel: 'Cache',
      tech: 'Redis',
    },
    techStack: ['NestJS', 'Apollo Federation', 'GraphQL', 'OAuth2'],
  },
  VIDEO_INGESTION: {
    boundedContext: 'Video Processing',
    commandHandlers: {
      uploadVideo: async _payload => {
        /* Implementation */
      },
    },
    eventHandlers: {
      MATCH_CREATED: async _event => {
        /* Handle match creation */
      },
    },
    apiEndpoints: {
      healthCheck: { method: 'GET', path: '/health' },
    },
    database: {
      writeModel: 'Relational',
      readModel: 'OLAP',
      tech: 'PostgreSQL',
    },
    techStack: ['NestJS', 'FFmpeg', 'OpenCV', 'S3 SDK'],
  },
  ML_PIPELINE: {
    boundedContext: 'Machine Learning',
    commandHandlers: {},
    eventHandlers: {
      VIDEO_UPLOADED: async _event => {
        /* Trigger processing */
      },
    },
    apiEndpoints: {
      modelVersion: { method: 'GET', path: '/models/active' },
    },
    database: {
      writeModel: 'Document',
      readModel: 'Search',
      tech: 'Elasticsearch',
    },
    techStack: ['Python', 'TensorFlow', 'PyTorch', 'Kafka'],
  },
};

// CQRS Implementation
export class MatchReadModel {
  constructor(
    public readonly id: MatchId,
    public readonly analyticsSnapshot: MatchAnalytics,
    public readonly timelinePreview: MatchEvent[]
  ) {}
}

export class MatchWriteModel {
  constructor(
    public readonly id: MatchId,
    private pendingEvents: DomainEventSchema[]
  ) {}

  applyEvent(event: DomainEventSchema): void {
    this.pendingEvents.push(event);
  }

  commitEvents(): DomainEventSchema[] {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
  }
}

// =======================
// Domain Services
// =======================
export interface VideoAnalysisService {
  analyzeVideoSegment(segment: VideoSegment): Promise<MatchEvent[]>;
}

export interface AnalyticsCalculationService {
  recalculateAnalytics(matchId: MatchId): Promise<MatchAnalytics>;
}
