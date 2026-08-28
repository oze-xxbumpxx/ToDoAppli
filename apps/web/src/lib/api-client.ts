import type { ProblemDetails } from '@todoapli/shared';
import { getAccessToken } from './token-store';

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000/api/v1';

/**
 * API が RFC 9457 で返したエラー（docs/02-domain-and-api.md 2.5）。
 *
 * status を持たせてあるので、呼び出し側は 404 と 422 を区別できる。
 * どう出し分けるか（404 は画面ごと差し替え、422 はフォームにエラー表示、など）は
 * 画面ごとの判断なので、ここでは決めない。
 */
export class ApiError extends Error {
  constructor(readonly problem: ProblemDetails) {
    super(problem.detail);
    this.name = 'ApiError';
  }

  get status(): number {
    return this.problem.status;
  }
}

interface RequestOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

/**
 * 認証ヘッダの付与とエラー整形だけを担当する薄い層。
 *
 * ここに「Todo を取得する」のような業務的な関数は置かない。
 * それは loader / action の仕事（docs/03-frontend.md 3.2）。
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });

  if (!response.ok) {
    throw new ApiError(await toProblem(response));
  }

  // 204 No Content（DELETE）には本体がない
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function toProblem(response: Response): Promise<ProblemDetails> {
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    // API 以外（プロキシ、ネットワーク機器）が返したエラーは problem+json ではない
    return {
      type: 'about:blank',
      title: response.statusText,
      status: response.status,
      detail: `API がエラーを返しました (${response.status})`,
      instance: '',
    };
  }
}
