/**
 * Browser-based End-to-End Tests using Playwright
 * Tests the complete user interface and user experience
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { TestDataFactory } from '@test-utils/test-data-factory';

test.describe('FootAnalytics UI E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      locale: 'he-IL',
      timezoneId: 'Asia/Jerusalem',
      viewport: { width: 1920, height: 1080 },
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();

    // Mock authentication
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-jwt-token',
          user: {
            id: 'test-user-123',
            name: 'Test User',
            role: 'analyst',
            teamId: TestDataFactory.createTeamId(),
          },
        }),
      });
    });

    await page.goto('http://localhost:3000');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Authentication Flow', () => {
    test('should login successfully with valid credentials', async () => {
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');

      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-menu"]')).toContainText(
        'Test User'
      );
    });

    test('should show error for invalid credentials', async () => {
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' }),
        });
      });

      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="submit-login"]');

      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Invalid credentials'
      );
    });

    test('should logout successfully', async () => {
      // Login first
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    });
  });

  test.describe('Video Upload Interface', () => {
    test.beforeEach(async () => {
      // Login first
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');
    });

    test('should upload video with drag and drop', async () => {
      await page.click('[data-testid="upload-video-nav"]');

      // Mock file upload
      const fileContent = Buffer.from('fake video content');
      await page.setInputFiles('[data-testid="video-file-input"]', {
        name: 'test-match.mp4',
        mimeType: 'video/mp4',
        buffer: fileContent,
      });

      await page.fill('[data-testid="match-name-input"]', 'Test Match');
      await page.selectOption('[data-testid="home-team-select"]', 'team-1');
      await page.selectOption('[data-testid="away-team-select"]', 'team-2');

      await page.click('[data-testid="upload-submit-button"]');

      await expect(
        page.locator('[data-testid="upload-success-message"]')
      ).toBeVisible();
    });

    test('should show upload progress', async () => {
      await page.click('[data-testid="upload-video-nav"]');

      // Mock progressive upload
      await page.route('**/api/videos/upload', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            videoId: 'test-video-id',
            status: 'uploading',
          }),
        });
      });

      const fileContent = Buffer.from('fake video content');
      await page.setInputFiles('[data-testid="video-file-input"]', {
        name: 'test-match.mp4',
        mimeType: 'video/mp4',
        buffer: fileContent,
      });

      await page.fill('[data-testid="match-name-input"]', 'Test Match');
      await page.click('[data-testid="upload-submit-button"]');

      await expect(
        page.locator('[data-testid="upload-progress-bar"]')
      ).toBeVisible();
    });

    test('should validate file format', async () => {
      await page.click('[data-testid="upload-video-nav"]');

      const invalidFile = Buffer.from('not a video file');
      await page.setInputFiles('[data-testid="video-file-input"]', {
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: invalidFile,
      });

      await expect(
        page.locator('[data-testid="file-format-error"]')
      ).toContainText('Invalid file format');
    });
  });

  test.describe('Analytics Dashboard', () => {
    test.beforeEach(async () => {
      // Login and mock analytics data
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');

      await page.route('**/api/analytics/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            matchId: 'test-match-id',
            homeTeam: {
              teamId: 'home-team',
              xG: 2.15,
              possession: 62.4,
              passAccuracy: 89.1,
              formation: '4-3-3',
            },
            awayTeam: {
              teamId: 'away-team',
              xG: 1.87,
              possession: 37.6,
              passAccuracy: 84.7,
              formation: '4-4-2',
            },
          }),
        });
      });
    });

    test('should display match analytics correctly', async () => {
      await page.click('[data-testid="analytics-nav"]');

      await expect(page.locator('[data-testid="home-team-xg"]')).toContainText(
        '2.15'
      );
      await expect(page.locator('[data-testid="away-team-xg"]')).toContainText(
        '1.87'
      );
      await expect(
        page.locator('[data-testid="home-team-possession"]')
      ).toContainText('62.4%');
      await expect(
        page.locator('[data-testid="away-team-possession"]')
      ).toContainText('37.6%');
    });

    test('should render interactive charts', async () => {
      await page.click('[data-testid="analytics-nav"]');

      const xgChart = page.locator('[data-testid="xg-timeline-chart"]');
      await expect(xgChart).toBeVisible();

      // Test chart interaction
      await xgChart.hover();
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    });

    test('should switch between different analytics views', async () => {
      await page.click('[data-testid="analytics-nav"]');

      // Test possession view
      await page.click('[data-testid="possession-tab"]');
      await expect(
        page.locator('[data-testid="possession-chart"]')
      ).toBeVisible();

      // Test player heatmaps
      await page.click('[data-testid="heatmaps-tab"]');
      await expect(
        page.locator('[data-testid="heatmap-canvas"]')
      ).toBeVisible();

      // Test formation analysis
      await page.click('[data-testid="formations-tab"]');
      await expect(
        page.locator('[data-testid="formation-diagram"]')
      ).toBeVisible();
    });

    test('should export analytics report', async () => {
      await page.click('[data-testid="analytics-nav"]');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-pdf-button"]');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toContain('.pdf');
    });
  });

  test.describe('Real-time Analytics', () => {
    test.beforeEach(async () => {
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');
    });

    test('should connect to live match stream', async () => {
      await page.goto('/matches/live');

      await page.click('[data-testid="connect-live-stream"]');

      await expect(
        page.locator('[data-testid="live-indicator"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="live-indicator"]')).toHaveClass(
        /live/
      );
    });

    test('should update analytics in real-time', async () => {
      await page.goto('/matches/test-match-id/live');

      // Mock WebSocket updates
      await page.evaluate(() => {
        const mockUpdate = {
          type: 'analytics_update',
          data: {
            homeTeamXG: 1.25,
            awayTeamXG: 0.87,
            possession: { home: 58, away: 42 },
          },
        };

        window.dispatchEvent(
          new CustomEvent('analytics_update', { detail: mockUpdate })
        );
      });

      await expect(page.locator('[data-testid="live-xg-home"]')).toContainText(
        '1.25'
      );
      await expect(page.locator('[data-testid="live-xg-away"]')).toContainText(
        '0.87'
      );
    });

    test('should handle connection loss gracefully', async () => {
      await page.goto('/matches/test-match-id/live');

      // Simulate connection loss
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('connection_lost'));
      });

      await expect(
        page.locator('[data-testid="connection-lost-warning"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="reconnect-button"]')
      ).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');

      // Mobile menu should be visible
      await expect(
        page.locator('[data-testid="mobile-menu-button"]')
      ).toBeVisible();

      // Desktop navigation should be hidden
      await expect(
        page.locator('[data-testid="desktop-navigation"]')
      ).toBeHidden();

      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });

    test('should work on tablet devices', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');

      // Tablet layout should show condensed navigation
      await expect(
        page.locator('[data-testid="tablet-navigation"]')
      ).toBeVisible();
    });
  });

  test.describe('Hebrew RTL Support', () => {
    test('should display Hebrew interface correctly', async () => {
      await page.goto('http://localhost:3000?lang=he');

      // Verify RTL layout
      await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');

      // Login with Hebrew interface
      await page.click('[data-testid="login-button"]');
      await expect(page.locator('[data-testid="login-title"]')).toContainText(
        'התחברות'
      );

      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');

      // Verify Hebrew navigation
      await expect(page.locator('[data-testid="dashboard-nav"]')).toContainText(
        'לוח בקרה'
      );
      await expect(page.locator('[data-testid="analytics-nav"]')).toContainText(
        'אנליטיקה'
      );
    });

    test('should handle RTL chart layouts', async () => {
      await page.goto('http://localhost:3000?lang=he');

      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');

      await page.click('[data-testid="analytics-nav"]');

      // Charts should adapt to RTL
      const chart = page.locator('[data-testid="analytics-chart"]');
      await expect(chart).toBeVisible();

      // Verify RTL text alignment
      const chartLabels = page.locator('[data-testid="chart-labels"]');
      await expect(chartLabels).toHaveCSS('text-align', 'right');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      await page.click('[data-testid="login-button"]');

      // Navigate using keyboard
      await page.keyboard.press('Tab'); // Email input
      await page.keyboard.type('test@footanalytics.com');

      await page.keyboard.press('Tab'); // Password input
      await page.keyboard.type('password123');

      await page.keyboard.press('Tab'); // Submit button
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    });

    test('should have proper ARIA labels', async () => {
      await expect(
        page.locator('[data-testid="login-button"]')
      ).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute(
        'aria-label'
      );
      await expect(
        page.locator('[data-testid="password-input"]')
      ).toHaveAttribute('aria-label');
    });

    test('should support screen readers', async () => {
      // Verify semantic HTML structure
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();

      // Verify ARIA landmarks
      await expect(page.locator('[role="banner"]')).toBeVisible();
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async () => {
      const startTime = Date.now();
      await page.goto('http://localhost:3000');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000); // Under 3 seconds
    });

    test('should handle large datasets efficiently', async () => {
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test@footanalytics.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="submit-login"]');

      // Mock large dataset
      await page.route('**/api/analytics/**', route => {
        const largeDataset = {
          matchId: 'test-match-id',
          events: Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            type: 'pass',
            timestamp: i * 1000,
            position: { x: Math.random() * 100, y: Math.random() * 100 },
          })),
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset),
        });
      });

      const startTime = Date.now();
      await page.click('[data-testid="analytics-nav"]');
      await expect(
        page.locator('[data-testid="analytics-chart"]')
      ).toBeVisible();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Under 5 seconds for large dataset
    });
  });
});
