import { Controller, Get, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListTodosUseCase } from '../application/list-todos.usecase';
import { ListTodosQueryDto } from './dto/list-todos-query.dto';
import { toTodoResponse, type ListTodosResponse } from './dto/todo-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Controller('todos')
export class TodosController {
  constructor(private readonly listTodos: ListTodosUseCase) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTodosQueryDto,
  ): Promise<ListTodosResponse> {
    const result = await this.listTodos.execute(user.sub, {
      status: query.status,
      keyword: query.q,
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
    });

    return {
      items: result.items.map(toTodoResponse),
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
  }
}
