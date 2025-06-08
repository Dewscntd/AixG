/**
 * Global Jest Setup
 * Runs once before all test suites
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({ path: join(__dirname, '../../.env.test') });
config({ path: join(__dirname, '../../.env.local') });
config({ path: join(__dirname, '../../.env') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Database configuration for tests
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/footanalytics_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

// Disable external services in tests
process.env.DISABLE_EXTERNAL_SERVICES = 'true';
process.env.MOCK_EXTERNAL_APIS = 'true';

// Performance settings for tests
process.env.MAX_WORKERS = '1';
process.env.JEST_TIMEOUT = '30000';

// Security settings for tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';

// ML Pipeline test settings
process.env.ML_PIPELINE_SERVICE_URL = 'http://localhost:8000';
process.env.MOCK_ML_PIPELINE = 'true';

// Pulsar/Kafka test settings
process.env.PULSAR_URL = 'pulsar://localhost:6650';
process.env.MOCK_MESSAGE_BROKER = 'true';

// Storage test settings
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.MOCK_S3_STORAGE = 'true';

// Global test setup
export default async function globalSetup(): Promise<void> {
  console.log('🚀 Starting global test setup...');

  // Configure global test environment
  global.testStartTime = Date.now();
  
  // Initialize test database if needed
  if (process.env.INIT_TEST_DB === 'true') {
    console.log('📊 Initializing test database...');
    // Database initialization would go here
  }
  
  // Initialize test Redis if needed
  if (process.env.INIT_TEST_REDIS === 'true') {
    console.log('🔴 Initializing test Redis...');
    // Redis initialization would go here
  }
  
  // Start test containers if needed
  if (process.env.USE_TEST_CONTAINERS === 'true') {
    console.log('🐳 Starting test containers...');
    // TestContainers setup would go here
  }
  
  console.log('✅ Global test setup completed');
}

// Global test configuration
declare global {
  var testStartTime: number;
}
