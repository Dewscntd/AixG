// Domain model types for the API Gateway

export interface Video {
  id: string;
  title: string;
  description?: string;
  duration: number;
  format: string;
  size: number;
  uploadedAt: Date;
  status: VideoStatus;
  metadata: VideoMetadata;
  teamId: string;
  matchId?: string;
}

export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface VideoMetadata {
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  bitrate: number;
  codec: string;
  thumbnails?: string[];
  chapters?: VideoChapter[];
}

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

export interface VideoFilters {
  teamId?: string;
  status?: VideoStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface VideoUploadData {
  file: File;
  title: string;
  description?: string;
  teamId: string;
  matchId?: string;
  metadata?: Partial<VideoMetadata>;
}

export interface MatchAnalytics {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  xG: TeamStats;
  possession: TeamStats;
  shots: TeamStats;
  passAccuracy: TeamStats;
  events: MatchEvent[];
  heatmaps?: Heatmap[];
  formations?: Formation[];
}

export interface TeamStats {
  home: number;
  away: number;
}

export interface TeamAnalytics {
  teamId: string;
  season: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  xGFor: number;
  xGAgainst: number;
  averagePossession: number;
  form: MatchResult[];
}

export interface PlayerAnalytics {
  playerId: string;
  teamId: string;
  position: PlayerPosition;
  matches: number;
  goals: number;
  assists: number;
  xG: number;
  xA: number;
  passAccuracy: number;
  distanceCovered: number;
  heatmap?: PlayerHeatmap;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  founded?: number;
  stadium?: string;
  manager?: string;
  league: string;
  season: string;
  players?: Player[];
}

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  number: number;
  age: number;
  nationality: string;
  photo?: string;
}

export type PlayerPosition = 
  | 'GK' 
  | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB'
  | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM'
  | 'LW' | 'RW' | 'CF' | 'ST';

export interface TeamFilters {
  league?: string;
  season?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MatchEvent {
  id: string;
  type: EventType;
  timestamp: number;
  playerId?: string;
  teamId: string;
  position: Position;
  metadata: EventMetadata;
}

export type EventType = 
  | 'goal' | 'assist' | 'shot' | 'shot_on_target' | 'shot_off_target'
  | 'pass' | 'pass_completed' | 'pass_failed'
  | 'tackle' | 'interception' | 'clearance'
  | 'foul' | 'yellow_card' | 'red_card'
  | 'substitution' | 'corner' | 'throw_in' | 'free_kick'
  | 'offside' | 'penalty' | 'save';

export interface Position {
  x: number;
  y: number;
}

export interface EventMetadata {
  [key: string]: unknown;
  xG?: number;
  bodyPart?: 'left_foot' | 'right_foot' | 'head' | 'other';
  outcome?: 'successful' | 'unsuccessful';
  distance?: number;
  angle?: number;
}

export interface Heatmap {
  playerId: string;
  teamId: string;
  positions: HeatmapPoint[];
  period: 'first_half' | 'second_half' | 'full_match';
}

export interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  duration: number;
}

export interface Formation {
  teamId: string;
  formation: string; // e.g., "4-3-3", "4-4-2"
  players: FormationPlayer[];
  timestamp: number;
  period: 'first_half' | 'second_half';
}

export interface FormationPlayer {
  playerId: string;
  position: Position;
  role: PlayerPosition;
}

export interface PlayerHeatmap {
  playerId: string;
  matchId: string;
  positions: Position[];
  averagePosition: Position;
  distanceCovered: number;
}

export type MatchResult = 'W' | 'D' | 'L';

// Pagination types
export interface PaginationInput {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  categories?: string[];
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
