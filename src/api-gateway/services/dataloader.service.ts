/**
 * DataLoader Service
 *
 * Implements efficient data loading with batching and caching to prevent N+1 queries
 * Uses composition pattern for maximum flexibility and testability
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import DataLoader from 'dataloader';
import Redis from 'ioredis';

import {
  DataSources,
  Match,
  Video,
  Team,
  Player,
  MatchAnalytics,
  MatchEvent,
  BatchLoadFn,
  CacheKeyGenerators,
} from '../types/datasources';
import { User } from '../types/context';

@Injectable()
export class DataLoaderService {
  private readonly logger = new Logger(DataLoaderService.name);
  private readonly redis: Redis;
  private readonly cacheKeyGenerators: CacheKeyGenerators;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(this.configService.get<string>('redisUrl'));
    this.cacheKeyGenerators = this.createCacheKeyGenerators();
  }

  /**
   * Creates a new set of DataLoaders for each request
   * This ensures proper request isolation and prevents cache leakage
   */
  createDataSources(): DataSources {
    return {
      // Match loaders
      matchLoader: this.createMatchLoader(),
      matchesByTeamLoader: this.createMatchesByTeamLoader(),

      // Video loaders
      videoLoader: this.createVideoLoader(),
      videosByMatchLoader: this.createVideosByMatchLoader(),

      // Team loaders
      teamLoader: this.createTeamLoader(),
      teamsLoader: this.createTeamsLoader(),

      // Player loaders
      playerLoader: this.createPlayerLoader(),
      playersByTeamLoader: this.createPlayersByTeamLoader(),

      // Analytics loaders
      matchAnalyticsLoader: this.createMatchAnalyticsLoader(),
      matchEventsLoader: this.createMatchEventsLoader(),

      // User loaders
      userLoader: this.createUserLoader(),
      usersByTeamLoader: this.createUsersByTeamLoader(),
    };
  }

  // Match loaders
  private createMatchLoader(): DataLoader<string, Match> {
    return new DataLoader<string, Match>(
      this.createBatchLoader<string, Match>('matches', async ids =>
        this.batchLoadMatches(ids)
      ),
      {
        cacheKeyFn: this.cacheKeyGenerators.match,
        maxBatchSize: 100,
      }
    );
  }

  private createMatchesByTeamLoader(): DataLoader<string, Match[]> {
    return new DataLoader<string, Match[]>(
      async teamIds => this.batchLoadMatchesByTeam(teamIds),
      {
        cacheKeyFn: teamId => `matches_by_team:${teamId}`,
        maxBatchSize: 50,
      }
    );
  }

  // Video loaders
  private createVideoLoader(): DataLoader<string, Video> {
    return new DataLoader<string, Video>(
      this.createBatchLoader<string, Video>('videos', async ids =>
        this.batchLoadVideos(ids)
      ),
      {
        cacheKeyFn: this.cacheKeyGenerators.video,
        maxBatchSize: 100,
      }
    );
  }

  private createVideosByMatchLoader(): DataLoader<string, Video[]> {
    return new DataLoader<string, Video[]>(
      async matchIds => this.batchLoadVideosByMatch(matchIds),
      {
        cacheKeyFn: matchId => `videos_by_match:${matchId}`,
        maxBatchSize: 50,
      }
    );
  }

  // Team loaders
  private createTeamLoader(): DataLoader<string, Team> {
    return new DataLoader<string, Team>(
      this.createBatchLoader<string, Team>('teams', async ids =>
        this.batchLoadTeams(ids)
      ),
      {
        cacheKeyFn: this.cacheKeyGenerators.team,
        maxBatchSize: 100,
      }
    );
  }

  private createTeamsLoader(): DataLoader<void, Team[]> {
    return new DataLoader<void, Team[]>(
      async () => [await this.loadAllTeams()],
      {
        cacheKeyFn: () => 'all_teams',
        maxBatchSize: 1,
      }
    );
  }

  // Player loaders
  private createPlayerLoader(): DataLoader<string, Player> {
    return new DataLoader<string, Player>(
      this.createBatchLoader<string, Player>('players', async ids =>
        this.batchLoadPlayers(ids)
      ),
      {
        cacheKeyFn: this.cacheKeyGenerators.player,
        maxBatchSize: 100,
      }
    );
  }

  private createPlayersByTeamLoader(): DataLoader<string, Player[]> {
    return new DataLoader<string, Player[]>(
      async teamIds => this.batchLoadPlayersByTeam(teamIds),
      {
        cacheKeyFn: teamId => `players_by_team:${teamId}`,
        maxBatchSize: 50,
      }
    );
  }

  // Analytics loaders
  private createMatchAnalyticsLoader(): DataLoader<string, MatchAnalytics> {
    return new DataLoader<string, MatchAnalytics>(
      this.createBatchLoader<string, MatchAnalytics>(
        'match_analytics',
        async matchIds => this.batchLoadMatchAnalytics(matchIds)
      ),
      {
        cacheKeyFn: this.cacheKeyGenerators.analytics,
        maxBatchSize: 50,
      }
    );
  }

  private createMatchEventsLoader(): DataLoader<string, MatchEvent[]> {
    return new DataLoader<string, MatchEvent[]>(
      async matchIds => this.batchLoadMatchEvents(matchIds),
      {
        cacheKeyFn: matchId => `match_events:${matchId}`,
        maxBatchSize: 50,
      }
    );
  }

  // User loaders
  private createUserLoader(): DataLoader<string, User> {
    return new DataLoader<string, User>(
      this.createBatchLoader<string, User>('users', async ids =>
        this.batchLoadUsers(ids)
      ),
      {
        cacheKeyFn: this.cacheKeyGenerators.user,
        maxBatchSize: 100,
      }
    );
  }

  private createUsersByTeamLoader(): DataLoader<string, User[]> {
    return new DataLoader<string, User[]>(
      async teamIds => this.batchLoadUsersByTeam(teamIds),
      {
        cacheKeyFn: teamId => `users_by_team:${teamId}`,
        maxBatchSize: 50,
      }
    );
  }

  /**
   * Generic batch loader with Redis caching
   */
  private createBatchLoader<K, V>(
    entityType: string,
    batchLoadFn: BatchLoadFn<K, V>
  ): BatchLoadFn<K, V> {
    return async (keys: readonly K[]): Promise<(V | Error)[]> => {
      try {
        // Try to get from cache first
        const cacheKeys = keys.map(key => `${entityType}:${key}`);
        const cachedResults = await this.redis.mget(...cacheKeys);

        const results: (V | Error)[] = [];
        const uncachedKeys: K[] = [];
        const uncachedIndices: number[] = [];

        // Separate cached and uncached results
        cachedResults.forEach((cached, index) => {
          if (cached) {
            try {
              results[index] = JSON.parse(cached);
            } catch (error) {
              this.logger.warn(
                `Failed to parse cached result for ${cacheKeys[index]}: ${error.message}`
              );
              uncachedKeys.push(keys[index]);
              uncachedIndices.push(index);
            }
          } else {
            uncachedKeys.push(keys[index]);
            uncachedIndices.push(index);
          }
        });

        // Load uncached data
        if (uncachedKeys.length > 0) {
          const freshResults = await batchLoadFn(uncachedKeys);

          // Cache fresh results and add to final results
          const cachePromises: Promise<string>[] = [];
          freshResults.forEach((result, index) => {
            const originalIndex = uncachedIndices[index];
            results[originalIndex] = result;

            // Cache successful results
            if (!(result instanceof Error)) {
              const cacheKey = `${entityType}:${uncachedKeys[index]}`;
              cachePromises.push(
                this.redis.setex(cacheKey, 300, JSON.stringify(result)) // 5 minute cache
              );
            }
          });

          // Execute cache operations in background
          Promise.all(cachePromises).catch(error => {
            this.logger.warn(`Failed to cache results: ${error.message}`);
          });
        }

        return results;
      } catch (error) {
        this.logger.error(`Batch loading failed for ${entityType}:`, error);
        return keys.map(() =>
          error instanceof Error ? error : new Error(String(error))
        );
      }
    };
  }

  /**
   * Cache key generators for consistent caching
   */
  private createCacheKeyGenerators(): CacheKeyGenerators {
    return {
      match: (id: string) => `match:${id}`,
      video: (id: string) => `video:${id}`,
      team: (id: string) => `team:${id}`,
      player: (id: string) => `player:${id}`,
      analytics: (matchId: string) => `analytics:${matchId}`,
      user: (id: string) => `user:${id}`,
    };
  }

  // Batch loading implementations (to be implemented based on actual data sources)
  private async batchLoadMatches(_ids: readonly string[]): Promise<Match[]> {
    // TODO: Implementation will call the appropriate subgraph service
    // For now, return empty array to prevent errors during development
    this.logger.warn('batchLoadMatches not yet implemented');
    return [];
  }

  private async batchLoadMatchesByTeam(
    teamIds: readonly string[]
  ): Promise<Match[][]> {
    this.logger.warn('batchLoadMatchesByTeam not yet implemented');
    return teamIds.map(() => []);
  }

  private async batchLoadVideos(_ids: readonly string[]): Promise<Video[]> {
    this.logger.warn('batchLoadVideos not yet implemented');
    return [];
  }

  private async batchLoadVideosByMatch(
    matchIds: readonly string[]
  ): Promise<Video[][]> {
    this.logger.warn('batchLoadVideosByMatch not yet implemented');
    return matchIds.map(() => []);
  }

  private async batchLoadTeams(_ids: readonly string[]): Promise<Team[]> {
    this.logger.warn('batchLoadTeams not yet implemented');
    return [];
  }

  private async loadAllTeams(): Promise<Team[]> {
    this.logger.warn('loadAllTeams not yet implemented');
    return [];
  }

  private async batchLoadPlayers(_ids: readonly string[]): Promise<Player[]> {
    this.logger.warn('batchLoadPlayers not yet implemented');
    return [];
  }

  private async batchLoadPlayersByTeam(
    teamIds: readonly string[]
  ): Promise<Player[][]> {
    this.logger.warn('batchLoadPlayersByTeam not yet implemented');
    return teamIds.map(() => []);
  }

  private async batchLoadMatchAnalytics(
    _matchIds: readonly string[]
  ): Promise<MatchAnalytics[]> {
    this.logger.warn('batchLoadMatchAnalytics not yet implemented');
    return [];
  }

  private async batchLoadMatchEvents(
    matchIds: readonly string[]
  ): Promise<MatchEvent[][]> {
    this.logger.warn('batchLoadMatchEvents not yet implemented');
    return matchIds.map(() => []);
  }

  private async batchLoadUsers(_ids: readonly string[]): Promise<User[]> {
    this.logger.warn('batchLoadUsers not yet implemented');
    return [];
  }

  private async batchLoadUsersByTeam(
    teamIds: readonly string[]
  ): Promise<User[][]> {
    this.logger.warn('batchLoadUsersByTeam not yet implemented');
    return teamIds.map(() => []);
  }
}
