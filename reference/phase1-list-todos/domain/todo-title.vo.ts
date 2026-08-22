import { InvalidTodoTitle } from './todo.errors';

/**
 * 値オブジェクト。
 *
 * 「title は 1〜120 文字」は Todo 1 件の情報だけで判定できるので、
 * Domain Service ではなくここに置く（docs/04-backend.md 4.8 の判断基準）。
 *
 * TodoTitle 型として存在している時点で、必ず妥当な値である
 * ——「チェックを書く」のではなく「通れない構造にする」。
 */
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
