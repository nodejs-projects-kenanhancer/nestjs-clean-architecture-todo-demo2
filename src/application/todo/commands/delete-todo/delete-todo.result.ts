export class DeleteTodoResult {
  constructor(
    public readonly success: boolean,
    public readonly deletedId: string,
  ) {}
}
