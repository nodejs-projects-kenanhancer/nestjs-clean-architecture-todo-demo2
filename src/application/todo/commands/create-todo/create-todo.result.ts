import { Todo } from '../../../../domain/entities/index.js';

export class CreateTodoResult {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static fromEntity(entity: Todo): CreateTodoResult {
    return new CreateTodoResult(
      entity.id.value,
      entity.title.value,
      entity.description.value,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
