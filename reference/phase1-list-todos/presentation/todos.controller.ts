import { Controller, Get, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListTodosUseCase } from '../application/list-todos.usecase';
import { ListTodosQueryDto } from './dto/list-todos-query.dto';
import { toTodoResponse, type ListTodosResponse } from './dto/todo-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Controller は HTTP の言語だけを扱う（docs/04-backend.md 4.2）。
 * DTO を受け、UseCase を呼び、結果を DTO に詰め直す。それだけ。
 * if 文が増えてきたら設計ミスのサイン。
 *
 * 所有者は URL からではなく、検証済みトークンの sub から決まる。
 * クライアントに指定させないので、他人を指す余地がそもそもない
 * （docs/02-domain-and-api.md 2.2）。
 */
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

  // TODO(横展開): POST / GET :id / PATCH :id / DELETE :id を書く。
  //   POST は 201 + Location、DELETE は 204。@HttpCode() で明示する。
}
