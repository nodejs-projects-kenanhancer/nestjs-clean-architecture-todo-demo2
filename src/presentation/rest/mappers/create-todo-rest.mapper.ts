import { Injectable } from '@nestjs/common';

import { CreateTodoCommand, CreateTodoResult } from '@application/todo';
import { IRestCommandMapper } from '@core/contracts';

import { CreateTodoRequest } from '../dtos/requests';
import { CreateTodoResponse, TodoResponse } from '../dtos/responses';

@Injectable()
export class CreateTodoRestMapper implements IRestCommandMapper<
  CreateTodoRequest,
  CreateTodoCommand,
  CreateTodoResult,
  CreateTodoResponse
> {
  toCommand(request: CreateTodoRequest): CreateTodoCommand {
    return new CreateTodoCommand(request.title, request.description);
  }

  toResponse(result: CreateTodoResult): CreateTodoResponse {
    return {
      todo: this.mapToTodoResponse(result),
    };
  }

  private mapToTodoResponse(result: CreateTodoResult): TodoResponse {
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
