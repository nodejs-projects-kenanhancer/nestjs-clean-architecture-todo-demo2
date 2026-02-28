import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '@core/contracts';
import { Todo } from '@domain/entities';
import { TodoValidationError } from '@domain/errors';
import { TODO_REPOSITORY } from '@domain/repositories';
import type { TodoRepository } from '@domain/repositories';
import { TodoDescription, TodoTitle } from '@domain/value-objects';

import { CreateTodoCommand } from './create-todo.command';
import { CreateTodoResult } from './create-todo.result';

@Injectable()
export class CreateTodoUseCase implements UseCase<CreateTodoCommand, CreateTodoResult> {
  constructor(
    @Inject(TODO_REPOSITORY)
    private readonly todoRepository: TodoRepository,
  ) {}

  async execute(command: CreateTodoCommand): Promise<CreateTodoResult> {
    try {
      const title = TodoTitle.create(command.title);
      const description = TodoDescription.create(command.description);

      const todo = Todo.create({ title, description });
      const savedTodo = await this.todoRepository.save(todo);

      return CreateTodoResult.fromEntity(savedTodo);
    } catch (error) {
      if (error instanceof Error) {
        throw new TodoValidationError(error.message);
      }
      throw error;
    }
  }
}
