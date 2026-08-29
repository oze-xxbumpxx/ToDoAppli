import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CognitoTokenVerifier } from './cognito-token.verifier';
import { DevTokenVerifier } from './dev-token.verifier';
import { TOKEN_VERIFIER, type TokenVerifier } from './token-verifier';

/**
 * どちらの検証器を使うかは **AUTH_MODE だけ**で決まる（docs/05-auth.md 5.5）。
 *
 * ★ providers に両方を並べていないのが肝。並べると Nest が起動時に**両方を生成**し、
 *   使わない方のコンストラクタも走る。CognitoTokenVerifier は環境変数が無いと
 *   例外を投げるので、AUTH_MODE=dev なのに COGNITO_ISSUER が無くて落ちる、という
 *   意味の分からない失敗になる。factory の中で選んだ方だけを new する。
 *
 * ★ 手で new しているのは、依存が ConfigService 1 つだけだから。
 *   依存が増えたら providers に戻して useExisting で選ぶ形にすること。
 *
 * dev モードを残してあるのは、AWS が使えない状況でも API 単体を動かせるようにするため。
 * 既定は cognito 側（AUTH_MODE 未設定で dev にはならない）。
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: TOKEN_VERIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): TokenVerifier =>
        config.get<string>('AUTH_MODE') === 'dev'
          ? new DevTokenVerifier(config)
          : new CognitoTokenVerifier(config),
    },
  ],
  exports: [TOKEN_VERIFIER],
})
export class AuthModule {}
