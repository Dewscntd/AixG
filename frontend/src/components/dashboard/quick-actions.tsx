'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface QuickActionsProps {
  locale: string;
}

interface Action {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

export default function QuickActions({ locale }: QuickActionsProps) {
  const t = useTranslations('dashboard.quickActions');

  const actions: Action[] = [
    {
      id: 'new-session',
      title: t('newSession', { default: 'New Coaching Session' }),
      description: t('newSessionDesc', { default: 'Start a new AI coaching session' }),
      href: `/${locale}/dashboard/ai-coaching/new`,
      icon: '🤖',
      color: 'bg-blue-500',
    },
    {
      id: 'upload-video',
      title: t('uploadVideo', { default: 'Upload Video' }),
      description: t('uploadVideoDesc', { default: 'Upload match footage for analysis' }),
      href: `/${locale}/dashboard/videos/upload`,
      icon: '🎥',
      color: 'bg-purple-500',
    },
    {
      id: 'tactical-board',
      title: t('tacticalBoard', { default: 'Tactical Board' }),
      description: t('tacticalBoardDesc', { default: 'Create tactical diagrams' }),
      href: `/${locale}/dashboard/tactical-board`,
      icon: '📋',
      color: 'bg-green-500',
    },
    {
      id: 'view-analytics',
      title: t('viewAnalytics', { default: 'View Analytics' }),
      description: t('viewAnalyticsDesc', { default: 'Explore team performance data' }),
      href: `/${locale}/dashboard/analytics`,
      icon: '📊',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        {t('title', { default: 'Quick Actions' })}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="relative rounded-lg border border-gray-300 bg-white p-4 hover:border-gray-400 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md ${action.color} text-white text-xl`}
              >
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{action.title}</p>
                <p className="text-sm text-gray-500 mt-1">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
