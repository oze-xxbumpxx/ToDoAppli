/**
 * Prisma の enum ではなく文字列ユニオンで持つ。
 * domain 層は Prisma を import できないため（docs/04-backend.md 4.3）。
 * 変換は infrastructure が引き受ける。
 */
export const TODO_STATUSES = ['todo', 'doing', 'done'] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];

export function isTodoStatus(value: unknown): value is TodoStatus {
  return typeof value === 'string' && (TODO_STATUSES as readonly string[]).includes(value);
}

/** 未完了とみなす status。F-09 の重複判定で使う。 */
export const ACTIVE_STATUSES: readonly TodoStatus[] = ['todo', 'doing'];
