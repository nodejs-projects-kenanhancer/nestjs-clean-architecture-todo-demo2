import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '@core/contracts';
import { TodoNotFoundError } from '@domain/errors';
import { TODO_REPOSITORY } from '@domain/repositories';
import type { TodoRepository } from '@domain/repositories';
import { TodoId } from '@domain/value-objects';

import { GetTodoByIdQuery } from './get-todo-by-id.query';
import { GetTodoByIdResult } from './get-todo-by-id.result';

@Injectable()
export class GetTodoByIdUseCase implements UseCase<GetTodoByIdQuery, GetTodoByIdResult> {
  constructor(
    @Inject(TODO_REPOSITORY)
    private readonly todoRepository: TodoRepository,
  ) {}

  async execute(query: GetTodoByIdQuery): Promise<GetTodoByIdResult> {
    const todoId = TodoId.fromString(query.id);
    const todo = await this.todoRepository.findById(todoId);

    if (!todo) {
      throw new TodoNotFoundError(query.id);
    }

    return GetTodoByIdResult.fromEntity(todo);
  }
}
