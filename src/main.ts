import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3001);
  const environment = configService.get('NODE_ENV', 'development');

  // Security
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
        scriptSrc: ["'self'"],
        manifestSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
  }));

  // Compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation (development only)
  if (environment === 'development' && configService.get('ENABLE_SWAGGER', 'true') === 'true') {
    const config = new DocumentBuilder()
      .setTitle('AixG Football Analytics API')
      .setDescription('Advanced Football Analytics Platform with AI-Powered Coaching')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('authentication', 'Authentication endpoints')
      .addTag('ai-coaching', 'AI-powered coaching and analysis')
      .addTag('video-analysis', 'Video processing and analysis')
      .addTag('players', 'Player management and statistics')
      .addTag('teams', 'Team management and analytics')
      .addTag('matches', 'Match data and analysis')
      .addTag('real-time', 'Real-time analysis and coaching')
      .addServer(`http://localhost:${port}`, 'Development server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'AixG API Documentation',
      customfavIcon: '/favicon.ico',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      ],
    });

    logger.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
  }

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);
    app.close().then(() => {
      logger.log('Application closed successfully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  await app.listen(port);
  
  logger.log(`🚀 AixG Backend Server running on http://localhost:${port}`);
  logger.log(`🌍 Environment: ${environment}`);
  logger.log(`📊 Health check: http://localhost:${port}/api/v1/health`);
  
  if (environment === 'development') {
    logger.log(`🔧 Development mode - Hot reload enabled`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error);
  process.exit(1);
});