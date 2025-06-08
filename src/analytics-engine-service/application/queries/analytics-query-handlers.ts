/**
 * Query handlers for analytics read operations using CQRS pattern
 */

import { Pool } from 'pg';
import {
  GetMatchAnalyticsQuery,
  GetTeamAnalyticsQuery,
  GetTimeSeriesAnalyticsQuery,
  AnalyticsQuery
} from './analytics-queries';

export interface AnalyticsResult {
  readonly queryId: string;
  readonly timestamp: Date;
  readonly data: any;
  readonly metadata?: Record<string, any>;
}

export interface AnalyticsQueryHandler<T extends AnalyticsQuery, R extends AnalyticsResult> {
  handle(query: T): Promise<R>;
}

// Read model interfaces
export interface MatchAnalyticsReadModel {
  matchId: string;
  homeTeam: {
    teamId: string;
    teamName: string;
    xG: number;
    xA: number;
    possession: number;
    passAccuracy: number;
    shotsOnTarget: number;
    shotsOffTarget: number;
    formation?: string;
  };
  awayTeam: {
    teamId: string;
    teamName: string;
    xG: number;
    xA: number;
    possession: number;
    passAccuracy: number;
    shotsOnTarget: number;
    shotsOffTarget: number;
    formation?: string;
  };
  matchDuration: number;
  lastUpdated: Date;
  status: 'live' | 'completed' | 'scheduled';
}

export interface TeamAnalyticsReadModel {
  teamId: string;
  teamName: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  xGFor: number;
  xGAgainst: number;
  avgPossession: number;
  avgPassAccuracy: number;
  form: string[]; // Last 5 results
  lastUpdated: Date;
}

export class GetMatchAnalyticsQueryHandler 
  implements AnalyticsQueryHandler<GetMatchAnalyticsQuery, AnalyticsResult> {
  
  constructor(private readonly readDb: Pool) {}

  async handle(query: GetMatchAnalyticsQuery): Promise<AnalyticsResult> {
    const client = await this.readDb.connect();
    
    try {
      // Get current match analytics from materialized view
      const matchResult = await client.query(`
        SELECT 
          m.match_id,
          m.home_team_id,
          m.away_team_id,
          m.match_duration,
          m.status,
          m.last_updated,
          ht.team_name as home_team_name,
          at.team_name as away_team_name,
          ma.home_xg,
          ma.home_xa,
          ma.home_possession,
          ma.home_pass_accuracy,
          ma.home_shots_on_target,
          ma.home_shots_off_target,
          ma.home_formation,
          ma.away_xg,
          ma.away_xa,
          ma.away_possession,
          ma.away_pass_accuracy,
          ma.away_shots_on_target,
          ma.away_shots_off_target,
          ma.away_formation
        FROM match_analytics_view ma
        JOIN matches m ON ma.match_id = m.match_id
        JOIN teams ht ON m.home_team_id = ht.team_id
        JOIN teams at ON m.away_team_id = at.team_id
        WHERE m.match_id = $1
      `, [query.matchId]);

      if (matchResult.rows.length === 0) {
        throw new Error(`Match analytics not found for match ${query.matchId}`);
      }

      const row = matchResult.rows[0];
      
      const data: MatchAnalyticsReadModel = {
        matchId: row.match_id,
        homeTeam: {
          teamId: row.home_team_id,
          teamName: row.home_team_name,
          xG: parseFloat(row.home_xg) || 0,
          xA: parseFloat(row.home_xa) || 0,
          possession: parseFloat(row.home_possession) || 0,
          passAccuracy: parseFloat(row.home_pass_accuracy) || 0,
          shotsOnTarget: parseInt(row.home_shots_on_target) || 0,
          shotsOffTarget: parseInt(row.home_shots_off_target) || 0,
          formation: row.home_formation
        },
        awayTeam: {
          teamId: row.away_team_id,
          teamName: row.away_team_name,
          xG: parseFloat(row.away_xg) || 0,
          xA: parseFloat(row.away_xa) || 0,
          possession: parseFloat(row.away_possession) || 0,
          passAccuracy: parseFloat(row.away_pass_accuracy) || 0,
          shotsOnTarget: parseInt(row.away_shots_on_target) || 0,
          shotsOffTarget: parseInt(row.away_shots_off_target) || 0,
          formation: row.away_formation
        },
        matchDuration: parseInt(row.match_duration) || 0,
        lastUpdated: row.last_updated,
        status: row.status
      };

      // Get historical data if requested
      let historicalData = null;
      if (query.includeHistorical) {
        const historicalResult = await client.query(`
          SELECT 
            timestamp,
            home_xg,
            away_xg,
            home_possession,
            away_possession
          FROM match_analytics_history 
          WHERE match_id = $1 
          ORDER BY timestamp ASC
        `, [query.matchId]);

        historicalData = historicalResult.rows;
      }

      return {
        queryId: query.queryId,
        timestamp: new Date(),
        data,
        metadata: {
          includeHistorical: query.includeHistorical,
          historicalData
        }
      };

    } finally {
      client.release();
    }
  }
}

