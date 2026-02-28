import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '@core/contracts/index.js';
import { TodoStatus } from '@domain/entities/index.js';
import {
  InvalidTodoStatusError,
  TodoNotFoundError,
  TodoValidationError,
} from '@domain/errors/index.js';
import { TODO_REPOSITORY } from '@domain/repositories/index.js';
import type { TodoRepository } from '@domain/repositories/index.js';
import { TodoDescription, TodoId, TodoTitle } from '@domain/value-objects/index.js';

import { UpdateTodoCommand } from './update-todo.command.js';
import { UpdateTodoResult } from './update-todo.result.js';

@Injectable()
export class UpdateTodoUseCase implements UseCase<UpdateTodoCommand, UpdateTodoResult> {
  constructor(
    @Inject(TODO_REPOSITORY)
    private readonly todoRepository: TodoRepository,
  ) {}

  async execute(command: UpdateTodoCommand): Promise<UpdateTodoResult> {
    const todoId = TodoId.fromString(command.id);
    let todo = await this.todoRepository.findById(todoId);

    if (!todo) {
      throw new TodoNotFoundError(command.id);
    }

    try {
      if (command.title !== undefined) {
        const title = TodoTitle.create(command.title);
        todo = todo.updateTitle(title);
      }

      if (command.description !== undefined) {
        const description = TodoDescription.create(command.description);
        todo = todo.updateDescription(description);
      }

      if (command.status !== undefined) {
        const status = this.parseStatus(command.status);
        todo = todo.updateStatus(status);
      }

      const updatedTodo = await this.todoRepository.update(todo);

      return UpdateTodoResult.fromEntity(updatedTodo);
    } catch (error) {
      if (error instanceof InvalidTodoStatusError || error instanceof TodoNotFoundError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new TodoValidationError(error.message);
      }
      throw error;
    }
  }

  private parseStatus(status: string): TodoStatus {
    const upperStatus = status.toUpperCase();
    if (!Object.values(TodoStatus).includes(upperStatus as TodoStatus)) {
      throw new InvalidTodoStatusError(status);
    }
    return upperStatus as TodoStatus;
  }
}
