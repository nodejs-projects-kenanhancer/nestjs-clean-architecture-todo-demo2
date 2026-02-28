import { Todo } from '@domain/entities';

export class TodoItemResult {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static fromEntity(entity: Todo): TodoItemResult {
    return new TodoItemResult(
      entity.id.value,
      entity.title.value,
      entity.description.value,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

export class ListTodosResult {
  constructor(public readonly todos: TodoItemResult[]) {}

  static fromEntities(entities: Todo[]): ListTodosResult {
    return new ListTodosResult(entities.map(entity => TodoItemResult.fromEntity(entity)));
  }
}
