import { Injectable } from '@nestjs/common';

import { DeleteTodoCommand, DeleteTodoResult } from '@application/todo';
import { IRestCommandMapper } from '@core/contracts';

import { DeleteTodoResponse } from '../dtos/responses';

export interface DeleteTodoParams {
  id: string;
}

@Injectable()
export class DeleteTodoRestMapper implements IRestCommandMapper<
  DeleteTodoParams,
  DeleteTodoCommand,
  DeleteTodoResult,
  DeleteTodoResponse
> {
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
