import { describe, expect, it } from 'vitest';
import { isTodoStatus } from './todo-status';

describe('isTodoStatus', () => {
  it('既知の status だけを通す', () => {
    expect(isTodoStatus('todo')).toBe(true);
    expect(isTodoStatus('doing')).toBe(true);
    expect(isTodoStatus('done')).toBe(true);
  });

  it('未知の値は拒否する', () => {
    expect(isTodoStatus('pending')).toBe(false);
    expect(isTodoStatus('TODO')).toBe(false);
    expect(isTodoStatus(1)).toBe(false);
    expect(isTodoStatus(null)).toBe(false);
  });
});
