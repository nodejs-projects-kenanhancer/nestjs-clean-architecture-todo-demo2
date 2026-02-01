import { Injectable } from '@nestjs/common';

import { DeleteTodoCommand, DeleteTodoResult } from '../../../application/todo/index.js';
import { IGraphqlMutationMapper } from '../../../core/contracts/index.js';
import { DeleteTodoResultType } from '../dtos/types/index.js';

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
