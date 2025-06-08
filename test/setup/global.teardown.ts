/**
 * Global Jest Teardown
 * Runs once after all test suites complete
 */

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting global test teardown...');
  
  const testDuration = Date.now() - (global.testStartTime || 0);
  console.log(`⏱️  Total test execution time: ${testDuration}ms`);
  
  // Clean up test database if needed
  if (process.env.CLEANUP_TEST_DB === 'true') {
    console.log('🗑️  Cleaning up test database...');
    // Database cleanup would go here
  }
  
  // Clean up test Redis if needed
  if (process.env.CLEANUP_TEST_REDIS === 'true') {
    console.log('🗑️  Cleaning up test Redis...');
    // Redis cleanup would go here
  }
  
  // Stop test containers if needed
  if (process.env.USE_TEST_CONTAINERS === 'true') {
    console.log('🛑 Stopping test containers...');
    // TestContainers cleanup would go here
  }
  
  // Clean up temporary files
  if (process.env.CLEANUP_TEMP_FILES === 'true') {
    console.log('🗑️  Cleaning up temporary files...');
    // Temporary file cleanup would go here
  }
  
  // Force garbage collection if available
  if (global.gc) {
    console.log('♻️  Running garbage collection...');
    global.gc();
  }
  
  console.log('✅ Global test teardown completed');
}
