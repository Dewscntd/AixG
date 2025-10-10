'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface VideoProcessingQueueProps {
  locale: string;
}

interface VideoJob {
  id: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  matchId?: string;
}

export default function VideoProcessingQueue({ locale }: VideoProcessingQueueProps) {
  const t = useTranslations('dashboard.videoQueue');

  // Mock data - in production, this would come from API/WebSocket
  const jobs: VideoJob[] = [
    {
      id: 'job-1',
      filename: 'match_2025_10_10.mp4',
      status: 'processing',
      progress: 67,
      matchId: 'match-123',
    },
    {
      id: 'job-2',
      filename: 'training_session_oct_9.mp4',
      status: 'queued',
      progress: 0,
    },
    {
      id: 'job-3',
      filename: 'match_highlights_oct_8.mp4',
      status: 'completed',
      progress: 100,
      matchId: 'match-122',
    },
  ];

  const getStatusColor = (status: VideoJob['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-gray-100 text-gray-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {t('title', { default: 'Video Processing Queue' })}
        </h3>
      </div>
      <ul className="divide-y divide-gray-200">
        {jobs.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-gray-500">
            {t('empty', { default: 'No videos in queue' })}
          </li>
        ) : (
          jobs.map((job) => (
            <li key={job.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {job.filename}
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {t(job.status, { default: job.status })}
                    </span>
                    {job.status === 'processing' && (
                      <div className="flex-1 max-w-xs">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{job.progress}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
