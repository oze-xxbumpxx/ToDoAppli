import { Injectable } from '@nestjs/common';
import type { Prisma, Todo as TodoRow } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Todo } from '../domain/todo.entity';
import { isTodoStatus } from '../domain/todo-status';
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
