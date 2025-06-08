/**
 * DataSources Types
 * 
 * Defines the data sources available in the GraphQL context
 */

import DataLoader from 'dataloader';
import { User } from './context';

// Entity types from domain models
export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  videoId?: string;
  startTime: Date;
  endTime?: Date;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  venue?: string;
  weather?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  matchId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration?: number;
  resolution?: {
    width: number;
    height: number;
  };
  storagePath: string;
  thumbnailPath?: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  uploadedAt: Date;
  processedAt?: Date;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  foundedYear?: number;
  stadium?: string;
  league: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: string;
  dateOfBirth?: Date;
  nationality?: string;
  height?: number;
  weight?: number;
  isActive: boolean;
  joinedAt: Date;
}

export interface MatchAnalytics {
  id: string;
  matchId: string;
  homeTeam: {
    teamId: string;
    xG: number;
    possession: number;
    shots: number;
    shotsOnTarget: number;
    passes: number;
    passAccuracy: number;
    formation: string;
  };
  awayTeam: {
    teamId: string;
    xG: number;
    possession: number;
    shots: number;
    shotsOnTarget: number;
    passes: number;
    passAccuracy: number;
    formation: string;
  };
  events: MatchEvent[];
  lastUpdated: Date;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: 'goal' | 'shot' | 'pass' | 'foul' | 'card' | 'substitution';
  timestamp: number; // seconds from match start
  playerId?: string;
  teamId: string;
  position?: {
    x: number;
    y: number;
  };
  metadata?: MatchEventMetadata;
}

export interface MatchEventMetadata {
  shotType?: 'header' | 'left_foot' | 'right_foot' | 'other';
  bodyPart?: 'foot' | 'head' | 'chest' | 'other';
  cardType?: 'yellow' | 'red';
  foulType?: 'dangerous_play' | 'unsporting_behavior' | 'dissent' | 'other';
  passType?: 'short' | 'long' | 'cross' | 'through_ball';
  substitutionType?: 'tactical' | 'injury' | 'disciplinary';
  xG?: number;
  distance?: number;
  angle?: number;
  pressure?: number;
  [key: string]: unknown;
}

// DataLoader definitions
export interface DataSources {
  // Match-related loaders
  matchLoader: DataLoader<string, Match>;
  matchesByTeamLoader: DataLoader<string, Match[]>;
  
  // Video-related loaders
  videoLoader: DataLoader<string, Video>;
  videosByMatchLoader: DataLoader<string, Video[]>;
  
  // Team-related loaders
  teamLoader: DataLoader<string, Team>;
  teamsLoader: DataLoader<void, Team[]>;
  
  // Player-related loaders
  playerLoader: DataLoader<string, Player>;
  playersByTeamLoader: DataLoader<string, Player[]>;
  
  // Analytics-related loaders
  matchAnalyticsLoader: DataLoader<string, MatchAnalytics>;
  matchEventsLoader: DataLoader<string, MatchEvent[]>;
  
  // User-related loaders (for authentication/authorization)
  userLoader: DataLoader<string, User>;
  usersByTeamLoader: DataLoader<string, User[]>;
}

// Batch loading function types
export type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<(V | Error)[]>;

// Cache key generators
export interface CacheKeyGenerators {
  match: (id: string) => string;
  video: (id: string) => string;
  team: (id: string) => string;
  player: (id: string) => string;
  analytics: (matchId: string) => string;
  user: (id: string) => string;
}
