import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '@core/contracts';
import { TODO_REPOSITORY } from '@domain/repositories';
import type { TodoRepository } from '@domain/repositories';

import { ListTodosQuery } from './list-todos.query';
import { ListTodosResult } from './list-todos.result';

@Injectable()
export class ListTodosUseCase implements UseCase<ListTodosQuery, ListTodosResult> {
  constructor(
    @Inject(TODO_REPOSITORY)
    private readonly todoRepository: TodoRepository,
  ) {}

  async execute(query: ListTodosQuery): Promise<ListTodosResult> {
    const todos = query.status
      ? await this.todoRepository.findByStatus(query.status.toUpperCase())
      : await this.todoRepository.findAll();

    return ListTodosResult.fromEntities(todos);
  }
}
