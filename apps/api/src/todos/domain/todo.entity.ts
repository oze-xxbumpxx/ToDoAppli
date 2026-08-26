import { TodoTitle } from './todo-title.vo';
import { InvalidStatusTransition } from './todo.errors';
import type { TodoStatus } from './todo-status';

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
