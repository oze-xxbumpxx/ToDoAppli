import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

/** 配線が生きているかの確認用。認証不要。 */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
