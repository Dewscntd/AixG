/**
 * FootAnalytics API Gateway - Apollo Federation Gateway
 * 
 * A production-ready GraphQL API Gateway implementing Apollo Federation
 * with comprehensive performance optimizations, security, and monitoring.
 */

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { ApiGatewayModule } from './api-gateway.module';
import { GraphQLExceptionFilter } from './filters/graphql-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';

async function bootstrap() {
  const logger = new Logger('ApiGateway');
  
  try {
    // Create NestJS application
    const app = await NestFactory.create(ApiGatewayModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('port', 4000);
    const environment = configService.get<string>('nodeEnv', 'development');

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: environment === 'production',
      crossOriginEmbedderPolicy: false,
    }));

    // Compression middleware
    app.use(compression());

    // Rate limiting
    app.use('/graphql', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: environment === 'production' ? 1000 : 10000, // requests per window
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    }));

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: environment === 'production',
    }));

    // Global exception filter
    app.useGlobalFilters(new GraphQLExceptionFilter(configService));

    // Global interceptors
    app.useGlobalInterceptors(
      new LoggingInterceptor(configService),
      new PerformanceInterceptor(configService, app.get('MetricsService'))
    );

    // CORS configuration
    app.enableCors({
      origin: configService.get<string>('corsOrigin', '*'),
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Apollo-Require-Preflight',
        'X-Apollo-Operation-Name',
        'X-Apollo-Operation-Id'
      ],
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.log('SIGTERM received, shutting down gracefully...');
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.log('SIGINT received, shutting down gracefully...');
      await app.close();
      process.exit(0);
    });

    // Start server
    await app.listen(port, '0.0.0.0');
    
    logger.log(`🚀 API Gateway running on http://localhost:${port}/graphql`);
    logger.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
    logger.log(`🔍 Environment: ${environment}`);
    
  } catch (error) {
    logger.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
}

// Global logger for process handlers
const globalLogger = new Logger('ProcessHandler');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  globalLogger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  globalLogger.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();
