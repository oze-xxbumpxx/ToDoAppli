/**
 * アクセストークンの保管場所（決定 D-1 / docs/05-auth.md 5.3）。
 *
 * **メモリのみ。localStorage には置かない。**
 * localStorage は同一オリジンの任意の JS から読めるので、XSS が 1 か所でも
 * あればトークンごと持っていかれる。モジュールスコープの変数なら、
 * 少なくとも「保存されたものを後から読む」経路は存在しない。
 *
 * 代償：リロードでトークンが消える。ただし Phase 4 以降は、Cognito 側の
 * セッション Cookie が生きていれば認可リクエストが即座に戻ってくるので、
 * 利用者から見ると「一瞬 Cognito を経由して戻る」だけになる。
 * BFF + HttpOnly Cookie が本来の正解だが、日程の都合で採らない（D-1 の但し書き）。
 */
let accessToken: string | null = null;

/**
 * ID トークンも保持する。**API には絶対に送らない**（送っても API が拒否する）。
 * 用途は画面にメールアドレスを出すことだけ。Cognito のアクセストークンには
 * email が入らないため、表示用の情報はこちらから読む。
 */
let idToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getIdToken(): string | null {
  return idToken;
}

/**
 * 空文字は null と同じ扱いにする。
 * `''` を通すと `getAccessToken() === null` の認証ガードをすり抜けてしまい、
 * 「ログイン済みだが Authorization ヘッダが空」という一番デバッグしにくい状態になる。
 */
export function setAccessToken(token: string | null): void {
  accessToken = token === null || token.trim() === '' ? null : token;
}

export function setIdToken(token: string | null): void {
  idToken = token === null || token.trim() === '' ? null : token;
}

export function clearAccessToken(): void {
  accessToken = null;
  idToken = null;
}
