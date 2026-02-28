import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '@core/contracts/index.js';
import { TodoNotFoundError } from '@domain/errors/index.js';
import { TODO_REPOSITORY } from '@domain/repositories/index.js';
import type { TodoRepository } from '@domain/repositories/index.js';
import { TodoId } from '@domain/value-objects/index.js';

import { GetTodoByIdQuery } from './get-todo-by-id.query.js';
import { GetTodoByIdResult } from './get-todo-by-id.result.js';

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
