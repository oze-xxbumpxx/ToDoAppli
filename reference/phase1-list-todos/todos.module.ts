import { Module } from '@nestjs/common';
import { ListTodosUseCase } from './application/list-todos.usecase';
import { TODO_REPOSITORY } from './domain/todo.repository';
import { PrismaTodoRepository } from './infrastructure/prisma-todo.repository';
import { TodosController } from './presentation/todos.controller';

@Module({
  controllers: [TodosController],
  providers: [
    ListTodosUseCase,
    // interface に実装を束ねる。テストではここを InMemoryTodoRepository に差し替える。
    { provide: TODO_REPOSITORY, useClass: PrismaTodoRepository },
  ],
})
export class TodosModule {}

// TODO(横展開・F-09): Domain Service を足すときはこう書く。
//   domain 層は NestJS を import できない（@Injectable() を付けられない）ので、
//   useFactory で組み立てて DI に載せる。
//
//   {
//     provide: TodoTitleUniquenessChecker,
//     useFactory: (repo: TodoRepository) => new TodoTitleUniquenessChecker(repo),
//     inject: [TODO_REPOSITORY],
//   },
