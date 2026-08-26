import { describe, expect, it } from 'vitest';
import { Todo } from '../domain/todo.entity';
import type { Paginated, TodoFilter, TodoRepository } from '../domain/todo.repository';
import type { TodoStatus } from '../domain/todo-status';
import { ListTodosUseCase } from './list-todos.usecase';

/**
 * 本物の Prisma 実装と同じ絞り込みをメモリ上で再現する。
 * UseCase は委譲だけなので、ここで ownerId / status / keyword / paging を揃えないと
 * テストが「UseCase が呼んだ」以上のことを検証できない。
 */
class InMemoryTodoRepository implements TodoRepository {
  constructor(private readonly rows: readonly Todo[]) {}

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
}

function todoOf(
  id: string,
  ownerId: string,
  options: { title?: string; status?: TodoStatus } = {},
): Todo {
  const now = new Date('2026-08-22T00:00:00Z');
  return Todo.reconstitute({
    id,
    ownerId,
    title: options.title ?? `todo ${id}`,
    description: null,
    status: options.status ?? 'todo',
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  });
}

const FILTER: TodoFilter = { page: 1, limit: 20 };

describe('ListTodosUseCase', () => {
  it('他人の Todo は返さない', async () => {
    const usecase = new ListTodosUseCase(
      new InMemoryTodoRepository([todoOf('a', 'user-001'), todoOf('b', 'user-002')]),
    );

    const result = await usecase.execute('user-001', FILTER);

    expect(result.items.map((t) => t.id)).toEqual(['a']);
    expect(result.total).toBe(1);
  });

  it('status で絞れる', async () => {
    const usecase = new ListTodosUseCase(
      new InMemoryTodoRepository([
        todoOf('a', 'user-001', { status: 'todo' }),
        todoOf('b', 'user-001', { status: 'doing' }),
        todoOf('c', 'user-001', { status: 'done' }),
      ]),
    );

    const result = await usecase.execute('user-001', { ...FILTER, status: 'doing' });

    expect(result.items.map((t) => t.id)).toEqual(['b']);
    expect(result.total).toBe(1);
  });

  it('キーワードで title を部分一致（大文字小文字を区別しない）できる', async () => {
    const usecase = new ListTodosUseCase(
      new InMemoryTodoRepository([
        todoOf('a', 'user-001', { title: 'Buy Milk' }),
        todoOf('b', 'user-001', { title: 'Walk the dog' }),
      ]),
    );

    const result = await usecase.execute('user-001', { ...FILTER, keyword: 'milk' });

    expect(result.items.map((t) => t.id)).toEqual(['a']);
    expect(result.total).toBe(1);
  });

  it('ページングが効く（page=2 で 2 ページ目が返る）', async () => {
    const usecase = new ListTodosUseCase(
      new InMemoryTodoRepository([
        todoOf('a', 'user-001'),
        todoOf('b', 'user-001'),
        todoOf('c', 'user-001'),
      ]),
    );

    const result = await usecase.execute('user-001', { page: 2, limit: 2 });

    expect(result.items.map((t) => t.id)).toEqual(['c']);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(2);
    expect(result.total).toBe(3);
  });

  it('該当なしのとき items が空で total が 0 になる', async () => {
    const usecase = new ListTodosUseCase(
      new InMemoryTodoRepository([todoOf('a', 'user-002')]),
    );

    const result = await usecase.execute('user-001', FILTER);

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});
