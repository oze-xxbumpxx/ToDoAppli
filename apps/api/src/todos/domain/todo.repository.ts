import type { Todo } from './todo.entity';
import type { TodoTitle } from './todo-title.vo';
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

  /** 他人のものを指定したときも null。呼び出し側は 403 ではなく 404 にする。 */
  findById(ownerId: string, id: string): Promise<Todo | null>;

  /** F-09 用。未完了（todo / doing）だけを見る。完了済みは重複してよい。 */
  findActiveByTitle(ownerId: string, title: TodoTitle): Promise<Todo | null>;

  /**
   * 新規も更新も同じ save()。Todo は不変なので、create() の直後も
   * rename() の直後も「完成した Todo が 1 つある」という同じ状態であり、
   * 呼び出し側が「新規か既存か」を覚えている必要がない。
   *
   * 引数に ownerId が無いのは、Todo が自分で ownerId を持っているから。
   * 他人の Todo を保存しようにも、それを取得する経路が無い。
   */
  save(todo: Todo): Promise<void>;

  delete(ownerId: string, id: string): Promise<void>;
}

/** interface は実行時に存在しないので Symbol で注入する（docs/04-backend.md 4.4）。 */
export const TODO_REPOSITORY = Symbol('TodoRepository');
