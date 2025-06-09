/**
 * Dashboard Page
 *
 * Main dashboard implementing:
 * - Server-side rendering with Next.js 14 App Router
 * - Real-time analytics updates
 * - Responsive design with micro-frontend architecture
 * - Performance optimizations
 * - Hebrew RTL support
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { RecentMatches } from '@/components/dashboard/recent-matches';
import { LiveMatches } from '@/components/dashboard/live-matches';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { AnalyticsOverview } from '@/components/dashboard/analytics-overview';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/error-boundary';

// Lazy-loaded components for performance
const VideoProcessingQueue = lazy(
  () => import('@/components/dashboard/video-processing-queue')
);
const TeamPerformance = lazy(
  () => import('@/components/dashboard/team-performance')
);
const UpcomingMatches = lazy(
  () => import('@/components/dashboard/upcoming-matches')
);
const RecentActivity = lazy(
  () => import('@/components/dashboard/recent-activity')
);

interface DashboardPageProps {
  params: {
    locale: string;
  };
  searchParams: {
    tab?: string;
    timeRange?: string;
    teamId?: string;
  };
}

// Generate metadata for SEO
export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}

export default async function DashboardPage({
  params: { locale },
  searchParams,
}: DashboardPageProps) {
  // Validate locale
  const validLocales = ['he', 'en', 'ar'];
  if (!validLocales.includes(locale)) {
    notFound();
  }

  // Get translations
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  // Extract search params
  const { tab = 'overview', timeRange = '7d', teamId } = searchParams;

  return (
    <DashboardLayout locale={locale}>
      {/* Dashboard Header */}
      <DashboardHeader
        title={t('title')}
        subtitle={t('subtitle')}
        timeRange={timeRange}
        onTimeRangeChange={range => {
          // Handle time range change
          const url = new URL(window.location.href);
          url.searchParams.set('timeRange', range);
          window.history.pushState({}, '', url.toString());
        }}
      />

      {/* Main Dashboard Content */}
      <div className="space-y-6 p-6">
        {/* Quick Stats */}
        <ErrorBoundary fallback={<div>Failed to load dashboard stats</div>}>
          <Suspense fallback={<LoadingSpinner />}>
            <DashboardStats timeRange={timeRange} teamId={teamId} />
          </Suspense>
        </ErrorBoundary>

        {/* Main Grid Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column - Primary Content */}
          <div className="space-y-6 lg:col-span-8">
            {/* Live Matches */}
            <ErrorBoundary fallback={<div>Failed to load live matches</div>}>
              <Suspense fallback={<LoadingSpinner />}>
                <LiveMatches />
              </Suspense>
            </ErrorBoundary>

            {/* Analytics Overview */}
            <ErrorBoundary
              fallback={<div>Failed to load analytics overview</div>}
            >
              <Suspense fallback={<LoadingSpinner />}>
                <AnalyticsOverview timeRange={timeRange} teamId={teamId} />
              </Suspense>
            </ErrorBoundary>

            {/* Recent Matches */}
            <ErrorBoundary fallback={<div>Failed to load recent matches</div>}>
              <Suspense fallback={<LoadingSpinner />}>
                <RecentMatches
                  timeRange={timeRange}
                  teamId={teamId}
                  limit={5}
                />
              </Suspense>
            </ErrorBoundary>

            {/* Team Performance (Lazy Loaded) */}
            <ErrorBoundary
              fallback={<div>Failed to load team performance</div>}
            >
              <Suspense fallback={<LoadingSpinner />}>
                <TeamPerformance timeRange={timeRange} teamId={teamId} />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* Right Column - Secondary Content */}
          <div className="space-y-6 lg:col-span-4">
            {/* Quick Actions */}
            <QuickActions />

            {/* Video Processing Queue (Lazy Loaded) */}
            <ErrorBoundary
              fallback={<div>Failed to load video processing queue</div>}
            >
              <Suspense fallback={<LoadingSpinner />}>
                <VideoProcessingQueue />
              </Suspense>
            </ErrorBoundary>

            {/* Upcoming Matches (Lazy Loaded) */}
            <ErrorBoundary
              fallback={<div>Failed to load upcoming matches</div>}
            >
              <Suspense fallback={<LoadingSpinner />}>
                <UpcomingMatches teamId={teamId} limit={3} />
              </Suspense>
            </ErrorBoundary>

            {/* Recent Activity (Lazy Loaded) */}
            <ErrorBoundary fallback={<div>Failed to load recent activity</div>}>
              <Suspense fallback={<LoadingSpinner />}>
                <RecentActivity teamId={teamId} limit={10} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>

        {/* Tab-based Content */}
        {tab === 'analytics' && (
          <div className="mt-8">
            <ErrorBoundary
              fallback={<div>Failed to load detailed analytics</div>}
            >
              <Suspense fallback={<LoadingSpinner />}>
                {/* Detailed Analytics Component */}
                <div className="rounded-lg border bg-card p-6">
                  <h2 className="text-2xl font-bold">
                    {t('detailedAnalytics')}
                  </h2>
                  <p className="text-muted-foreground">
                    {t('detailedAnalyticsDescription')}
                  </p>
                  {/* Add detailed analytics components here */}
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {tab === 'videos' && (
          <div className="mt-8">
            <ErrorBoundary
              fallback={<div>Failed to load video management</div>}
            >
              <Suspense fallback={<LoadingSpinner />}>
                {/* Video Management Component */}
                <div className="rounded-lg border bg-card p-6">
                  <h2 className="text-2xl font-bold">{t('videoManagement')}</h2>
                  <p className="text-muted-foreground">
                    {t('videoManagementDescription')}
                  </p>
                  {/* Add video management components here */}
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {tab === 'team' && (
          <div className="mt-8">
            <ErrorBoundary fallback={<div>Failed to load team management</div>}>
              <Suspense fallback={<LoadingSpinner />}>
                {/* Team Management Component */}
                <div className="rounded-lg border bg-card p-6">
                  <h2 className="text-2xl font-bold">{t('teamManagement')}</h2>
                  <p className="text-muted-foreground">
                    {t('teamManagementDescription')}
                  </p>
                  {/* Add team management components here */}
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Static generation for supported locales
export function generateStaticParams() {
  return [{ locale: 'he' }, { locale: 'en' }, { locale: 'ar' }];
}

// Enable ISR (Incremental Static Regeneration)
export const revalidate = 60; // Revalidate every 60 seconds

// Enable dynamic rendering for real-time data
export const dynamic = 'force-dynamic';

// Lazy imports
import { lazy } from 'react';
