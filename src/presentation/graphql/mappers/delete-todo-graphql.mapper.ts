import { Injectable } from '@nestjs/common';

import { DeleteTodoCommand, DeleteTodoResult } from '@application/todo';
import { IGraphqlMutationMapper } from '@core/contracts';

import { DeleteTodoResultType } from '../dtos/types';

export interface DeleteTodoInputId {
  id: string;
}

@Injectable()
export class DeleteTodoGraphqlMapper implements IGraphqlMutationMapper<
  DeleteTodoInputId,
  DeleteTodoCommand,
  DeleteTodoResult,
  DeleteTodoResultType
> {
  toCommand(input: DeleteTodoInputId): DeleteTodoCommand {
    return new DeleteTodoCommand(input.id);
  }

  toType(result: DeleteTodoResult): DeleteTodoResultType {
    const resultType = new DeleteTodoResultType();
    resultType.success = result.success;
    resultType.deletedId = result.deletedId;
    return resultType;
  }
}
