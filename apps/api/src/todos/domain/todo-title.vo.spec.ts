import { describe, expect, it } from 'vitest';
import { TodoTitle } from './todo-title.vo';
import { InvalidTodoTitle } from './todo.errors';

describe('TodoTitle', () => {
  it('前後の空白を除いて保持する', () => {
    expect(new TodoTitle('  hello  ').value).toBe('hello');
  });

  it('120 文字は許容する', () => {
    const title = 'a'.repeat(TodoTitle.MAX_LENGTH);
    expect(new TodoTitle(title).value).toBe(title);
  });

  it('空文字は拒否する', () => {
    expect(() => new TodoTitle('')).toThrow(InvalidTodoTitle);
  });

  it('空白のみは拒否する', () => {
    expect(() => new TodoTitle('   ')).toThrow(InvalidTodoTitle);
  });

  it('121 文字は拒否する', () => {
    expect(() => new TodoTitle('a'.repeat(TodoTitle.MAX_LENGTH + 1))).toThrow(InvalidTodoTitle);
  });
});
