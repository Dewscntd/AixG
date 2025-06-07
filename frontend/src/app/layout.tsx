/**
 * Root Layout Component
 * 
 * Implements the main application layout with:
 * - RTL/LTR support for Hebrew and English
 * - Progressive Web App capabilities
 * - Global providers and state management
 * - Performance optimizations
 * - Accessibility features
 */

import type { Metadata, Viewport } from 'next';
import { Inter, Assistant, Fira_Code } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@/components/analytics';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { cn } from '@/lib/utils';

import '@/styles/globals.css';

// Font configurations with variable CSS properties
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  variable: '--font-assistant',
  display: 'swap',
  preload: true,
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  display: 'swap',
  preload: false, // Only load when needed
});

// Supported locales
const locales = ['he', 'en', 'ar'] as const;
type Locale = (typeof locales)[number];

// Metadata configuration
export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: {
      template: `%s | ${t('title')}`,
      default: t('title'),
    },
    description: t('description'),
    keywords: t('keywords'),
    authors: [{ name: 'FootAnalytics Team' }],
    creator: 'FootAnalytics',
    publisher: 'FootAnalytics',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    alternates: {
      canonical: '/',
      languages: {
        'he': '/he',
        'en': '/en',
        'ar': '/ar',
      },
    },
    openGraph: {
      type: 'website',
      locale: locale,
      url: '/',
      title: t('title'),
      description: t('description'),
      siteName: t('title'),
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/og-image.png'],
      creator: '@footanalytics',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
      other: [
        { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#0ea5e9' },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: t('title'),
    },
  };
}

// Viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  colorScheme: 'light dark',
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: Locale };
}

export default async function RootLayout({
  children,
  params: { locale },
}: RootLayoutProps) {
  // Validate locale
  if (!locales.includes(locale)) {
    notFound();
  }

  // Get messages for the locale
  const messages = await getMessages();

  // Determine text direction
  const isRTL = locale === 'he' || locale === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';

  // Font selection based on locale
  const primaryFont = isRTL ? assistant : inter;

  return (
    <html
      lang={locale}
      dir={direction}
      className={cn(
        'h-full scroll-smooth antialiased',
        primaryFont.variable,
        inter.variable,
        assistant.variable,
        firaCode.variable
      )}
      suppressHydrationWarning
    >
      <head>
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/fonts/assistant-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/inter-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Preconnect to GraphQL endpoint */}
        <link rel="preconnect" href={process.env.GRAPHQL_ENDPOINT} />
        
        {/* Theme color meta tags */}
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* Performance hints */}
        <meta httpEquiv="Accept-CH" content="DPR, Viewport-Width, Width" />
      </head>
      
      <body
        className={cn(
          'min-h-full bg-background font-sans text-foreground',
          'selection:bg-brand-200 selection:text-brand-900',
          'dark:selection:bg-brand-800 dark:selection:text-brand-100',
          // RTL-specific styles
          isRTL && 'font-hebrew',
          // Prevent flash of unstyled content
          'opacity-0 transition-opacity duration-300 ease-in-out',
          '[&.loaded]:opacity-100'
        )}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers locale={locale}>
            {/* Skip to main content link for accessibility */}
            <a
              href="#main-content"
              className={cn(
                'sr-only focus:not-sr-only focus:absolute focus:top-4',
                'focus:z-50 focus:rounded-md focus:bg-brand-600',
                'focus:px-4 focus:py-2 focus:text-white focus:shadow-lg',
                isRTL ? 'focus:right-4' : 'focus:left-4'
              )}
            >
              Skip to main content
            </a>

            {/* Main application content */}
            <div id="main-content" className="min-h-screen">
              {children}
            </div>

            {/* Global components */}
            <Toaster />
            <Analytics />
            <ServiceWorkerRegistration />
          </Providers>
        </NextIntlClientProvider>

        {/* Script to remove loading state */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.body.classList.add('loaded');
              
              // Set initial theme based on system preference
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

// Generate static params for all supported locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
