/**
 * Phase A 用のダミー JWT 発行スクリプト。
 *
 *   pnpm run token                        # 既定のユーザー
 *   pnpm run token user-002 b@test.dev    # 別ユーザー
 *
 * 2 人分を発行すれば「片方のユーザーで他方の Todo を取ると 404 になる」ことを
 * 手で確認できる（docs/02-domain-and-api.md 2.4）。
 *
 * Phase 4 でこのスクリプトは不要になる。Cognito が本物のトークンを発行するため。
 */
import { resolve } from 'node:path';
import { SignJWT } from 'jose';
import { DEV_AUDIENCE, DEV_ISSUER } from '../src/auth/dev-token.verifier';

async function main(): Promise<void> {
  process.loadEnvFile(resolve(__dirname, '../.env'));

  const secret = process.env['DEV_JWT_SECRET'];
  if (!secret) {
    console.error('DEV_JWT_SECRET が未設定です。apps/api/.env.example をコピーしてください。');
    process.exit(1);
  }

  const sub = process.argv[2] ?? 'user-001';
  const email = process.argv[3] ?? 'dev@example.com';

  const token = await new SignJWT({ email, token_use: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(DEV_ISSUER)
    .setAudience(DEV_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(new TextEncoder().encode(secret));

  console.error(`sub:   ${sub}`);
  console.error(`email: ${email}`);
  // トークンだけを stdout に出す。`$(pnpm -s token)` でそのまま使えるようにするため。
  console.log(token);
}

void main();
