import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../auth/token-verifier';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

/**
 * 全エンドポイントに既定で適用する（main.ts で globalGuards に登録）。
 *
 * 「認証が必要なところに Guard を付ける」のではなく
 * 「既定で全部に付け、公開したいものだけ @Public() で外す」。
 * 付け忘れが穴にならない側に倒している（docs/03-frontend.md 3.4 と同じ発想）。
 *
 * Phase 4 で変わるのは注入される TokenVerifier の実装だけで、このファイルは変わらない。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearerToken(request.headers['authorization']);
    if (!token) {
      throw new UnauthorizedException('Authorization ヘッダに Bearer トークンがありません');
    }

    request.user = await this.verifier.verify(token);
    return true;
  }
}

function extractBearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const [scheme, token] = value.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
