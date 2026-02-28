import { Injectable } from '@nestjs/common';

import { UpdateTodoCommand, UpdateTodoResult } from '@application/todo/index.js';
import { IGraphqlMutationMapper } from '@core/contracts/index.js';

import { UpdateTodoInput } from '../dtos/inputs/index.js';
import { TodoType } from '../dtos/types/index.js';

@Injectable()
export class UpdateTodoGraphqlMapper implements IGraphqlMutationMapper<
  UpdateTodoInput,
  UpdateTodoCommand,
  UpdateTodoResult,
  TodoType
> {
  toCommand(input: UpdateTodoInput): UpdateTodoCommand {
    return new UpdateTodoCommand(input.id, input.title, input.description, input.status);
  }

  toType(result: UpdateTodoResult): TodoType {
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
