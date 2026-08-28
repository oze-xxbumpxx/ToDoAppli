import { Global, Module } from '@nestjs/common';
import { DevTokenVerifier } from './dev-token.verifier';
import { TOKEN_VERIFIER } from './token-verifier';

/**
 * Phase 4 ではここの `useClass` を CognitoTokenVerifier に差し替えるだけでよい。
 * Guard も Controller も UseCase も一切変わらない（docs/05-auth.md 5.5）。
 */
@Global()
@Module({
  providers: [{ provide: TOKEN_VERIFIER, useClass: DevTokenVerifier }],
  exports: [TOKEN_VERIFIER],
})
export class AuthModule {}
