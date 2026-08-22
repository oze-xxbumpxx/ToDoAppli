import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma を import してよいのは infrastructure 層だけだが、
 * 接続そのものの管理は横断的関心事なので common に置く。
 * ESLint の層ルールは domain / application からの import を禁じている
 * （eslint.config.mjs, docs/04-backend.md 4.3）。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
