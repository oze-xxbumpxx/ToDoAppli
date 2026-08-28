import { redirect, type LoaderFunctionArgs } from 'react-router';
import { getAccessToken } from '../lib/token-store';

/**
 * 認証ガード（docs/03-frontend.md 3.4）。
 *
 * `/app` レイアウトルートに 1 か所だけ置く。ネストしたルートは
 * **親が子より先に必ず実行される**ので、`/app` 配下は
 * 「未認証なら描画されない」ことが構造で保証される。
 *
 * redirect() は return ではなく **throw** する。
 * loader の途中で打ち切る意味なので、後続の処理を書いても走らないことが型で分かる。
 */
export function requireAuthLoader({ request }: LoaderFunctionArgs): null {
  if (getAccessToken() === null) {
    const from = new URL(request.url).pathname;
    throw redirect(`/login?from=${encodeURIComponent(from)}`);
  }
  return null;
}
