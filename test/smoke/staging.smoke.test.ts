import { describe, test, expect } from '@jest/globals';
import fetch from 'node-fetch';

/**
 * Smoke tests for staging environment
 * These tests verify basic functionality after deployment
 */

const STAGING_BASE_URL =
  process.env.STAGING_BASE_URL || 'https://staging.footanalytics.com';
const TIMEOUT = 30000; // 30 seconds

describe('Staging Smoke Tests', () => {
  test(
    'API Gateway health check',
    async () => {
      const response = await fetch(`${STAGING_BASE_URL}/health`, {
        timeout: TIMEOUT,
      });

      expect(response.status).toBe(200);

      const health = await response.json();
      expect(health).toHaveProperty('status', 'ok');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('services');
    },
    TIMEOUT
  );

  test(
    'GraphQL endpoint is accessible',
    async () => {
      const query = `
      query {
        __schema {
          types {
            name
          }
        }
      }
    `;

      const response = await fetch(`${STAGING_BASE_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        timeout: TIMEOUT,
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('__schema');
    },
    TIMEOUT
  );

  test(
    'Frontend is accessible',
    async () => {
      const response = await fetch(STAGING_BASE_URL, {
        timeout: TIMEOUT,
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
    },
    TIMEOUT
  );

  test(
    'API responds with correct CORS headers',
    async () => {
      const response = await fetch(`${STAGING_BASE_URL}/health`, {
        method: 'OPTIONS',
        timeout: TIMEOUT,
      });

      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
      expect(response.headers.get('access-control-allow-methods')).toBeTruthy();
    },
    TIMEOUT
  );

  test(
    'Security headers are present',
    async () => {
      const response = await fetch(`${STAGING_BASE_URL}/health`, {
        timeout: TIMEOUT,
      });

      // Check for security headers
      expect(response.headers.get('x-frame-options')).toBeTruthy();
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-xss-protection')).toBeTruthy();
    },
    TIMEOUT
  );
});
