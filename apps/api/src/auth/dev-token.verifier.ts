import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import type { AuthenticatedUser } from './authenticated-user';
import type { TokenVerifier } from './token-verifier';

export const DEV_ISSUER = 'todoapli-dev';
export const DEV_AUDIENCE = 'todoapli-api';

/**
 * Phase A 専用。共有鍵（HS256）で署名を検証する。
 *
 * 検証する項目は Cognito 版とそろえてある（docs/05-auth.md 5.4）。
 * とくに `token_use === 'access'` を Phase A から確認しておくことで、
 * Phase 4 で ID トークンを誤って受け付ける事故を構造的に防ぐ。
 */
@Injectable()
export class DevTokenVerifier implements TokenVerifier {
  private readonly secret: Uint8Array;

  constructor(config: ConfigService) {
    const secret = config.get<string>('DEV_JWT_SECRET');
    if (!secret) {
      throw new Error('DEV_JWT_SECRET が未設定です。apps/api/.env を確認してください。');
    }
    this.secret = new TextEncoder().encode(secret);
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.secret, {
        issuer: DEV_ISSUER,
        audience: DEV_AUDIENCE,
      }));
    } catch {
      // 失敗理由は返さない。「署名が違う」と「期限切れ」を区別させない。
      throw new UnauthorizedException('トークンが無効です');
    }

    if (payload['token_use'] !== 'access') {
      // ID トークンを API 認可に使わせない（docs/05-auth.md 5.4）
      throw new UnauthorizedException('アクセストークンではありません');
    }

    const sub = payload.sub;
    const email = payload['email'];
    if (typeof sub !== 'string' || typeof email !== 'string') {
      throw new UnauthorizedException('トークンに必要なクレームがありません');
    }

    return { sub, email };
  }
}
