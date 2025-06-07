/**
 * End-to-End Test Utilities for FootAnalytics Platform
 * Provides comprehensive utilities for browser-based testing
 */

import { Page, BrowserContext, expect } from '@playwright/test';
import { TestDataFactory } from './test-data-factory';
import fs from 'fs/promises';
import path from 'path';

export class E2ETestUtils {
  constructor(private page: Page) {}

  /**
   * Setup test environment and login
   */
  async setupTestEnvironment(): Promise<void> {
    // Clear any existing data
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Set up test data in localStorage if needed
    await this.page.evaluate(() => {
      localStorage.setItem('test-mode', 'true');
    });
  }

  /**
   * Login as test user
   */
  async loginAsTestUser(): Promise<void> {
    await this.page.goto('/login');
    
    await this.page.fill('[data-testid="email"]', 'test@footanalytics.com');
    await this.page.fill('[data-testid="password"]', 'testpassword123');
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await expect(this.page.locator('[data-testid="dashboard"]')).toBeVisible();
  }

  /**
   * Create a test video file for upload testing
   */
  async createTestVideoFile(): Promise<string> {
    const testVideoPath = path.join(__dirname, '../fixtures/test-video.mp4');
    
    // Create a minimal MP4 file for testing (if it doesn't exist)
    try {
      await fs.access(testVideoPath);
    } catch {
      // Create a dummy video file
      const dummyVideoContent = Buffer.alloc(1024 * 1024); // 1MB dummy file
      await fs.writeFile(testVideoPath, dummyVideoContent);
    }
    
    return testVideoPath;
  }

