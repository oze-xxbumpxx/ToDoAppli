import { InvalidTodoTitle } from './todo.errors';

export class TodoTitle {
  static readonly MAX_LENGTH = 120;

  readonly value: string;

  constructor(raw: string) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new InvalidTodoTitle('title は空にできません');
    }
    if (trimmed.length > TodoTitle.MAX_LENGTH) {
      throw new InvalidTodoTitle(`title は ${TodoTitle.MAX_LENGTH} 文字以内です`);
    }
    this.value = trimmed;
  }

  equals(other: TodoTitle): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
