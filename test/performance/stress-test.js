/**
 * K6 Stress Testing Script for FootAnalytics Platform
 * Tests system behavior under extreme load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const videoUploadDuration = new Trend('video_upload_duration');
const analyticsQueryDuration = new Trend('analytics_query_duration');
const mlProcessingDuration = new Trend('ml_processing_duration');
const failedRequests = new Counter('failed_requests');

// Test configuration
export const options = {
  stages: [
    // Stress test phases
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 300 },   // Ramp up to 300 users
    { duration: '5m', target: 300 },   // Stay at 300 users
    { duration: '5m', target: 0 },     // Ramp down to 0 users
  ],
  
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    errors: ['rate<0.05'],             // Custom error rate under 5%
    
    // Service-specific thresholds
    video_upload_duration: ['p(95)<10000'],    // Video uploads under 10s
    analytics_query_duration: ['p(95)<1000'],  // Analytics queries under 1s
    ml_processing_duration: ['p(95)<5000'],    // ML processing under 5s
  },
};

const BASE_URL = 'http://localhost:4000';

// Test data generators
function generateMatchData() {
  return {
    id: `match-${Math.random().toString(36).substr(2, 9)}`,
    homeTeamId: `team-home-${Math.random().toString(36).substr(2, 9)}`,
    awayTeamId: `team-away-${Math.random().toString(36).substr(2, 9)}`,
    startTime: new Date().toISOString(),
  };
}

function generateShotData(teamId) {
  return {
    teamId,
    playerId: `player-${Math.random().toString(36).substr(2, 9)}`,
    position: {
      x: Math.random() * 30 + 70, // Shots from attacking third
      y: Math.random() * 60 + 20,
    },
    targetPosition: { x: 100, y: 50 },
    distanceToGoal: Math.random() * 25 + 5,
    angle: Math.random() * 45,
    bodyPart: ['foot', 'head'][Math.floor(Math.random() * 2)],
    situation: ['open_play', 'corner', 'free_kick'][Math.floor(Math.random() * 3)],
    defenderCount: Math.floor(Math.random() * 4),
    gameState: {
      minute: Math.floor(Math.random() * 90) + 1,
      scoreDifference: Math.floor(Math.random() * 5) - 2,
      isHome: Math.random() > 0.5,
    },
    confidence: Math.random() * 0.2 + 0.8,
  };
}

function generatePossessionEvents(homeTeamId, awayTeamId, count = 50) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: i * 1000,
    teamId: Math.random() > 0.5 ? homeTeamId : awayTeamId,
    playerId: `player-${Math.random().toString(36).substr(2, 9)}`,
    eventType: ['pass', 'dribble', 'shot', 'tackle'][Math.floor(Math.random() * 4)],
    position: {
      x: Math.random() * 100,
      y: Math.random() * 100,
    },
    successful: Math.random() > 0.2,
    duration: Math.random() * 10,
  }));
}

// Main test function
export default function () {
  const matchData = generateMatchData();
  
  // Test scenario selection based on iteration
  const scenario = Math.floor(Math.random() * 4);
  
  switch (scenario) {
    case 0:
      testVideoUploadWorkflow(matchData);
      break;
    case 1:
      testAnalyticsQueries();
      break;
    case 2:
      testMLPipelineProcessing(matchData);
      break;
    case 3:
      testRealTimeUpdates();
      break;
  }
  
  sleep(1); // Brief pause between requests
}

function testVideoUploadWorkflow(matchData) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  };
  
  // Create match
  const createMatchStart = Date.now();
  const matchResponse = http.post(
    `${BASE_URL}/api/matches`,
    JSON.stringify(matchData),
    { headers }
  );
  
  const matchSuccess = check(matchResponse, {
    'match creation status is 201': (r) => r.status === 201,
    'match creation response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  if (!matchSuccess) {
    errorRate.add(1);
    failedRequests.add(1);
    return;
  }
  
  // Simulate video upload (mock with metadata only for stress test)
  const uploadStart = Date.now();
  const uploadResponse = http.post(
    `${BASE_URL}/api/videos/upload`,
    {
      matchId: matchData.id,
      metadata: JSON.stringify({
        duration: 5400,
        resolution: '1920x1080',
        fps: 30,
        size: 1024 * 1024 * 500, // 500MB
      }),
    },
    { headers: { 'Authorization': 'Bearer test-token' } }
  );
  
  const uploadDuration = Date.now() - uploadStart;
  videoUploadDuration.add(uploadDuration);
  
  const uploadSuccess = check(uploadResponse, {
    'video upload status is 200': (r) => r.status === 200,
    'video upload response time < 10s': (r) => r.timings.duration < 10000,
  });
  
  if (!uploadSuccess) {
    errorRate.add(1);
    failedRequests.add(1);
  }
}

function testAnalyticsQueries() {
  const matchIds = ['match-001', 'match-002', 'match-003', 'match-004', 'match-005'];
  const teamIds = ['team-home-001', 'team-away-001', 'team-home-002', 'team-away-002'];
  
  const headers = { 'Authorization': 'Bearer test-token' };
  
  // Test match analytics query
  const queryStart = Date.now();
  const matchId = matchIds[Math.floor(Math.random() * matchIds.length)];
  const analyticsResponse = http.get(
    `${BASE_URL}/api/analytics/matches/${matchId}`,
    { headers }
  );
  
  const queryDuration = Date.now() - queryStart;
  analyticsQueryDuration.add(queryDuration);
  
  const querySuccess = check(analyticsResponse, {
    'analytics query status is 200 or 404': (r) => [200, 404].includes(r.status),
    'analytics query response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!querySuccess) {
    errorRate.add(1);
    failedRequests.add(1);
  }
  
  // Test team analytics query
  const teamId = teamIds[Math.floor(Math.random() * teamIds.length)];
  const teamResponse = http.get(
    `${BASE_URL}/api/analytics/teams/${teamId}`,
    { headers }
  );
  
  check(teamResponse, {
    'team analytics query status is 200 or 404': (r) => [200, 404].includes(r.status),
    'team analytics query response time < 1s': (r) => r.timings.duration < 1000,
  });
}

function testMLPipelineProcessing(matchData) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  };
  
  const mlOutput = {
    eventType: 'VideoAnalysisCompleted',
    matchId: matchData.id,
    timestamp: new Date().toISOString(),
    data: {
      shots: [
        generateShotData(matchData.homeTeamId),
        generateShotData(matchData.awayTeamId),
        generateShotData(matchData.homeTeamId),
      ],
      possessionEvents: generatePossessionEvents(
        matchData.homeTeamId,
        matchData.awayTeamId,
        100
      ),
      metadata: {
        processingTime: Math.random() * 120 + 30,
        frameCount: Math.floor(Math.random() * 100000) + 50000,
        analysisQuality: 'high',
      },
    },
  };
  
  const processStart = Date.now();
  const mlResponse = http.post(
    `${BASE_URL}/api/analytics/process-ml-output`,
    JSON.stringify(mlOutput),
    { headers }
  );
  
  const processDuration = Date.now() - processStart;
  mlProcessingDuration.add(processDuration);
  
  const mlSuccess = check(mlResponse, {
    'ML processing status is 200 or 202': (r) => [200, 202].includes(r.status),
    'ML processing response time < 5s': (r) => r.timings.duration < 5000,
  });
  
  if (!mlSuccess) {
    errorRate.add(1);
    failedRequests.add(1);
  }
}

function testRealTimeUpdates() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  };
  
  const frameUpdate = {
    eventType: 'FrameAnalyzed',
    streamId: `stream-${Math.random().toString(36).substr(2, 9)}`,
    frameNumber: Math.floor(Math.random() * 10000),
    timestamp: Date.now(),
    data: {
      players: Array.from({ length: 5 }, () => ({
        id: `player-${Math.random().toString(36).substr(2, 9)}`,
        teamId: `team-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: Math.random() * 100,
          y: Math.random() * 100,
        },
        velocity: {
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 20,
        },
        confidence: Math.random() * 0.2 + 0.8,
      })),
      ball: {
        position: {
          x: Math.random() * 100,
          y: Math.random() * 100,
        },
        velocity: {
          x: (Math.random() - 0.5) * 30,
          y: (Math.random() - 0.5) * 30,
        },
        confidence: Math.random() * 0.2 + 0.8,
      },
    },
  };
  
  const updateResponse = http.post(
    `${BASE_URL}/api/analytics/real-time-update`,
    JSON.stringify(frameUpdate),
    { headers }
  );
  
  const updateSuccess = check(updateResponse, {
    'real-time update status is 200': (r) => r.status === 200,
    'real-time update response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  if (!updateSuccess) {
    errorRate.add(1);
    failedRequests.add(1);
  }
}

// Setup function (runs once per VU)
export function setup() {
  console.log('Starting stress test setup...');
  
  // Warm up the system
  const warmupResponse = http.get(`${BASE_URL}/health`);
  check(warmupResponse, {
    'warmup request successful': (r) => r.status === 200,
  });
  
  return { startTime: Date.now() };
}

// Teardown function (runs once after all VUs finish)
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Stress test completed in ${duration} seconds`);
}
