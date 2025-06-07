/**
 * Match analytics projection handlers for maintaining read models
 */

import { DomainEvent } from '../../domain/events/domain-event';
import { MatchAnalyticsCreatedEvent } from '../../domain/events/match-analytics-created.event';
import { XGCalculatedEvent } from '../../domain/events/xg-calculated.event';
import { PossessionCalculatedEvent } from '../../domain/events/possession-calculated.event';
import { FormationDetectedEvent } from '../../domain/events/formation-detected.event';
import { ProjectionHandler, ProjectionDefinition } from './projection-manager';

export class MatchAnalyticsCreatedHandler implements ProjectionHandler {
  eventType = 'MatchAnalyticsCreated';

  async handle(event: DomainEvent, client: any): Promise<void> {
    const typedEvent = event as MatchAnalyticsCreatedEvent;
    
    // Insert new match analytics record
    await client.query(`
      INSERT INTO match_analytics_projection (
        match_id, 
        home_team_id, 
        away_team_id,
        last_updated
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (match_id) DO UPDATE SET
        home_team_id = $2,
        away_team_id = $3,
        last_updated = $4
    `, [
      typedEvent.aggregateId,
      typedEvent.homeTeamId,
      typedEvent.awayTeamId,
      typedEvent.timestamp
    ]);

    // Initialize team analytics if they don't exist
    await this.initializeTeamAnalytics(typedEvent.homeTeamId, client);
    await this.initializeTeamAnalytics(typedEvent.awayTeamId, client);
  }

  private async initializeTeamAnalytics(teamId: string, client: any): Promise<void> {
    await client.query(`
      INSERT INTO team_analytics_projection (team_id, team_name)
      VALUES ($1, $2)
      ON CONFLICT (team_id) DO NOTHING
    `, [teamId, `Team ${teamId}`]); // In real implementation, get team name from team service
  }
}

export class XGCalculatedHandler implements ProjectionHandler {
  eventType = 'XGCalculated';

  async handle(event: DomainEvent, client: any): Promise<void> {
    const typedEvent = event as XGCalculatedEvent;
    
    // Determine if this is home or away team
    const matchResult = await client.query(
      'SELECT home_team_id, away_team_id FROM match_analytics_projection WHERE match_id = $1',
      [typedEvent.aggregateId]
    );

    if (matchResult.rows.length === 0) {
      console.warn(`Match not found for xG update: ${typedEvent.aggregateId}`);
      return;
    }

    const { home_team_id, away_team_id } = matchResult.rows[0];
    const isHomeTeam = typedEvent.teamId === home_team_id;
    
    // Update match analytics projection
    const column = isHomeTeam ? 'home_xg' : 'away_xg';
    await client.query(`
      UPDATE match_analytics_projection 
      SET ${column} = $1, last_updated = $2
      WHERE match_id = $3
    `, [typedEvent.newXG, typedEvent.timestamp, typedEvent.aggregateId]);

    // Insert into time series history
    await client.query(`
      INSERT INTO match_analytics_history (
        match_id, 
        timestamp, 
        ${column}
      ) VALUES ($1, $2, $3)
      ON CONFLICT (match_id, timestamp) DO UPDATE SET
        ${column} = $3
    `, [typedEvent.aggregateId, typedEvent.timestamp, typedEvent.newXG]);

    // Update team analytics
    await this.updateTeamXGStats(typedEvent.teamId, typedEvent.newXG, client);
  }

  private async updateTeamXGStats(teamId: string, newXG: number, client: any): Promise<void> {
    // This is a simplified update - in reality, you'd recalculate based on all matches
    await client.query(`
      UPDATE team_analytics_projection 
      SET 
        xg_for = xg_for + $1,
        last_updated = NOW()
      WHERE team_id = $2
    `, [newXG, teamId]);
  }
}

export class PossessionCalculatedHandler implements ProjectionHandler {
  eventType = 'PossessionCalculated';

