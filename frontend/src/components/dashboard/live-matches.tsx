'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface LiveMatchesProps {
  locale: string;
}

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  minute: number;
  sessionId?: string;
}

export default function LiveMatches({ locale }: LiveMatchesProps) {
  const t = useTranslations('dashboard.live');

  // Mock data - in production, this would come from API/WebSocket
  const liveMatches: LiveMatch[] = [
    {
      id: 'live-1',
      homeTeam: 'Maccabi Netanya',
      awayTeam: 'Hapoel Petah Tikva',
      score: '1-0',
      minute: 67,
      sessionId: 'session-123',
    },
    {
      id: 'live-2',
      homeTeam: 'Bnei Sakhnin',
      awayTeam: 'Maccabi Bnei Reineh',
      score: '2-2',
      minute: 82,
      sessionId: 'session-456',
    },
  ];

  if (liveMatches.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          {t('liveMatches', { default: 'Live Matches' })}
        </h3>
        <p className="text-sm text-gray-500">
          {t('noLiveMatches', { default: 'No live matches at the moment' })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {t('liveMatches', { default: 'Live Matches' })}
          </h3>
          <span className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-sm text-red-600 font-medium">LIVE</span>
          </span>
        </div>
      </div>
      <ul className="divide-y divide-gray-200">
        {liveMatches.map((match) => (
          <li key={match.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">
                    {match.homeTeam} vs {match.awayTeam}
                  </p>
                  <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {match.minute}&apos;
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-gray-900">{match.score}</p>
                  {match.sessionId && (
                    <Link
                      href={`/${locale}/dashboard/ai-coaching/${match.sessionId}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      {t('viewSession', { default: 'View Session' })} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
