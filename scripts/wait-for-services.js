#!/usr/bin/env node

const { execSync } = require('child_process');
const net = require('net');

/**
 * Wait for services to be ready
 * This script waits for required services to be available before proceeding
 */

const SERVICES = [
  { name: 'PostgreSQL', host: 'localhost', port: 5432 },
  { name: 'Redis', host: 'localhost', port: 6379 },
  { name: 'API Gateway', host: 'localhost', port: 4000 },
];

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 2000; // 2 seconds

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function waitForService(service) {
  console.log(`Waiting for ${service.name} on ${service.host}:${service.port}...`);
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    const isReady = await checkPort(service.host, service.port);
    
    if (isReady) {
      console.log(`✅ ${service.name} is ready!`);
      return true;
    }
    
    console.log(`⏳ ${service.name} not ready, retrying in ${RETRY_INTERVAL/1000}s... (${i + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
  }
  
  console.error(`❌ ${service.name} failed to start after ${MAX_RETRIES} retries`);
  return false;
}

async function waitForAllServices() {
  console.log('🚀 Waiting for all services to be ready...\n');
  
  const results = await Promise.all(
    SERVICES.map(service => waitForService(service))
  );
  
  const allReady = results.every(result => result);
  
  if (allReady) {
    console.log('\n🎉 All services are ready!');
    process.exit(0);
  } else {
    console.error('\n💥 Some services failed to start');
    process.exit(1);
  }
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
waitForAllServices().catch(error => {
  console.error('💥 Error waiting for services:', error);
  process.exit(1);
});
