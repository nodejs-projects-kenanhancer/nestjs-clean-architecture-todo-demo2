import { Repository } from '../../core/contracts';
import { Todo } from '../entities';
import { TodoId } from '../value-objects';

export const TODO_REPOSITORY = Symbol('TODO_REPOSITORY');

export interface TodoRepository extends Repository<Todo, TodoId> {
  findByStatus(status: string): Promise<Todo[]>;
}
