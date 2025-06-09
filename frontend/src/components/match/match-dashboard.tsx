/**
 * Match Dashboard Component
 *
 * Demonstrates the declarative component composition pattern with:
 * - HOC composition for cross-cutting concerns
 * - Composable hooks for data management
 * - Real-time updates and optimistic UI
 * - Performance optimizations
 * - Accessibility features
 */

'use client';

import React, { memo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

import { useMatchAnalytics } from '@/hooks/use-match-analytics';
import { compose, withCommonEnhancements } from '@/components/hoc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/error-boundary';
import { cn } from '@/lib/utils';

// Lazy-loaded components for performance
const MatchStatsChart = React.lazy(
  () => import('@/components/charts/match-stats-chart')
);
const PlayerHeatmap = React.lazy(
  () => import('@/components/charts/player-heatmap')
);
const EventTimeline = React.lazy(
  () => import('@/components/match/event-timeline')
);
const LiveMetrics = React.lazy(() => import('@/components/match/live-metrics'));

export interface MatchDashboardProps {
  matchId: string;
  className?: string;
  enableRealTime?: boolean;
  showAdvancedMetrics?: boolean;
}

/**
 * Base Match Dashboard Component
 */
const MatchDashboardComponent: React.FC<MatchDashboardProps> = ({
  matchId,
  className,
  enableRealTime = true,
  showAdvancedMetrics = false,
}) => {
  // Intersection observer for lazy loading
  const { ref: dashboardRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  // Match analytics hook with composition
  const {
    analytics,
    isLoading,
    error,
    isConnected,
    lastUpdated,
    refetch,
    updateAnalytics,
    optimisticUpdate,
    performanceMetrics,
  } = useMatchAnalytics({
    matchId,
    includeHistorical: true,
    realTimeUpdates: enableRealTime,
    optimisticUpdates: true,
    onError: error => {
      console.error('Match analytics error:', error);
    },
    onUpdate: analytics => {
      console.log('Analytics updated:', analytics);
    },
  });

  // Loading state
  if (isLoading && !analytics) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error && !analytics) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center space-y-4">
        <p className="text-destructive">Failed to load match analytics</p>
        <Button onClick={refetch} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // No data state
  if (!analytics) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div ref={dashboardRef} className={cn('space-y-6 p-6', className)}>
      {/* Header with real-time status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Match Analytics</h1>
          <p className="text-muted-foreground">
            {analytics.match?.homeTeam?.name} vs{' '}
            {analytics.match?.awayTeam?.name}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Real-time connection status */}
          <Badge
            variant={isConnected ? 'success' : 'destructive'}
            className="animate-pulse"
          >
            {isConnected ? 'Live' : 'Offline'}
          </Badge>

          {/* Last updated */}
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}

          {/* Performance metrics in development */}
          {process.env.NODE_ENV === 'development' && (
            <Badge variant="outline">{performanceMetrics.queryTime}ms</Badge>
          )}
        </div>
      </div>

      {/* Main content with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={analytics.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {/* Live Metrics */}
          {enableRealTime && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Live Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ErrorBoundary
                  fallback={<div>Failed to load live metrics</div>}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <LiveMetrics
                      matchId={matchId}
                      analytics={analytics}
                      onUpdate={optimisticUpdate}
                    />
                  </Suspense>
                </ErrorBoundary>
              </CardContent>
            </Card>
          )}

          {/* Team Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Team Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorBoundary fallback={<div>Failed to load team stats</div>}>
                <Suspense fallback={<LoadingSpinner />}>
                  <MatchStatsChart
                    homeTeam={analytics.homeTeam}
                    awayTeam={analytics.awayTeam}
                    animated={inView}
                  />
                </Suspense>
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Player Heatmap */}
          {showAdvancedMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Player Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <ErrorBoundary fallback={<div>Failed to load heatmap</div>}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <PlayerHeatmap
                      heatmaps={analytics.heatmaps}
                      animated={inView}
                    />
                  </Suspense>
                </ErrorBoundary>
              </CardContent>
            </Card>
          )}

          {/* Event Timeline */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Match Events</CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorBoundary fallback={<div>Failed to load timeline</div>}>
                <Suspense fallback={<LoadingSpinner />}>
                  <EventTimeline
                    events={analytics.events}
                    timeline={analytics.timeline}
                    animated={inView}
                  />
                </Suspense>
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Quick Stats Cards */}
          <div className="grid gap-4 md:col-span-2 lg:col-span-3 lg:grid-cols-4">
            <StatCard
              title="xG"
              homeValue={analytics.homeTeam.xG}
              awayValue={analytics.awayTeam.xG}
              format={value => value.toFixed(2)}
            />
            <StatCard
              title="Possession"
              homeValue={analytics.homeTeam.possession}
              awayValue={analytics.awayTeam.possession}
              format={value => `${value.toFixed(1)}%`}
            />
            <StatCard
              title="Shots"
              homeValue={analytics.homeTeam.shots}
              awayValue={analytics.awayTeam.shots}
            />
            <StatCard
              title="Pass Accuracy"
              homeValue={analytics.homeTeam.passAccuracy}
              awayValue={analytics.awayTeam.passAccuracy}
              format={value => `${value.toFixed(1)}%`}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  homeValue: number;
  awayValue: number;
  format?: (value: number) => string;
}

const StatCard = memo<StatCardProps>(
  ({ title, homeValue, awayValue, format = v => v.toString() }) => (
    <Card>
      <CardContent className="p-4">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold text-blue-600">
              {format(homeValue)}
            </span>
            <span className="text-lg font-bold text-red-600">
              {format(awayValue)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
);

StatCard.displayName = 'StatCard';

/**
 * Enhanced Match Dashboard with HOC composition
 */
export const MatchDashboard = compose(
  withCommonEnhancements({
    requireAuth: true,
    enableRealTime: true,
    trackPerformance: true,
  })
)(MatchDashboardComponent);

/**
 * Alternative composition for public view
 */
export const PublicMatchDashboard = compose(
  withCommonEnhancements({
    requireAuth: false,
    enableRealTime: false,
    trackPerformance: false,
  })
)(MatchDashboardComponent);

// Export the base component for testing
export { MatchDashboardComponent };

// Default export
export default MatchDashboard;
