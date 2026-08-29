/**
 * PKCE（RFC 7636）。docs/05-auth.md 5.1 の 1 と 4 に対応する。
 *
 * SPA はクライアントシークレットを持てない（JS に埋め込めば読める）ので、
 * 代わりに「毎回使い捨ての合言葉」で本人性を示す。
 *   - 認可リクエスト（URL に載る＝人目につく）に出すのは **ハッシュした challenge**
 *   - トークン交換（POST のボディ）で初めて **生の verifier** を出す
 * 途中でコードを盗まれても、verifier を知らない相手はトークンに交換できない。
 */

/** 仕様の要求は 43〜128 文字。32 バイト（＝43 文字）だと下限ぴったりなので余裕を持たせる */
const VERIFIER_BYTES = 48;

/**
 * base64url。標準の base64 と違い + / = を使わない。
 * URL に載せる値なので、エンコードで壊れない表現にする必要がある。
 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  // ★ Math.random() は使わない。予測可能な値だと PKCE も state も意味を失う
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function createCodeVerifier(): string {
  return randomBase64Url(VERIFIER_BYTES);
}

/** CSRF 対策の state。PKCE とは別の目的なので、別の値を使う（使い回さない） */
export function createState(): string {
  return randomBase64Url(16);
}

/**
 * challenge = BASE64URL(SHA256(verifier))。
 * `plain`（ハッシュしない）方式も仕様上あるが、URL に verifier が載るので使わない。
 */
export async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}
