'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface UpcomingMatchesProps {
  locale: string;
}

interface UpcomingMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
}

export default function UpcomingMatches({ locale }: UpcomingMatchesProps) {
  const t = useTranslations('dashboard.upcomingMatches');

  // Mock data - in production, this would come from API
  const matches: UpcomingMatch[] = [
    {
      id: 'upcoming-1',
      homeTeam: 'Maccabi Tel Aviv',
      awayTeam: 'Hapoel Jerusalem',
      date: '2025-10-15',
      time: '20:00',
      venue: 'Bloomfield Stadium',
      competition: 'Israeli Premier League',
    },
    {
      id: 'upcoming-2',
      homeTeam: 'Beitar Jerusalem',
      awayTeam: 'Maccabi Haifa',
      date: '2025-10-16',
      time: '19:30',
      venue: 'Teddy Stadium',
      competition: 'Israeli Premier League',
    },
    {
      id: 'upcoming-3',
      homeTeam: 'Hapoel Beer Sheva',
      awayTeam: 'Maccabi Netanya',
      date: '2025-10-17',
      time: '18:00',
      venue: 'Turner Stadium',
      competition: 'Israeli Premier League',
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {t('title', { default: 'Upcoming Matches' })}
        </h3>
      </div>
      <ul className="divide-y divide-gray-200">
        {matches.map((match) => (
          <li key={match.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {match.homeTeam} vs {match.awayTeam}
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-500">
                    📅 {match.date} at {match.time}
                  </p>
                  <p className="text-sm text-gray-500">📍 {match.venue}</p>
                  <p className="text-xs text-gray-400">{match.competition}</p>
                </div>
              </div>
              <Link
                href={`/${locale}/dashboard/matches/${match.id}/prepare`}
                className="ml-4 text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                {t('prepare', { default: 'Prepare' })} →
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
        <Link
          href={`/${locale}/dashboard/schedule`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          {t('viewSchedule', { default: 'View full schedule' })} →
        </Link>
      </div>
    </div>
  );
}
