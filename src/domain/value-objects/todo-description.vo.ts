export class TodoDescription {
  private static readonly MAX_LENGTH = 1000;

  private constructor(private readonly _value: string | null) {}

  get value(): string | null {
    return this._value;
  }

  static create(description: string | null | undefined): TodoDescription {
    if (description === null || description === undefined) {
      return new TodoDescription(null);
    }

    const trimmed = description.trim();

    if (trimmed.length > TodoDescription.MAX_LENGTH) {
      throw new Error(
        `Description must not exceed ${TodoDescription.MAX_LENGTH} characters`,
      );
    }

    return new TodoDescription(trimmed || null);
  }

  equals(other: TodoDescription): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value ?? '';
  }
}
