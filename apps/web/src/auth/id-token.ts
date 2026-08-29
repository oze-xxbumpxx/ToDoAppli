/**
 * ID トークンから表示用の情報だけを取り出す。
 *
 * ★★ ここでは**署名を検証していない**。だから「表示以外に使ってはいけない」。
 *
 *   検証していない値で権限を判断すると、利用者が自分でトークンを差し替えるだけで
 *   なりすませる。権限の判断は必ずサーバー側（API の JwtAuthGuard）で行い、
 *   ここで読むのは「画面に自分のメールアドレスを出す」ためだけに限る。
 *   サーバーは ID トークンを受け付けないので、間違って送っても事故にはならない。
 */
export function readEmailFromIdToken(idToken: string | null): string | null {
  if (idToken === null) return null;

  const payload = idToken.split('.')[1];
  if (payload === undefined) return null;

  try {
    // base64url → base64 に戻してからデコードする
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as { email?: unknown };
    return typeof claims.email === 'string' ? claims.email : null;
  } catch {
    return null;
  }
}
