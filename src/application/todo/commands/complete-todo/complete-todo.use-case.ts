import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '@core/contracts/index.js';
import { TodoNotFoundError } from '@domain/errors/index.js';
import { TODO_REPOSITORY } from '@domain/repositories/index.js';
import type { TodoRepository } from '@domain/repositories/index.js';
import { TodoId } from '@domain/value-objects/index.js';

import { CompleteTodoCommand } from './complete-todo.command.js';
import { CompleteTodoResult } from './complete-todo.result.js';

@Injectable()
export class CompleteTodoUseCase implements UseCase<CompleteTodoCommand, CompleteTodoResult> {
  constructor(
    @Inject(TODO_REPOSITORY)
    private readonly todoRepository: TodoRepository,
  ) {}

  async execute(command: CompleteTodoCommand): Promise<CompleteTodoResult> {
    const todoId = TodoId.fromString(command.id);
    const todo = await this.todoRepository.findById(todoId);

    if (!todo) {
      throw new TodoNotFoundError(command.id);
    }

    const completedTodo = todo.markAsCompleted();
    const savedTodo = await this.todoRepository.update(completedTodo);

    return CompleteTodoResult.fromEntity(savedTodo);
  }
}
