import type { TodoStatus } from '@todoapli/shared';

/**
 * 状態の表示名。
 *
 * ★ ここを `@todoapli/shared` に置かなかった理由:
 *   shared に置いてよいのは「API から何が返ってくるか」だけ（docs/02-domain-and-api.md 2.3）。
 *   「未着手」という日本語は UI の都合であって API の契約ではない。
 *
 * ★ 型を `Record<TodoStatus, string>` にしてあるのが肝。
 *   API 側に status が増えて shared の TodoStatus が広がったとき、
 *   **ここがコンパイルエラーになる**。「画面だけ古いまま静かに動く」を防いでいる。
 */
export const TODO_STATUS_LABELS: Readonly<Record<TodoStatus, string>> = {
  todo: '未着手',
  doing: '進行中',
  done: '完了',
};

/** 表示順を固定するための配列。Object.keys だと順序が仕様で保証されないので手で並べる。 */
export const TODO_STATUSES: readonly TodoStatus[] = ['todo', 'doing', 'done'];

/**
 * FormData から来た値は必ず string なので、TodoStatus に絞り込む関門が要る。
 * ここを通さずに `as TodoStatus` と書くと、壊れた値がそのまま API に飛んで 400 になる。
 */
export function isTodoStatus(value: unknown): value is TodoStatus {
  return typeof value === 'string' && Object.hasOwn(TODO_STATUS_LABELS, value);
}
