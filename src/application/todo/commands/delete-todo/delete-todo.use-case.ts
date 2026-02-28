import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '@core/contracts';
import { TodoNotFoundError } from '@domain/errors';
import { TODO_REPOSITORY } from '@domain/repositories';
import type { TodoRepository } from '@domain/repositories';
import { TodoId } from '@domain/value-objects';

import { DeleteTodoCommand } from './delete-todo.command';
import { DeleteTodoResult } from './delete-todo.result';

@Injectable()
export class DeleteTodoUseCase implements UseCase<DeleteTodoCommand, DeleteTodoResult> {
  constructor(
    @Inject(TODO_REPOSITORY)
    private readonly todoRepository: TodoRepository,
  ) {}

  async execute(command: DeleteTodoCommand): Promise<DeleteTodoResult> {
    const todoId = TodoId.fromString(command.id);
    const exists = await this.todoRepository.exists(todoId);

    if (!exists) {
      throw new TodoNotFoundError(command.id);
    }

    await this.todoRepository.delete(todoId);

    return new DeleteTodoResult(true, command.id);
  }
}
