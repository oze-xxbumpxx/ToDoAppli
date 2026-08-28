import { Inject, Injectable } from '@nestjs/common';
import { TodoNotFound } from '../domain/todo.errors';
import { TODO_REPOSITORY, type TodoRepository } from '../domain/todo.repository';

/**
 * 存在確認してから消す。クエリは 2 本になるが、
 * 「無いものを消したら 404」を GetTodoUseCase と同じ形で書けるほうを取った。
 *
 * delete の戻り値を件数にして 0 なら 404、という手もある（クエリ 1 本）。
 * ただし Repository の interface は docs/02-domain-and-api.md 2.4 で
 * `Promise<void>` と決めてあるので、設計書のほうに合わせている。
 */
@Injectable()
export class DeleteTodoUseCase {
  constructor(@Inject(TODO_REPOSITORY) private readonly repository: TodoRepository) {}

  async execute(ownerId: string, id: string): Promise<void> {
    const todo = await this.repository.findById(ownerId, id);
    if (todo === null) {
      throw new TodoNotFound(id);
    }
    await this.repository.delete(ownerId, id);
  }
}
