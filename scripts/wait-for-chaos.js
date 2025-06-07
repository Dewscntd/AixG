#!/usr/bin/env node

const { execSync } = require('child_process');

/**
 * Wait for chaos engineering experiments to complete
 * This script monitors Litmus chaos experiments and waits for completion
 */

const MAX_WAIT_TIME = 1800; // 30 minutes
const CHECK_INTERVAL = 30; // 30 seconds

function executeCommand(command) {
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output: result.trim() };
  } catch (error) {
    return { success: false, output: error.message };
  }
}

function getChaosExperimentStatus() {
  const command = 'kubectl get chaosengines -n footanalytics-test -o jsonpath="{.items[*].status.engineStatus}"';
  return executeCommand(command);
}

function getChaosResults() {
  const command = 'kubectl get chaosresults -n footanalytics-test -o jsonpath="{.items[*].status.experimentStatus.verdict}"';
  return executeCommand(command);
}

async function waitForChaosCompletion() {
  console.log('🔥 Waiting for chaos engineering experiments to complete...\n');
  
  const startTime = Date.now();
  const maxEndTime = startTime + (MAX_WAIT_TIME * 1000);
  
  while (Date.now() < maxEndTime) {
    console.log('📊 Checking chaos experiment status...');
    
    // Check engine status
    const engineStatus = getChaosExperimentStatus();
    if (!engineStatus.success) {
      console.log('⚠️  Could not get chaos engine status, retrying...');
    } else {
      console.log(`Engine Status: ${engineStatus.output}`);
      
      // Check if all engines are completed
      const statuses = engineStatus.output.split(' ').filter(s => s);
      const allCompleted = statuses.every(status => 
        status === 'completed' || status === 'stopped'
      );
      
      if (allCompleted && statuses.length > 0) {
        console.log('✅ All chaos engines completed!');
        
        // Check results
        const results = getChaosResults();
        if (results.success) {
          console.log(`Experiment Results: ${results.output}`);
          
          const verdicts = results.output.split(' ').filter(v => v);
          const allPassed = verdicts.every(verdict => verdict === 'Pass');
          
          if (allPassed) {
            console.log('🎉 All chaos experiments passed!');
            return true;
          } else {
            console.log('❌ Some chaos experiments failed');
            return false;
          }
        }
      }
    }
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.floor((maxEndTime - Date.now()) / 1000);
    
    console.log(`⏳ Elapsed: ${elapsed}s, Remaining: ${remaining}s`);
    console.log(`Waiting ${CHECK_INTERVAL}s before next check...\n`);
    
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL * 1000));
  }
  
  console.error('⏰ Timeout waiting for chaos experiments to complete');
  return false;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted, exiting...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminated, exiting...');
  process.exit(1);
});

// Run the script
waitForChaosCompletion().then(success => {
  if (success) {
    console.log('\n🎉 Chaos engineering tests completed successfully!');
    process.exit(0);
  } else {
    console.error('\n💥 Chaos engineering tests failed or timed out');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Error waiting for chaos experiments:', error);
  process.exit(1);
});
