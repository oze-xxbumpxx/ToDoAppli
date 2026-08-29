import { Controller, Get } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * docs/02-domain-and-api.md のエンドポイント #1。
 *
 * User テーブルを作らない設計（2.1）なので、DB は一切見ない。
 * 検証済みトークンの中身をそのまま返すだけ。
 */
@Controller('me')
export class MeController {
  @Get()
  get(@CurrentUser() user: AuthenticatedUser): { sub: string; email: string | null } {
    return { sub: user.sub, email: user.email };
  }
}
