import type { Todo } from '../../domain/todo.entity';
import type { TodoStatus } from '../../domain/todo-status';

/**
 * ★ ownerId を含めない（docs/02-domain-and-api.md 2.3）
 *
 * 自分の Todo しか返らないので ownerId は自明。返さないことで
 * 「クライアントが ownerId を見て分岐する」実装を最初から不可能にする。
 */
export interface TodoResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TodoStatus;
  readonly dueDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListTodosResponse {
  readonly items: readonly TodoResponse[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

export function toTodoResponse(todo: Todo): TodoResponse {
  return {
    id: todo.id,
    title: todo.title.value,
    description: todo.description,
    status: todo.status,
    dueDate: todo.dueDate?.toISOString() ?? null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}
