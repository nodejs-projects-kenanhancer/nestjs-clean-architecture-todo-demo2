import { Injectable } from '@nestjs/common';

import { IRestQueryMapper } from '../../../core/contracts/index.js';
import { GetTodoByIdQuery, GetTodoByIdResult } from '../../../application/todo/index.js';
import { GetTodoByIdResponse, TodoResponse } from '../dtos/responses/index.js';

export interface GetTodoByIdParams {
  id: string;
}

@Injectable()
export class GetTodoByIdRestMapper
  implements IRestQueryMapper<GetTodoByIdParams, GetTodoByIdQuery, GetTodoByIdResult, GetTodoByIdResponse>
{
  toQuery(params: GetTodoByIdParams): GetTodoByIdQuery {
    return new GetTodoByIdQuery(params.id);
  }

  toResponse(result: GetTodoByIdResult): GetTodoByIdResponse {
    return {
      todo: this.mapToTodoResponse(result),
    };
  }

  private mapToTodoResponse(result: GetTodoByIdResult): TodoResponse {
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
