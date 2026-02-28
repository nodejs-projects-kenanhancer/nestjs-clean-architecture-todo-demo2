import { Injectable } from '@nestjs/common';

import { ListTodosQuery, ListTodosResult, TodoItemResult } from '@application/todo/index.js';
import { IGraphqlQueryMapper } from '@core/contracts/index.js';

import { ListTodosArgs } from '../args/index.js';
import { TodoType } from '../dtos/types/index.js';

@Injectable()
export class ListTodosGraphqlMapper implements IGraphqlQueryMapper<
  ListTodosArgs,
  ListTodosQuery,
  ListTodosResult,
  TodoType[]
> {
  toQuery(args: ListTodosArgs): ListTodosQuery {
    return new ListTodosQuery(args.status);
  }

  toType(result: ListTodosResult): TodoType[] {
    return result.todos.map(todo => this.mapToTodoType(todo));
  }

  private mapToTodoType(todo: TodoItemResult): TodoType {
    const type = new TodoType();
    type.id = todo.id;
    type.title = todo.title;
    type.description = todo.description;
    type.status = todo.status;
    type.createdAt = todo.createdAt;
    type.updatedAt = todo.updatedAt;
    return type;
  }
}
