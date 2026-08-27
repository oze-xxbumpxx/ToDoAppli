import { Inject, Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { TodoTitleUniquenessChecker } from '../domain/services/todo-title-uniqueness.checker';
import { Todo } from '../domain/todo.entity';
import { TODO_REPOSITORY, type TodoRepository } from '../domain/todo.repository';

export interface CreateTodoCommand {
  readonly title: string;
  readonly description: string | null;
  readonly dueDate: Date | null;
}

/**
 * UseCase は「取得 → 委譲 → 保存」の司会役（docs/04-backend.md 4.8）。
 * 業務ルールはここには書かない。
 *   - title の長さ      … TodoTitle（値オブジェクト）
 *   - 新規は必ず 'todo'  … Todo.create()
 *   - タイトル重複(F-09) … TodoTitleUniquenessChecker（Domain Service）
 *
 * ここに残るのは「id を採番する」「今の時刻を取る」という**外の世界との接点**だけ。
 * domain を純粋に保つために、この 2 つだけは application 層が引き受ける。
 */
@Injectable()
export class CreateTodoUseCase {
  constructor(
    @Inject(TODO_REPOSITORY) private readonly repository: TodoRepository,
    private readonly uniqueness: TodoTitleUniquenessChecker,
  ) {}

  async execute(ownerId: string, command: CreateTodoCommand): Promise<Todo> {
    const now = new Date();

    // 先に Todo を組み立てる。ここで title が不正なら TodoTitle が弾く（→ 422）
    const todo = Todo.create({
      id: uuidv7(),
      ownerId,
      title: command.title,
      description: command.description,
      dueDate: command.dueDate,
      now,
    });

    // 新規は必ず未完了なので、常に F-09 の対象になる
    await this.uniqueness.assertUnique(ownerId, todo.title);

    await this.repository.save(todo);
    return todo;
  }
}
