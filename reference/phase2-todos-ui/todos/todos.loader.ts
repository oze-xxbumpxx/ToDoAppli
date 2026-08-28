import type { ListTodosResponse } from '@todoapli/shared';
import type { LoaderFunctionArgs } from 'react-router';
import { apiFetch } from '../lib/api-client';

/**
 * 一覧の loader（docs/03-frontend.md 3.2）。
 *
 * ★ 検索条件を useState で持たない。**URL がそのまま状態**。
 *   - ブックマークできる／共有できる／リロードで消えない
 *   - `<Form method="get">` が URL を書き換える → loader が自動で再実行される
 *
 * React Router を使う意味の大半がここにある。
 */
export async function todosLoader({ request }: LoaderFunctionArgs): Promise<ListTodosResponse> {
  const url = new URL(request.url);
  const query = new URLSearchParams();

  // 空文字を送ると API 側の @IsIn / @MaxLength に引っかかるので落とす
  for (const key of ['status', 'q', 'page'] as const) {
    const value = url.searchParams.get(key);
    if (value !== null && value !== '') {
      query.set(key, value);
    }
  }

  const suffix = query.toString();
  return apiFetch<ListTodosResponse>(suffix === '' ? '/todos' : `/todos?${suffix}`);
}
