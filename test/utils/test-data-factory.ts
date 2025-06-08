/**
 * Enhanced Test Data Factory for FootAnalytics Platform
 * Provides comprehensive test data generation for all domains
 */

import { faker } from '@faker-js/faker';

// Configure faker for Hebrew locale support
faker.locale = 'he';

export class TestDataFactory {
  // Core ID generators
  static createMatchId(): string {
    return `match-${faker.string.uuid()}`;
  }

  static createTeamId(): string {
    return `team-${faker.string.uuid()}`;
  }

  static createPlayerId(): string {
    return `player-${faker.string.uuid()}`;
  }

  static createVideoId(): string {
    return `video-${faker.string.uuid()}`;
  }

  static createStreamId(): string {
    return `stream-${faker.string.uuid()}`;
  }

  static createCalculationId(): string {
    return `calc-${faker.string.uuid()}`;
  }

  static createUserId(): string {
    return `user-${faker.string.uuid()}`;
  }

  // Match data generators
  static createMatchData() {
    const israeliTeams = [
      'מכבי תל אביב', 'הפועל באר שבע', 'מכבי חיפה', 'הפועל תל אביב',
      'בני סכנין', 'עירוני קריית שמונה', 'הפועל חיפה', 'מכבי נתניה',
      'אשדוד', 'הפועל ירושלים', 'בני יהודה', 'מכבי פתח תקווה'
    ];

    const venues = [
      'בלומפילד', 'טרנר', 'סמי עופר', 'דוחא', 'גרין פוינט',
      'עירוני נתניה', 'עירוני אשדוד', 'טדי', 'דוסטוב', 'איצטדיון פתח תקווה'
    ];

    return {
      id: this.createMatchId(),
      homeTeam: faker.helpers.arrayElement(israeliTeams),
      awayTeam: faker.helpers.arrayElement(israeliTeams.filter(team => team !== israeliTeams[0])),
      date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
      venue: faker.helpers.arrayElement(venues),
      competition: faker.helpers.arrayElement(['ליגת העל', 'גביע המדינה', 'גביע הטוטו']),
      season: '2023-24',
      matchday: faker.number.int({ min: 1, max: 36 }),
      kickoffTime: faker.date.recent().toISOString(),
      weather: {
        temperature: faker.number.int({ min: 15, max: 35 }),
        humidity: faker.number.int({ min: 40, max: 80 }),
        windSpeed: faker.number.int({ min: 0, max: 20 }),
        conditions: faker.helpers.arrayElement(['sunny', 'cloudy', 'rainy', 'clear'])
      }
    };
  }

