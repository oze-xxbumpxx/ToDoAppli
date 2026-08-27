import { describe, expect, it } from 'vitest';
import { Todo } from '../domain/todo.entity';
import { TodoNotFound } from '../domain/todo.errors';
import { InMemoryTodoRepository } from '../testing/in-memory-todo.repository';
import { DeleteTodoUseCase } from './delete-todo.usecase';

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

describe('DeleteTodoUseCase', () => {
  it('自分の Todo は消える', async () => {
    const repository = new InMemoryTodoRepository([todoOf('t1', 'user-001')]);
    const usecase = new DeleteTodoUseCase(repository);

    await usecase.execute('user-001', 't1');

    expect(repository.all()).toHaveLength(0);
  });

  it('存在しない ID は TodoNotFound', async () => {
    const usecase = new DeleteTodoUseCase(new InMemoryTodoRepository());

    await expect(usecase.execute('user-001', 'missing')).rejects.toThrow(TodoNotFound);
  });

  it('他人の Todo は消せず、消えてもいない', async () => {
    const repository = new InMemoryTodoRepository([todoOf('t1', 'user-002')]);
    const usecase = new DeleteTodoUseCase(repository);

    await expect(usecase.execute('user-001', 't1')).rejects.toThrow(TodoNotFound);
    expect(repository.all()).toHaveLength(1);
  });
});
