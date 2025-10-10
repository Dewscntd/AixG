'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface RecentMatchesProps {
  locale: string;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  date: string;
  status: 'completed' | 'live' | 'upcoming';
}

export default function RecentMatches({ locale }: RecentMatchesProps) {
  const t = useTranslations('dashboard.matches');

  // Mock data - in production, this would come from API
  const matches: Match[] = [
    {
      id: '1',
      homeTeam: 'Maccabi Tel Aviv',
      awayTeam: 'Hapoel Beer Sheva',
      score: '2-1',
      date: '2025-10-10',
      status: 'completed',
    },
    {
      id: '2',
      homeTeam: 'Hapoel Tel Aviv',
      awayTeam: 'Maccabi Haifa',
      score: '1-1',
      date: '2025-10-09',
      status: 'completed',
    },
    {
      id: '3',
      homeTeam: 'Beitar Jerusalem',
      awayTeam: 'Hapoel Haifa',
      score: '3-0',
      date: '2025-10-08',
      status: 'completed',
    },
  ];

  const getStatusColor = (status: Match['status']) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {t('recentMatches', { default: 'Recent Matches' })}
        </h3>
      </div>
      <ul className="divide-y divide-gray-200">
        {matches.map((match) => (
          <li key={match.id}>
            <Link
              href={`/${locale}/dashboard/matches/${match.id}`}
              className="block hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {match.homeTeam} vs {match.awayTeam}
                      </p>
                      <span
                        className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          match.status
                        )}`}
                      >
                        {t(match.status, { default: match.status })}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-500">{match.date}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {match.score}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
        <Link
          href={`/${locale}/dashboard/matches`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          {t('viewAll', { default: 'View all matches' })} →
        </Link>
      </div>
    </div>
  );
}