  // Player data generators
  static createPlayerData() {
    const israeliNames = [
      'יוסי', 'דוד', 'משה', 'אברהם', 'יעקב', 'שמואל', 'דניאל', 'מיכאל',
      'רפאל', 'גבריאל', 'אליהו', 'יהונתן', 'בנימין', 'אשר', 'נפתלי'
    ];

    const lastNames = [
      'כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'דהן', 'אברהם', 'דוד',
      'שמואל', 'יוסף', 'חיים', 'משה', 'יעקב', 'אהרון', 'יצחק'
    ];

    return {
      id: this.createPlayerId(),
      name: `${faker.helpers.arrayElement(israeliNames)} ${faker.helpers.arrayElement(lastNames)}`,
      number: faker.number.int({ min: 1, max: 99 }),
      position: faker.helpers.arrayElement(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']),
      age: faker.number.int({ min: 18, max: 38 }),
      height: faker.number.int({ min: 165, max: 200 }),
      weight: faker.number.int({ min: 60, max: 95 }),
      nationality: faker.helpers.arrayElement(['ישראל', 'ברזיל', 'ארגנטינה', 'ספרד', 'צרפת', 'גרמניה']),
      marketValue: faker.number.int({ min: 50000, max: 5000000 }),
      contractUntil: faker.date.future({ years: 3 }).toISOString().split('T')[0]
    };
  }

  // Analytics data generators
  static createShotData() {
    return {
      id: faker.string.uuid(),
      minute: faker.number.int({ min: 1, max: 90 }),
      second: faker.number.int({ min: 0, max: 59 }),
      playerId: this.createPlayerId(),
      teamId: this.createTeamId(),
      position: {
        x: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
        y: faker.number.float({ min: 0, max: 100, fractionDigits: 2 })
      },
      targetPosition: {
        x: faker.number.float({ min: 95, max: 100, fractionDigits: 2 }),
        y: faker.number.float({ min: 35, max: 65, fractionDigits: 2 })
      },
      distanceToGoal: faker.number.float({ min: 5, max: 35, fractionDigits: 1 }),
      angle: faker.number.float({ min: 0, max: 180, fractionDigits: 1 }),
      bodyPart: faker.helpers.arrayElement(['foot', 'head', 'other']),
      situation: faker.helpers.arrayElement(['open_play', 'corner', 'free_kick', 'penalty', 'counter_attack']),
      defenderCount: faker.number.int({ min: 0, max: 5 }),
      outcome: faker.helpers.arrayElement(['goal', 'saved', 'blocked', 'off_target', 'post']),
      xG: faker.number.float({ min: 0, max: 1, fractionDigits: 3 }),
      confidence: faker.number.float({ min: 0.7, max: 1, fractionDigits: 2 })
    };
  }

  static createPossessionEvent() {
    return {
      id: faker.string.uuid(),
      timestamp: faker.number.int({ min: 0, max: 5400000 }), // 90 minutes in ms
      teamId: this.createTeamId(),
      playerId: this.createPlayerId(),
      eventType: faker.helpers.arrayElement([
        'pass', 'dribble', 'shot', 'tackle', 'interception', 'clearance',
        'cross', 'corner', 'throw_in', 'free_kick', 'goal_kick'
      ]),
      position: {
        x: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
        y: faker.number.float({ min: 0, max: 100, fractionDigits: 2 })
      },
      endPosition: {
        x: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
        y: faker.number.float({ min: 0, max: 100, fractionDigits: 2 })
      },
      successful: faker.datatype.boolean(),
      duration: faker.number.int({ min: 1, max: 30 }),
      distance: faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      speed: faker.number.float({ min: 5, max: 35, fractionDigits: 1 })
    };
  }

  // Video data generators
  static createVideoMetadata() {
    return {
      id: this.createVideoId(),
      filename: `match-${faker.date.recent().getTime()}.mp4`,
      originalName: `${faker.lorem.words(2)}.mp4`,
      size: faker.number.int({ min: 500000000, max: 5000000000 }), // 500MB to 5GB
      duration: faker.number.int({ min: 5000, max: 6000 }), // 83-100 minutes
      resolution: {
        width: faker.helpers.arrayElement([1920, 1280, 854]),
        height: faker.helpers.arrayElement([1080, 720, 480])
      },
      fps: faker.helpers.arrayElement([25, 30, 50, 60]),
      bitrate: faker.number.int({ min: 2000, max: 10000 }),
      codec: faker.helpers.arrayElement(['h264', 'h265', 'vp9']),
      uploadedAt: faker.date.recent().toISOString(),
      processedAt: faker.date.recent().toISOString(),
      status: faker.helpers.arrayElement(['uploaded', 'processing', 'processed', 'failed']),
      processingProgress: faker.number.int({ min: 0, max: 100 }),
      thumbnailUrl: `https://storage.example.com/thumbnails/${faker.string.uuid()}.jpg`,
      streamUrl: `https://stream.example.com/videos/${faker.string.uuid()}/playlist.m3u8`
    };
  }

  // ML Pipeline data generators
  static createMLResults() {
    return {
      videoId: this.createVideoId(),
      matchId: this.createMatchId(),
      processingTime: faker.number.float({ min: 60, max: 300, fractionDigits: 1 }),
      modelVersions: {
        playerDetection: `v${faker.number.int({ min: 1, max: 3 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`,
        ballTracking: `v${faker.number.int({ min: 1, max: 2 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`,
        eventDetection: `v${faker.number.int({ min: 2, max: 4 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`
      },
      frameCount: faker.number.int({ min: 135000, max: 180000 }),
      analysisQuality: faker.helpers.arrayElement(['low', 'medium', 'high', 'ultra']),
      confidence: {
        overall: faker.number.float({ min: 0.8, max: 0.98, fractionDigits: 3 }),
        playerDetection: faker.number.float({ min: 0.85, max: 0.99, fractionDigits: 3 }),
        ballTracking: faker.number.float({ min: 0.75, max: 0.95, fractionDigits: 3 }),
        eventDetection: faker.number.float({ min: 0.7, max: 0.9, fractionDigits: 3 })
      }
    };
  }

  // Formation data generators
  static createFormationData() {
    const formations = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-5-1'];
    
    return {
      formation: faker.helpers.arrayElement(formations),
      confidence: faker.number.float({ min: 0.7, max: 0.95, fractionDigits: 2 }),
      averagePositions: Array.from({ length: 11 }, () => ({
        playerId: this.createPlayerId(),
        position: {
          x: faker.number.float({ min: 10, max: 90, fractionDigits: 1 }),
          y: faker.number.float({ min: 10, max: 90, fractionDigits: 1 })
        }
      })),
      transitions: faker.number.int({ min: 0, max: 15 }),
      stability: faker.number.float({ min: 0.6, max: 0.9, fractionDigits: 2 })
    };
  }

  // Performance metrics generators
  static createPerformanceMetrics() {
    return {
      responseTime: faker.number.float({ min: 50, max: 2000, fractionDigits: 1 }),
      throughput: faker.number.int({ min: 100, max: 1000 }),
      errorRate: faker.number.float({ min: 0, max: 5, fractionDigits: 2 }),
      cpuUsage: faker.number.float({ min: 10, max: 90, fractionDigits: 1 }),
      memoryUsage: faker.number.float({ min: 20, max: 80, fractionDigits: 1 }),
      diskUsage: faker.number.float({ min: 30, max: 70, fractionDigits: 1 }),
      networkLatency: faker.number.float({ min: 5, max: 100, fractionDigits: 1 }),
      queueDepth: faker.number.int({ min: 0, max: 50 })
    };
  }

  // Batch generators for large datasets
  static createMultipleShots(count: number) {
    return Array.from({ length: count }, () => this.createShotData());
  }

  static createMultiplePossessionEvents(count: number) {
    return Array.from({ length: count }, () => this.createPossessionEvent());
  }

  static createMultiplePlayers(count: number) {
    return Array.from({ length: count }, () => this.createPlayerData());
  }

  static createMatchWithFullData() {
    const match = this.createMatchData();
    return {
      ...match,
      homeTeamPlayers: this.createMultiplePlayers(11),
      awayTeamPlayers: this.createMultiplePlayers(11),
      shots: this.createMultipleShots(faker.number.int({ min: 8, max: 25 })),
      possessionEvents: this.createMultiplePossessionEvents(faker.number.int({ min: 200, max: 800 })),
      formations: {
        home: this.createFormationData(),
        away: this.createFormationData()
      },
      video: this.createVideoMetadata(),
      mlResults: this.createMLResults()
    };
  }

  // Utility methods
  static randomBetween(min: number, max: number, decimals: number = 0): number {
    const value = faker.number.float({ min, max, fractionDigits: decimals });
    return decimals === 0 ? Math.round(value) : value;
  }

  static randomElement<T>(array: T[]): T {
    return faker.helpers.arrayElement(array);
  }

  static randomElements<T>(array: T[], count: number): T[] {
    return faker.helpers.arrayElements(array, count);
  }

  static createTimestamp(daysAgo: number = 0): string {
    return faker.date.recent({ days: daysAgo }).toISOString();
  }

  static createHebrewText(words: number = 3): string {
    const hebrewWords = [
      'כדורגל', 'קבוצה', 'שחקן', 'מגרש', 'כדור', 'שער', 'משחק', 'ניצחון',
      'הפסד', 'תיקו', 'מאמן', 'שופט', 'קהל', 'אוהדים', 'ליגה', 'גביע'
    ];
    return faker.helpers.arrayElements(hebrewWords, words).join(' ');
  }
}
