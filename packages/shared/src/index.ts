/**
 * API レスポンスの契約。docs/02-domain-and-api.md 2.3 に対応する。
 *
 * ここに置いてよいのは「何が返ってくるか」だけ。
 * バリデーションは置かない（2.3 の決定）。
 */

export type TodoStatus = 'todo' | 'doing' | 'done';

/** ★ ownerId は含まない。自分の Todo しか返らないので自明（docs/02 の 2.3）。 */
export interface TodoResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TodoStatus;
  /** ISO 8601。JSON なので Date ではなく文字列で渡る */
  readonly dueDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListTodosResponse {
  readonly items: readonly TodoResponse[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

export interface MeResponse {
  readonly sub: string;
  /** Cognito のアクセストークンには email が無いので null になりうる（apps/api の authenticated-user.ts）。 */
  readonly email: string | null;
}

/** RFC 9457 (application/problem+json)。docs/02 の 2.5。 */
export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
  readonly errors?: readonly unknown[];
}
