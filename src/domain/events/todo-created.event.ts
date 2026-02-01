export class TodoCreatedEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly todoId: string,
    public readonly title: string,
    public readonly description: string | null,
  ) {
    this.occurredAt = new Date();
  }

  static create(todoId: string, title: string, description: string | null): TodoCreatedEvent {
    return new TodoCreatedEvent(todoId, title, description);
  }
}
