import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTodoUseCase } from '../application/create-todo.usecase';
import { DeleteTodoUseCase } from '../application/delete-todo.usecase';
import { GetTodoUseCase } from '../application/get-todo.usecase';
import { ListTodosUseCase } from '../application/list-todos.usecase';
import { UpdateTodoUseCase } from '../application/update-todo.usecase';
import { CreateTodoDto } from './dto/create-todo.dto';
import { ListTodosQueryDto } from './dto/list-todos-query.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { toTodoResponse, type ListTodosResponse, type TodoResponse } from './dto/todo-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/** Location ヘッダを立てるためだけに使う。@types/express を足さないための構造的な型。 */
interface ResponseWithLocation {
  location(url: string): void;
}

/**
 * Controller の仕事は 3 つだけ（docs/04-backend.md 4.2）。
 *   1. 認証済みユーザーから ownerId を取り出す
 *   2. DTO（HTTP の言葉）を Command（ドメインの言葉）に直す
 *   3. UseCase の結果をレスポンス DTO に直す
 *
 * 業務ルールも認可の判定もここには書かない。書く場所が無いのが正しい状態。
 */
@Controller('todos')
export class TodosController {
  constructor(
    private readonly listTodos: ListTodosUseCase,
    private readonly getTodo: GetTodoUseCase,
    private readonly createTodo: CreateTodoUseCase,
    private readonly updateTodo: UpdateTodoUseCase,
    private readonly deleteTodo: DeleteTodoUseCase,
  ) {}

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

  /**
   * 201 + Location（docs/02-domain-and-api.md 2.2）。
   *
   * Location の値は実行時にしか決まらないので `@Header()` では書けない。
   * `passthrough: true` を付けると、レスポンス本体は今まで通り
   * 戻り値から作られる（付けないと自分で res.json() を呼ぶ羽目になる）。
   */
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTodoDto,
    @Res({ passthrough: true }) response: ResponseWithLocation,
  ): Promise<TodoResponse> {
    const todo = await this.createTodo.execute(user.sub, {
      title: body.title,
      description: body.description ?? null,
      dueDate: body.dueDate == null ? null : new Date(body.dueDate),
    });

    // プレフィックス api/v1 は main.ts の setGlobalPrefix() が付けている
    response.location(`/api/v1/todos/${todo.id}`);
    return toTodoResponse(todo);
  }

  /**
   * ParseUUIDPipe を付けているので、UUID ですらない文字列は 404 ではなく **400**。
   *
   * 「存在を漏らさない」（2.4）はここでは緩まない。守りたいのは
   * 「実在する他人の Todo の ID を当てられること」で、それは
   * findById が ownerId で絞ることで既に潰してある。
   * 形式不正にまで 404 を返しても、隠せるものが増えるわけではない。
   */
  @Get(':id')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TodoResponse> {
    return toTodoResponse(await this.getTodo.execute(user.sub, id));
  }

  /**
   * ★ ここが PATCH の肝。
   *
   * `body.description` は 3 値ある。undefined（送られてない）/ null（消して）/ 文字列。
   * そのまま渡すことで、UseCase 側で「変えない」と「消す」を区別できる。
   * `?? null` を挟むと **undefined と null が潰れて、全部「消す」になる**。
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTodoDto,
  ): Promise<TodoResponse> {
    const todo = await this.updateTodo.execute(user.sub, id, {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate === undefined || body.dueDate === null ? body.dueDate : new Date(body.dueDate),
      status: body.status,
    });

    return toTodoResponse(todo);
  }

  /** 204 No Content。NestJS の既定は 200 なので明示する。 */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteTodo.execute(user.sub, id);
  }
}
