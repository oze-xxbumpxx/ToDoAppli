export const TODO_STATUSES = ['todo', 'doing', 'done'] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];

export function isTodoStatus(value: unknown): value is TodoStatus {
  return typeof value === 'string' && (TODO_STATUSES as readonly string[]).includes(value);
}

export const ACTIVE_STATUSES: readonly TodoStatus[] = ['todo', 'doing'];
