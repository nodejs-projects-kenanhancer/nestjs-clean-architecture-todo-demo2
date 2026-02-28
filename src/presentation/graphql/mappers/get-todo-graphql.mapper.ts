import { Injectable } from '@nestjs/common';

import { GetTodoByIdQuery, GetTodoByIdResult } from '@application/todo';
import { IGraphqlQueryMapper } from '@core/contracts';

import { GetTodoArgs } from '../args';
import { TodoType } from '../dtos/types';

@Injectable()
export class GetTodoGraphqlMapper implements IGraphqlQueryMapper<
  GetTodoArgs,
  GetTodoByIdQuery,
  GetTodoByIdResult,
  TodoType
> {
  toQuery(args: GetTodoArgs): GetTodoByIdQuery {
    return new GetTodoByIdQuery(args.id);
  }

  toType(result: GetTodoByIdResult): TodoType {
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
