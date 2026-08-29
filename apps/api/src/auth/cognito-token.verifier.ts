import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { AuthenticatedUser } from './authenticated-user';
import type { TokenVerifier } from './token-verifier';

/** Cognito が発行する鍵は RS256。他のアルゴリズムを受け付けない（alg 混同攻撃を塞ぐ）。 */
const ALLOWED_ALGORITHMS = ['RS256'];

export interface CognitoVerifyOptions {
  /** https://cognito-idp.<region>.amazonaws.com/<userPoolId> */
  readonly issuer: string;
  /** アプリクライアント ID。アクセストークンでは aud ではなく client_id に入る */
  readonly clientId: string;
  /** 公開鍵の取得元。本番は JWKS の URL、テストはローカル鍵 */
  readonly keys: JWTVerifyGetKey;
}

/**
 * 検証の本体（docs/05-auth.md 5.4）。
 *
 * ★ クラスから切り出して純粋な関数にしてあるのは、テストのため。
 *   createRemoteJWKSet はネットワークに出るので、鍵の取得元を引数にしておくと
 *   「自分で作った鍵で署名したトークン」を使ってオフラインで検証を試せる。
 */
export async function verifyCognitoAccessToken(
  token: string,
  options: CognitoVerifyOptions,
): Promise<AuthenticatedUser> {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, options.keys, {
      issuer: options.issuer,
      algorithms: ALLOWED_ALGORITHMS,
      // exp / nbf は jose が自動で見る
    }));
  } catch {
    // 失敗理由は返さない。「署名が違う」と「期限切れ」を区別させない（dev 版と同じ方針）
    throw new UnauthorizedException('トークンが無効です');
  }

  // ★ ID トークンを API 認可に使わせない。両者は同じ形の JWT で、署名も iss も通る。
  //   ここを書かないと「ログインした人なら誰でも通る」ではなく
  //   「誰の何のためのトークンか分からないものが通る」状態になる（docs/05 の 5.4）。
  if (payload['token_use'] !== 'access') {
    throw new UnauthorizedException('アクセストークンではありません');
  }

  // ★ アクセストークンに aud は無い。同じ User Pool の別アプリのトークンを弾くのは client_id。
  if (payload['client_id'] !== options.clientId) {
    throw new UnauthorizedException('このアプリ向けのトークンではありません');
  }

  const sub = payload.sub;
  if (typeof sub !== 'string') {
    throw new UnauthorizedException('トークンに sub がありません');
  }

  // ★ Cognito の**アクセストークンに email は入らない**（入るのは ID トークン）。
  //   アクセストークンに独自クレームを足すには Pre Token Generation Lambda が要り、
  //   表示用の 1 項目のためにインフラを増やす価値が無いので null を許容している。
  //   認可に使うのは sub だけなので、email が無くても機能は落ちない（docs/02 の 2.1）。
  const email = payload['email'];
  return { sub, email: typeof email === 'string' ? email : null };
}

/**
 * Phase 4 の TokenVerifier。DevTokenVerifier と差し替わるのはこのクラスだけで、
 * Guard も Controller も UseCase も変わらない（docs/05-auth.md 5.5）。
 */
@Injectable()
export class CognitoTokenVerifier implements TokenVerifier {
  private readonly options: CognitoVerifyOptions;

  constructor(config: ConfigService) {
    const issuer = config.get<string>('COGNITO_ISSUER');
    const clientId = config.get<string>('COGNITO_CLIENT_ID');
    if (!issuer || !clientId) {
      // 起動時に落とす。「動くが誰も認証できない」状態でデプロイされるより良い
      throw new Error(
        'COGNITO_ISSUER と COGNITO_CLIENT_ID が必要です。pnpm run env:sync で流し込めます。',
      );
    }

    this.options = {
      issuer,
      clientId,
      // ★ JWKS はここで 1 度だけ組み立てる。createRemoteJWKSet は取得した鍵を
      //   内部でキャッシュし、未知の kid が来たときだけ取り直す。
      //   リクエストごとに作ると毎回取りに行くことになり、レート制限に当たる（5.4）。
      keys: createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)),
    };
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    return verifyCognitoAccessToken(token, this.options);
  }
}
