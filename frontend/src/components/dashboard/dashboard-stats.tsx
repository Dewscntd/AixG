'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface DashboardStatsProps {
  locale: string;
}

interface StatItem {
  id: string;
  name: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

export default function DashboardStats({ locale }: DashboardStatsProps) {
  const t = useTranslations('dashboard.stats');

  // Mock data - in production, this would come from API
  const stats: StatItem[] = [
    {
      id: 'total-sessions',
      name: t('totalSessions', { default: 'Total Sessions' }),
      value: '142',
      change: '+12%',
      changeType: 'increase',
    },
    {
      id: 'active-sessions',
      name: t('activeSessions', { default: 'Active Sessions' }),
      value: '8',
      change: '+3',
      changeType: 'increase',
    },
    {
      id: 'insights-generated',
      name: t('insightsGenerated', { default: 'Insights Generated' }),
      value: '2,847',
      change: '+18%',
      changeType: 'increase',
    },
    {
      id: 'avg-response-time',
      name: t('avgResponseTime', { default: 'Avg Response Time' }),
      value: '120ms',
      change: '-15%',
      changeType: 'decrease',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="bg-white overflow-hidden shadow rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {stat.name}
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stat.value}
                </dd>
              </div>
            </div>
            {stat.change && (
              <div className="mt-4">
                <span
                  className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    stat.changeType === 'increase'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
