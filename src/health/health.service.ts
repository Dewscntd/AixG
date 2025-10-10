import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async check() {
    const startTime = Date.now();
    
    const [database] = await Promise.allSettled([
      this.checkDatabase(),
    ]);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV', 'development'),
      version: '1.0.0',
      responseTime: `${responseTime}ms`,
      checks: {
        database: {
          status: database.status === 'fulfilled' ? 'ok' : 'error',
          details: database.status === 'fulfilled' ? database.value : database.reason,
        },
      },
    };
  }

  async readiness() {
    try {
      await this.checkDatabase();
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'connected', responseTime: '<5ms' };
    } catch (error) {
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}