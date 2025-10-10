'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface TeamPerformanceProps {
  locale: string;
}

interface TeamStats {
  teamId: string;
  teamName: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  form: ('W' | 'D' | 'L')[];
}

export default function TeamPerformance({ locale }: TeamPerformanceProps) {
  const t = useTranslations('dashboard.teamPerformance');

  // Mock data - in production, this would come from API
  const teamStats: TeamStats = {
    teamId: 'team-1',
    teamName: 'Maccabi Tel Aviv',
    wins: 18,
    draws: 6,
    losses: 4,
    goalsFor: 52,
    goalsAgainst: 21,
    form: ['W', 'W', 'D', 'W', 'L'],
  };

  const getFormColor = (result: 'W' | 'D' | 'L') => {
    switch (result) {
      case 'W':
        return 'bg-green-500 text-white';
      case 'D':
        return 'bg-gray-400 text-white';
      case 'L':
        return 'bg-red-500 text-white';
    }
  };

  const totalMatches = teamStats.wins + teamStats.draws + teamStats.losses;
  const winRate = ((teamStats.wins / totalMatches) * 100).toFixed(1);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {t('title', { default: 'Team Performance' })}
          </h3>
          <Link
            href={`/${locale}/dashboard/teams/${teamStats.teamId}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            {t('viewDetails', { default: 'View Details' })} →
          </Link>
        </div>
      </div>
      <div className="px-4 py-5 sm:px-6">
        <h4 className="text-base font-semibold text-gray-900 mb-4">{teamStats.teamName}</h4>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{teamStats.wins}</p>
            <p className="text-xs text-gray-500">{t('wins', { default: 'Wins' })}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{teamStats.draws}</p>
            <p className="text-xs text-gray-500">{t('draws', { default: 'Draws' })}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{teamStats.losses}</p>
            <p className="text-xs text-gray-500">{t('losses', { default: 'Losses' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{t('goalsFor', { default: 'Goals For' })}</p>
            <p className="text-xl font-semibold text-gray-900">{teamStats.goalsFor}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{t('goalsAgainst', { default: 'Goals Against' })}</p>
            <p className="text-xl font-semibold text-gray-900">{teamStats.goalsAgainst}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">{t('recentForm', { default: 'Recent Form' })}</p>
          <div className="flex items-center gap-2">
            {teamStats.form.map((result, index) => (
              <div
                key={index}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getFormColor(
                  result
                )}`}
              >
                {result}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t('winRate', { default: 'Win Rate' })}</span>
            <span className="text-sm font-semibold text-gray-900">{winRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
