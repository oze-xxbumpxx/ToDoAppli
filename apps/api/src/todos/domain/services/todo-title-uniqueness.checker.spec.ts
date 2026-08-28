import { describe, expect, it } from 'vitest';
import { InMemoryTodoRepository } from '../../testing/in-memory-todo.repository';
import { Todo } from '../todo.entity';
import { DuplicateTodoTitle } from '../todo.errors';
import { TodoTitle } from '../todo-title.vo';
import type { TodoStatus } from '../todo-status';
import { TodoTitleUniquenessChecker } from './todo-title-uniqueness.checker';

const NOW = new Date('2026-08-27T00:00:00Z');

function todoOf(id: string, title: string, status: TodoStatus, ownerId = 'user-001'): Todo {
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

function checkerWith(...todos: readonly Todo[]): TodoTitleUniquenessChecker {
  return new TodoTitleUniquenessChecker(new InMemoryTodoRepository(todos));
}

describe('TodoTitleUniquenessChecker', () => {
  it('同じタイトルが無ければ通す', async () => {
    const checker = checkerWith(todoOf('t1', '牛乳を買う', 'todo'));

    await expect(checker.assertUnique('user-001', new TodoTitle('パンを買う'))).resolves.toBeUndefined();
  });

  it('未完了に同じタイトルがあれば弾く', async () => {
    const checker = checkerWith(todoOf('t1', '牛乳を買う', 'todo'));

    await expect(checker.assertUnique('user-001', new TodoTitle('牛乳を買う'))).rejects.toThrow(
      DuplicateTodoTitle,
    );
  });

  it('doing も未完了なので弾く', async () => {
    const checker = checkerWith(todoOf('t1', '牛乳を買う', 'doing'));

    await expect(checker.assertUnique('user-001', new TodoTitle('牛乳を買う'))).rejects.toThrow(
      DuplicateTodoTitle,
    );
  });

  it('完了済みと同じタイトルは許す（F-09 は未完了だけが対象）', async () => {
    const checker = checkerWith(todoOf('t1', '牛乳を買う', 'done'));

    await expect(checker.assertUnique('user-001', new TodoTitle('牛乳を買う'))).resolves.toBeUndefined();
  });

  it('他人の Todo とは重複しない', async () => {
    const checker = checkerWith(todoOf('t1', '牛乳を買う', 'todo', 'user-002'));

    await expect(checker.assertUnique('user-001', new TodoTitle('牛乳を買う'))).resolves.toBeUndefined();
  });

  it('見つかったのが自分自身なら重複扱いしない（更新時）', async () => {
    const checker = checkerWith(todoOf('t1', '牛乳を買う', 'todo'));

    await expect(
      checker.assertUnique('user-001', new TodoTitle('牛乳を買う'), 't1'),
    ).resolves.toBeUndefined();
  });

  it('excludeId が別の Todo なら弾く', async () => {
    const checker = checkerWith(todoOf('t1', '牛乳を買う', 'todo'));

    await expect(
      checker.assertUnique('user-001', new TodoTitle('牛乳を買う'), 't2'),
    ).rejects.toThrow(DuplicateTodoTitle);
  });
});
