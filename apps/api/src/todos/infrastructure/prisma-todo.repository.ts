import { Injectable } from '@nestjs/common';
import type { Prisma, Todo as TodoRow } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Todo } from '../domain/todo.entity';
import { ACTIVE_STATUSES, isTodoStatus } from '../domain/todo-status';
import type { TodoTitle } from '../domain/todo-title.vo';
import type { Paginated, TodoFilter, TodoRepository } from '../domain/todo.repository';

@Injectable()
export class PrismaTodoRepository implements TodoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(ownerId: string, filter: TodoFilter): Promise<Paginated<Todo>> {
    const where: Prisma.TodoWhereInput = {
      ownerId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.keyword
        ? { title: { contains: filter.keyword, mode: 'insensitive' } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.todo.findMany({
        where,
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

  async findById(ownerId: string, id: string): Promise<Todo | null> {
    // findUnique({ id }) ではなく findFirst({ id, ownerId })。
    // id だけで引くと「他人のものを取ってから捨てる」実装になり、捨て忘れが穴になる。
    // WHERE owner_id = $1 AND id = $2 を必ず発行する（docs/02-domain-and-api.md 2.4）
    const row = await this.prisma.todo.findFirst({ where: { id, ownerId } });
    return row === null ? null : toDomain(row);
  }

  async findActiveByTitle(ownerId: string, title: TodoTitle): Promise<Todo | null> {
    // 「完了済みは重複してよい」という F-09 のドメインの都合が、
    // そのままこのクエリの status 条件に現れている（docs/04-backend.md 4.8）
    const row = await this.prisma.todo.findFirst({
      where: { ownerId, title: title.value, status: { in: [...ACTIVE_STATUSES] } },
    });
    return row === null ? null : toDomain(row);
  }

  async save(todo: Todo): Promise<void> {
    const snapshot = todo.toSnapshot();

    // 新規も更新も同じ save()。id は採番済みなので upsert が使える。
    // update 側に ownerId を入れていないのは、所有者の付け替えを
    // 「書ける場所が無い」ことで防ぐため（不変条件 1）
    await this.prisma.todo.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        ownerId: snapshot.ownerId,
        title: snapshot.title,
        description: snapshot.description,
        status: snapshot.status,
        dueDate: snapshot.dueDate,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      },
      update: {
        title: snapshot.title,
        description: snapshot.description,
        status: snapshot.status,
        dueDate: snapshot.dueDate,
        updatedAt: snapshot.updatedAt,
      },
    });
  }

  async delete(ownerId: string, id: string): Promise<void> {
    // delete() は一意キーしか受け付けないので、ownerId で絞るために deleteMany を使う。
    // 「id だけで消す」を書けなくするための選択
    await this.prisma.todo.deleteMany({ where: { id, ownerId } });
  }
}

function toDomain(row: TodoRow): Todo {
  if (!isTodoStatus(row.status)) {
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
