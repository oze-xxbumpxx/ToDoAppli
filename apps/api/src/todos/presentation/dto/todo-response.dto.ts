import type { Todo } from '../../domain/todo.entity';
import type { TodoStatus } from '../../domain/todo-status';

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
