import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { TodoController } from './controllers';
import {
  REST_MAPPER_TOKENS,
  CreateTodoRestMapper,
  UpdateTodoRestMapper,
  DeleteTodoRestMapper,
  GetTodoByIdRestMapper,
  ListTodosRestMapper,
} from './mappers';

@Module({
  imports: [ApplicationModule],
  controllers: [TodoController],
  providers: [
    {
      provide: REST_MAPPER_TOKENS.CREATE_TODO,
      useClass: CreateTodoRestMapper,
    },
    {
      provide: REST_MAPPER_TOKENS.UPDATE_TODO,
      useClass: UpdateTodoRestMapper,
    },
    {
      provide: REST_MAPPER_TOKENS.DELETE_TODO,
      useClass: DeleteTodoRestMapper,
    },
    {
      provide: REST_MAPPER_TOKENS.GET_TODO_BY_ID,
      useClass: GetTodoByIdRestMapper,
    },
    {
      provide: REST_MAPPER_TOKENS.LIST_TODOS,
      useClass: ListTodosRestMapper,
    },
  ],
})
export class RestModule {}
