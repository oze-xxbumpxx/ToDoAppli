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

export class TodoNotFound extends ResourceNotFoundError {
  readonly code = 'todo-not-found';

  constructor(id: string) {
    super(`Todo が見つかりません: ${id}`);
  }
}
