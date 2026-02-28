import { Module } from '@nestjs/common';

import {
  CompleteTodoUseCase,
  CreateTodoUseCase,
  DeleteTodoUseCase,
  GetTodoByIdUseCase,
  ListTodosUseCase,
  UpdateTodoUseCase,
} from './todo';

const useCases = [
  CreateTodoUseCase,
  UpdateTodoUseCase,
  DeleteTodoUseCase,
  CompleteTodoUseCase,
  GetTodoByIdUseCase,
  ListTodosUseCase,
];

@Module({
  providers: [...useCases],
  exports: [...useCases],
})
export class ApplicationModule {}
