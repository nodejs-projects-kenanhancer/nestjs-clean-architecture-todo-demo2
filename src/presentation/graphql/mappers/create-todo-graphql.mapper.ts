import { Injectable } from '@nestjs/common';

import { IGraphqlMutationMapper } from '../../../core/contracts/index.js';
import { CreateTodoCommand, CreateTodoResult } from '../../../application/todo/index.js';
import { CreateTodoInput } from '../dtos/inputs/index.js';
import { TodoType } from '../dtos/types/index.js';

@Injectable()
export class CreateTodoGraphqlMapper
  implements IGraphqlMutationMapper<CreateTodoInput, CreateTodoCommand, CreateTodoResult, TodoType>
{
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
