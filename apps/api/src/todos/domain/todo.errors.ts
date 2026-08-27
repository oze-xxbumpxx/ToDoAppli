import { DomainError, ResourceNotFoundError } from '../../common/errors/domain-error';
import type { TodoStatus } from './todo-status';
import type { TodoTitle } from './todo-title.vo';

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

/**
 * F-09 違反。DTO は通っているが業務ルールに反するので **422**
 * （docs/02-domain-and-api.md 2.5）。400 ではない。
 */
export class DuplicateTodoTitle extends DomainError {
  readonly code = 'duplicate-todo-title';

  constructor(title: TodoTitle) {
    super(`未完了の Todo に同じタイトルがあります: ${title.value}`);
  }
}
