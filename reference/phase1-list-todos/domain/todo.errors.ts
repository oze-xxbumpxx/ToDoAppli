import { DomainError, ResourceNotFoundError } from '../../common/errors/domain-error';
import type { TodoStatus } from './todo-status';

export class InvalidTodoTitle extends DomainError {
  readonly code = 'invalid-todo-title';
}

export class InvalidStatusTransition extends DomainError {
  readonly code = 'invalid-status-transition';

  constructor(from: TodoStatus, to: TodoStatus) {
    super(`status を ${from} から ${to} へは変更できません`);
  }
}

/**
 * 他人の Todo を指定した場合もこれになる。
 * Repository が ownerId で絞るので「存在するが他人のもの」という状態を
 * アプリは観測できない（docs/02-domain-and-api.md 2.4）。→ 403 ではなく 404。
 */
export class TodoNotFound extends ResourceNotFoundError {
  readonly code = 'todo-not-found';

  constructor(id: string) {
    super(`Todo が見つかりません: ${id}`);
  }
}
