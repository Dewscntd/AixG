/**
 * Browser-based End-to-End Tests for FootAnalytics UI
 * Tests complete user workflows using Playwright
 */

import { test, expect, Page } from '@playwright/test';
// TestDataFactory import removed as it's not used

test.describe('FootAnalytics UI Workflow E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Setup test environment
    await page.goto('/');

    // Login as test user
    await page.fill('[data-testid="email"]', 'test@footanalytics.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('complete video upload and analysis workflow', async () => {
    const matchData = {
      homeTeam: 'מכבי תל אביב',
      awayTeam: 'הפועל באר שבע',
      date: '2024-01-15',
      venue: 'בלומפילד',
      competition: 'ליגת העל',
    };

    await test.step('Navigate to upload page', async () => {
      await page.click('[data-testid="upload-video-button"]');
      await expect(page.locator('[data-testid="upload-form"]')).toBeVisible();
    });

    await test.step('Fill match details', async () => {
      await page.fill('[data-testid="match-home-team"]', matchData.homeTeam);
      await page.fill('[data-testid="match-away-team"]', matchData.awayTeam);
      await page.fill('[data-testid="match-date"]', matchData.date);
      await page.fill('[data-testid="match-venue"]', matchData.venue);
      await page.selectOption(
        '[data-testid="match-competition"]',
        matchData.competition
      );
    });

    await test.step('Upload video file', async () => {
      // Create a test video file (mock)
      const testVideoPath = './test/fixtures/sample-match.mp4';
      await page.setInputFiles('[data-testid="video-upload"]', testVideoPath);

      // Verify upload progress
      await expect(
        page.locator('[data-testid="upload-progress"]')
      ).toBeVisible();

      // Submit upload
      await page.click('[data-testid="upload-submit"]');

      // Wait for upload confirmation
      await expect(
        page.locator('[data-testid="upload-success"]')
      ).toBeVisible();
    });

    await test.step('Monitor processing status', async () => {
      await page.goto('/matches');

      // Find the uploaded match
      const matchRow = page.locator('[data-testid^="match-row-"]').first();
      await expect(matchRow).toBeVisible();

      // Check processing stages
      await expect(matchRow.locator('[data-testid="status"]')).toHaveText(
        'מעבד...'
      );

      // Wait for processing to complete (with reasonable timeout for tests)
      await expect(matchRow.locator('[data-testid="status"]')).toHaveText(
        'הושלם',
        {
          timeout: 60000, // 1 minute for test environment
        }
      );
    });

    await test.step('View analytics dashboard', async () => {
      await page.click('[data-testid^="view-analytics-"]');

      // Verify analytics page loads
      await expect(
        page.locator('[data-testid="analytics-dashboard"]')
      ).toBeVisible();

      // Check Hebrew UI elements
      await expect(page.locator('[data-testid="xg-label"]')).toContainText(
        'xG'
      );
      await expect(
        page.locator('[data-testid="possession-label"]')
      ).toContainText('החזקה');

      // Verify analytics data is displayed
      await expect(page.locator('[data-testid="xg-home"]')).toBeVisible();
      await expect(page.locator('[data-testid="xg-away"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="possession-home"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="possession-away"]')
      ).toBeVisible();
    });

    await test.step('Interact with visualizations', async () => {
      // Test heatmap interaction
      await page.click('[data-testid="heatmap-tab"]');
      await expect(
        page.locator('[data-testid="heatmap-canvas"]')
      ).toBeVisible();

      // Select a player
      await page.selectOption('[data-testid="player-selector"]', { index: 1 });
      await expect(
        page.locator('[data-testid="player-heatmap"]')
      ).toBeVisible();

      // Test shot map
      await page.click('[data-testid="shot-map-tab"]');
      await expect(
        page.locator('[data-testid="shot-map-canvas"]')
      ).toBeVisible();

      // Click on a shot marker
      const shotMarker = page.locator('[data-testid^="shot-marker-"]').first();
      await shotMarker.click();
      await expect(page.locator('[data-testid="shot-details"]')).toBeVisible();
    });

    await test.step('Test video player integration', async () => {
      await page.click('[data-testid="video-tab"]');

      // Verify video player loads
      await expect(page.locator('[data-testid="video-player"]')).toBeVisible();

      // Test timeline interaction
      const timelineEvent = page
        .locator('[data-testid^="timeline-event-"]')
        .first();
      await timelineEvent.click();

      // Verify video seeks to event time
      await expect(page.locator('[data-testid="current-time"]')).toBeVisible();

      // Test playback controls
      await page.click('[data-testid="play-button"]');
      await page.waitForTimeout(2000);
      await page.click('[data-testid="pause-button"]');
    });
  });

  test('real-time analysis workflow', async () => {
    await test.step('Start live analysis', async () => {
      await page.click('[data-testid="live-analysis-button"]');
      await expect(
        page.locator('[data-testid="live-analysis-setup"]')
      ).toBeVisible();

      // Configure live stream
      await page.selectOption('[data-testid="camera-source"]', 'test-camera');
      await page.click('[data-testid="start-live-analysis"]');

      // Verify live feed starts
      await expect(
        page.locator('[data-testid="live-video-feed"]')
      ).toBeVisible();
    });

    await test.step('Monitor real-time analytics', async () => {
      // Wait for first analytics update
      await expect(page.locator('[data-testid="live-xg-home"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('[data-testid="live-xg-away"]')).toBeVisible();

      // Check live possession updates
      await expect(
        page.locator('[data-testid="live-possession"]')
      ).toBeVisible();

      // Verify player tracking overlay
      await expect(
        page.locator('[data-testid="player-tracking-overlay"]')
      ).toBeVisible();
    });

    await test.step('Save live session', async () => {
      await page.click('[data-testid="stop-live-analysis"]');

      // Fill session details
      await page.fill('[data-testid="session-name"]', 'בדיקת ניתוח חי');
      await page.fill(
        '[data-testid="session-notes"]',
        'מחצית ראשונה - ביצועים טובים'
      );

      await page.click('[data-testid="save-session"]');
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    });
  });

  test('analytics comparison and export', async () => {
    await test.step('Navigate to comparison view', async () => {
      await page.goto('/analytics/compare');
      await expect(
        page.locator('[data-testid="comparison-dashboard"]')
      ).toBeVisible();
    });

    await test.step('Select matches for comparison', async () => {
      await page.selectOption('[data-testid="match-1-selector"]', { index: 1 });
      await page.selectOption('[data-testid="match-2-selector"]', { index: 2 });

      await page.click('[data-testid="compare-button"]');
      await expect(
        page.locator('[data-testid="comparison-results"]')
      ).toBeVisible();
    });

    await test.step('View comparison charts', async () => {
      // Check xG comparison
      await expect(
        page.locator('[data-testid="xg-comparison-chart"]')
      ).toBeVisible();

      // Check possession comparison
      await expect(
        page.locator('[data-testid="possession-comparison-chart"]')
      ).toBeVisible();

      // Check player performance comparison
      await page.click('[data-testid="player-comparison-tab"]');
      await expect(
        page.locator('[data-testid="player-comparison-table"]')
      ).toBeVisible();
    });

    await test.step('Export comparison report', async () => {
      await page.click('[data-testid="export-comparison"]');

      // Select export format
      await page.selectOption('[data-testid="export-format"]', 'pdf');

      // Configure export options
      await page.check('[data-testid="include-charts"]');
      await page.check('[data-testid="include-player-stats"]');
      await page.check('[data-testid="hebrew-labels"]');

      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-report"]');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toContain('comparison');
      expect(download.suggestedFilename()).toContain('.pdf');
    });
  });

  test('mobile responsive design', async () => {
    await test.step('Test mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.goto('/matches');

      // Check mobile navigation
      await expect(
        page.locator('[data-testid="mobile-menu-button"]')
      ).toBeVisible();
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });

    await test.step('Test tablet viewport', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await page.goto('/analytics');

      // Check tablet layout
      await expect(
        page.locator('[data-testid="analytics-grid"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    });
  });

  test('accessibility compliance', async () => {
    await test.step('Check keyboard navigation', async () => {
      await page.goto('/matches');

      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();

      // Test enter key activation
      await page.keyboard.press('Enter');
    });

    await test.step('Check ARIA labels', async () => {
      await page.goto('/analytics');

      // Verify ARIA labels exist
      const chartElements = page.locator('[role="img"]');
      await expect(chartElements.first()).toHaveAttribute('aria-label');

      // Check screen reader text
      const srText = page.locator('.sr-only');
      await expect(srText.first()).toBeHidden();
    });
  });

  test('error handling and recovery', async () => {
    await test.step('Handle network errors', async () => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());

      await page.goto('/matches');

      // Check error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    await test.step('Test error recovery', async () => {
      // Restore network
      await page.unroute('**/api/**');

      // Click retry
      await page.click('[data-testid="retry-button"]');

      // Verify recovery
      await expect(page.locator('[data-testid="matches-list"]')).toBeVisible();
    });
  });
});
