import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';

const isProduction = process.env.NODE_ENV === 'production';

const winstonLogger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(winston.format.timestamp(), winston.format.json())
        : winston.format.combine(
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) =>
              `${timestamp} [${context ?? 'App'}] ${level}: ${message}`,
            ),
          ),
    }),
    ...(isProduction
      ? [
          new winston.transports.File({
            filename: '/var/log/erp/error.log',
            level: 'error',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
          new winston.transports.File({
            filename: '/var/log/erp/combined.log',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
        ]
      : []),
  ],
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false, logger: winstonLogger });

  // Security headers / En-têtes de sécurité.
  app.use(helmet());

  // Strict CORS / CORS strict.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  // Global prefix + URI versioning => /api/v1/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Validate & strip every incoming DTO / Valide et nettoie chaque DTO entrant.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // OpenAPI / Swagger at /api/docs.
  const config = new DocumentBuilder()
    .setTitle('ERP Platform API')
    .setDescription('ERP + CRM + Budgeting + Analytics API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API ready on http://localhost:${port}/api/v1 (docs: /api/docs)`);
}
bootstrap();
