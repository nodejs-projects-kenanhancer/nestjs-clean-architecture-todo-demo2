export class TodoTitle {
  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 200;

  private constructor(private readonly _value: string) {}

  get value(): string {
    return this._value;
  }

  static create(title: string): TodoTitle {
    const trimmed = title?.trim() ?? '';

    if (trimmed.length < TodoTitle.MIN_LENGTH) {
      throw new Error(
        `Title must be at least ${TodoTitle.MIN_LENGTH} character(s)`,
      );
    }

    if (trimmed.length > TodoTitle.MAX_LENGTH) {
      throw new Error(
        `Title must not exceed ${TodoTitle.MAX_LENGTH} characters`,
      );
    }

    return new TodoTitle(trimmed);
  }

  equals(other: TodoTitle): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
