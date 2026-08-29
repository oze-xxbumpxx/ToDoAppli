import { UnauthorizedException } from '@nestjs/common';
import { SignJWT, exportJWK, generateKeyPair, type JWTVerifyGetKey, type KeyObject } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { verifyCognitoAccessToken, type CognitoVerifyOptions } from './cognito-token.verifier';

const ISSUER = 'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_test';
const CLIENT_ID = 'test-client-id';

/**
 * 本物の Cognito は呼ばない。自分で鍵ペアを作り、その公開鍵を「JWKS の代わり」に渡す。
 * こうするとネットワークなしで、署名・iss・token_use・client_id の全経路を試せる。
 */
let privateKey: KeyObject;
let options: CognitoVerifyOptions;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey as KeyObject;
  const keys: JWTVerifyGetKey = () => Promise.resolve(pair.publicKey);
  options = { issuer: ISSUER, clientId: CLIENT_ID, keys };
  // exportJWK は使わないが、鍵が JWK に変換できることだけ確かめておく
  await exportJWK(pair.publicKey);
});

interface ClaimOverrides {
  readonly [claim: string]: unknown;
}

async function sign(claims: ClaimOverrides = {}, key: KeyObject = privateKey): Promise<string> {
  return new SignJWT({
    token_use: 'access',
    client_id: CLIENT_ID,
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(ISSUER)
    .setSubject('cognito-sub-001')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}

describe('verifyCognitoAccessToken', () => {
  it('正しいアクセストークンから sub を取り出す', async () => {
    const user = await verifyCognitoAccessToken(await sign(), options);
    expect(user.sub).toBe('cognito-sub-001');
  });

  it('email クレームが無いアクセストークンでも通り、email は null になる', async () => {
    // Cognito のアクセストークンには email が入らないのが既定。ここが落ちると認証全体が動かない
    const user = await verifyCognitoAccessToken(await sign(), options);
    expect(user.email).toBeNull();
  });

  it('ID トークン（token_use: id）は拒否する', async () => {
    const token = await sign({ token_use: 'id', email: 'a@example.com' });
    await expect(verifyCognitoAccessToken(token, options)).rejects.toThrow(UnauthorizedException);
  });

  it('別アプリの client_id は拒否する', async () => {
    const token = await sign({ client_id: 'another-app' });
    await expect(verifyCognitoAccessToken(token, options)).rejects.toThrow(UnauthorizedException);
  });

  it('別の鍵で署名されたトークンは拒否する', async () => {
    const attacker = await generateKeyPair('RS256');
    const token = await sign({}, attacker.privateKey as KeyObject);
    await expect(verifyCognitoAccessToken(token, options)).rejects.toThrow(UnauthorizedException);
  });

  it('別の User Pool（iss 違い）は拒否する', async () => {
    const token = await new SignJWT({ token_use: 'access', client_id: CLIENT_ID })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer('https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_other')
      .setSubject('cognito-sub-001')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
    await expect(verifyCognitoAccessToken(token, options)).rejects.toThrow(UnauthorizedException);
  });

  it('期限切れのトークンは拒否する', async () => {
    const token = await new SignJWT({ token_use: 'access', client_id: CLIENT_ID })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(ISSUER)
      .setSubject('cognito-sub-001')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(privateKey);
    await expect(verifyCognitoAccessToken(token, options)).rejects.toThrow(UnauthorizedException);
  });
});
