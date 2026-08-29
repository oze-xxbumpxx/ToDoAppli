/**
 * 検証済みトークンから取り出した利用者。
 * `sub` がそのまま Todo の `ownerId` になる（docs/02-domain-and-api.md 2.1）。
 */
export interface AuthenticatedUser {
  readonly sub: string;
  /**
   * ★ null を許容している理由（Phase 4）。
   *
   * Cognito の**アクセストークンには email が入らない**（入るのは ID トークン）。
   * 足すには Pre Token Generation Lambda が要るが、表示用の 1 項目のために
   * インフラを増やす価値が無いと判断した。認可に使うのは sub だけなので、
   * email が無くても機能は落ちない（docs/02-domain-and-api.md 2.1）。
   * 画面に出すメールアドレスは、フロントが ID トークンから読む。
   */
  readonly email: string | null;
}
