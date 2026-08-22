import { Injectable } from '@nestjs/common';
import type { Prisma, Todo as TodoRow } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Todo } from '../domain/todo.entity';
import { isTodoStatus } from '../domain/todo-status';
import type { Paginated, TodoFilter, TodoRepository } from '../domain/todo.repository';

/**
 * Prisma を import してよい唯一の層（docs/04-backend.md 4.2）。
 * ESLint が domain / application からの Prisma import を止める。
 */
@Injectable()
export class PrismaTodoRepository implements TodoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(ownerId: string, filter: TodoFilter): Promise<Paginated<Todo>> {
    // ★ ownerId は常に入る。interface が必須引数にしているので外しようがない。
    const where: Prisma.TodoWhereInput = {
      ownerId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.keyword
        ? { title: { contains: filter.keyword, mode: 'insensitive' } }
        : {}),
    };

    // 件数と本体を 1 トランザクションで取る。別々に投げると
    // その間の挿入で total と items がずれる。
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.todo.findMany({
        where,
        // インデックス (owner_id, created_at desc) がそのまま効く（4.7）
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.todo.count({ where }),
    ]);

    return {
      items: rows.map(toDomain),
      page: filter.page,
      limit: filter.limit,
      total,
    };
  }
}

/** Prisma の行 → ドメインの Entity。この変換が infrastructure の主な仕事。 */
function toDomain(row: TodoRow): Todo {
  if (!isTodoStatus(row.status)) {
    // DB の enum とドメインのユニオンがずれたら、黙って通さず落とす
    throw new Error(`未知の status が DB にあります: ${String(row.status)}`);
  }
  return Todo.reconstitute({
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