export class GetTeamAnalyticsQueryHandler 
  implements AnalyticsQueryHandler<GetTeamAnalyticsQuery, AnalyticsResult> {
  
  constructor(private readonly readDb: Pool) {}

  async handle(query: GetTeamAnalyticsQuery): Promise<AnalyticsResult> {
    const client = await this.readDb.connect();
    
    try {
      let whereClause = 'WHERE t.team_id = $1';
      const params: any[] = [query.teamId];
      let paramIndex = 2;

      if (query.fromDate) {
        whereClause += ` AND m.match_date >= $${paramIndex}`;
        params.push(query.fromDate);
        paramIndex++;
      }

      if (query.toDate) {
        whereClause += ` AND m.match_date <= $${paramIndex}`;
        params.push(query.toDate);
        paramIndex++;
      }

      const teamResult = await client.query(`
        SELECT 
          t.team_id,
          t.team_name,
          COUNT(m.match_id) as matches,
          SUM(CASE 
            WHEN (m.home_team_id = t.team_id AND m.home_score > m.away_score) OR 
                 (m.away_team_id = t.team_id AND m.away_score > m.home_score) 
            THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) as draws,
          SUM(CASE 
            WHEN (m.home_team_id = t.team_id AND m.home_score < m.away_score) OR 
                 (m.away_team_id = t.team_id AND m.away_score < m.home_score) 
            THEN 1 ELSE 0 END) as losses,
          SUM(CASE 
            WHEN m.home_team_id = t.team_id THEN m.home_score 
            ELSE m.away_score END) as goals_for,
          SUM(CASE 
            WHEN m.home_team_id = t.team_id THEN m.away_score 
            ELSE m.home_score END) as goals_against,
          AVG(CASE 
            WHEN m.home_team_id = t.team_id THEN ma.home_xg 
            ELSE ma.away_xg END) as avg_xg_for,
          AVG(CASE 
            WHEN m.home_team_id = t.team_id THEN ma.away_xg 
            ELSE ma.home_xg END) as avg_xg_against,
          AVG(CASE 
            WHEN m.home_team_id = t.team_id THEN ma.home_possession 
            ELSE ma.away_possession END) as avg_possession,
          AVG(CASE 
            WHEN m.home_team_id = t.team_id THEN ma.home_pass_accuracy 
            ELSE ma.away_pass_accuracy END) as avg_pass_accuracy
        FROM teams t
        LEFT JOIN matches m ON (m.home_team_id = t.team_id OR m.away_team_id = t.team_id)
        LEFT JOIN match_analytics_view ma ON m.match_id = ma.match_id
        ${whereClause}
        GROUP BY t.team_id, t.team_name
      `, params);

      if (teamResult.rows.length === 0) {
        throw new Error(`Team not found: ${query.teamId}`);
      }

      const row = teamResult.rows[0];

      // Get recent form (last 5 matches)
      const formResult = await client.query(`
        SELECT 
          CASE 
            WHEN (m.home_team_id = $1 AND m.home_score > m.away_score) OR 
                 (m.away_team_id = $1 AND m.away_score > m.home_score) THEN 'W'
            WHEN m.home_score = m.away_score THEN 'D'
            ELSE 'L'
          END as result
        FROM matches m
        WHERE (m.home_team_id = $1 OR m.away_team_id = $1)
          AND m.status = 'completed'
        ORDER BY m.match_date DESC
        LIMIT 5
      `, [query.teamId]);

      const form = formResult.rows.map(r => r.result);

      const data: TeamAnalyticsReadModel = {
        teamId: row.team_id,
        teamName: row.team_name,
        matches: parseInt(row.matches) || 0,
        wins: parseInt(row.wins) || 0,
        draws: parseInt(row.draws) || 0,
        losses: parseInt(row.losses) || 0,
        goalsFor: parseInt(row.goals_for) || 0,
        goalsAgainst: parseInt(row.goals_against) || 0,
        xGFor: parseFloat(row.avg_xg_for) || 0,
        xGAgainst: parseFloat(row.avg_xg_against) || 0,
        avgPossession: parseFloat(row.avg_possession) || 0,
        avgPassAccuracy: parseFloat(row.avg_pass_accuracy) || 0,
        form,
        lastUpdated: new Date()
      };

      return {
        queryId: query.queryId,
        timestamp: new Date(),
        data,
        metadata: {
          fromDate: query.fromDate,
          toDate: query.toDate,
          includeOpponents: query.includeOpponents
        }
      };

    } finally {
      client.release();
    }
  }
}

export class GetTimeSeriesAnalyticsQueryHandler 
  implements AnalyticsQueryHandler<GetTimeSeriesAnalyticsQuery, AnalyticsResult> {
  
  constructor(private readonly readDb: Pool) {}

  async handle(query: GetTimeSeriesAnalyticsQuery): Promise<AnalyticsResult> {
    const client = await this.readDb.connect();
    
    try {
      // Build time series query based on interval
      const intervalMap = {
        'minute': '1 minute',
        'hour': '1 hour',
        'day': '1 day',
        'week': '1 week',
        'month': '1 month'
      };

      const interval = intervalMap[query.interval];
      
      let timeSeriesQuery = '';
      let params: any[] = [];

      if (query.entityType === 'match') {
        timeSeriesQuery = `
          SELECT 
            time_bucket($1, timestamp) as time_bucket,
            AVG(CASE WHEN metric_name = $2 THEN metric_value END) as value
          FROM match_metrics_timeseries 
          WHERE match_id = $3 
            AND timestamp >= $4 
            AND timestamp <= $5
            AND metric_name = $2
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
        `;
        params = [interval, query.metric, query.entityId, query.fromDate, query.toDate];
      }

      const result = await client.query(timeSeriesQuery, params);

      const data = result.rows.map(row => ({
        timestamp: row.time_bucket,
        value: parseFloat(row.value) || 0
      }));

      return {
        queryId: query.queryId,
        timestamp: new Date(),
        data,
        metadata: {
          entityType: query.entityType,
          entityId: query.entityId,
          metric: query.metric,
          interval: query.interval,
          fromDate: query.fromDate,
          toDate: query.toDate,
          dataPoints: data.length
        }
      };

    } finally {
      client.release();
    }
  }
}
