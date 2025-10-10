'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface DashboardLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export default function DashboardLayout({ children, locale }: DashboardLayoutProps) {
  const t = useTranslations('dashboard');
  const isRTL = locale === 'he';

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}
