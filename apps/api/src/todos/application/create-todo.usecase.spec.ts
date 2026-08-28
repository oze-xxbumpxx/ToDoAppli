import { describe, expect, it } from 'vitest';
import { TodoTitleUniquenessChecker } from '../domain/services/todo-title-uniqueness.checker';
import { Todo } from '../domain/todo.entity';
import { DuplicateTodoTitle, InvalidTodoTitle } from '../domain/todo.errors';
import type { TodoStatus } from '../domain/todo-status';
import { InMemoryTodoRepository } from '../testing/in-memory-todo.repository';
import { CreateTodoUseCase } from './create-todo.usecase';

const NOW = new Date('2026-08-27T00:00:00Z');

function existing(id: string, title: string, status: TodoStatus, ownerId = 'user-001'): Todo {
  return Todo.reconstitute({
    id,
    ownerId,
    title,
    description: null,
    status,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function usecaseWith(...todos: readonly Todo[]): {
  usecase: CreateTodoUseCase;
  repository: InMemoryTodoRepository;
} {
  const repository = new InMemoryTodoRepository(todos);
  return {
    usecase: new CreateTodoUseCase(repository, new TodoTitleUniquenessChecker(repository)),
    repository,
  };
}

describe('CreateTodoUseCase', () => {
  it('新規は必ず status=todo で保存される', async () => {
    const { usecase, repository } = usecaseWith();

    const created = await usecase.execute('user-001', {
      title: '牛乳を買う',
      description: null,
      dueDate: null,
    });

    expect(created.status).toBe('todo');
    expect(created.ownerId).toBe('user-001');
    expect(created.id).not.toBe('');
    expect(created.createdAt).toEqual(created.updatedAt);
    expect(repository.all()).toHaveLength(1);
  });

  it('同じタイトルの未完了があれば作れない（F-09）', async () => {
    const { usecase, repository } = usecaseWith(existing('t1', '牛乳を買う', 'todo'));

    await expect(
      usecase.execute('user-001', { title: '牛乳を買う', description: null, dueDate: null }),
    ).rejects.toThrow(DuplicateTodoTitle);

    // 失敗したときに保存されていないことまで見る
    expect(repository.all()).toHaveLength(1);
  });

  it('完了済みと同じタイトルなら作れる', async () => {
    const { usecase } = usecaseWith(existing('t1', '牛乳を買う', 'done'));

    await expect(
      usecase.execute('user-001', { title: '牛乳を買う', description: null, dueDate: null }),
    ).resolves.toBeDefined();
  });

  it('他人が同じタイトルを持っていても作れる', async () => {
    const { usecase } = usecaseWith(existing('t1', '牛乳を買う', 'todo', 'user-002'));

    await expect(
      usecase.execute('user-001', { title: '牛乳を買う', description: null, dueDate: null }),
    ).resolves.toBeDefined();
  });

  it('空白だけのタイトルは DTO を通っても値オブジェクトが弾く', async () => {
    const { usecase } = usecaseWith();

    await expect(
      usecase.execute('user-001', { title: '   ', description: null, dueDate: null }),
    ).rejects.toThrow(InvalidTodoTitle);
  });
});
