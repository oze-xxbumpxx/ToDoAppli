import { Inject, Injectable } from '@nestjs/common';
import type { Todo } from '../domain/todo.entity';
import {
  TODO_REPOSITORY,
  type Paginated,
  type TodoFilter,
  type TodoRepository,
} from '../domain/todo.repository';

@Injectable()
export class ListTodosUseCase {
  constructor(
    @Inject(TODO_REPOSITORY) private readonly repository: TodoRepository,
  ) {}

  async execute(ownerId: string, filter: TodoFilter): Promise<Paginated<Todo>> {
    return this.repository.findMany(ownerId, filter);
  }
}
