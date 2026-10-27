import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = configureApp(await NestFactory.create(AppModule));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`REST API: http://localhost:${port}/api/todos`);
  logger.log(`GraphQL Playground: http://localhost:${port}/graphql`);
}

void bootstrap();
