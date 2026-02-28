import { Inject } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import {
  CreateTodoUseCase,
  DeleteTodoUseCase,
  GetTodoByIdUseCase,
  ListTodosUseCase,
  UpdateTodoUseCase,
} from '@application/todo';

import { GetTodoArgs, ListTodosArgs } from '../args';
import { CreateTodoInput, UpdateTodoInput } from '../dtos/inputs';
import { DeleteTodoResultType, TodoType } from '../dtos/types';
import {
  CreateTodoGraphqlMapper,
  DeleteTodoGraphqlMapper,
  GRAPHQL_MAPPER_TOKENS,
  GetTodoGraphqlMapper,
  ListTodosGraphqlMapper,
  UpdateTodoGraphqlMapper,
} from '../mappers';

@Resolver(() => TodoType)
export class TodoResolver {
  constructor(
    private readonly createTodoUseCase: CreateTodoUseCase,
    private readonly updateTodoUseCase: UpdateTodoUseCase,
    private readonly deleteTodoUseCase: DeleteTodoUseCase,
    private readonly getTodoByIdUseCase: GetTodoByIdUseCase,
    private readonly listTodosUseCase: ListTodosUseCase,
    @Inject(GRAPHQL_MAPPER_TOKENS.CREATE_TODO)
    private readonly createTodoMapper: CreateTodoGraphqlMapper,
    @Inject(GRAPHQL_MAPPER_TOKENS.UPDATE_TODO)
    private readonly updateTodoMapper: UpdateTodoGraphqlMapper,
    @Inject(GRAPHQL_MAPPER_TOKENS.DELETE_TODO)
    private readonly deleteTodoMapper: DeleteTodoGraphqlMapper,
    @Inject(GRAPHQL_MAPPER_TOKENS.GET_TODO)
    private readonly getTodoMapper: GetTodoGraphqlMapper,
    @Inject(GRAPHQL_MAPPER_TOKENS.LIST_TODOS)
    private readonly listTodosMapper: ListTodosGraphqlMapper,
  ) {}

  @Query(() => [TodoType], { name: 'todos' })
  async findAll(@Args() args: ListTodosArgs): Promise<TodoType[]> {
    const query = this.listTodosMapper.toQuery(args);
    const result = await this.listTodosUseCase.execute(query);
    return this.listTodosMapper.toType(result);
  }

  @Query(() => TodoType, { name: 'todo' })
  async findOne(@Args() args: GetTodoArgs): Promise<TodoType> {
    const query = this.getTodoMapper.toQuery(args);
    const result = await this.getTodoByIdUseCase.execute(query);
    return this.getTodoMapper.toType(result);
  }

  @Mutation(() => TodoType)
  async createTodo(@Args('input') input: CreateTodoInput): Promise<TodoType> {
    const command = this.createTodoMapper.toCommand(input);
    const result = await this.createTodoUseCase.execute(command);
    return this.createTodoMapper.toType(result);
  }

  @Mutation(() => TodoType)
  async updateTodo(@Args('input') input: UpdateTodoInput): Promise<TodoType> {
    const command = this.updateTodoMapper.toCommand(input);
    const result = await this.updateTodoUseCase.execute(command);
    return this.updateTodoMapper.toType(result);
  }

  @Mutation(() => DeleteTodoResultType)
  async deleteTodo(@Args('id', { type: () => ID }) id: string): Promise<DeleteTodoResultType> {
    const command = this.deleteTodoMapper.toCommand({ id });
    const result = await this.deleteTodoUseCase.execute(command);
    return this.deleteTodoMapper.toType(result);
  }
}
