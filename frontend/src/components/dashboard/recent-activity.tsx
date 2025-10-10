'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface RecentActivityProps {
  locale: string;
}

interface ActivityItem {
  id: string;
  type: 'session' | 'video' | 'analysis' | 'insight';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export default function RecentActivity({ locale }: RecentActivityProps) {
  const t = useTranslations('dashboard.recentActivity');

  // Mock data - in production, this would come from API
  const activities: ActivityItem[] = [
    {
      id: 'activity-1',
      type: 'session',
      title: t('sessionCreated', { default: 'Coaching session created' }),
      description: 'Maccabi Tel Aviv vs Hapoel Beer Sheva',
      timestamp: '2 hours ago',
      icon: '🤖',
    },
    {
      id: 'activity-2',
      type: 'insight',
      title: t('insightGenerated', { default: 'Tactical insight generated' }),
      description: 'Formation adjustment recommendation',
      timestamp: '3 hours ago',
      icon: '💡',
    },
    {
      id: 'activity-3',
      type: 'video',
      title: t('videoProcessed', { default: 'Video processed successfully' }),
      description: 'match_2025_10_10.mp4',
      timestamp: '5 hours ago',
      icon: '🎥',
    },
    {
      id: 'activity-4',
      type: 'analysis',
      title: t('analysisCompleted', { default: 'Match analysis completed' }),
      description: 'Tactical patterns identified',
      timestamp: '1 day ago',
      icon: '📊',
    },
  ];

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'session':
        return 'bg-blue-100';
      case 'video':
        return 'bg-purple-100';
      case 'analysis':
        return 'bg-green-100';
      case 'insight':
        return 'bg-yellow-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {t('title', { default: 'Recent Activity' })}
        </h3>
      </div>
      <div className="px-4 py-5 sm:px-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, index) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {index !== activities.length - 1 && (
                    <span
                      className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-start space-x-3">
                    <div>
                      <div
                        className={`relative px-1 flex items-center justify-center h-10 w-10 rounded-full ${getActivityColor(
                          activity.type
                        )}`}
                      >
                        <span className="text-xl">{activity.icon}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{activity.title}</p>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">{activity.timestamp}</p>
                      </div>
                      <div className="mt-2 text-sm text-gray-700">
                        <p>{activity.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
