/**
 * Unit Tests for VideoId Value Object
 * Tests immutability, validation, and equality semantics
 */

import { VideoId } from '@video-ingestion/domain/value-objects/video-id.value-object';
import * as fc from 'fast-check';

describe('VideoId Value Object', () => {
  describe('Construction', () => {
    it('should create a valid VideoId with generated UUID', () => {
      const videoId = new VideoId();
      
      expect(videoId).toBeValidVideoId();
      expect(videoId.value).toBeValidUUID();
    });

    it('should create VideoId with provided valid UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const videoId = new VideoId(uuid);
      
      expect(videoId.value).toBe(uuid);
      expect(videoId).toBeValidVideoId();
    });

    it('should throw error for invalid UUID format', () => {
      const invalidUuids = [
        'invalid-uuid',
        '123',
        '',
        'not-a-uuid-at-all',
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000' // too long
      ];

      invalidUuids.forEach(invalidUuid => {
        expect(() => new VideoId(invalidUuid)).toThrow('Invalid VideoId format');
      });
    });
  });

  describe('Equality', () => {
    it('should be equal when UUIDs are the same', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const videoId1 = new VideoId(uuid);
      const videoId2 = new VideoId(uuid);
      
      expect(videoId1.equals(videoId2)).toBe(true);
    });

    it('should not be equal when UUIDs are different', () => {
      const videoId1 = new VideoId('123e4567-e89b-12d3-a456-426614174000');
      const videoId2 = new VideoId('987fcdeb-51a2-43d1-9f12-123456789abc');
      
      expect(videoId1.equals(videoId2)).toBe(false);
    });

    it('should be reflexive (x.equals(x) = true)', () => {
      const videoId = new VideoId();
      expect(videoId.equals(videoId)).toBe(true);
    });

    it('should be symmetric (x.equals(y) = y.equals(x))', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const videoId1 = new VideoId(uuid);
      const videoId2 = new VideoId(uuid);
      
      expect(videoId1.equals(videoId2)).toBe(videoId2.equals(videoId1));
    });

    it('should be transitive (if x.equals(y) and y.equals(z), then x.equals(z))', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const videoId1 = new VideoId(uuid);
      const videoId2 = new VideoId(uuid);
      const videoId3 = new VideoId(uuid);
      
      expect(videoId1.equals(videoId2)).toBe(true);
      expect(videoId2.equals(videoId3)).toBe(true);
      expect(videoId1.equals(videoId3)).toBe(true);
    });
  });

  describe('Immutability', () => {
    it('should be immutable', () => {
      const videoId = new VideoId();
      expect(videoId).toBeImmutable();
    });

    it('should not allow modification of value property', () => {
      const videoId = new VideoId();
      const originalValue = videoId.value;
      
      // Attempt to modify should fail or be ignored
      try {
        (videoId as any).value = 'modified';
      } catch (error) {
        // Expected for immutable objects
      }
      
      expect(videoId.value).toBe(originalValue);
    });
  });

  describe('String Representation', () => {
    it('should return UUID as string representation', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const videoId = new VideoId(uuid);
      
      expect(videoId.toString()).toBe(uuid);
    });
  });

  describe('Static Factory Methods', () => {
    it('should generate new VideoId with generate()', () => {
      const videoId = VideoId.generate();
      
      expect(videoId).toBeValidVideoId();
      expect(videoId.value).toBeValidUUID();
    });

    it('should create VideoId from string with fromString()', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const videoId = VideoId.fromString(uuid);
      
      expect(videoId.value).toBe(uuid);
      expect(videoId).toBeValidVideoId();
    });

    it('should throw error when fromString() receives invalid UUID', () => {
      expect(() => VideoId.fromString('invalid-uuid')).toThrow('Invalid VideoId format');
    });
  });

  describe('Property-Based Tests', () => {
    it('should always create valid VideoIds from valid UUIDs', () => {
      fc.assert(
        fc.property(fc.uuid(), (uuid) => {
          const videoId = new VideoId(uuid);
          expect(videoId.value).toBe(uuid);
          expect(videoId).toBeValidVideoId();
        })
      );
    });

    it('should maintain equality reflexivity for all valid UUIDs', () => {
      fc.assert(
        fc.property(fc.uuid(), (uuid) => {
          const videoId = new VideoId(uuid);
          expect(videoId.equals(videoId)).toBe(true);
        })
      );
    });

    it('should maintain equality symmetry for all valid UUIDs', () => {
      fc.assert(
        fc.property(fc.uuid(), (uuid) => {
          const videoId1 = new VideoId(uuid);
          const videoId2 = new VideoId(uuid);
          expect(videoId1.equals(videoId2)).toBe(videoId2.equals(videoId1));
        })
      );
    });

    it('should always produce different VideoIds when generating', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (count) => {
          const videoIds = Array.from({ length: count }, () => VideoId.generate());
          const uniqueValues = new Set(videoIds.map(id => id.value));
          expect(uniqueValues.size).toBe(count);
        })
      );
    });
  });

  describe('Performance', () => {
    it('should create VideoId quickly', () => {
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          new VideoId();
        }
      }).toHavePerformanceWithin(100); // Should complete within 100ms
    });

    it('should perform equality checks quickly', () => {
      const videoId1 = new VideoId();
      const videoId2 = new VideoId();
      
      expect(() => {
        for (let i = 0; i < 10000; i++) {
          videoId1.equals(videoId2);
        }
      }).toHavePerformanceWithin(50); // Should complete within 50ms
    });
  });
});
