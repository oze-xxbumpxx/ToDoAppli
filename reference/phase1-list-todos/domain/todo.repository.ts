import type { Todo } from './todo.entity';
import type { TodoStatus } from './todo-status';

export interface TodoFilter {
  readonly status?: TodoStatus;
  readonly keyword?: string;
  readonly page: number;
  readonly limit: number;
}

export interface Paginated<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

/**
 * ★ この設計の要（docs/02-domain-and-api.md 2.4）
 *
 * 全メソッドが ownerId を第一引数に取る。省略できないので、
 * 渡し忘れは実行時のバグではなく**コンパイルエラー**になる。
 *
 * 「安全なコードを書く」ではなく「危険なコードが書けない」。
 * 実装は必ず WHERE owner_id = ? を発行すること。
 */
export interface TodoRepository {
  findMany(ownerId: string, filter: TodoFilter): Promise<Paginated<Todo>>;

  // TODO(横展開): 必要になったら足す。いずれも ownerId が第一引数。
  //   findById(ownerId: string, id: string): Promise<Todo | null>;
  //   findActiveByTitle(ownerId: string, title: TodoTitle): Promise<Todo | null>;
  //   save(todo: Todo): Promise<void>;
  //   delete(ownerId: string, id: string): Promise<void>;
}

/** interface は実行時に存在しないので Symbol で注入する（docs/04-backend.md 4.4）。 */
export const TODO_REPOSITORY = Symbol('TodoRepository');
