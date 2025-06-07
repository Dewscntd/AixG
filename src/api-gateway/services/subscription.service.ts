/**
 * Subscription Service
 * 
 * Manages GraphQL subscriptions and real-time updates using Redis pub/sub
 * Implements composition pattern for scalable real-time communication
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'graphql-subscriptions';
import Redis from 'ioredis';
import { RedisPubSub } from 'graphql-redis-subscriptions';

export interface SubscriptionEvent {
  type: string;
  payload: any;
  userId?: string;
  teamId?: string;
  matchId?: string;
  timestamp: Date;
}

export interface SubscriptionFilter {
  userId?: string;
  teamId?: string;
  matchId?: string;
  eventTypes?: string[];
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly pubSub: PubSub;
  private readonly redis: Redis;
  private readonly subscriptionCounts = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redisUrl');
    
    // Create Redis clients for pub/sub
    const publisher = new Redis(redisUrl);
    const subscriber = new Redis(redisUrl);
    
    this.redis = new Redis(redisUrl);
    
    // Initialize Redis-based PubSub
    this.pubSub = new RedisPubSub({
      publisher,
      subscriber,
      messageEventName: 'message',
      pmessageEventName: 'pmessage',
    });

    this.logger.log('Subscription service initialized with Redis pub/sub');
  }

  /**
   * Publishes an event to all subscribers
   */
  async publish(event: SubscriptionEvent): Promise<void> {
    try {
      const eventKey = this.getEventKey(event.type);
      
      // Add metadata
      const enrichedEvent = {
        ...event,
        timestamp: new Date(),
        id: this.generateEventId(),
      };

      // Publish to main channel
      await this.pubSub.publish(eventKey, enrichedEvent);

      // Publish to filtered channels if applicable
      if (event.userId) {
        await this.pubSub.publish(`${eventKey}:user:${event.userId}`, enrichedEvent);
      }
      
      if (event.teamId) {
        await this.pubSub.publish(`${eventKey}:team:${event.teamId}`, enrichedEvent);
      }
      
      if (event.matchId) {
        await this.pubSub.publish(`${eventKey}:match:${event.matchId}`, enrichedEvent);
      }

      this.logger.debug(`Published event: ${event.type}`, { eventId: enrichedEvent.id });
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Creates a subscription for match analysis progress
   */
  subscribeToMatchAnalysisProgress(matchId: string, filter?: SubscriptionFilter) {
    const channel = filter?.userId 
      ? `MATCH_ANALYSIS_PROGRESS:match:${matchId}:user:${filter.userId}`
      : `MATCH_ANALYSIS_PROGRESS:match:${matchId}`;
    
    this.incrementSubscriptionCount(channel);
    
    return this.pubSub.asyncIterator(channel);
  }

  /**
   * Creates a subscription for live metrics updates
   */
  subscribeToLiveMetrics(matchId: string, filter?: SubscriptionFilter) {
    const channel = filter?.userId 
      ? `LIVE_METRICS:match:${matchId}:user:${filter.userId}`
      : `LIVE_METRICS:match:${matchId}`;
    
    this.incrementSubscriptionCount(channel);
    
    return this.pubSub.asyncIterator(channel);
  }

  /**
   * Creates a subscription for video processing updates
   */
  subscribeToVideoProcessing(videoId: string, filter?: SubscriptionFilter) {
    const channel = filter?.userId 
      ? `VIDEO_PROCESSING:video:${videoId}:user:${filter.userId}`
      : `VIDEO_PROCESSING:video:${videoId}`;
    
    this.incrementSubscriptionCount(channel);
    
    return this.pubSub.asyncIterator(channel);
  }

  /**
   * Creates a subscription for team updates
   */
  subscribeToTeamUpdates(teamId: string, filter?: SubscriptionFilter) {
    const channel = filter?.userId 
      ? `TEAM_UPDATES:team:${teamId}:user:${filter.userId}`
      : `TEAM_UPDATES:team:${teamId}`;
    
    this.incrementSubscriptionCount(channel);
    
    return this.pubSub.asyncIterator(channel);
  }

  /**
   * Creates a subscription for user notifications
   */
  subscribeToUserNotifications(userId: string) {
    const channel = `USER_NOTIFICATIONS:user:${userId}`;
    
    this.incrementSubscriptionCount(channel);
    
    return this.pubSub.asyncIterator(channel);
  }

  /**
   * Publishes match analysis progress update
   */
  async publishMatchAnalysisProgress(data: {
    matchId: string;
    progress: number;
    stage: string;
    message?: string;
    userId?: string;
  }): Promise<void> {
    await this.publish({
      type: 'MATCH_ANALYSIS_PROGRESS',
      payload: data,
      matchId: data.matchId,
      userId: data.userId,
    });
  }

  /**
   * Publishes live metrics update
   */
  async publishLiveMetrics(data: {
    matchId: string;
    metrics: any;
    timestamp: Date;
    userId?: string;
  }): Promise<void> {
    await this.publish({
      type: 'LIVE_METRICS',
      payload: data,
      matchId: data.matchId,
      userId: data.userId,
    });
  }

  /**
   * Publishes video processing update
   */
  async publishVideoProcessingUpdate(data: {
    videoId: string;
    status: string;
    progress?: number;
    message?: string;
    userId?: string;
  }): Promise<void> {
    await this.publish({
      type: 'VIDEO_PROCESSING',
      payload: data,
      userId: data.userId,
    });
  }

  /**
   * Publishes team update
   */
  async publishTeamUpdate(data: {
    teamId: string;
    updateType: string;
    data: any;
    userId?: string;
  }): Promise<void> {
    await this.publish({
      type: 'TEAM_UPDATES',
      payload: data,
      teamId: data.teamId,
      userId: data.userId,
    });
  }

  /**
   * Publishes user notification
   */
  async publishUserNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
    await this.publish({
      type: 'USER_NOTIFICATIONS',
      payload: data,
      userId: data.userId,
    });
  }

  /**
   * Gets subscription statistics
   */
  getSubscriptionStats(): Record<string, number> {
    return Object.fromEntries(this.subscriptionCounts);
  }

  /**
   * Health check for subscription service
   */
  async healthCheck(): Promise<{ redis: boolean; pubsub: boolean }> {
    try {
      await this.redis.ping();
      
      // Test pub/sub functionality
      const testChannel = 'health_check';
      const testMessage = { test: true, timestamp: Date.now() };
      
      await this.pubSub.publish(testChannel, testMessage);
      
      return { redis: true, pubsub: true };
    } catch (error) {
      this.logger.error(`Subscription service health check failed: ${error.message}`);
      return { redis: false, pubsub: false };
    }
  }

  /**
   * Cleanup resources
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Subscription service cleanup completed');
    } catch (error) {
      this.logger.error(`Failed to cleanup subscription service: ${error.message}`);
    }
  }

  // Private methods

  private getEventKey(eventType: string): string {
    return eventType.toUpperCase();
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private incrementSubscriptionCount(channel: string): void {
    const current = this.subscriptionCounts.get(channel) || 0;
    this.subscriptionCounts.set(channel, current + 1);
  }

  private decrementSubscriptionCount(channel: string): void {
    const current = this.subscriptionCounts.get(channel) || 0;
    if (current > 1) {
      this.subscriptionCounts.set(channel, current - 1);
    } else {
      this.subscriptionCounts.delete(channel);
    }
  }
}
