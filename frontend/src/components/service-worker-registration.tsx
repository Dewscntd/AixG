/**
 * Service Worker Registration Component
 * 
 * Handles PWA service worker registration with:
 * - Offline-first caching strategy
 * - Background sync for data updates
 * - Push notification support
 * - Update notifications
 * - Performance monitoring
 */

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppActions } from '@/store';

interface ServiceWorkerRegistrationProps {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export function ServiceWorkerRegistration({
  onUpdate,
  onSuccess,
  onError,
}: ServiceWorkerRegistrationProps = {}) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { addNotification } = useAppActions();

  useEffect(() => {
    // Only register service worker in production and if supported
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      setRegistration(registration);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available
              setUpdateAvailable(true);
              
              addNotification({
                type: 'info',
                title: 'Update Available',
                message: 'A new version of FootAnalytics is available. Refresh to update.',
                actions: [
                  {
                    label: 'Update Now',
                    action: () => {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    },
                  },
                  {
                    label: 'Later',
                    action: () => {
                      // User chose to update later
                    },
                  },
                ],
              });

              if (onUpdate) {
                onUpdate(registration);
              }
            } else {
              // Content is cached for offline use
              toast.success('FootAnalytics is ready for offline use');
              
              if (onSuccess) {
                onSuccess(registration);
              }
            }
          }
        });
      });

      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'CACHE_UPDATED':
            console.log('Cache updated:', payload);
            break;
          
          case 'BACKGROUND_SYNC':
            console.log('Background sync completed:', payload);
            toast.success('Data synchronized');
            break;
          
          case 'PUSH_NOTIFICATION':
            // Handle push notifications
            showNotification(payload);
            break;
          
          case 'OFFLINE_FALLBACK':
            toast.error('You are offline. Some features may be limited.');
            break;
          
          default:
            console.log('Unknown service worker message:', event.data);
        }
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

      console.log('Service Worker registered successfully');

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      
      if (onError) {
        onError(error as Error);
      }
    }
  };

  const showNotification = async (payload: any) => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: payload.tag || 'footanalytics',
        data: payload.data,
        actions: payload.actions || [],
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        vibrate: payload.vibrate || [200, 100, 200],
      });

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        if (payload.url) {
          window.location.href = payload.url;
        }
        
        notification.close();
      };

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!payload.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return Notification.permission === 'granted';
  };

  // Subscribe to push notifications
  const subscribeToPushNotifications = async () => {
    if (!registration) {
      console.warn('Service Worker not registered');
      return null;
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      console.log('Push notification subscription successful');
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  };

  // Background sync for offline data
  const scheduleBackgroundSync = async (tag: string, data?: any) => {
    if (!registration) {
      console.warn('Service Worker not registered');
      return;
    }

    try {
      await registration.sync.register(tag);
      
      // Store data for background sync
      if (data) {
        const cache = await caches.open('background-sync-data');
        await cache.put(
          new Request(`/sync/${tag}`),
          new Response(JSON.stringify(data))
        );
      }

      console.log('Background sync scheduled:', tag);
    } catch (error) {
      console.error('Failed to schedule background sync:', error);
    }
  };

  // Expose service worker utilities
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Add utilities to window object for global access
      (window as any).footAnalyticsSW = {
        requestNotificationPermission,
        subscribeToPushNotifications,
        scheduleBackgroundSync,
        updateAvailable,
        registration,
      };
    }
  }, [registration, updateAvailable]);

  return null; // This component doesn't render anything
}

// Hook for using service worker features
export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA install prompt
    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // App installed
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success('FootAnalytics installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error during app installation:', error);
      return false;
    } finally {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return {
    isOnline,
    isInstallable,
    installApp,
    serviceWorker: typeof window !== 'undefined' ? (window as any).footAnalyticsSW : null,
  };
}

export default ServiceWorkerRegistration;
