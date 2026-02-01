import { TodoDescription, TodoId, TodoTitle } from '../value-objects';

export enum TodoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface TodoProps {
  id: TodoId;
  title: TodoTitle;
  description: TodoDescription;
  status: TodoStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Todo {
  private constructor(private readonly props: TodoProps) {}

  get id(): TodoId {
    return this.props.id;
  }

  get title(): TodoTitle {
    return this.props.title;
  }

  get description(): TodoDescription {
    return this.props.description;
  }

  get status(): TodoStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  static create(props: { title: TodoTitle; description?: TodoDescription }): Todo {
    const now = new Date();
    return new Todo({
      id: TodoId.create(),
      title: props.title,
      description: props.description ?? TodoDescription.create(null),
      status: TodoStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: TodoProps): Todo {
    return new Todo(props);
  }

  updateTitle(title: TodoTitle): Todo {
    return new Todo({
      ...this.props,
      title,
      updatedAt: new Date(),
    });
  }

  updateDescription(description: TodoDescription): Todo {
    return new Todo({
      ...this.props,
      description,
      updatedAt: new Date(),
    });
  }

  updateStatus(status: TodoStatus): Todo {
    return new Todo({
      ...this.props,
      status,
      updatedAt: new Date(),
    });
  }

  markAsInProgress(): Todo {
    return this.updateStatus(TodoStatus.IN_PROGRESS);
  }

  markAsCompleted(): Todo {
    return this.updateStatus(TodoStatus.COMPLETED);
  }

  markAsPending(): Todo {
    return this.updateStatus(TodoStatus.PENDING);
  }

  equals(other: Todo): boolean {
    return this.id.equals(other.id);
  }
}
