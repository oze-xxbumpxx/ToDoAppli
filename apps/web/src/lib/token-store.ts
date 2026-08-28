/**
 * アクセストークンの保管場所（決定 D-1 / docs/05-auth.md 5.3）。
 *
 * **メモリのみ。localStorage には置かない。**
 * localStorage は同一オリジンの任意の JS から読めるので、XSS が 1 か所でも
 * あればトークンごと持っていかれる。モジュールスコープの変数なら、
 * 少なくとも「保存されたものを後から読む」経路は存在しない。
 *
 * 代償：リロードでトークンが消える。Phase 4 では refresh token による
 * 復帰（silent renew）で埋める。BFF + HttpOnly Cookie が本来の正解だが、
 * 日程の都合で採らない（D-1 の但し書き）。
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * 空文字は null と同じ扱いにする。
 * `''` を通すと `getAccessToken() === null` の認証ガードをすり抜けてしまい、
 * 「ログイン済みだが Authorization ヘッダが空」という一番デバッグしにくい状態になる。
 */
export function setAccessToken(token: string | null): void {
  accessToken = token === null || token.trim() === '' ? null : token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