  async handle(event: DomainEvent, client: any): Promise<void> {
    const typedEvent = event as PossessionCalculatedEvent;
    
    // Update match analytics projection
    await client.query(`
      UPDATE match_analytics_projection 
      SET 
        home_possession = $1,
        away_possession = $2,
        last_updated = $3
      WHERE match_id = $4
    `, [
      typedEvent.homeTeamPossession,
      typedEvent.awayTeamPossession,
      typedEvent.timestamp,
      typedEvent.aggregateId
    ]);

    // Insert into time series history
    await client.query(`
      INSERT INTO match_analytics_history (
        match_id, 
        timestamp, 
        home_possession,
        away_possession
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (match_id, timestamp) DO UPDATE SET
        home_possession = $3,
        away_possession = $4
    `, [
      typedEvent.aggregateId,
      typedEvent.timestamp,
      typedEvent.homeTeamPossession,
      typedEvent.awayTeamPossession
    ]);

    // Update team analytics
    await this.updateTeamPossessionStats(
      typedEvent.homeTeamId,
      typedEvent.homeTeamPossession,
      client
    );
    await this.updateTeamPossessionStats(
      typedEvent.awayTeamId,
      typedEvent.awayTeamPossession,
      client
    );
  }

  private async updateTeamPossessionStats(
    teamId: string,
    possession: number,
    client: any
  ): Promise<void> {
    // Recalculate average possession for the team
    await client.query(`
      UPDATE team_analytics_projection 
      SET 
        avg_possession = (
          SELECT AVG(
            CASE 
              WHEN home_team_id = $1 THEN home_possession
              ELSE away_possession
            END
          )
          FROM match_analytics_projection
          WHERE (home_team_id = $1 OR away_team_id = $1)
            AND (home_possession > 0 OR away_possession > 0)
        ),
        last_updated = NOW()
      WHERE team_id = $1
    `, [teamId]);
  }
}

export class FormationDetectedHandler implements ProjectionHandler {
  eventType = 'FormationDetected';

  async handle(event: DomainEvent, client: any): Promise<void> {
    const typedEvent = event as FormationDetectedEvent;
    
    // Determine if this is home or away team
    const matchResult = await client.query(
      'SELECT home_team_id, away_team_id FROM match_analytics_projection WHERE match_id = $1',
      [typedEvent.aggregateId]
    );

    if (matchResult.rows.length === 0) {
      console.warn(`Match not found for formation update: ${typedEvent.aggregateId}`);
      return;
    }

    const { home_team_id, away_team_id } = matchResult.rows[0];
    const isHomeTeam = typedEvent.teamId === home_team_id;
    
    // Update match analytics projection
    const column = isHomeTeam ? 'home_formation' : 'away_formation';
    await client.query(`
      UPDATE match_analytics_projection 
      SET ${column} = $1, last_updated = $2
      WHERE match_id = $3
    `, [typedEvent.formation, typedEvent.timestamp, typedEvent.aggregateId]);

    // Insert into time series history
    await client.query(`
      INSERT INTO match_analytics_history (
        match_id, 
        timestamp, 
        ${column}
      ) VALUES ($1, $2, $3)
      ON CONFLICT (match_id, timestamp) DO UPDATE SET
        ${column} = $3
    `, [typedEvent.aggregateId, typedEvent.timestamp, typedEvent.formation]);

    // Store detailed formation data in separate table
    await client.query(`
      INSERT INTO formation_history (
        match_id,
        team_id,
        timestamp,
        formation,
        confidence,
        player_positions
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (match_id, team_id, timestamp) DO UPDATE SET
        formation = $4,
        confidence = $5,
        player_positions = $6
    `, [
      typedEvent.aggregateId,
      typedEvent.teamId,
      new Date(typedEvent.detectionTimestamp),
      typedEvent.formation,
      typedEvent.confidence,
      JSON.stringify(typedEvent.playerPositions)
    ]);
  }
}

// Export the complete projection definition
export const matchAnalyticsProjection: ProjectionDefinition = {
  name: 'match_analytics',
  handlers: [
    new MatchAnalyticsCreatedHandler(),
    new XGCalculatedHandler(),
    new PossessionCalculatedHandler(),
    new FormationDetectedHandler()
  ],
  snapshotFrequency: 100
};
