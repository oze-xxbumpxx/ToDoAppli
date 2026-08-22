import type { AuthenticatedUser } from './authenticated-user';

/**
 * トークン検証の抽象。
 *
 * Phase A（ダミー JWT / HS256）と Phase 4（Cognito / JWKS）で
 * **差し替わるのはこの実装だけ**。Guard の形も Controller も変わらない。
 * docs/05-auth.md 5.5 の「差分を署名検証ロジックだけに閉じ込める」の実体。
 */
export interface TokenVerifier {
  verify(token: string): Promise<AuthenticatedUser>;
}

/** interface は実行時に存在しないので Symbol トークンで注入する（docs/04-backend.md 4.4）。 */
export const TOKEN_VERIFIER = Symbol('TokenVerifier');
