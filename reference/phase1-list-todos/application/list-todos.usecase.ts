import { Inject, Injectable } from '@nestjs/common';
import type { Todo } from '../domain/todo.entity';
import {
  TODO_REPOSITORY,
  type Paginated,
  type TodoFilter,
  type TodoRepository,
} from '../domain/todo.repository';

/**
 * UseCase はオーケストレーションに徹する（docs/04-backend.md 4.2）。
 *
 * 一覧取得には委譲すべき業務ルールがないので、見ての通り薄い。
 * **薄いのは手抜きではなく正しい**。ここに絞り込み条件の解釈や
 * 件数上限の判定を書き始めたら、それは domain に置くべきものが漏れている。
 */
@Injectable()
export class ListTodosUseCase {
  constructor(
    @Inject(TODO_REPOSITORY) private readonly repository: TodoRepository,
  ) {}

  async execute(ownerId: string, filter: TodoFilter): Promise<Paginated<Todo>> {
    return this.repository.findMany(ownerId, filter);
  }
}
