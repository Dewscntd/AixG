/**
 * Analytics Micro-Frontend
 *
 * Self-contained analytics module implementing:
 * - Module Federation compatibility
 * - Independent state management
 * - Lazy loading and code splitting
 * - Real-time data synchronization
 * - Performance optimizations
 */

'use client';

import React, { Suspense, lazy, memo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AnalyticsProvider } from './providers/analytics-provider';
import { AnalyticsErrorFallback } from './components/analytics-error-fallback';
import { AnalyticsLoadingSpinner } from './components/analytics-loading-spinner';
import { withCommonEnhancements } from '@/components/hoc';

// Lazy-loaded components for code splitting
const AnalyticsDashboard = lazy(
  () => import('./components/analytics-dashboard')
);
const MatchAnalytics = lazy(() => import('./components/match-analytics'));
const TeamAnalytics = lazy(() => import('./components/team-analytics'));
const PlayerAnalytics = lazy(() => import('./components/player-analytics'));
const AnalyticsReports = lazy(() => import('./components/analytics-reports'));

// Types
export interface AnalyticsMicroFrontendProps {
  mode?: 'dashboard' | 'match' | 'team' | 'player' | 'reports';
  matchId?: string;
  teamId?: string;
  playerId?: string;
  timeRange?: string;
  className?: string;
  onNavigate?: (route: string) => void;
}

// Create isolated query client for this micro-frontend
const createAnalyticsQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
};

/**
 * Analytics Micro-Frontend Root Component
 */
const AnalyticsMicroFrontendComponent: React.FC<
  AnalyticsMicroFrontendProps
> = ({
  mode = 'dashboard',
  matchId,
  teamId,
  playerId,
  timeRange = '7d',
  className,
  onNavigate,
}) => {
  // Create isolated query client
  const [queryClient] = React.useState(() => createAnalyticsQueryClient());

  // Render appropriate component based on mode
  const renderAnalyticsComponent = () => {
    switch (mode) {
      case 'match':
        if (!matchId) {
          throw new Error('matchId is required for match analytics mode');
        }
        return (
          <MatchAnalytics
            matchId={matchId}
            timeRange={timeRange}
            onNavigate={onNavigate}
          />
        );

      case 'team':
        if (!teamId) {
          throw new Error('teamId is required for team analytics mode');
        }
        return (
          <TeamAnalytics
            teamId={teamId}
            timeRange={timeRange}
            onNavigate={onNavigate}
          />
        );

      case 'player':
        if (!playerId) {
          throw new Error('playerId is required for player analytics mode');
        }
        return (
          <PlayerAnalytics
            playerId={playerId}
            timeRange={timeRange}
            onNavigate={onNavigate}
          />
        );

      case 'reports':
        return (
          <AnalyticsReports
            teamId={teamId}
            timeRange={timeRange}
            onNavigate={onNavigate}
          />
        );

      case 'dashboard':
      default:
        return (
          <AnalyticsDashboard
            teamId={teamId}
            timeRange={timeRange}
            onNavigate={onNavigate}
          />
        );
    }
  };

  return (
    <div className={className}>
      <QueryClientProvider client={queryClient}>
        <AnalyticsProvider>
          <ErrorBoundary
            FallbackComponent={AnalyticsErrorFallback}
            onError={(error, errorInfo) => {
              console.error('Analytics Micro-Frontend Error:', error);
              console.error('Error Info:', errorInfo);

              // Send to error tracking service
              if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'exception', {
                  description: `Analytics MF: ${error.message}`,
                  fatal: false,
                });
              }
            }}
            onReset={() => {
              // Reset analytics state
              queryClient.clear();
            }}
          >
            <Suspense fallback={<AnalyticsLoadingSpinner />}>
              {renderAnalyticsComponent()}
            </Suspense>
          </ErrorBoundary>
        </AnalyticsProvider>
      </QueryClientProvider>
    </div>
  );
};

/**
 * Enhanced Analytics Micro-Frontend with HOCs
 */
export const AnalyticsMicroFrontend = memo(
  withCommonEnhancements({
    requireAuth: true,
    enableRealTime: true,
    trackPerformance: true,
  })(AnalyticsMicroFrontendComponent)
);

/**
 * Public Analytics Micro-Frontend (no auth required)
 */
export const PublicAnalyticsMicroFrontend = memo(
  withCommonEnhancements({
    requireAuth: false,
    enableRealTime: false,
    trackPerformance: false,
  })(AnalyticsMicroFrontendComponent)
);

/**
 * Module Federation Export
 * This allows the analytics module to be consumed by other micro-frontends
 */
export default AnalyticsMicroFrontend;

// Named exports for specific components
export { AnalyticsMicroFrontend, PublicAnalyticsMicroFrontend };

// Export types for external consumption
export type { AnalyticsMicroFrontendProps };

// Micro-frontend metadata for Module Federation
export const microFrontendMetadata = {
  name: 'analytics',
  version: '1.0.0',
  description: 'Analytics micro-frontend for FootAnalytics platform',
  dependencies: {
    react: '^18.2.0',
    'react-dom': '^18.2.0',
    '@tanstack/react-query': '^5.0.0',
  },
  exposedComponents: {
    './AnalyticsMicroFrontend': './src/micro-frontends/analytics/index.tsx',
    './MatchAnalytics':
      './src/micro-frontends/analytics/components/match-analytics.tsx',
    './TeamAnalytics':
      './src/micro-frontends/analytics/components/team-analytics.tsx',
    './PlayerAnalytics':
      './src/micro-frontends/analytics/components/player-analytics.tsx',
  },
  sharedDependencies: [
    'react',
    'react-dom',
    '@tanstack/react-query',
    'zustand',
  ],
};

/**
 * Utility function for dynamic imports in Module Federation
 */
export const loadAnalyticsModule = async () => {
  try {
    // Dynamic import for Module Federation
    const module = await import('./index');
    return module.default;
  } catch (error) {
    console.error('Failed to load analytics module:', error);
    throw error;
  }
};

/**
 * Bootstrap function for standalone mode
 */
export const bootstrapAnalytics = (
  containerId: string,
  props: AnalyticsMicroFrontendProps
) => {
  if (typeof window === 'undefined') return;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  // Create React root and render
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(container);
    root.render(React.createElement(AnalyticsMicroFrontend, props));
  });
};

/**
 * Cleanup function for unmounting
 */
export const cleanupAnalytics = (containerId: string) => {
  if (typeof window === 'undefined') return;

  const container = document.getElementById(containerId);
  if (container) {
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(container);
      root.unmount();
    });
  }
};

// Global registration for Module Federation
if (typeof window !== 'undefined') {
  (window as any).__ANALYTICS_MF__ = {
    AnalyticsMicroFrontend,
    PublicAnalyticsMicroFrontend,
    loadAnalyticsModule,
    bootstrapAnalytics,
    cleanupAnalytics,
    metadata: microFrontendMetadata,
  };
}
