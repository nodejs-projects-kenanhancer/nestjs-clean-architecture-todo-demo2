import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Global set-up shared by main.ts and the e2e tests, so that tests run requests through the same
 * pipes as production.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  app.enableCors();

  return app;
}
