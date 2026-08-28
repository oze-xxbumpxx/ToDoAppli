import { describe, expect, it } from 'vitest';
import { TodoTitleUniquenessChecker } from '../domain/services/todo-title-uniqueness.checker';
import { Todo } from '../domain/todo.entity';
import {
  DuplicateTodoTitle,
  InvalidStatusTransition,
  TodoNotFound,
} from '../domain/todo.errors';
import type { TodoStatus } from '../domain/todo-status';
import { InMemoryTodoRepository } from '../testing/in-memory-todo.repository';
import { UpdateTodoUseCase } from './update-todo.usecase';

const NOW = new Date('2026-08-27T00:00:00Z');

interface TodoOptions {
  readonly title?: string;
  readonly description?: string | null;
  readonly status?: TodoStatus;
  readonly dueDate?: Date | null;
  readonly ownerId?: string;
}

function todoOf(id: string, options: TodoOptions = {}): Todo {
  return Todo.reconstitute({
    id,
    ownerId: options.ownerId ?? 'user-001',
    title: options.title ?? `todo ${id}`,
    description: options.description ?? null,
    status: options.status ?? 'todo',
    dueDate: options.dueDate ?? null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function usecaseWith(...todos: readonly Todo[]): {
  usecase: UpdateTodoUseCase;
  repository: InMemoryTodoRepository;
} {
  const repository = new InMemoryTodoRepository(todos);
  return {
    usecase: new UpdateTodoUseCase(repository, new TodoTitleUniquenessChecker(repository)),
    repository,
  };
}

describe('UpdateTodoUseCase', () => {
  it('存在しない ID は TodoNotFound', async () => {
    const { usecase } = usecaseWith();

    await expect(usecase.execute('user-001', 'missing', { status: 'doing' })).rejects.toThrow(
      TodoNotFound,
    );
  });

  it('他人の Todo は TodoNotFound', async () => {
    const { usecase } = usecaseWith(todoOf('t1', { ownerId: 'user-002' }));

    await expect(usecase.execute('user-001', 't1', { status: 'doing' })).rejects.toThrow(
      TodoNotFound,
    );
  });

  // ---- ★ ここが PATCH の本題：undefined と null の違い ----

  it('description を送らなければ変わらない', async () => {
    const { usecase } = usecaseWith(todoOf('t1', { description: '元の説明' }));

    const updated = await usecase.execute('user-001', 't1', { status: 'doing' });

    expect(updated.description).toBe('元の説明');
  });

  it('description に null を送ると消える', async () => {
    const { usecase } = usecaseWith(todoOf('t1', { description: '元の説明' }));

    const updated = await usecase.execute('user-001', 't1', { description: null });

    expect(updated.description).toBeNull();
  });

  it('dueDate も同じく null で消える', async () => {
    const { usecase } = usecaseWith(todoOf('t1', { dueDate: NOW }));

    const updated = await usecase.execute('user-001', 't1', { dueDate: null });

    expect(updated.dueDate).toBeNull();
  });

  // ---- 状態遷移とタイトル重複 ----

  it('done から doing への遷移は Entity が拒否する', async () => {
    const { usecase } = usecaseWith(todoOf('t1', { status: 'done' }));

    await expect(usecase.execute('user-001', 't1', { status: 'doing' })).rejects.toThrow(
      InvalidStatusTransition,
    );
  });

  it('タイトルだけ更新でき、updatedAt が進む', async () => {
    const { usecase } = usecaseWith(todoOf('t1', { title: '古いタイトル' }));

    const updated = await usecase.execute('user-001', 't1', { title: '新しいタイトル' });

    expect(updated.title.value).toBe('新しいタイトル');
    expect(updated.updatedAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('タイトルを他の未完了と同じにすると 422（F-09）', async () => {
    const { usecase } = usecaseWith(
      todoOf('t1', { title: '牛乳を買う' }),
      todoOf('t2', { title: 'パンを買う' }),
    );

    await expect(usecase.execute('user-001', 't2', { title: '牛乳を買う' })).rejects.toThrow(
      DuplicateTodoTitle,
    );
  });

  it('タイトルを変えずに status だけ更新しても、自分自身とはぶつからない', async () => {
    const { usecase } = usecaseWith(todoOf('t1', { title: '牛乳を買う' }));

    await expect(usecase.execute('user-001', 't1', { status: 'doing' })).resolves.toBeDefined();
  });

  it('★ 完了済みを未完了に戻すときも F-09 を見る', async () => {
    // 「完了済みなら重複してよい」の裏返し。done を todo に戻すと、
    // 同名の未完了が 2 つできてしまう
    const { usecase } = usecaseWith(
      todoOf('t1', { title: '牛乳を買う', status: 'done' }),
      todoOf('t2', { title: '牛乳を買う', status: 'todo' }),
    );

    await expect(usecase.execute('user-001', 't1', { status: 'todo' })).rejects.toThrow(
      DuplicateTodoTitle,
    );
  });

  it('完了させるときは同名の未完了があっても通す', async () => {
    const { usecase } = usecaseWith(
      todoOf('t1', { title: '牛乳を買う', status: 'doing' }),
      todoOf('t2', { title: '牛乳を買う', status: 'done' }),
    );

    await expect(usecase.execute('user-001', 't1', { status: 'done' })).resolves.toBeDefined();
  });
});
