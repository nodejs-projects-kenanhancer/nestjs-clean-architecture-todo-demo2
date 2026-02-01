import { v4 as uuidv4 } from 'uuid';

export class TodoId {
  private constructor(private readonly _value: string) {}

  get value(): string {
    return this._value;
  }

  static create(): TodoId {
    return new TodoId(uuidv4());
  }

  static fromString(id: string): TodoId {
    if (!id || id.trim() === '') {
      throw new Error('TodoId cannot be empty');
    }
    return new TodoId(id);
  }

  equals(other: TodoId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
