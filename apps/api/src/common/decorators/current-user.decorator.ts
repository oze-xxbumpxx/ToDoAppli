import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';

/**
 * Guard が詰めた利用者を取り出す。
 * `user.sub` をそのまま Repository の `ownerId` に渡す（docs/02-domain-and-api.md 2.4）。
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      // JwtAuthGuard を通っていれば必ず入っている。ここに来るのは配線ミス。
      throw new Error('CurrentUser: リクエストに user がありません。Guard の設定を確認してください。');
    }
    return user;
  },
);
