import { Inject, Injectable } from '@nestjs/common';
import type { Todo } from '../domain/todo.entity';
import { TodoNotFound } from '../domain/todo.errors';
import { TODO_REPOSITORY, type TodoRepository } from '../domain/todo.repository';

/**
 * 「見つからない」の意味を **404 に翻訳する場所**。
 *
 * Repository は null を返すだけで、それが 404 なのか空リストなのかを知らない。
 * 他人の Todo を指定した場合も findById が null を返すので、ここに来る。
 * つまり **403 を書く場所がそもそも存在しない**（docs/02-domain-and-api.md 2.4）。
 */
@Injectable()
export class GetTodoUseCase {
  constructor(@Inject(TODO_REPOSITORY) private readonly repository: TodoRepository) {}

  async execute(ownerId: string, id: string): Promise<Todo> {
    const todo = await this.repository.findById(ownerId, id);
    if (todo === null) {
      throw new TodoNotFound(id);
    }
    return todo;
  }
}
