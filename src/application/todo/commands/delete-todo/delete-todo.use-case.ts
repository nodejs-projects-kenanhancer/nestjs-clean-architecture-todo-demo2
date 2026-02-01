import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../core/contracts/index.js';
import { TodoNotFoundError } from '../../../../domain/errors/index.js';
import { TODO_REPOSITORY } from '../../../../domain/repositories/index.js';
import type { TodoRepository } from '../../../../domain/repositories/index.js';
import { TodoId } from '../../../../domain/value-objects/index.js';
import { DeleteTodoCommand } from './delete-todo.command.js';
import { DeleteTodoResult } from './delete-todo.result.js';

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
