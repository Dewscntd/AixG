# FootAnalytics Frontend

A **highly scalable micro-frontend architecture** built with **Next.js 14**, optimized for **performance**, **Hebrew RTL support**, and **real-time analytics**. Implements cutting-edge patterns for enterprise-grade football analytics platform.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Shell Application (Next.js 14)          │
├─────────────────────────────────────────────────────────────┤
│  App Router + Server Components                            │
│  ├── [locale]/dashboard/page.tsx                          │
│  ├── [locale]/matches/[id]/page.tsx                       │
│  ├── [locale]/videos/page.tsx                             │
│  └── [locale]/team/page.tsx                               │
├─────────────────────────────────────────────────────────────┤
│  Micro-Frontends (Module Federation)                       │
│  ├── Analytics MF (Port 3001)                             │
│  ├── Video MF (Port 3002)                                 │
│  ├── Team Management MF (Port 3003)                       │
│  └── Reports MF (Port 3004)                               │
├─────────────────────────────────────────────────────────────┤
│  Shared Infrastructure                                      │
│  ├── State Management (Zustand)                           │
│  ├── Data Fetching (TanStack Query + Apollo)              │
│  ├── Real-time (WebSocket + Subscriptions)                │
│  ├── Caching (Redis + Service Worker)                     │
│  └── Performance (Virtual Scrolling + Canvas)             │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Key Features

### 🚀 **Performance First**

- **Sub-second page loads** with Next.js 14 App Router
- **Virtual scrolling** for large datasets (10,000+ items)
- **Canvas rendering** for complex visualizations
- **Code splitting** and lazy loading
- **Service Worker** caching with offline support
- **Incremental Static Regeneration** (ISR)

### 🌐 **Micro-Frontend Architecture**

- **Module Federation** for independent deployments
- **Composable components** with HOC patterns
- **Isolated state management** per micro-frontend
- **Shared dependencies** optimization
- **Runtime integration** with fallback strategies

### 🔄 **Real-time Capabilities**

- **GraphQL Subscriptions** over WebSocket
- **Optimistic UI updates** for instant feedback
- **Live match analytics** streaming
- **Real-time collaboration** features
- **Background sync** for offline data

### 🌍 **Internationalization & RTL**

- **Hebrew-first** design with RTL support
- **Arabic and English** language support
- **Cultural adaptations** for Israeli market
- **Dynamic locale switching**
- **RTL-aware animations** and layouts

### 📱 **Progressive Web App**

- **Offline-first** architecture
- **App-like experience** on mobile
- **Push notifications** for match updates
- **File handling** for video uploads
- **Install prompts** and shortcuts

## 🛠️ Tech Stack

### **Core Framework**

- **Next.js 14** - App Router, Server Components, ISR
- **React 18** - Concurrent features, Suspense
- **TypeScript** - Strict mode, advanced types

### **State Management**

- **Zustand** - Lightweight, event-driven state
- **TanStack Query** - Server state management
- **Apollo Client** - GraphQL with subscriptions
- **Immer** - Immutable state updates

### **Styling & UI**

- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Headless UI** - Accessible components
- **Recharts** - Data visualizations

### **Performance**

- **React Window** - Virtual scrolling
- **Canvas API** - High-performance graphics
- **Web Workers** - Background processing
- **Service Workers** - Caching and offline

### **Development**

- **Storybook** - Component development
- **Jest + Testing Library** - Unit testing
- **Playwright** - E2E testing
- **ESLint + Prettier** - Code quality

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/footanalytics/platform.git
cd platform/frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Development Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run dev:turbo        # Start with Turbo mode
npm run storybook        # Start Storybook (port 6006)

# Building
npm run build            # Production build
npm run build:analyze    # Build with bundle analyzer
npm run start            # Start production server

# Testing
npm run test             # Run unit tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # E2E tests with Playwright

# Code Quality
npm run lint             # ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Prettier formatting
npm run type-check       # TypeScript checking

# Internationalization
npm run i18n:extract     # Extract messages
npm run i18n:compile     # Compile translations

