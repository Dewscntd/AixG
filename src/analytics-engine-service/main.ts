/**
 * Main entry point for Analytics Engine Service
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AnalyticsModule } from './analytics.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AnalyticsModule);
    
    // Get configuration
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const environment = configService.get<string>('NODE_ENV', 'development');
    
    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: environment === 'production'
    }));
    
    // CORS configuration
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN', '*'),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    });
    
    // Swagger documentation (only in development)
    if (environment !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('FootAnalytics Analytics Engine API')
        .setDescription('AI-powered football analytics engine with CQRS and Event Sourcing')
        .setVersion('1.0')
        .addTag('analytics', 'Match and team analytics operations')
        .addTag('queries', 'Read operations for analytics data')
        .addTag('commands', 'Write operations for analytics updates')
        .addBearerAuth()
        .build();
      
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        }
      });
      
      logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
    }
    
    // Health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'analytics-engine',
        version: '1.0.0',
        environment
      });
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.log('SIGTERM received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.log('SIGINT received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });
    
    // Start the application
    await app.listen(port, '0.0.0.0');
    
    logger.log(`🚀 Analytics Engine Service started successfully`);
    logger.log(`📊 Environment: ${environment}`);
    logger.log(`🌐 Server running on: http://localhost:${port}`);
    logger.log(`📈 GraphQL Playground: http://localhost:${port}/graphql`);
    
    if (environment !== 'production') {
      logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    }
    
  } catch (error) {
    logger.error('Failed to start Analytics Engine Service', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();
