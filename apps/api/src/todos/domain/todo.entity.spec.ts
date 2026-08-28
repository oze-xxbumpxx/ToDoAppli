import { describe, expect, it } from 'vitest';
import { Todo } from './todo.entity';
import { InvalidStatusTransition } from './todo.errors';

const NOW = new Date('2026-08-22T00:00:00Z');
const LATER = new Date('2026-08-23T00:00:00Z');

function todoWithStatus(status: 'todo' | 'doing' | 'done'): Todo {
  return Todo.reconstitute({
    id: 't1',
    ownerId: 'user-001',
    title: 'sample',
    description: null,
    status,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

describe('Todo.changeStatus', () => {
  it('done から doing への遷移を拒否する', () => {
    const todo = todoWithStatus('done');
    expect(() => todo.changeStatus('doing', LATER)).toThrow(InvalidStatusTransition);
  });

  it('許可された遷移では新しいインスタンスを返し、元は変えない', () => {
    const todo = todoWithStatus('todo');
    const next = todo.changeStatus('doing', LATER);

    expect(next.status).toBe('doing');
    expect(next.updatedAt).toBe(LATER);
    expect(todo.status).toBe('todo');
    expect(todo.updatedAt).toBe(NOW);
  });
});
