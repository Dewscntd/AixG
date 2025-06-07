import { execSync } from 'child_process';

/**
 * Global setup for E2E tests
 * This runs once before all E2E tests
 */
export default async function globalSetup() {
  console.log('🚀 Setting up E2E test environment...');

  try {
    // Start test services if not already running
    console.log('📦 Starting test services...');
    execSync('docker-compose -f docker-compose.test.yml up -d', {
      stdio: 'inherit',
      timeout: 120000, // 2 minutes timeout
    });

    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    execSync('npm run wait-for-services', {
      stdio: 'inherit',
      timeout: 60000, // 1 minute timeout
    });

    console.log('✅ E2E test environment is ready!');
  } catch (error) {
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
}
