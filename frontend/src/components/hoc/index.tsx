/**
 * Higher-Order Components for Declarative Component Composition
 *
 * Implements the composition pattern with reusable HOCs:
 * - Authentication wrapper
 * - Data loading wrapper
 * - Real-time updates wrapper
 * - Error boundary wrapper
 * - Performance monitoring wrapper
 */

import React, { ComponentType, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';

import { useIsAuthenticated, useAppActions } from '@/store';
import { useRealTimeSync } from '@/hooks/use-real-time-sync';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorFallback } from '@/components/error-fallback';

// Types for HOC props
export interface WithAuthenticationProps {
  requireAuth?: boolean;
  requiredRoles?: string[];
  redirectTo?: string;
}

export interface WithDataProps<T> {
  data?: T;
  loading?: boolean;
  error?: Error | null;
  refetch?: () => void;
}

export interface WithRealTimeProps {
  enableRealTime?: boolean;
  subscriptionKey?: string;
}

export interface WithErrorBoundaryProps {
  fallback?: ComponentType<any>;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

export interface WithPerformanceProps {
  trackPerformance?: boolean;
  performanceKey?: string;
}

/**
 * Authentication HOC
 * Wraps components that require authentication
 */
export function withAuthentication<P extends object>(
  options: WithAuthenticationProps = {}
) {
  return function (WrappedComponent: ComponentType<P>) {
    const WithAuthenticationComponent = (props: P) => {
      const {
        requireAuth = true,
        requiredRoles = [],
        redirectTo = '/auth/login',
      } = options;

      const isAuthenticated = useIsAuthenticated();
      const router = useRouter();
      const [isChecking, setIsChecking] = useState(true);

      useEffect(() => {
        if (requireAuth && !isAuthenticated) {
          router.push(redirectTo);
          return;
        }

        // TODO: Check required roles here
        // const userRoles = useUser()?.roles || [];
        // const hasRequiredRoles = requiredRoles.every(role => userRoles.includes(role));
        // if (requiredRoles.length > 0 && !hasRequiredRoles) {
        //   router.push('/unauthorized');
        //   return;
        // }

        setIsChecking(false);
      }, [isAuthenticated, router]);

      if (requireAuth && isChecking) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        );
      }

      if (requireAuth && !isAuthenticated) {
        return null; // Will redirect
      }

      return <WrappedComponent {...props} />;
    };

    WithAuthenticationComponent.displayName = `withAuthentication(${WrappedComponent.displayName || WrappedComponent.name})`;
    return WithAuthenticationComponent;
  };
}

/**
 * Data Loading HOC
 * Wraps components that depend on data loading
 */
