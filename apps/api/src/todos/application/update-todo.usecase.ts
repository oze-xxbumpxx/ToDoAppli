import { Inject, Injectable } from '@nestjs/common';
import { TodoTitleUniquenessChecker } from '../domain/services/todo-title-uniqueness.checker';
import type { Todo } from '../domain/todo.entity';
import { TodoNotFound } from '../domain/todo.errors';
import { ACTIVE_STATUSES, type TodoStatus } from '../domain/todo-status';
import { TODO_REPOSITORY, type TodoRepository } from '../domain/todo.repository';

/**
 * 部分更新の指示。**`undefined` と `null` の意味が違う**のがこの型の肝。
 *
 *   description: undefined … 送られてこなかった → 変えない
 *   description: null      … 明示的に消してくれ → null にする
 *
 * PATCH（全置換の PUT ではない）を選んだ以上、この区別からは逃げられない
 * （docs/02-domain-and-api.md 2.2）。
 */
export interface UpdateTodoCommand {
  readonly title?: string;
  readonly description?: string | null;
  readonly dueDate?: Date | null;
  readonly status?: TodoStatus;
}

@Injectable()
export class UpdateTodoUseCase {
  constructor(
    @Inject(TODO_REPOSITORY) private readonly repository: TodoRepository,
    private readonly uniqueness: TodoTitleUniquenessChecker,
  ) {}

  async execute(ownerId: string, id: string, command: UpdateTodoCommand): Promise<Todo> {
    const now = new Date();

    // Entity が不変なので、変更のたびに新しいインスタンスに差し替わる。
    // const ではなく let になるのは設計上の想定内（docs/09-coding-standards.md 9.3 例外 2）
    let todo: Todo | null = await this.repository.findById(ownerId, id);
    if (todo === null) {
      throw new TodoNotFound(id);
    }

    if (command.title !== undefined) {
      todo = todo.rename(command.title, now);
    }
    if (command.description !== undefined) {
      todo = todo.describe(command.description, now);
    }
    if (command.dueDate !== undefined) {
      todo = todo.reschedule(command.dueDate, now);
    }
    if (command.status !== undefined) {
      // 遷移規則（done → doing の禁止）は Entity が持っている
      todo = todo.changeStatus(command.status, now);
    }

    // ★ 「title を変えたときだけ」ではない。
    //   done だった Todo を todo に戻したときにも F-09 は破れる
    //   （完了済みなら重複してよい、というルールの裏返し）。
    //   なので「変更後が未完了なら必ず見る」という条件にしてある。
    //   何も変わっていなければ自分自身が見つかり、excludeId で除外されて素通りする。
    if (ACTIVE_STATUSES.includes(todo.status)) {
      await this.uniqueness.assertUnique(ownerId, todo.title, todo.id);
    }

    await this.repository.save(todo);
    return todo;
  }
}
