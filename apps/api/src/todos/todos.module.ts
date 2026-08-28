import { Module } from '@nestjs/common';
import { CreateTodoUseCase } from './application/create-todo.usecase';
import { DeleteTodoUseCase } from './application/delete-todo.usecase';
import { GetTodoUseCase } from './application/get-todo.usecase';
import { ListTodosUseCase } from './application/list-todos.usecase';
import { UpdateTodoUseCase } from './application/update-todo.usecase';
import { TodoTitleUniquenessChecker } from './domain/services/todo-title-uniqueness.checker';
import { TODO_REPOSITORY, type TodoRepository } from './domain/todo.repository';
import { PrismaTodoRepository } from './infrastructure/prisma-todo.repository';
import { TodosController } from './presentation/todos.controller';

@Module({
  controllers: [TodosController],
  providers: [
    ListTodosUseCase,
    GetTodoUseCase,
    CreateTodoUseCase,
    UpdateTodoUseCase,
    DeleteTodoUseCase,
    { provide: TODO_REPOSITORY, useClass: PrismaTodoRepository },

    // Domain Service は @Injectable() を付けられない（domain 層は NestJS を
    // import しない → docs/04-backend.md 4.3）。だから DI コンテナに
    // 「作り方」を教える側で解決する。
    //
    // トークンにクラスそのものを使っているので、UseCase 側は
    // 型で注入できる（@Inject() が要らない）。
    {
      provide: TodoTitleUniquenessChecker,
      useFactory: (repository: TodoRepository): TodoTitleUniquenessChecker =>
        new TodoTitleUniquenessChecker(repository),
      inject: [TODO_REPOSITORY],
    },
  ],
})
export class TodosModule {}
