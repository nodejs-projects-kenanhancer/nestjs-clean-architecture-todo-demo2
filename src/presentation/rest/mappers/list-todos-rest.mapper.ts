import { Injectable } from '@nestjs/common';

import { ListTodosQuery, ListTodosResult, TodoItemResult } from '@application/todo/index.js';
import { IRestQueryMapper } from '@core/contracts/index.js';

import { ListTodosResponse, TodoResponse } from '../dtos/responses/index.js';

export interface ListTodosParams {
  status?: string;
}

@Injectable()
export class ListTodosRestMapper implements IRestQueryMapper<
  ListTodosParams,
  ListTodosQuery,
  ListTodosResult,
  ListTodosResponse
> {
  toQuery(params: ListTodosParams): ListTodosQuery {
    return new ListTodosQuery(params.status);
  }

  toResponse(result: ListTodosResult): ListTodosResponse {
    return {
      todos: result.todos.map(todo => this.mapToTodoResponse(todo)),
    };
  }

  private mapToTodoResponse(todo: TodoItemResult): TodoResponse {
    return {
      id: todo.id,
      title: todo.title,
      description: todo.description,
      status: todo.status,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }
}
