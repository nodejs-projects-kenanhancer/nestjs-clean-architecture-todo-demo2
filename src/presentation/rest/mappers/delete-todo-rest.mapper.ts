import { Injectable } from '@nestjs/common';

import { IRestCommandMapper } from '../../../core/contracts/index.js';
import { DeleteTodoCommand, DeleteTodoResult } from '../../../application/todo/index.js';
import { DeleteTodoResponse } from '../dtos/responses/index.js';

export interface DeleteTodoParams {
  id: string;
}

@Injectable()
export class DeleteTodoRestMapper
  implements IRestCommandMapper<DeleteTodoParams, DeleteTodoCommand, DeleteTodoResult, DeleteTodoResponse>
{
  toCommand(params: DeleteTodoParams): DeleteTodoCommand {
    return new DeleteTodoCommand(params.id);
  }

  toResponse(result: DeleteTodoResult): DeleteTodoResponse {
    return {
      success: result.success,
      deletedId: result.deletedId,
    };
  }
}
