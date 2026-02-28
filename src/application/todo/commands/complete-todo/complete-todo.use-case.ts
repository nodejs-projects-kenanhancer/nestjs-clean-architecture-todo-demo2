import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '@core/contracts';
import { TodoNotFoundError } from '@domain/errors';
import { TODO_REPOSITORY } from '@domain/repositories';
import type { TodoRepository } from '@domain/repositories';
import { TodoId } from '@domain/value-objects';

import { CompleteTodoCommand } from './complete-todo.command';
import { CompleteTodoResult } from './complete-todo.result';

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
