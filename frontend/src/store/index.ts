/**
 * Global State Management with Zustand
 *
 * Implements event-driven state management with:
 * - Immutable state updates using Immer
 * - Persistence for user preferences
 * - Type-safe store composition
 * - Performance optimizations
 * - Real-time synchronization
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { StateCreator } from 'zustand';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  teamId?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'he' | 'en' | 'ar';
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    matchUpdates: boolean;
    analyticsReports: boolean;
  };
  dashboard: {
    layout: 'grid' | 'list';
    defaultTimeRange: '7d' | '30d' | '90d' | '1y';
    favoriteMetrics: string[];
    autoRefresh: boolean;
    refreshInterval: number;
  };
}

export interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;

  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'he' | 'en' | 'ar';

  // Real-time connections
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';

  // Loading states
  isLoading: boolean;
  loadingStates: Record<string, boolean>;

  // Error handling
  errors: Record<string, string>;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// Actions
export interface AppActions {
  // Authentication actions
  setUser: (user: User | null) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  logout: () => void;

  // UI actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'he' | 'en' | 'ar') => void;

  // Connection actions
  setConnectionStatus: (status: AppState['connectionStatus']) => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setLoadingState: (key: string, loading: boolean) => void;

  // Error actions
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;

  // Notification actions
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// Store type
export type AppStore = AppState & AppActions;

// Initial state
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  sidebarOpen: true,
  theme: 'system',
  language: 'he',
  isConnected: false,
  connectionStatus: 'disconnected',
  isLoading: false,
  loadingStates: {},
  errors: {},
  notifications: [],
  unreadCount: 0,
};

// Store creator with middleware
const createAppStore: StateCreator<
  AppStore,
  [
    ['zustand/devtools', never],
    ['zustand/persist', unknown],
    ['zustand/immer', never],
  ],
  [],
  AppStore
> = (set, get) => ({
  ...initialState,

  // Authentication actions
  setUser: user =>
    set(
      state => {
        state.user = user;
        state.isAuthenticated = !!user;
      },
      false,
      'setUser'
    ),

  updateUserPreferences: preferences =>
    set(
      state => {
        if (state.user) {
          state.user.preferences = {
            ...state.user.preferences,
            ...preferences,
          };
        }
      },
      false,
      'updateUserPreferences'
    ),

  logout: () =>
    set(
      state => {
        state.user = null;
        state.isAuthenticated = false;
        state.notifications = [];
        state.unreadCount = 0;
        state.errors = {};
      },
      false,
      'logout'
    ),

  // UI actions
  toggleSidebar: () =>
    set(
      state => {
        state.sidebarOpen = !state.sidebarOpen;
      },
      false,
      'toggleSidebar'
    ),

  setSidebarOpen: open =>
    set(
      state => {
        state.sidebarOpen = open;
      },
      false,
      'setSidebarOpen'
    ),

  setTheme: theme =>
    set(
      state => {
        state.theme = theme;
        if (state.user) {
          state.user.preferences.theme = theme;
        }
      },
      false,
      'setTheme'
    ),

  setLanguage: language =>
    set(
      state => {
        state.language = language;
        if (state.user) {
          state.user.preferences.language = language;
        }
      },
      false,
      'setLanguage'
    ),

  // Connection actions
  setConnectionStatus: status =>
    set(
      state => {
        state.connectionStatus = status;
        state.isConnected = status === 'connected';
      },
      false,
      'setConnectionStatus'
    ),

  // Loading actions
  setLoading: loading =>
    set(
      state => {
        state.isLoading = loading;
      },
      false,
      'setLoading'
    ),

  setLoadingState: (key, loading) =>
    set(
      state => {
        if (loading) {
          state.loadingStates[key] = true;
        } else {
          delete state.loadingStates[key];
        }
      },
      false,
      'setLoadingState'
    ),

  // Error actions
  setError: (key, error) =>
    set(
      state => {
        state.errors[key] = error;
      },
      false,
      'setError'
    ),

  clearError: key =>
    set(
      state => {
        delete state.errors[key];
      },
      false,
      'clearError'
    ),

  clearAllErrors: () =>
    set(
      state => {
        state.errors = {};
      },
      false,
      'clearAllErrors'
    ),

  // Notification actions
  addNotification: notification =>
    set(
      state => {
        const newNotification: Notification = {
          ...notification,
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          read: false,
        };
        state.notifications.unshift(newNotification);
        state.unreadCount += 1;

        // Limit to 50 notifications
        if (state.notifications.length > 50) {
          state.notifications = state.notifications.slice(0, 50);
        }
      },
      false,
      'addNotification'
    ),

  markNotificationRead: id =>
    set(
      state => {
        const notification = state.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      },
      false,
      'markNotificationRead'
    ),

  markAllNotificationsRead: () =>
    set(
      state => {
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
      },
      false,
      'markAllNotificationsRead'
    ),

  removeNotification: id =>
    set(
      state => {
        const index = state.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
          const notification = state.notifications[index];
          if (!notification.read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications.splice(index, 1);
        }
      },
      false,
      'removeNotification'
    ),

  clearNotifications: () =>
    set(
      state => {
        state.notifications = [];
        state.unreadCount = 0;
      },
      false,
      'clearNotifications'
    ),
});

// Create the store with middleware
export const useAppStore = create<AppStore>()(
  devtools(
    persist(subscribeWithSelector(immer(createAppStore)), {
      name: 'footanalytics-app-store',
      partialize: state => ({
        // Only persist user preferences and UI state
        theme: state.theme,
        language: state.language,
        sidebarOpen: state.sidebarOpen,
        user: state.user
          ? {
              ...state.user,
              // Don't persist sensitive data
            }
          : null,
      }),
      version: 1,
      migrate: (persistedState: any, version) => {
        // Handle migration between versions
        if (version === 0) {
          // Migration from version 0 to 1
          return {
            ...persistedState,
            // Add new fields or transform existing ones
          };
        }
        return persistedState;
      },
    }),
    {
      name: 'FootAnalytics App Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for performance optimization
export const useUser = () => useAppStore(state => state.user);
export const useIsAuthenticated = () =>
  useAppStore(state => state.isAuthenticated);
export const useTheme = () => useAppStore(state => state.theme);
export const useLanguage = () => useAppStore(state => state.language);
export const useSidebarOpen = () => useAppStore(state => state.sidebarOpen);
export const useConnectionStatus = () =>
  useAppStore(state => state.connectionStatus);
export const useIsLoading = () => useAppStore(state => state.isLoading);
export const useLoadingState = (key: string) =>
  useAppStore(state => state.loadingStates[key] || false);
export const useError = (key: string) =>
  useAppStore(state => state.errors[key]);
export const useNotifications = () => useAppStore(state => state.notifications);
export const useUnreadCount = () => useAppStore(state => state.unreadCount);

// Action selectors
export const useAppActions = () =>
  useAppStore(state => ({
    setUser: state.setUser,
    updateUserPreferences: state.updateUserPreferences,
    logout: state.logout,
    toggleSidebar: state.toggleSidebar,
    setSidebarOpen: state.setSidebarOpen,
    setTheme: state.setTheme,
    setLanguage: state.setLanguage,
    setConnectionStatus: state.setConnectionStatus,
    setLoading: state.setLoading,
    setLoadingState: state.setLoadingState,
    setError: state.setError,
    clearError: state.clearError,
    clearAllErrors: state.clearAllErrors,
    addNotification: state.addNotification,
    markNotificationRead: state.markNotificationRead,
    markAllNotificationsRead: state.markAllNotificationsRead,
    removeNotification: state.removeNotification,
    clearNotifications: state.clearNotifications,
  }));
