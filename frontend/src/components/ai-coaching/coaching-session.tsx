'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface CoachingSessionProps {
  sessionId: string;
  locale: string;
}

interface CoachingInsight {
  id: string;
  content: string;
  hebrewContent: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  timestamp: Date;
}

export default function CoachingSession({ sessionId, locale }: CoachingSessionProps) {
  const t = useTranslations('aiCoaching');
  const isHebrew = locale === 'he';

  const [query, setQuery] = useState('');
  const [insights, setInsights] = useState<CoachingInsight[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsProcessing(true);

    try {
      // TODO: Replace with actual API call
      const mockInsight: CoachingInsight = {
        id: `insight-${Date.now()}`,
        content: `Tactical analysis for: ${query}`,
        hebrewContent: `ניתוח טקטי עבור: ${query}`,
        urgency: 'MEDIUM',
        confidence: 0.85,
        timestamp: new Date(),
      };

      setInsights((prev) => [mockInsight, ...prev]);
      setQuery('');
    } catch (error) {
      console.error('Failed to process query:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getUrgencyColor = (urgency: CoachingInsight['urgency']) => {
    switch (urgency) {
      case 'LOW':
        return 'bg-blue-100 text-blue-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {t('askCoach', { default: 'Ask the AI Coach' })}
        </h3>
        <form onSubmit={handleQuerySubmit}>
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('queryPlaceholder', { default: 'Ask a tactical question...' })}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              dir={isHebrew ? 'rtl' : 'ltr'}
            />
            <button
              type="submit"
              disabled={isProcessing || !query.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? t('processing', { default: 'Processing...' }) : t('ask', { default: 'Ask' })}
            </button>
          </div>
        </form>
      </div>

      {/* Insights List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {t('insights', { default: 'Coaching Insights' })}
          </h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          {insights.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {t('noInsights', { default: 'No insights yet. Ask a question to get started.' })}
            </p>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(
                        insight.urgency
                      )}`}
                    >
                      {t(insight.urgency.toLowerCase(), { default: insight.urgency })}
                    </span>
                    <span className="text-xs text-gray-500">
                      {t('confidence', { default: 'Confidence' })}: {(insight.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-gray-900" dir={isHebrew ? 'rtl' : 'ltr'}>
                    {isHebrew ? insight.hebrewContent : insight.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(insight.timestamp).toLocaleString(locale)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
