import { describe, expect, it } from 'vitest';
import { Todo } from '../domain/todo.entity';
import { TodoNotFound } from '../domain/todo.errors';
import { InMemoryTodoRepository } from '../testing/in-memory-todo.repository';
import { GetTodoUseCase } from './get-todo.usecase';

const NOW = new Date('2026-08-27T00:00:00Z');

function todoOf(id: string, ownerId: string): Todo {
  return Todo.reconstitute({
    id,
    ownerId,
    title: `todo ${id}`,
    description: null,
    status: 'todo',
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

describe('GetTodoUseCase', () => {
  it('自分の Todo は取れる', async () => {
    const usecase = new GetTodoUseCase(new InMemoryTodoRepository([todoOf('t1', 'user-001')]));

    await expect(usecase.execute('user-001', 't1')).resolves.toMatchObject({ id: 't1' });
  });

  it('存在しない ID は TodoNotFound', async () => {
    const usecase = new GetTodoUseCase(new InMemoryTodoRepository());

    await expect(usecase.execute('user-001', 'missing')).rejects.toThrow(TodoNotFound);
  });

  it('★ 他人の Todo も TodoNotFound（403 ではない）', async () => {
    const usecase = new GetTodoUseCase(new InMemoryTodoRepository([todoOf('t1', 'user-002')]));

    // 「その ID が存在するかどうか」自体を漏らさない（docs/02-domain-and-api.md 2.4）
    await expect(usecase.execute('user-001', 't1')).rejects.toThrow(TodoNotFound);
  });
});
