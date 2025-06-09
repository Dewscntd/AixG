/**
 * Global Providers Component
 *
 * Implements the provider composition pattern with:
 * - TanStack Query for server state management
 * - Apollo Client for GraphQL operations
 * - Theme provider for dark/light mode
 * - Error boundary for graceful error handling
 * - Performance monitoring
 */

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from 'next-themes';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'react-hot-toast';

import { apolloClient } from '@/lib/apollo-client';
import { ErrorFallback } from '@/components/error-fallback';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring';

interface ProvidersProps {
  children: ReactNode;
  locale: string;
}

// Query client configuration with optimizations
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time - data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Cache time - data stays in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors except 408, 429
          if (
            error?.status >= 400 &&
            error?.status < 500 &&
            ![408, 429].includes(error.status)
          ) {
            return false;
          }
          // Retry up to 3 times with exponential backoff
          return failureCount < 3;
        },
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus only if data is stale
        refetchOnWindowFocus: 'always',
        // Refetch on reconnect
        refetchOnReconnect: 'always',
        // Background refetch interval (5 minutes)
        refetchInterval: 5 * 60 * 1000,
        // Network mode
        networkMode: 'offlineFirst',
      },
      mutations: {
        // Retry mutations once
        retry: 1,
        // Network mode for mutations
        networkMode: 'online',
      },
    },
  });
}

// Performance monitoring wrapper
function PerformanceProvider({ children }: { children: ReactNode }) {
  usePerformanceMonitoring();
  return <>{children}</>;
}

// Theme provider wrapper with system preference detection
function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="footanalytics-theme"
    >
      {children}
    </ThemeProvider>
  );
}

// Error boundary wrapper with custom error handling
function AppErrorBoundary({ children }: { children: ReactNode }) {
  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    // Log error to monitoring service
    console.error('Application Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);

    // Send to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => window.location.reload()}
    >
      {children}
    </ErrorBoundary>
  );
}

// Apollo provider wrapper with error handling
function AppApolloProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => apolloClient);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

// React Query provider wrapper
function AppQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// Hydration boundary to prevent SSR mismatches
function HydrationBoundary({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}

// Main providers component using composition pattern
export function Providers({ children, locale }: ProvidersProps) {
  return (
    <AppErrorBoundary>
      <HydrationBoundary>
        <AppThemeProvider>
          <AppQueryProvider>
            <AppApolloProvider>
              <PerformanceProvider>
                {children}

                {/* Global toast notifications */}
                <Toaster
                  position="top-center"
                  reverseOrder={false}
                  gutter={8}
                  containerClassName="toast-container"
                  containerStyle={{
                    top: 20,
                    left: 20,
                    bottom: 20,
                    right: 20,
                  }}
                  toastOptions={{
                    // Default options
                    duration: 4000,
                    style: {
                      background: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      padding: '0.75rem 1rem',
                      boxShadow:
                        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    },
                    // Success toast
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: 'hsl(var(--success))',
                        secondary: 'hsl(var(--success-foreground))',
                      },
                    },
                    // Error toast
                    error: {
                      duration: 6000,
                      iconTheme: {
                        primary: 'hsl(var(--destructive))',
                        secondary: 'hsl(var(--destructive-foreground))',
                      },
                    },
                    // Loading toast
                    loading: {
                      duration: Infinity,
                    },
                  }}
                />
              </PerformanceProvider>
            </AppApolloProvider>
          </AppQueryProvider>
        </AppThemeProvider>
      </HydrationBoundary>
    </AppErrorBoundary>
  );
}

// Higher-order component for provider composition
export function withProviders<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WrappedComponent(props: P & { locale?: string }) {
    const { locale = 'he', ...componentProps } = props;

    return (
      <Providers locale={locale}>
        <Component {...(componentProps as P)} />
      </Providers>
    );
  };
}

// Hook for accessing query client
export function useQueryClient() {
  const { QueryClient } = require('@tanstack/react-query');
  return QueryClient;
}

// Hook for accessing Apollo client
export function useApolloClient() {
  const { useApolloClient } = require('@apollo/client');
  return useApolloClient();
}
