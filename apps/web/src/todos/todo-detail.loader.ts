import type { TodoResponse } from '@todoapli/shared';
import type { LoaderFunctionArgs } from 'react-router';
import { apiFetch } from '../lib/api-client';

/**
 * 詳細の loader（docs/03-frontend.md 3.2）。
 *
 * ★ 一覧（todosLoader）と同じ形で、**親の loader を呼び直していない**のが要点。
 *   /app/todos/1 → /app/todos/2 と移っても再実行されるのはこの loader だけで、
 *   左ペインの一覧は取り直されない。ルートのネスト構造がそれを保証している（3.1）。
 *
 * 404（他人の Todo・存在しない ID）はここでは握り潰さない。
 * ApiError のまま投げると、このルートの errorElement が受け取る（2.5）。
 */
export async function todoDetailLoader({
  params,
}: LoaderFunctionArgs): Promise<TodoResponse> {
  return apiFetch<TodoResponse>(`/todos/${requireTodoId(params.todoId)}`);
}

/**
 * params の値は型の上では常に `string | undefined`。
 * ルート定義に `:todoId` がある限り undefined にはならないが、
 * ルートを書き換えたときに気づけるよう、握り潰さずここで落とす。
 */
export function requireTodoId(todoId: string | undefined): string {
  if (todoId === undefined) {
    throw new Error('ルート定義に :todoId がありません');
  }
  return todoId;
}
