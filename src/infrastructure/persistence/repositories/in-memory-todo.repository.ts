import { Injectable } from '@nestjs/common';
import { TodoRepository } from '../../../domain/repositories';
import { Todo, TodoStatus } from '../../../domain/entities';
import {
  TodoId,
  TodoTitle,
  TodoDescription,
} from '../../../domain/value-objects';
import { TodoEntity } from '../entities';

@Injectable()
export class InMemoryTodoRepository implements TodoRepository {
  private readonly store: Map<string, TodoEntity> = new Map();

  findById(id: TodoId): Promise<Todo | null> {
    const entity = this.store.get(id.value);
    if (!entity) {
      return Promise.resolve(null);
    }
    return Promise.resolve(this.toDomain(entity));
  }

  findAll(): Promise<Todo[]> {
    const entities = Array.from(this.store.values());
    return Promise.resolve(entities.map((entity) => this.toDomain(entity)));
  }

  findByStatus(status: string): Promise<Todo[]> {
    const entities = Array.from(this.store.values()).filter(
      (entity) => entity.status === status,
    );
    return Promise.resolve(entities.map((entity) => this.toDomain(entity)));
  }

  save(entity: Todo): Promise<Todo> {
    const todoEntity = this.toEntity(entity);
    this.store.set(todoEntity.id, todoEntity);
    return Promise.resolve(entity);
  }

  update(entity: Todo): Promise<Todo> {
    const todoEntity = this.toEntity(entity);
    this.store.set(todoEntity.id, todoEntity);
    return Promise.resolve(entity);
  }

  delete(id: TodoId): Promise<void> {
    this.store.delete(id.value);
    return Promise.resolve();
  }

  exists(id: TodoId): Promise<boolean> {
    return Promise.resolve(this.store.has(id.value));
  }

  private toDomain(entity: TodoEntity): Todo {
    return Todo.reconstitute({
      id: TodoId.fromString(entity.id),
      title: TodoTitle.create(entity.title),
      description: TodoDescription.create(entity.description),
      status: entity.status as TodoStatus,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toEntity(todo: Todo): TodoEntity {
    return {
      id: todo.id.value,
      title: todo.title.value,
      description: todo.description.value,
      status: todo.status,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
    };
  }
}