export function withMatchData<P extends object, T = any>(
  dataHook: () => WithDataProps<T>
) {
  return function (WrappedComponent: ComponentType<P & { data: T }>) {
    const WithDataComponent = (props: P) => {
      const { data, loading, error, refetch } = dataHook();

      if (loading) {
        return (
          <div className="flex min-h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        );
      }

      if (error) {
        return (
          <div className="flex min-h-64 flex-col items-center justify-center space-y-4">
            <p className="text-destructive">
              Error loading data: {error.message}
            </p>
            {refetch && (
              <button
                onClick={refetch}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Retry
              </button>
            )}
          </div>
        );
      }

      if (!data) {
        return (
          <div className="flex min-h-64 items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        );
      }

      return <WrappedComponent {...props} data={data} />;
    };

    WithDataComponent.displayName = `withData(${WrappedComponent.displayName || WrappedComponent.name})`;
    return WithDataComponent;
  };
}

/**
 * Real-time Updates HOC
 * Wraps components that need real-time data synchronization
 */
export function withRealTimeUpdates<P extends object>(
  options: WithRealTimeProps = {}
) {
  return function (WrappedComponent: ComponentType<P>) {
    const WithRealTimeComponent = (props: P) => {
      const { enableRealTime = true, subscriptionKey = 'default' } = options;

      const { isConnected, connectionStatus } = useRealTimeSync({
        enabled: enableRealTime,
        key: subscriptionKey,
      });

      // Add real-time status to props
      const enhancedProps = {
        ...props,
        realTime: {
          isConnected,
          connectionStatus,
        },
      } as P & { realTime: { isConnected: boolean; connectionStatus: string } };

      return <WrappedComponent {...enhancedProps} />;
    };

    WithRealTimeComponent.displayName = `withRealTimeUpdates(${WrappedComponent.displayName || WrappedComponent.name})`;
    return WithRealTimeComponent;
  };
}

/**
 * Error Boundary HOC
 * Wraps components with error boundary protection
 */
export function withErrorBoundary<P extends object>(
  options: WithErrorBoundaryProps = {}
) {
  return function (WrappedComponent: ComponentType<P>) {
    const WithErrorBoundaryComponent = (props: P) => {
      const { fallback: FallbackComponent = ErrorFallback, onError } = options;

      const handleError = (
        error: Error,
        errorInfo: { componentStack: string }
      ) => {
        console.error('Component Error:', error);
        console.error('Component Stack:', errorInfo.componentStack);

        if (onError) {
          onError(error, errorInfo);
        }

        // Send to error tracking service
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'exception', {
            description: error.message,
            fatal: false,
          });
        }
      };

      return (
        <ErrorBoundary
          FallbackComponent={FallbackComponent}
          onError={handleError}
          onReset={() => window.location.reload()}
        >
          <WrappedComponent {...props} />
        </ErrorBoundary>
      );
    };

    WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
    return WithErrorBoundaryComponent;
  };
}

/**
 * Performance Monitoring HOC
 * Wraps components with performance tracking
 */
export function withPerformanceMonitoring<P extends object>(
  options: WithPerformanceProps = {}
) {
  return function (WrappedComponent: ComponentType<P>) {
    const WithPerformanceComponent = (props: P) => {
      const { trackPerformance = true, performanceKey } = options;

      const componentName =
        performanceKey ||
        WrappedComponent.displayName ||
        WrappedComponent.name ||
        'Unknown';
      const performanceMonitor = usePerformanceMonitor(componentName);

      useEffect(() => {
        if (trackPerformance) {
          performanceMonitor.startTimer('render');
          return () => {
            performanceMonitor.endTimer('render');
          };
        }
      }, [performanceMonitor, trackPerformance]);

      return <WrappedComponent {...props} />;
    };

    WithPerformanceComponent.displayName = `withPerformanceMonitoring(${WrappedComponent.displayName || WrappedComponent.name})`;
    return WithPerformanceComponent;
  };
}

/**
 * Compose multiple HOCs together
 * Usage: compose(withAuth, withData, withErrorBoundary)(Component)
 */
export function compose<P extends object>(
  ...hocs: Array<(component: ComponentType<any>) => ComponentType<any>>
) {
  return function (WrappedComponent: ComponentType<P>) {
    return hocs.reduceRight((acc, hoc) => hoc(acc), WrappedComponent);
  };
}

/**
 * Pre-composed HOC for common patterns
 */
export function withCommonEnhancements<P extends object>(
  options: {
    requireAuth?: boolean;
    enableRealTime?: boolean;
    trackPerformance?: boolean;
  } = {}
) {
  const {
    requireAuth = true,
    enableRealTime = true,
    trackPerformance = true,
  } = options;

  return compose<P>(
    withErrorBoundary(),
    ...(trackPerformance ? [withPerformanceMonitoring()] : []),
    ...(enableRealTime ? [withRealTimeUpdates()] : []),
    ...(requireAuth ? [withAuthentication()] : [])
  );
}

/**
 * Utility type for extracting props from HOC-wrapped components
 */
export type ExtractProps<T> = T extends ComponentType<infer P> ? P : never;

/**
 * Utility type for components with HOC enhancements
 */
export type EnhancedComponent<P> = ComponentType<P> & {
  displayName?: string;
};
