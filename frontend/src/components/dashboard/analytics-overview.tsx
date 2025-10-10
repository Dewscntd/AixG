'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface AnalyticsOverviewProps {
  locale: string;
}

interface AnalyticsData {
  metric: string;
  value: number;
  label: string;
  color: string;
}

export default function AnalyticsOverview({ locale }: AnalyticsOverviewProps) {
  const t = useTranslations('dashboard.analytics');

  // Mock data - in production, this would come from API
  const analyticsData: AnalyticsData[] = [
    {
      metric: 'possession',
      value: 58,
      label: t('possession', { default: 'Possession' }),
      color: 'bg-blue-500',
    },
    {
      metric: 'passAccuracy',
      value: 82,
      label: t('passAccuracy', { default: 'Pass Accuracy' }),
      color: 'bg-green-500',
    },
    {
      metric: 'shotsOnTarget',
      value: 45,
      label: t('shotsOnTarget', { default: 'Shots on Target' }),
      color: 'bg-yellow-500',
    },
    {
      metric: 'defensiveActions',
      value: 73,
      label: t('defensiveActions', { default: 'Defensive Actions' }),
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
        {t('title', { default: 'Analytics Overview' })}
      </h3>
      <div className="space-y-6">
        {analyticsData.map((data) => (
          <div key={data.metric}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{data.label}</span>
              <span className="text-sm font-semibold text-gray-900">{data.value}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${data.color} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${data.value}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {t('dataDescription', { default: 'Based on last 10 matches average performance' })}
        </p>
      </div>
    </div>
  );
}
