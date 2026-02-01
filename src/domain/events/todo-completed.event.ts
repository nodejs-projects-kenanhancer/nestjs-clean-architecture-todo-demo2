export class TodoCompletedEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly todoId: string,
    public readonly completedAt: Date,
  ) {
    this.occurredAt = new Date();
  }

  static create(todoId: string): TodoCompletedEvent {
    return new TodoCompletedEvent(todoId, new Date());
  }
}
