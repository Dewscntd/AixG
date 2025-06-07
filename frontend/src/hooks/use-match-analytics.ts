/**
 * Composable Match Analytics Hook
 * 
 * Implements the composable hooks pattern with:
 * - Real-time data synchronization
 * - Optimistic updates
 * - Error handling and retry logic
 * - Performance optimizations
 * - Type-safe data access
 */

import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'react-hot-toast';

import { useAppActions, useLoadingState, useError } from '@/store';
import { useOptimisticUpdate } from '@/hooks/use-optimistic-update';
import { useRealTimeSync } from '@/hooks/use-real-time-sync';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';

import {
  GET_MATCH_ANALYTICS,
  MATCH_ANALYTICS_UPDATED_SUBSCRIPTION,
  UPDATE_MATCH_ANALYTICS,
  type MatchAnalytics,
  type UpdateMatchAnalyticsInput,
  type MatchAnalyticsUpdatedSubscription,
} from '@/generated/graphql';

export interface UseMatchAnalyticsOptions {
  matchId: string;
  includeHistorical?: boolean;
  realTimeUpdates?: boolean;
  optimisticUpdates?: boolean;
  pollInterval?: number;
  onError?: (error: Error) => void;
  onUpdate?: (analytics: MatchAnalytics) => void;
}

export interface UseMatchAnalyticsReturn {
  // Data
  analytics: MatchAnalytics | null;
  isLoading: boolean;
  error: Error | null;
  
  // Real-time status
  isConnected: boolean;
  lastUpdated: Date | null;
  
  // Actions
  refetch: () => Promise<void>;
  updateAnalytics: (input: UpdateMatchAnalyticsInput) => Promise<void>;
  
  // Optimistic updates
  optimisticUpdate: (update: Partial<MatchAnalytics>) => void;
  revertOptimisticUpdate: () => void;
  
  // Performance metrics
  performanceMetrics: {
    queryTime: number;
    subscriptionLatency: number;
    updateCount: number;
  };
}

/**
 * Main hook for match analytics with composition pattern
 */
