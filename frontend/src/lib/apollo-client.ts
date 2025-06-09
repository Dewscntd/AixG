/**
 * Apollo Client Configuration
 *
 * Implements a comprehensive GraphQL client with:
 * - HTTP and WebSocket transport
 * - Authentication handling
 * - Caching strategies
 * - Error handling and retry logic
 * - Offline support
 * - Performance optimizations
 */

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  split,
  type NormalizedCacheObject,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { sha256 } from 'crypto-hash';

// Environment variables
const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';
const WS_ENDPOINT = process.env.WS_ENDPOINT || 'ws://localhost:4000/graphql';

// Authentication token management
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth-token');
}

function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth-token', token);
}

function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth-token');
}

// HTTP Link configuration
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
  credentials: 'include',
  fetchOptions: {
    mode: 'cors',
  },
});

// WebSocket Link configuration for subscriptions
const wsLink =
  typeof window !== 'undefined'
    ? new GraphQLWsLink(
        createClient({
          url: WS_ENDPOINT,
          connectionParams: () => {
            const token = getAuthToken();
            return token ? { authorization: `Bearer ${token}` } : {};
          },
          retryAttempts: 5,
          shouldRetry: errOrCloseEvent => {
            // Retry on network errors, but not on authentication errors
            if (errOrCloseEvent instanceof CloseEvent) {
              return errOrCloseEvent.code !== 4401; // Don't retry on auth errors
            }
            return true;
          },
          on: {
            connected: () => console.log('WebSocket connected'),
            closed: () => console.log('WebSocket closed'),
            error: error => console.error('WebSocket error:', error),
          },
        })
      )
    : null;

// Authentication link
const authLink = setContext((_, { headers }) => {
  const token = getAuthToken();

  return {
    headers: {
      ...headers,
      ...(token && { authorization: `Bearer ${token}` }),
      'Apollo-Require-Preflight': 'true',
    },
  };
});

// Error handling link
const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    // Handle GraphQL errors
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path, extensions }) => {
        console.error(
          `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
        );

        // Handle authentication errors
        if (extensions?.code === 'UNAUTHENTICATED') {
          removeAuthToken();
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }

        // Handle authorization errors
        if (extensions?.code === 'FORBIDDEN') {
          console.warn('Access denied to resource');
          // Could show a toast notification here
        }
      });
    }

    // Handle network errors
    if (networkError) {
      console.error(`Network error: ${networkError}`);

      // Handle specific network error types
      if ('statusCode' in networkError) {
        switch (networkError.statusCode) {
          case 401:
            removeAuthToken();
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login';
            }
            break;
          case 403:
            console.warn('Access forbidden');
            break;
          case 500:
            console.error('Server error');
            break;
          default:
            console.error('Unknown network error');
        }
      }
    }
  }
);

// Retry link configuration
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Retry on network errors and server errors, but not on client errors
      return !!error && !error.message.includes('4');
    },
  },
});

// Persisted queries link for performance
const persistedQueriesLink = createPersistedQueryLink({
  sha256,
  useGETForHashedQueries: true,
});

// Split link to route queries/mutations to HTTP and subscriptions to WebSocket
const splitLink = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      from([persistedQueriesLink, authLink, errorLink, retryLink, httpLink])
    )
  : from([persistedQueriesLink, authLink, errorLink, retryLink, httpLink]);

// Cache configuration with type policies
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Pagination for matches
        matches: {
          keyArgs: ['filter', 'sort'],
          merge(existing = [], incoming, { args }) {
            const { offset = 0 } = args || {};
            const merged = existing ? existing.slice() : [];
            for (let i = 0; i < incoming.length; ++i) {
              merged[offset + i] = incoming[i];
            }
            return merged;
          },
        },
        // Pagination for videos
        videos: {
          keyArgs: ['filter', 'sort'],
          merge(existing = [], incoming, { args }) {
            const { offset = 0 } = args || {};
            const merged = existing ? existing.slice() : [];
            for (let i = 0; i < incoming.length; ++i) {
              merged[offset + i] = incoming[i];
            }
            return merged;
          },
        },
        // Real-time analytics updates
        matchAnalytics: {
          merge(existing, incoming) {
            return { ...existing, ...incoming };
          },
        },
      },
    },
    Match: {
      fields: {
        analytics: {
          merge(existing, incoming) {
            return { ...existing, ...incoming };
          },
        },
      },
    },
    Team: {
      fields: {
        players: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
        matches: {
          keyArgs: ['timeRange'],
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
    Video: {
      fields: {
        processingJobs: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
  },
  possibleTypes: {
    // Add possible types for union and interface types
    AnalyticsResult: ['MatchAnalytics', 'TeamAnalytics', 'PlayerAnalytics'],
    MediaAsset: ['Video', 'Image', 'Document'],
  },
});

// Apollo Client instance
export const apolloClient = new ApolloClient<NormalizedCacheObject>({
  link: splitLink,
  cache,
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
      fetchPolicy: 'cache-and-network',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: process.env.NODE_ENV === 'development',
  name: 'FootAnalytics Web Client',
  version: '1.0.0',
});

// Helper functions for authentication
export const authHelpers = {
  setToken: setAuthToken,
  getToken: getAuthToken,
  removeToken: removeAuthToken,

  // Login helper
  async login(token: string) {
    setAuthToken(token);
    await apolloClient.resetStore(); // Clear cache and refetch queries
  },

  // Logout helper
  async logout() {
    removeAuthToken();
    await apolloClient.clearStore(); // Clear cache without refetching
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!getAuthToken();
  },
};

// Cache helpers
export const cacheHelpers = {
  // Clear specific cache entries
  evictCache(typename: string, id?: string) {
    if (id) {
      apolloClient.cache.evict({ id: `${typename}:${id}` });
    } else {
      apolloClient.cache.evict({ fieldName: typename });
    }
    apolloClient.cache.gc();
  },

  // Update cache after mutation
  updateCache<T>(typename: string, id: string, data: Partial<T>) {
    apolloClient.cache.modify({
      id: `${typename}:${id}`,
      fields: {
        ...data,
      },
    });
  },

  // Read from cache
  readCache<T>(typename: string, id: string): T | null {
    return apolloClient.cache.readFragment({
      id: `${typename}:${id}`,
      fragment: require('graphql-tag')`
        fragment ${typename}Fragment on ${typename} {
          id
        }
      `,
    });
  },
};

export default apolloClient;
