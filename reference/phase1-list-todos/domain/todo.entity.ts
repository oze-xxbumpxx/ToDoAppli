import { TodoTitle } from './todo-title.vo';
import { InvalidStatusTransition } from './todo.errors';
import type { TodoStatus } from './todo-status';

/** 永続化との受け渡しに使う素の形。Prisma の型は使わない（domain は Prisma を知らない）。 */
export interface TodoSnapshot {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TodoStatus;
  readonly dueDate: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * 不変（イミュータブル）な Entity。
 *
 * 全フィールドが readonly で、状態を変えるメソッドは新しいインスタンスを返す。
 * これで 3 つが同時に満たされる（docs/09-coding-standards.md 9.3 例外 2）:
 *   G-2 … `_` プレフィックスが要らない
 *   G-6 … 全フィールドが readonly
 *   原則 … changeStatus() を通さないと不正な状態遷移を作れない
 */
export class Todo {
  private constructor(
    readonly id: string,
    readonly ownerId: string,
    readonly title: TodoTitle,
    readonly description: string | null,
    readonly status: TodoStatus,
    readonly dueDate: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  /** 永続化層から復元する。バリデーションは通すが、業務ルールの判定はしない。 */
  static reconstitute(snapshot: TodoSnapshot): Todo {
    return new Todo(
      snapshot.id,
      snapshot.ownerId,
      new TodoTitle(snapshot.title),
      snapshot.description,
      snapshot.status,
      snapshot.dueDate,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  changeStatus(next: TodoStatus, now: Date): Todo {
    if (this.status === 'done' && next === 'doing') {
      throw new InvalidStatusTransition(this.status, next);
    }
    return new Todo(
      this.id,
      this.ownerId,
      this.title,
      this.description,
      next,
      this.dueDate,
      this.createdAt,
      now,
    );
  }

  toSnapshot(): TodoSnapshot {
    return {
      id: this.id,
      ownerId: this.ownerId,
      title: this.title.value,
      description: this.description,
      status: this.status,
      dueDate: this.dueDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // TODO(横展開): create() と rename() は自分で書く。
  //   create()  … 新規作成。id と now は引数で受け取る（domain を純粋に保つため）
  //   rename()  … changeStatus() と同じ形。新しいインスタンスを返す
}
