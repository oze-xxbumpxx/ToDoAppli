import { Module } from '@nestjs/common';
import { ListTodosUseCase } from './application/list-todos.usecase';
import { TODO_REPOSITORY } from './domain/todo.repository';
import { PrismaTodoRepository } from './infrastructure/prisma-todo.repository';
import { TodosController } from './presentation/todos.controller';

@Module({
  controllers: [TodosController],
  providers: [
    ListTodosUseCase,
    { provide: TODO_REPOSITORY, useClass: PrismaTodoRepository },
  ],
})
export class TodosModule {}
