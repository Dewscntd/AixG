import { execSync } from 'child_process';

/**
 * Global teardown for E2E tests
 * This runs once after all E2E tests
 */
export default async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  try {
    // Stop test services
    console.log('🛑 Stopping test services...');
    execSync('docker-compose -f docker-compose.test.yml down', {
      stdio: 'inherit',
      timeout: 60000, // 1 minute timeout
    });

    console.log('✅ E2E test environment cleaned up!');
  } catch (error) {
    console.error(
      '⚠️  Warning: Failed to cleanup E2E test environment:',
      error
    );
    // Don't throw error in teardown to avoid masking test failures
  }
}