# Performance
npm run lighthouse       # Lighthouse audit
npm run analyze          # Bundle analysis
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── [locale]/          # Internationalized routes
│   │   │   ├── dashboard/     # Dashboard pages
│   │   │   ├── matches/       # Match pages
│   │   │   ├── videos/        # Video pages
│   │   │   └── team/          # Team pages
│   │   ├── globals.css        # Global styles
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Shared components
│   │   ├── ui/               # Base UI components
│   │   ├── charts/           # Chart components
│   │   ├── forms/            # Form components
│   │   └── hoc/              # Higher-order components
│   ├── micro-frontends/       # Micro-frontend modules
│   │   ├── analytics/        # Analytics MF
│   │   ├── video/            # Video MF
│   │   ├── team/             # Team MF
│   │   └── reports/          # Reports MF
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utilities and configs
│   ├── store/                # Global state management
│   ├── styles/               # Styling files
│   └── types/                # TypeScript types
├── public/                   # Static assets
├── tests/                    # Test files
├── docs/                     # Documentation
└── config files             # Configuration
```

## 🎨 Component Patterns

### **Composable Hooks Pattern**

```typescript
const useMatchAnalytics = (matchId: string) => {
  const query = useMatchQuery(matchId);
  const subscription = useMatchUpdates(matchId);
  const optimisticUpdate = useOptimisticUpdate();

  return composeAnalytics(query, subscription, optimisticUpdate);
};
```

### **Declarative Component Composition**

```typescript
const MatchDashboard = compose(
  withAuthentication,
  withMatchData,
  withRealTimeUpdates,
  withErrorBoundary
)(MatchDashboardComponent);
```

### **Micro-Frontend Integration**

```typescript
// Dynamic micro-frontend loading
const AnalyticsMF = lazy(() => import('analytics_mf/AnalyticsModule'));

// Runtime integration with fallback
<Suspense fallback={<AnalyticsPlaceholder />}>
  <ErrorBoundary fallback={<AnalyticsError />}>
    <AnalyticsMF matchId={matchId} />
  </ErrorBoundary>
</Suspense>
```

## 🌐 Internationalization

### **RTL Support**

```css
/* Automatic RTL layout */
[dir='rtl'] .ml-4 {
  margin-right: 1rem;
  margin-left: 0;
}
[dir='rtl'] .text-left {
  text-align: right;
}
[dir='rtl'] .rtl-flip {
  transform: scaleX(-1);
}
```

### **Language Configuration**

```typescript
// next.config.js
i18n: {
  locales: ['he', 'en', 'ar'],
  defaultLocale: 'he',
  localeDetection: true,
}
```

## ⚡ Performance Optimizations

### **Virtual Scrolling**

```typescript
<VirtualList
  items={matches}
  itemHeight={80}
  renderItem={({ index, style, data }) => (
    <MatchCard key={data.id} match={data} style={style} />
  )}
  overscan={5}
/>
```

### **Canvas Rendering**

```typescript
<FootballFieldCanvas
  players={players}
  events={events}
  heatmapData={heatmap}
  enableAnimations
  onPlayerClick={handlePlayerClick}
/>
```

### **Code Splitting**

```typescript
// Route-based splitting
const MatchAnalytics = lazy(() => import('./MatchAnalytics'));

// Component-based splitting
const HeavyChart = lazy(() => import('./HeavyChart'));
```

## 📱 PWA Features

### **Offline Support**

```typescript
// Service Worker caching
const CACHE_STRATEGIES = {
  analytics: 'NetworkFirst',
  videos: 'CacheFirst',
  static: 'StaleWhileRevalidate',
};
```

### **Push Notifications**

```typescript
// Subscribe to match updates
await subscribeToPushNotifications({
  topics: ['match-updates', 'team-news'],
  userId: user.id,
});
```

## 🧪 Testing Strategy

### **Unit Tests**

```typescript
// Component testing
test('MatchDashboard renders analytics correctly', () => {
  render(<MatchDashboard matchId="123" />);
  expect(screen.getByText('Match Analytics')).toBeInTheDocument();
});
```

### **E2E Tests**

```typescript
// Playwright E2E
test('user can view live match analytics', async ({ page }) => {
  await page.goto('/matches/live');
  await expect(page.locator('[data-testid="live-score"]')).toBeVisible();
});
```

## 🚀 Deployment

### **Production Build**

```bash
# Build for production
npm run build

# Start production server
npm run start

# Deploy to Vercel
vercel deploy --prod
```

### **Docker Deployment**

```bash
# Build Docker image
docker build -t footanalytics-frontend .

# Run container
docker run -p 3000:3000 footanalytics-frontend
```

## 📊 Performance Metrics

- **Lighthouse Score**: 95+ (Performance, Accessibility, SEO)
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 250KB (gzipped)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Run quality checks
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the future of football analytics** ⚽📊

# contractLens
