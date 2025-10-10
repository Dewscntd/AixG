'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface CreateSessionFormProps {
  locale: string;
}

interface SessionFormData {
  coachId: string;
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  language: 'he' | 'en' | 'mixed';
}

export default function CreateSessionForm({ locale }: CreateSessionFormProps) {
  const t = useTranslations('aiCoaching.createSession');
  const router = useRouter();

  const [formData, setFormData] = useState<SessionFormData>({
    coachId: '',
    matchId: '',
    homeTeamId: '',
    awayTeamId: '',
    language: locale === 'he' ? 'he' : 'en',
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/v1/coaching/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      router.push(`/${locale}/dashboard/ai-coaching/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChange = (field: keyof SessionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {t('title', { default: 'Create Coaching Session' })}
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="coachId" className="block text-sm font-medium text-gray-700 mb-2">
            {t('coachId', { default: 'Coach ID' })}
          </label>
          <input
            type="text"
            id="coachId"
            value={formData.coachId}
            onChange={(e) => handleChange('coachId', e.target.value)}
            required
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="matchId" className="block text-sm font-medium text-gray-700 mb-2">
            {t('matchId', { default: 'Match ID' })}
          </label>
          <input
            type="text"
            id="matchId"
            value={formData.matchId}
            onChange={(e) => handleChange('matchId', e.target.value)}
            required
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="homeTeamId" className="block text-sm font-medium text-gray-700 mb-2">
              {t('homeTeam', { default: 'Home Team ID' })}
            </label>
            <input
              type="text"
              id="homeTeamId"
              value={formData.homeTeamId}
              onChange={(e) => handleChange('homeTeamId', e.target.value)}
              required
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="awayTeamId" className="block text-sm font-medium text-gray-700 mb-2">
              {t('awayTeam', { default: 'Away Team ID' })}
            </label>
            <input
              type="text"
              id="awayTeamId"
              value={formData.awayTeamId}
              onChange={(e) => handleChange('awayTeamId', e.target.value)}
              required
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            {t('language', { default: 'Coaching Language' })}
          </label>
          <select
            id="language"
            value={formData.language}
            onChange={(e) => handleChange('language', e.target.value as 'he' | 'en' | 'mixed')}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="he">{t('hebrew', { default: 'Hebrew' })}</option>
            <option value="en">{t('english', { default: 'English' })}</option>
            <option value="mixed">{t('mixed', { default: 'Mixed' })}</option>
          </select>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('cancel', { default: 'Cancel' })}
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? t('creating', { default: 'Creating...' }) : t('create', { default: 'Create Session' })}
          </button>
        </div>
      </form>
    </div>
  );
}
