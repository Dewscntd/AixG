'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface DashboardHeaderProps {
  locale: string;
}

export default function DashboardHeader({ locale }: DashboardHeaderProps) {
  const t = useTranslations('dashboard');
  const isRTL = locale === 'he';

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('title', { default: 'Dashboard' })}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('subtitle', { default: 'Football Analytics Platform' })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/dashboard/ai-coaching`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('aiCoaching', { default: 'AI Coaching' })}
          </Link>

          <Link
            href={`/${locale}/dashboard/tactical-board`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('tacticalBoard', { default: 'Tactical Board' })}
          </Link>
        </div>
      </div>
    </div>
  );
}
