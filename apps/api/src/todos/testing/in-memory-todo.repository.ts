import type { Todo } from '../domain/todo.entity';
import { ACTIVE_STATUSES } from '../domain/todo-status';
import type { TodoTitle } from '../domain/todo-title.vo';
import type { Paginated, TodoFilter, TodoRepository } from '../domain/todo.repository';

/**
 * テスト用の TodoRepository 実装。**Prisma 実装と同じ絞り込みをメモリ上で再現する。**
 *
 * ここで ownerId / status / keyword / paging を本気で再現しないと、
 * テストが「UseCase が repository を呼んだ」以上のことを検証できない。
 *
 * dist に混ぜないよう、tsconfig.build.json の exclude で testing/ を外している。
 */
export class InMemoryTodoRepository implements TodoRepository {
  private readonly rows: Todo[];

  constructor(rows: readonly Todo[] = []) {
    this.rows = [...rows];
  }

  /** 保存結果を検証するための覗き窓。テスト専用。 */
  all(): readonly Todo[] {
    return this.rows;
  }

  async findMany(ownerId: string, filter: TodoFilter): Promise<Paginated<Todo>> {
    let owned = this.rows.filter((todo) => todo.ownerId === ownerId);

    if (filter.status) {
      owned = owned.filter((todo) => todo.status === filter.status);
    }

    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      owned = owned.filter((todo) => todo.title.value.toLowerCase().includes(keyword));
    }

    const start = (filter.page - 1) * filter.limit;
    return {
      items: owned.slice(start, start + filter.limit),
      page: filter.page,
      limit: filter.limit,
      total: owned.length,
    };
  }

  async findById(ownerId: string, id: string): Promise<Todo | null> {
    return this.rows.find((todo) => todo.id === id && todo.ownerId === ownerId) ?? null;
  }

  async findActiveByTitle(ownerId: string, title: TodoTitle): Promise<Todo | null> {
    return (
      this.rows.find(
        (todo) =>
          todo.ownerId === ownerId &&
          todo.title.value === title.value &&
          ACTIVE_STATUSES.includes(todo.status),
      ) ?? null
    );
  }

  async save(todo: Todo): Promise<void> {
    const index = this.rows.findIndex((row) => row.id === todo.id);
    if (index === -1) {
      this.rows.push(todo);
    } else {
      this.rows[index] = todo;
    }
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const index = this.rows.findIndex((todo) => todo.id === id && todo.ownerId === ownerId);
    if (index !== -1) {
      this.rows.splice(index, 1);
    }
  }
}
