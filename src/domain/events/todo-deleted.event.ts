export class TodoDeletedEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly todoId: string,
    public readonly deletedAt: Date,
  ) {
    this.occurredAt = new Date();
  }

  static create(todoId: string): TodoDeletedEvent {
    return new TodoDeletedEvent(todoId, new Date());
  }
}
