/**
 * 検証済みトークンから取り出した利用者。
 * `sub` がそのまま Todo の `ownerId` になる（docs/02-domain-and-api.md 2.1）。
 */
export interface AuthenticatedUser {
  readonly sub: string;
  readonly email: string;
}
