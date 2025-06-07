/**
 * GraphQL resolvers for analytics operations
 */

import { 
  Resolver, 
  Query, 
  Mutation, 
  Args, 
  Subscription, 
  Context,
  ID,
  Float,
  Int
} from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { AnalyticsApplicationService } from '../application/analytics-application.service';

// GraphQL Types
import {
  MatchAnalyticsType,
  TeamAnalyticsType,
  TimeSeriesDataType,
  CreateMatchAnalyticsInput,
  UpdateXGInput,
  UpdatePossessionInput,
  ProcessMLPipelineInput,
  GetTimeSeriesInput
} from './types/analytics.types';

@Resolver()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);
  private readonly pubSub = new PubSub();

  constructor(
    private readonly analyticsService: AnalyticsApplicationService
  ) {}

  // Queries (Read operations)
  @Query(() => MatchAnalyticsType)
  async getMatchAnalytics(
    @Args('matchId', { type: () => ID }) matchId: string,
    @Args('includeHistorical', { type: () => Boolean, defaultValue: false }) 
    includeHistorical: boolean
  ): Promise<MatchAnalyticsType> {
    this.logger.log(`Getting match analytics for match: ${matchId}`);
    
    const result = await this.analyticsService.getMatchAnalytics(
      matchId, 
      includeHistorical
    );
    
    return result.data;
  }

  @Query(() => TeamAnalyticsType)
  async getTeamAnalytics(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('fromDate', { type: () => Date, nullable: true }) fromDate?: Date,
    @Args('toDate', { type: () => Date, nullable: true }) toDate?: Date
  ): Promise<TeamAnalyticsType> {
    this.logger.log(`Getting team analytics for team: ${teamId}`);
    
    const result = await this.analyticsService.getTeamAnalytics(
      teamId, 
      fromDate, 
      toDate
    );
    
    return result.data;
  }

  @Query(() => [TimeSeriesDataType])
  async getTimeSeriesAnalytics(
    @Args('input') input: GetTimeSeriesInput
  ): Promise<TimeSeriesDataType[]> {
    this.logger.log(`Getting time series analytics: ${JSON.stringify(input)}`);
    
    const result = await this.analyticsService.getTimeSeriesAnalytics(
      input.entityType,
      input.entityId,
      input.metric,
      input.fromDate,
      input.toDate,
      input.interval
    );
    
    return result.data;
  }

  @Query(() => [MatchAnalyticsType])
  async getRecentMatches(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('teamId', { type: () => ID, nullable: true }) teamId?: string
  ): Promise<MatchAnalyticsType[]> {
    this.logger.log(`Getting recent matches, limit: ${limit}, teamId: ${teamId}`);
    
    // This would be implemented with a specific query
    // For now, return empty array
    return [];
  }

  // Mutations (Write operations)
  @Mutation(() => Boolean)
  async createMatchAnalytics(
    @Args('input') input: CreateMatchAnalyticsInput
  ): Promise<boolean> {
    this.logger.log(`Creating match analytics: ${JSON.stringify(input)}`);
    
    try {
      await this.analyticsService.createMatchAnalytics(
        input.matchId,
        input.homeTeamId,
        input.awayTeamId,
        input.matchDuration
      );
      
      // Publish subscription update
      this.pubSub.publish('MATCH_ANALYTICS_CREATED', {
        matchAnalyticsCreated: {
          matchId: input.matchId,
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId
        }
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to create match analytics: ${error.message}`);
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async updateMatchXG(
    @Args('input') input: UpdateXGInput
  ): Promise<boolean> {
    this.logger.log(`Updating match xG: ${JSON.stringify(input)}`);
    
    try {
      await this.analyticsService.updateMatchXG(
        input.matchId,
        input.teamId,
        input.newXG,
        input.shotData
      );
      
      // Publish real-time update
      this.pubSub.publish('XG_UPDATED', {
        xgUpdated: {
          matchId: input.matchId,
          teamId: input.teamId,
          newXG: input.newXG,
          timestamp: new Date()
        }
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to update match xG: ${error.message}`);
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async updateMatchPossession(
    @Args('input') input: UpdatePossessionInput
  ): Promise<boolean> {
    this.logger.log(`Updating match possession: ${JSON.stringify(input)}`);
    
    try {
      await this.analyticsService.updateMatchPossession(
        input.matchId,
        input.homeTeamPossession,
        input.awayTeamPossession
      );
      
      // Publish real-time update
      this.pubSub.publish('POSSESSION_UPDATED', {
        possessionUpdated: {
          matchId: input.matchId,
          homeTeamPossession: input.homeTeamPossession,
          awayTeamPossession: input.awayTeamPossession,
          timestamp: new Date()
        }
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to update match possession: ${error.message}`);
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async processMLPipelineOutput(
    @Args('input') input: ProcessMLPipelineInput
  ): Promise<boolean> {
    this.logger.log(`Processing ML pipeline output for match: ${input.matchId}`);
    
    try {
      await this.analyticsService.processMLPipelineOutput(
        input.matchId,
        input.pipelineOutput
      );
      
      // Publish comprehensive update
      this.pubSub.publish('ML_PIPELINE_PROCESSED', {
        mlPipelineProcessed: {
          matchId: input.matchId,
          timestamp: new Date(),
          outputTypes: Object.keys(input.pipelineOutput)
        }
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to process ML pipeline output: ${error.message}`);
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async rebuildProjection(
    @Args('projectionName') projectionName: string
  ): Promise<boolean> {
    this.logger.log(`Rebuilding projection: ${projectionName}`);
    
    try {
      await this.analyticsService.rebuildProjection(projectionName);
      return true;
    } catch (error) {
      this.logger.error(`Failed to rebuild projection: ${error.message}`);
      throw error;
    }
  }

  // Subscriptions (Real-time updates)
  @Subscription(() => MatchAnalyticsType, {
    filter: (payload, variables) => {
      return payload.matchAnalyticsUpdated.matchId === variables.matchId;
    }
  })
  matchAnalyticsUpdated(
    @Args('matchId', { type: () => ID }) matchId: string
  ) {
    return this.pubSub.asyncIterator('MATCH_ANALYTICS_UPDATED');
  }

  @Subscription(() => XGUpdateType)
  xgUpdated(
    @Args('matchId', { type: () => ID, nullable: true }) matchId?: string
  ) {
    if (matchId) {
      return this.pubSub.asyncIterator('XG_UPDATED');
    }
    return this.pubSub.asyncIterator('XG_UPDATED');
  }

  @Subscription(() => PossessionUpdateType)
  possessionUpdated(
    @Args('matchId', { type: () => ID, nullable: true }) matchId?: string
  ) {
    return this.pubSub.asyncIterator('POSSESSION_UPDATED');
  }

  @Subscription(() => MLPipelineProcessedType)
  mlPipelineProcessed() {
    return this.pubSub.asyncIterator('ML_PIPELINE_PROCESSED');
  }

  // Health check
  @Query(() => HealthCheckType)
  async healthCheck(): Promise<HealthCheckType> {
    const health = await this.analyticsService.healthCheck();
    
    return {
      status: health.eventStore && health.readDatabase && health.projections ? 'healthy' : 'unhealthy',
      eventStore: health.eventStore,
      readDatabase: health.readDatabase,
      projections: health.projections,
      timestamp: new Date()
    };
  }
}

// Additional GraphQL types for subscriptions
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class XGUpdateType {
  @Field(() => ID)
  matchId: string;

  @Field(() => ID)
  teamId: string;

  @Field(() => Float)
  newXG: number;

  @Field()
  timestamp: Date;
}

@ObjectType()
export class PossessionUpdateType {
  @Field(() => ID)
  matchId: string;

  @Field(() => Float)
  homeTeamPossession: number;

  @Field(() => Float)
  awayTeamPossession: number;

  @Field()
  timestamp: Date;
}

@ObjectType()
export class MLPipelineProcessedType {
  @Field(() => ID)
  matchId: string;

  @Field()
  timestamp: Date;

  @Field(() => [String])
  outputTypes: string[];
}

@ObjectType()
export class HealthCheckType {
  @Field()
  status: string;

  @Field()
  eventStore: boolean;

  @Field()
  readDatabase: boolean;

  @Field()
  projections: boolean;

  @Field()
  timestamp: Date;
}
