/**
 * 開発用のシード。
 *
 *   pnpm --filter @todoapli/api exec tsx tools/seed.ts
 *
 * わざと 2 人分入れてある。片方のトークンで一覧を取ったとき
 * もう片方の Todo が混ざらないことを目で確認するため
 * （docs/02-domain-and-api.md 2.4）。
 */
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

async function main(): Promise<void> {
  process.loadEnvFile(resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();

  await prisma.todo.deleteMany();

  const now = new Date();
  await prisma.todo.createMany({
    data: [
      { id: uuidv7(), ownerId: 'user-001', title: '牛乳を買う', description: null, status: 'todo', dueDate: null, createdAt: now, updatedAt: now },
      { id: uuidv7(), ownerId: 'user-001', title: '設計書をレビューする', description: 'docs/ を読む', status: 'doing', dueDate: null, createdAt: now, updatedAt: now },
      { id: uuidv7(), ownerId: 'user-001', title: '歯医者に電話', description: null, status: 'done', dueDate: null, createdAt: now, updatedAt: now },
      { id: uuidv7(), ownerId: 'user-002', title: '他人の Todo（見えてはいけない）', description: null, status: 'todo', dueDate: null, createdAt: now, updatedAt: now },
    ],
  });

  const counts = await prisma.todo.groupBy({ by: ['ownerId'], _count: true });
  console.log('seeded:', counts.map((c) => `${c.ownerId}=${c._count}`).join(' '));
  await prisma.$disconnect();
}

void main();
