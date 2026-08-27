import type { TodoRepository } from '../todo.repository';
import type { TodoTitle } from '../todo-title.vo';
import { DuplicateTodoTitle } from '../todo.errors';

/**
 * F-09：同一オーナーの未完了（todo / doing）Todo に、同じタイトルを 2 つ作れない。
 *
 * **なぜ Entity ではなく Domain Service なのか**（docs/04-backend.md 4.8）
 * このルールは「その Todo 1 件が持つ情報」だけでは判定できない。
 * 他の Todo を見る必要がある。だから Entity には置けない。
 *
 * **なぜ UseCase ではなく Domain Service なのか**
 * Create と Update の**両方から呼ばれる**から。UseCase に直接書くと
 * 同じルールが 2 か所に複製され、片方だけ直すバグが生まれる。
 * これが Domain Service の存在理由そのもの。
 *
 * NestJS を import しないので `@Injectable()` は付けられない
 * （domain 層はフレームワークに依存しない → 4.3、ESLint が止める）。
 * 組み立ては todos.module.ts の useFactory でやる。
 */
export class TodoTitleUniquenessChecker {
  constructor(private readonly repository: TodoRepository) {}

  /**
   * @param excludeId 更新時に「自分自身」を重複と誤判定しないための除外 ID。
   *   これが無いと、タイトルを変えずに status だけ更新したときに
   *   自分が自分とぶつかって 422 になる。
   */
  async assertUnique(ownerId: string, title: TodoTitle, excludeId?: string): Promise<void> {
    const existing = await this.repository.findActiveByTitle(ownerId, title);
    if (existing !== null && existing.id !== excludeId) {
      throw new DuplicateTodoTitle(title);
    }
  }
}
