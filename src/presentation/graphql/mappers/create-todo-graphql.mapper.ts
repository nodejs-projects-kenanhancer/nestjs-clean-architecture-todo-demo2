import { Injectable } from '@nestjs/common';

import { CreateTodoCommand, CreateTodoResult } from '@application/todo';
import { IGraphqlMutationMapper } from '@core/contracts';

import { CreateTodoInput } from '../dtos/inputs';
import { TodoType } from '../dtos/types';

@Injectable()
export class CreateTodoGraphqlMapper implements IGraphqlMutationMapper<
  CreateTodoInput,
  CreateTodoCommand,
  CreateTodoResult,
  TodoType
> {
  toCommand(input: CreateTodoInput): CreateTodoCommand {
    return new CreateTodoCommand(input.title, input.description);
  }

  toType(result: CreateTodoResult): TodoType {
    const type = new TodoType();
    type.id = result.id;
    type.title = result.title;
    type.description = result.description;
    type.status = result.status;
    type.createdAt = result.createdAt;
    type.updatedAt = result.updatedAt;
    return type;
  }
}
