import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProblemJsonFilter } from './common/filters/problem-json.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { TodosModule } from './todos/todos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
    MeModule,
    TodosModule,
  ],
  providers: [
    // Guard / Filter / Pipe は DI が要るので APP_* トークンで登録する。
    // main.ts の useGlobalGuards() では ConfigService を注入できない。
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: ProblemJsonFilter },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true, // DTO にないプロパティは落とす
          forbidNonWhitelisted: true, // 落とすだけでなく 400 にする
          transform: true, // クエリ文字列を DTO の型に変換する
          transformOptions: { enableImplicitConversion: false },
        }),
    },
  ],
})
export class AppModule {}