  /**
   * Wait for element to be visible with custom timeout
   */
  async waitForElement(selector: string, timeout: number = 30000): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible({ timeout });
  }

  /**
   * Wait for API request to complete
   */
  async waitForApiRequest(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    });
  }

  /**
   * Fill form with match data
   */
  async fillMatchForm(matchData: any): Promise<void> {
    await this.page.fill('[data-testid="match-home-team"]', matchData.homeTeam);
    await this.page.fill('[data-testid="match-away-team"]', matchData.awayTeam);
    await this.page.fill('[data-testid="match-date"]', matchData.date);
    
    if (matchData.venue) {
      await this.page.fill('[data-testid="match-venue"]', matchData.venue);
    }
    
    if (matchData.competition) {
      await this.page.selectOption('[data-testid="match-competition"]', matchData.competition);
    }
  }

  /**
   * Upload video file
   */
  async uploadVideo(filePath: string): Promise<void> {
    await this.page.setInputFiles('[data-testid="video-upload"]', filePath);
    
    // Wait for upload to start
    await this.waitForElement('[data-testid="upload-progress"]');
    
    // Submit upload
    await this.page.click('[data-testid="upload-submit"]');
    
    // Wait for upload confirmation
    await this.waitForElement('[data-testid="upload-success"]');
  }

  /**
   * Wait for video processing to complete
   */
  async waitForVideoProcessing(matchId: string, timeout: number = 300000): Promise<void> {
    const matchRow = this.page.locator(`[data-testid="match-${matchId}"]`);
    
    // Wait for processing to complete
    await expect(matchRow.locator('[data-testid="status"]')).toHaveText('הושלם', { timeout });
  }

  /**
   * Navigate to analytics dashboard
   */
  async navigateToAnalytics(matchId: string): Promise<void> {
    await this.page.click(`[data-testid="view-analytics-${matchId}"]`);
    await this.waitForElement('[data-testid="analytics-dashboard"]');
  }

  /**
   * Verify analytics data is displayed
   */
  async verifyAnalyticsData(): Promise<void> {
    // Check xG values
    await expect(this.page.locator('[data-testid="xg-home"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="xg-away"]')).toBeVisible();
    
    // Check possession values
    await expect(this.page.locator('[data-testid="possession-home"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="possession-away"]')).toBeVisible();
    
    // Verify values are numeric
    const xgHome = await this.page.locator('[data-testid="xg-home"]').textContent();
    const xgAway = await this.page.locator('[data-testid="xg-away"]').textContent();
    
    expect(parseFloat(xgHome!)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(xgAway!)).toBeGreaterThanOrEqual(0);
  }

  /**
   * Test video player functionality
   */
  async testVideoPlayer(): Promise<void> {
    await this.waitForElement('[data-testid="video-player"]');
    
    // Test play/pause
    await this.page.click('[data-testid="play-button"]');
    await this.page.waitForTimeout(2000);
    await this.page.click('[data-testid="pause-button"]');
    
    // Test timeline interaction
    const timeline = this.page.locator('[data-testid="timeline-scrubber"]');
    await timeline.click({ position: { x: 100, y: 10 } });
    
    // Verify current time updates
    await expect(this.page.locator('[data-testid="current-time"]')).toBeVisible();
  }

  /**
   * Test heatmap interaction
   */
  async testHeatmapInteraction(): Promise<void> {
    await this.page.click('[data-testid="heatmap-tab"]');
    await this.waitForElement('[data-testid="heatmap-canvas"]');
    
    // Select a player
    await this.page.selectOption('[data-testid="player-selector"]', { index: 1 });
    await this.waitForElement('[data-testid="player-heatmap"]');
    
    // Test heatmap controls
    await this.page.click('[data-testid="heatmap-intensity-high"]');
    await this.page.click('[data-testid="heatmap-period-first-half"]');
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format: 'json' | 'pdf' | 'csv'): Promise<string> {
    await this.page.click('[data-testid="export-analytics"]');
    await this.page.selectOption('[data-testid="export-format"]', format);
    
    // Configure export options
    await this.page.check('[data-testid="include-player-data"]');
    await this.page.check('[data-testid="include-events"]');
    
    // Start download
    const downloadPromise = this.page.waitForDownload();
    await this.page.click('[data-testid="download-button"]');
    const download = await downloadPromise;
    
    return download.suggestedFilename();
  }

  /**
   * Test real-time analysis
   */
  async testRealTimeAnalysis(): Promise<void> {
    await this.page.goto('/live-analysis');
    await this.waitForElement('[data-testid="live-analysis-setup"]');
    
    // Configure live stream
    await this.page.selectOption('[data-testid="camera-source"]', 'test-camera');
    await this.page.click('[data-testid="start-live-analysis"]');
    
    // Verify live feed
    await this.waitForElement('[data-testid="live-video-feed"]');
    
    // Wait for analytics updates
    await this.waitForElement('[data-testid="live-xg-home"]', 10000);
    await this.waitForElement('[data-testid="live-possession"]');
  }

  /**
   * Stop real-time analysis and save session
   */
  async stopAndSaveRealTimeSession(sessionName: string): Promise<void> {
    await this.page.click('[data-testid="stop-live-analysis"]');
    
    await this.page.fill('[data-testid="session-name"]', sessionName);
    await this.page.fill('[data-testid="session-notes"]', 'Test session notes');
    
    await this.page.click('[data-testid="save-session"]');
    await this.waitForElement('[data-testid="save-success"]');
  }

  /**
   * Test mobile responsive design
   */
  async testMobileLayout(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile navigation
    await expect(this.page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await this.page.click('[data-testid="mobile-menu-button"]');
    await expect(this.page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  }

  /**
   * Test accessibility features
   */
  async testAccessibility(): Promise<void> {
    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(':focus')).toBeVisible();
    
    // Test ARIA labels
    const chartElements = this.page.locator('[role="img"]');
    if (await chartElements.count() > 0) {
      await expect(chartElements.first()).toHaveAttribute('aria-label');
    }
    
    // Test screen reader text
    const srElements = this.page.locator('.sr-only');
    if (await srElements.count() > 0) {
      await expect(srElements.first()).toBeHidden();
    }
  }

  /**
   * Simulate network error
   */
  async simulateNetworkError(): Promise<void> {
    await this.page.route('**/api/**', route => route.abort());
  }

  /**
   * Restore network connectivity
   */
  async restoreNetwork(): Promise<void> {
    await this.page.unroute('**/api/**');
  }

  /**
   * Test error handling and recovery
   */
  async testErrorRecovery(): Promise<void> {
    // Simulate network failure
    await this.simulateNetworkError();
    
    // Trigger an action that requires network
    await this.page.goto('/matches');
    
    // Check error message
    await this.waitForElement('[data-testid="error-message"]');
    await expect(this.page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Restore network
    await this.restoreNetwork();
    
    // Test recovery
    await this.page.click('[data-testid="retry-button"]');
    await this.waitForElement('[data-testid="matches-list"]');
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    // Clear browser storage
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Clear any uploaded files (if needed)
    // This would typically involve API calls to clean up test data
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for all network requests to complete
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
    });
  }
}
