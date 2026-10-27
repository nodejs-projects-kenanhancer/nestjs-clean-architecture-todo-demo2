import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { mock } from 'jest-mock-extended';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { CreateTodoCommand, CreateTodoUseCase } from './../src/application/todo';
import { KafkaService } from './../src/infrastructure/messaging/kafka/kafka.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KafkaService)
      .useValue(mock<KafkaService>())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/todos (GET)', () => {
    return request(app.getHttpServer()).get('/api/todos').expect(200);
  });

  describe('pipeline (CreateTodoUseCase)', () => {
    const logs: string[] = [];
    const pipelineLogs = [
      '→ CreateTodoUseCase.execute',
      expect.stringMatching(/^← CreateTodoUseCase\.execute \(\d+ ms\)$/),
    ];

    beforeEach(() => {
      logs.length = 0;
      for (const level of ['log', 'warn'] as const) {
        jest
          .spyOn(Logger.prototype, level)
          .mockImplementation((message: unknown, ..._optionalParams: unknown[]) => {
            logs.push(String(message));
          });
      }
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('/api/todos (POST) should run the use case through the global pipeline', async () => {
      await request(app.getHttpServer())
        .post('/api/todos')
        .send({ title: 'Learn pipelines' })
        .expect(201);

      expect(logs).toEqual(expect.arrayContaining(pipelineLogs));
    });

    it('a direct call (worker, MCP tool, test) should run the same pipeline', async () => {
      await app.get(CreateTodoUseCase).execute(new CreateTodoCommand('Learn pipelines'));

      expect(logs).toEqual(expect.arrayContaining(pipelineLogs));
    });

    it('/api/todos (POST) with an empty title should keep the exception filter response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/todos')
        .send({ title: '' })
        .expect(400);

      expect(response.body).toMatchObject({
        type: 'https://api.example.com/problems/validation-error',
        title: 'Validation Failed',
        status: 400,
        code: 'TODO_VALIDATION_FAILED',
        detail: 'Title must be at least 1 character(s)',
        instance: '/api/todos',
      });
    });
  });
});
