import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { RealTimeAnalysisModule } from './real-time-analysis.module';

/**
 * Bootstrap the Real-time Analysis Service
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create NestJS application
    const app = await NestFactory.create(RealTimeAnalysisModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Get configuration service
    const configService = app.get(ConfigService);
    const port = configService.get<number>('port') || 3002;
    const nodeEnv = configService.get<string>('nodeEnv');

    // Setup global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: nodeEnv === 'production',
      })
    );

    // Setup CORS
    const corsConfig = configService.get('cors');
    app.enableCors(corsConfig);

    // Setup WebSocket adapter
    app.useWebSocketAdapter(new IoAdapter(app));

    // Setup Swagger documentation
    const swaggerConfig = configService.get('swagger');
    if (swaggerConfig.enabled) {
      const config = new DocumentBuilder()
        .setTitle(swaggerConfig.title)
        .setDescription(swaggerConfig.description)
        .setVersion(swaggerConfig.version)
        .addTag('Real-time Analysis', 'Live video analysis endpoints')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(swaggerConfig.path, app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });

      logger.log(
        `Swagger documentation available at: http://localhost:${port}/${swaggerConfig.path}`
      );
    }

    // Global prefix for API routes
    app.setGlobalPrefix('api/v1');

    // Start the application
    await app.listen(port);

    logger.log(
      `🚀 Real-time Analysis Service is running on: http://localhost:${port}`
    );
    logger.log(
      `📊 WebSocket endpoint: ws://localhost:${port}/real-time-analysis`
    );
    logger.log(`🌍 Environment: ${nodeEnv}`);

    // Log configuration summary
    const mlConfig = configService.get('ml');
    const streamConfig = configService.get('stream');

    logger.log(
      `🤖 ML Inference: GPU ${mlConfig.gpuEnabled ? 'enabled' : 'disabled'}`
    );
    logger.log(`📹 Max concurrent streams: ${streamConfig.maxStreams}`);
    logger.log(
      `🔄 Stream buffer size: ${streamConfig.defaultBufferSize} frames`
    );
  } catch (error) {
    logger.error('Failed to start Real-time Analysis Service:', error);
    process.exit(1);
  }
}

// Global logger for process handlers
const globalLogger = new Logger('ProcessHandler');

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  globalLogger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  globalLogger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  globalLogger.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  globalLogger.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the application
bootstrap();
