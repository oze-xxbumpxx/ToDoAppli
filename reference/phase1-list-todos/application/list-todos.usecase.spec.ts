import { describe, expect, it } from 'vitest';
import { Todo } from '../domain/todo.entity';
import type { Paginated, TodoFilter, TodoRepository } from '../domain/todo.repository';
import { ListTodosUseCase } from './list-todos.usecase';

/**
 * テストの「仕掛け」の手本。ここまでが定型で、
 * **テストケースの設計は自分でやる**（docs/08-learning-method.md 8.2）。
 *
 * DB もモックライブラリも要らないのは、UseCase の依存が
 * Repository interface ひとつだけだから。これが層を分ける実利（4.3）。
 */
class InMemoryTodoRepository implements TodoRepository {
  constructor(private readonly rows: readonly Todo[]) {}

  async findMany(ownerId: string, filter: TodoFilter): Promise<Paginated<Todo>> {
    // 本物の Repository と同じく、必ず ownerId で絞る
    const owned = this.rows.filter((todo) => todo.ownerId === ownerId);
    const start = (filter.page - 1) * filter.limit;
    return {
      items: owned.slice(start, start + filter.limit),
      page: filter.page,
      limit: filter.limit,
      total: owned.length,
    };
  }
}

function todoOf(id: string, ownerId: string): Todo {
  const now = new Date('2026-08-22T00:00:00Z');
  return Todo.reconstitute({
    id,
    ownerId,
    title: `todo ${id}`,
    description: null,
    status: 'todo',
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  });
}

const FILTER: TodoFilter = { page: 1, limit: 20 };

describe('ListTodosUseCase', () => {
  // ★ 認可の回帰防止テスト。docs/04-backend.md 4.6 で「必ず書く」としたもの。
  it('他人の Todo は返さない', async () => {
    const usecase = new ListTodosUseCase(
      new InMemoryTodoRepository([todoOf('a', 'user-001'), todoOf('b', 'user-002')]),
    );

    const result = await usecase.execute('user-001', FILTER);

    expect(result.items.map((t) => t.id)).toEqual(['a']);
    expect(result.total).toBe(1);
  });

  // TODO(自分で書く):
  //   - status で絞れること
  //   - キーワードで絞れること
  //   - ページングが効くこと（page=2 で 2 ページ目が返る）
  //   - 該当なしのとき items が空で total が 0 になること
});
