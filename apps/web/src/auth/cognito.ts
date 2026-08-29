import { createCodeChallenge, createCodeVerifier, createState } from './pkce';

/**
 * Cognito（Managed Login）との往復（docs/05-auth.md 5.1）。
 *
 * ここには「ログインの手続き」だけを置く。取得したトークンをどう保つかは
 * token-store.ts の責務で、画面遷移の判断は loader の責務。
 */

const DOMAIN = import.meta.env['VITE_COGNITO_DOMAIN'] ?? '';
const CLIENT_ID = import.meta.env['VITE_COGNITO_CLIENT_ID'] ?? '';
const REDIRECT_URI =
  import.meta.env['VITE_COGNITO_REDIRECT_URI'] ?? 'http://localhost:5173/auth/callback';

/**
 * ★ verifier と state だけは sessionStorage に置く。
 *
 * トークンをメモリのみに置く決定（D-1）と矛盾して見えるが、これらはトークンではない。
 *   - 有効なのはリダイレクトの往復（数十秒）だけ
 *   - 一度使うと無効
 *   - 単体では何の権限も無い
 * そして Cognito へ飛ぶ＝ページが破棄されるので、メモリでは保持できない。
 * 交換が終わったら必ず消す（後述の consumeAuthRequest）。
 */
const VERIFIER_KEY = 'todoapli.pkce.verifier';
const STATE_KEY = 'todoapli.pkce.state';
const RETURN_TO_KEY = 'todoapli.pkce.returnTo';

export interface CognitoTokens {
  readonly accessToken: string;
  readonly idToken: string;
  readonly expiresIn: number;
}

export function isCognitoConfigured(): boolean {
  return DOMAIN !== '' && CLIENT_ID !== '';
}

/** ログイン後に戻る先。検証に失敗したときはここへ落とす */
const DEFAULT_RETURN_TO = '/app/todos';

/**
 * ★ オープンリダイレクト対策。
 *
 * 戻り先は `/login?from=...` に載って**外から与えられる**ので、そのまま
 * redirect() に渡すと `/login?from=https://evil.example` で任意のサイトに飛ばせる。
 * 正規のログイン画面を経由するぶん、フィッシングの導線として質が悪い。
 *
 * 「危険な文字列を弾く」のではなく「**自サイト内のパスだけを通す**」形にする。
 *   - `/` で始まること（絶対 URL を排除）
 *   - `//` と `/\` で始まらないこと（`//evil.example` はプロトコル相対 URL で外部に飛ぶ）
 */
export function safeReturnTo(value: string | null): string {
  if (value === null || !value.startsWith('/')) return DEFAULT_RETURN_TO;
  if (value.startsWith('//') || value.startsWith('/\\')) return DEFAULT_RETURN_TO;
  return value;
}

/**
 * 認可リクエストの URL を組み立て、verifier / state を控える。
 * 戻り値の URL に location.assign すると Managed Login に飛ぶ。
 */
export async function beginLogin(returnTo: string): Promise<string> {
  const verifier = createCodeVerifier();
  const state = createState();

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  // 保存する時点で検証する。取り出す側が検証を忘れても穴にならない
  sessionStorage.setItem(RETURN_TO_KEY, safeReturnTo(returnTo));

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: await createCodeChallenge(verifier),
    code_challenge_method: 'S256', // plain は使わない
  });

  return `https://${DOMAIN}/oauth2/authorize?${params.toString()}`;
}

interface ConsumedRequest {
  readonly verifier: string;
  readonly returnTo: string;
}

/**
 * 控えておいた値を取り出し、**取り出したその場で消す**。
 * state が一致しなければ、そのコールバックは自分が始めたログインの続きではない（CSRF）。
 */
export function consumeAuthRequest(stateFromUrl: string | null): ConsumedRequest {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const expectedState = sessionStorage.getItem(STATE_KEY);
  // sessionStorage も「外から書ける」前提で扱う（XSS があれば書き換えられる）。
  // 入口と出口の両方で検証しておく
  const returnTo = safeReturnTo(sessionStorage.getItem(RETURN_TO_KEY));

  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);

  if (verifier === null || expectedState === null) {
    throw new Error('ログインの途中経過が見つかりません。最初からやり直してください。');
  }
  if (stateFromUrl !== expectedState) {
    // PKCE ではなく state の役目。「別人のログインを自分の画面に流し込まれる」のを防ぐ
    throw new Error('state が一致しません。ログインをやり直してください。');
  }

  return { verifier, returnTo };
}

/** 認可コードをトークンに交換する。ここで初めて verifier を生のまま送る（POST のボディ） */
export async function exchangeCodeForTokens(
  code: string,
  verifier: string,
): Promise<CognitoTokens> {
  const response = await fetch(`https://${DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID, // シークレットは無い。公開クライアントなので client_id だけ
      code,
      redirect_uri: REDIRECT_URI, // 認可時と完全一致していないと拒否される
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    // Cognito のエラーは problem+json ではないので、ApiError には包まない
    throw new Error(`トークンの交換に失敗しました (${response.status})`);
  }

  const body = (await response.json()) as {
    access_token: string;
    id_token: string;
    expires_in: number;
  };

  return {
    accessToken: body.access_token,
    idToken: body.id_token,
    expiresIn: body.expires_in,
  };
}

/**
 * ログアウト URL。Cognito 側のセッション Cookie を切るために、ここへ遷移させる必要がある。
 * ローカルのトークンを捨てるだけだと、次のログインで**何も聞かれずに入れてしまう**。
 */
export function logoutUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: new URL('/login', window.location.origin).toString(),
  });
  return `https://${DOMAIN}/logout?${params.toString()}`;
}