export function useMatchAnalytics(options: UseMatchAnalyticsOptions): UseMatchAnalyticsReturn {
  const {
    matchId,
    includeHistorical = false,
    realTimeUpdates = true,
    optimisticUpdates = true,
    pollInterval = 30000, // 30 seconds
    onError,
    onUpdate,
  } = options;

  // Store actions
  const { setLoadingState, setError, clearError } = useAppActions();
  
  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor(`match-analytics-${matchId}`);
  
  // Debounced match ID to prevent excessive queries
  const [debouncedMatchId] = useDebounce(matchId, 300);
  
  // Refs for tracking
  const lastUpdatedRef = useRef<Date | null>(null);
  const updateCountRef = useRef(0);

  // Query for match analytics
  const {
    data: queryData,
    loading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery(GET_MATCH_ANALYTICS, {
    variables: {
      matchId: debouncedMatchId,
      includeHistorical,
    },
    skip: !debouncedMatchId,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    pollInterval: realTimeUpdates ? 0 : pollInterval, // Disable polling if using subscriptions
    onCompleted: (data) => {
      performanceMonitor.recordMetric('queryTime', Date.now());
      clearError(`match-analytics-${matchId}`);
      if (onUpdate && data.getMatchAnalytics) {
        onUpdate(data.getMatchAnalytics);
      }
    },
    onError: (error) => {
      setError(`match-analytics-${matchId}`, error.message);
      if (onError) {
        onError(error);
      }
    },
  });

  // Subscription for real-time updates
  const {
    data: subscriptionData,
    loading: subscriptionLoading,
    error: subscriptionError,
  } = useSubscription<MatchAnalyticsUpdatedSubscription>(
    MATCH_ANALYTICS_UPDATED_SUBSCRIPTION,
    {
      variables: { matchId: debouncedMatchId },
      skip: !realTimeUpdates || !debouncedMatchId,
      onData: ({ data }) => {
        if (data.data?.matchAnalyticsUpdated) {
          const latency = Date.now() - new Date(data.data.matchAnalyticsUpdated.lastUpdated).getTime();
          performanceMonitor.recordMetric('subscriptionLatency', latency);
          updateCountRef.current += 1;
          lastUpdatedRef.current = new Date();
          
          if (onUpdate) {
            onUpdate(data.data.matchAnalyticsUpdated);
          }
        }
      },
      onError: (error) => {
        setError(`match-analytics-subscription-${matchId}`, error.message);
        if (onError) {
          onError(error);
        }
      },
    }
  );

  // Mutation for updating analytics
  const [updateAnalyticsMutation, { loading: updateLoading }] = useMutation(
    UPDATE_MATCH_ANALYTICS,
    {
      onCompleted: () => {
        toast.success('Analytics updated successfully');
        clearError(`match-analytics-update-${matchId}`);
      },
      onError: (error) => {
        toast.error('Failed to update analytics');
        setError(`match-analytics-update-${matchId}`, error.message);
        if (onError) {
          onError(error);
        }
      },
    }
  );

  // Optimistic updates hook
  const {
    optimisticData,
    applyOptimisticUpdate,
    revertOptimisticUpdate,
  } = useOptimisticUpdate<MatchAnalytics>(
    subscriptionData?.matchAnalyticsUpdated || queryData?.getMatchAnalytics,
    optimisticUpdates
  );

  // Real-time sync hook
  const { isConnected } = useRealTimeSync({
    enabled: realTimeUpdates,
    onConnectionChange: (connected) => {
      if (!connected) {
        toast.error('Lost real-time connection');
      } else {
        toast.success('Real-time connection restored');
      }
    },
  });

  // Combined loading state
  const isLoading = queryLoading || subscriptionLoading || updateLoading;
  
  // Update loading state in store
  useEffect(() => {
    setLoadingState(`match-analytics-${matchId}`, isLoading);
  }, [isLoading, matchId, setLoadingState]);

  // Combined error
  const error = queryError || subscriptionError;

  // Get the most recent analytics data
  const analytics = useMemo(() => {
    return optimisticData || 
           subscriptionData?.matchAnalyticsUpdated || 
           queryData?.getMatchAnalytics || 
           null;
  }, [optimisticData, subscriptionData, queryData]);

  // Refetch function
  const refetch = useCallback(async () => {
    try {
      await queryRefetch();
    } catch (error) {
      console.error('Failed to refetch analytics:', error);
      throw error;
    }
  }, [queryRefetch]);

  // Update analytics function
  const updateAnalytics = useCallback(async (input: UpdateMatchAnalyticsInput) => {
    try {
      // Apply optimistic update if enabled
      if (optimisticUpdates && analytics) {
        applyOptimisticUpdate({
          ...analytics,
          ...input,
          lastUpdated: new Date().toISOString(),
        });
      }

      await updateAnalyticsMutation({
        variables: {
          matchId: debouncedMatchId,
          input,
        },
        // Optimistic response
        optimisticResponse: optimisticUpdates ? {
          updateMatchAnalytics: {
            ...analytics,
            ...input,
            lastUpdated: new Date().toISOString(),
          },
        } : undefined,
        // Update cache
        update: (cache, { data }) => {
          if (data?.updateMatchAnalytics) {
            cache.writeQuery({
              query: GET_MATCH_ANALYTICS,
              variables: {
                matchId: debouncedMatchId,
                includeHistorical,
              },
              data: {
                getMatchAnalytics: data.updateMatchAnalytics,
              },
            });
          }
        },
      });
    } catch (error) {
      // Revert optimistic update on error
      if (optimisticUpdates) {
        revertOptimisticUpdate();
      }
      throw error;
    }
  }, [
    debouncedMatchId,
    analytics,
    optimisticUpdates,
    applyOptimisticUpdate,
    revertOptimisticUpdate,
    updateAnalyticsMutation,
    includeHistorical,
  ]);

  // Performance metrics
  const performanceMetrics = useMemo(() => ({
    queryTime: performanceMonitor.getMetric('queryTime') || 0,
    subscriptionLatency: performanceMonitor.getMetric('subscriptionLatency') || 0,
    updateCount: updateCountRef.current,
  }), [performanceMonitor]);

  return {
    // Data
    analytics,
    isLoading,
    error,
    
    // Real-time status
    isConnected,
    lastUpdated: lastUpdatedRef.current,
    
    // Actions
    refetch,
    updateAnalytics,
    
    // Optimistic updates
    optimisticUpdate: applyOptimisticUpdate,
    revertOptimisticUpdate,
    
    // Performance metrics
    performanceMetrics,
  };
}

/**
 * Composition helper for multiple match analytics
 */
export function useMultipleMatchAnalytics(matchIds: string[]) {
  const analyticsHooks = matchIds.map(matchId => 
    useMatchAnalytics({ matchId })
  );

  return {
    analytics: analyticsHooks.map(hook => hook.analytics),
    isLoading: analyticsHooks.some(hook => hook.isLoading),
    errors: analyticsHooks.map(hook => hook.error).filter(Boolean),
    refetchAll: () => Promise.all(analyticsHooks.map(hook => hook.refetch())),
  };
}

/**
 * Higher-order hook for analytics with caching
 */
export function useMatchAnalyticsWithCache(options: UseMatchAnalyticsOptions) {
  const baseHook = useMatchAnalytics(options);
  
  // Add additional caching logic here if needed
  // This could include local storage caching, service worker caching, etc.
  
  return baseHook;
}
