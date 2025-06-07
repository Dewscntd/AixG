/**
 * Query definitions for analytics read operations
 */

export interface AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;
}

export class GetMatchAnalyticsQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly matchId: string,
    public readonly includeHistorical: boolean = false
  ) {
    this.queryId = `get-match-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetTeamAnalyticsQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly teamId: string,
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
    public readonly includeOpponents: boolean = false
  ) {
    this.queryId = `get-team-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetPlayerAnalyticsQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly playerId: string,
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
    public readonly metrics: string[] = ['xG', 'xA', 'passes', 'possession']
  ) {
    this.queryId = `get-player-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetComparativeAnalyticsQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly entityType: 'team' | 'player',
    public readonly entityIds: string[],
    public readonly metrics: string[],
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
    public readonly groupBy: 'match' | 'week' | 'month' = 'match'
  ) {
    this.queryId = `get-comparative-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetTimeSeriesAnalyticsQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly entityType: 'team' | 'player' | 'match',
    public readonly entityId: string,
    public readonly metric: string,
    public readonly fromDate: Date,
    public readonly toDate: Date,
    public readonly interval: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day'
  ) {
    this.queryId = `get-timeseries-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetLeagueStandingsQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly leagueId: string,
    public readonly season: string,
    public readonly sortBy: 'points' | 'xG' | 'xGA' | 'xGDiff' = 'points',
    public readonly includeForm: boolean = true
  ) {
    this.queryId = `get-league-standings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetMatchPredictionQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly homeTeamId: string,
    public readonly awayTeamId: string,
    public readonly predictionDate: Date,
    public readonly includeConfidence: boolean = true,
    public readonly historicalMatches: number = 10
  ) {
    this.queryId = `get-match-prediction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetFormationAnalyticsQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly teamId: string,
    public readonly formation?: string,
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
    public readonly includePlayerPositions: boolean = false
  ) {
    this.queryId = `get-formation-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetLiveMatchAnalyticsQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly matchId: string,
    public readonly includeRealTimeUpdates: boolean = true,
    public readonly updateInterval: number = 30 // seconds
  ) {
    this.queryId = `get-live-match-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class SearchAnalyticsQuery implements AnalyticsQuery {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor(
    public readonly searchTerm: string,
    public readonly entityTypes: ('team' | 'player' | 'match')[],
    public readonly filters: {
      league?: string;
      season?: string;
      position?: string;
      minXG?: number;
      maxXG?: number;
      dateRange?: { from: Date; to: Date };
    } = {},
    public readonly sortBy: string = 'relevance',
    public readonly limit: number = 50,
    public readonly offset: number = 0
  ) {
    this.queryId = `search-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}
