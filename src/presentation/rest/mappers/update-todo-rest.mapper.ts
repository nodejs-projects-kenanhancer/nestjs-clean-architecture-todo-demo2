import { Injectable } from '@nestjs/common';

import { UpdateTodoCommand, UpdateTodoResult } from '../../../application/todo/index.js';
import { IRestCommandMapper } from '../../../core/contracts/index.js';
import { UpdateTodoRequest } from '../dtos/requests/index.js';
import { TodoResponse, UpdateTodoResponse } from '../dtos/responses/index.js';

export interface UpdateTodoRequestWithId {
  id: string;
  request: UpdateTodoRequest;
}

@Injectable()
export class UpdateTodoRestMapper implements IRestCommandMapper<
  UpdateTodoRequestWithId,
  UpdateTodoCommand,
  UpdateTodoResult,
  UpdateTodoResponse
> {
  toCommand(input: UpdateTodoRequestWithId): UpdateTodoCommand {
    return new UpdateTodoCommand(
      input.id,
      input.request.title,
      input.request.description,
      input.request.status,
    );
  }

  toResponse(result: UpdateTodoResult): UpdateTodoResponse {
    return {
      todo: this.mapToTodoResponse(result),
    };
  }

  private mapToTodoResponse(result: UpdateTodoResult): TodoResponse {
    return {
      id: result.id,
      title: result.title,
      description: result.description,
      status: result.status,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }
}
