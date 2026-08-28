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

/** create() の引数。TodoSnapshot と違い status / createdAt / updatedAt を取らない。 */
export interface NewTodoInput {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly description: string | null;
  readonly dueDate: Date | null;
  readonly now: Date;
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

  /**
   * 新規作成。**id と now を引数で受け取る**のがこの設計の肝。
   *
   * ここで uuid を採番したり new Date() を呼んだりすると、domain 層が
   * 「時計」と「乱数」という外の世界に依存する。そうなると
   * テストのたびに時刻を固定する仕掛けが要るし、docs/04-backend.md 4.3 の
   * 「domain は何にも依存しない」も崩れる。**採番は UseCase の仕事**。
   *
   * status を引数に取らないのは、新規作成が必ず 'todo' から始まるというルール自体を
   * ここに埋めているため。呼び出し側が 'done' の Todo を作ることはできない。
   */
  static create(input: NewTodoInput): Todo {
    return new Todo(
      input.id,
      input.ownerId,
      new TodoTitle(input.title),
      input.description,
      'todo',
      input.dueDate,
      input.now,
      input.now,
    );
  }

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

  /**
   * タイトルを変える。changeStatus() と同じく新しいインスタンスを返す。
   *
   * 「同じタイトルの未完了 Todo が他にないか」（F-09）はここでは見ない。
   * 他の Todo を見ないと判定できないので Domain Service の担当
   * （docs/04-backend.md 4.8 の判断基準）。
   */
  rename(title: string, now: Date): Todo {
    return new Todo(
      this.id,
      this.ownerId,
      new TodoTitle(title),
      this.description,
      this.status,
      this.dueDate,
      this.createdAt,
      now,
    );
  }

  describe(description: string | null, now: Date): Todo {
    return new Todo(
      this.id,
      this.ownerId,
      this.title,
      description,
      this.status,
      this.dueDate,
      this.createdAt,
      now,
    );
  }

  reschedule(dueDate: Date | null, now: Date): Todo {
    return new Todo(
      this.id,
      this.ownerId,
      this.title,
      this.description,
      this.status,
      dueDate,
      this.createdAt,
      now,
    );
  }
}
