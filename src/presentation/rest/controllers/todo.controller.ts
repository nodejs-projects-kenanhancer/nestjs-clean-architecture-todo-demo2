import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import {
  CreateTodoUseCase,
  DeleteTodoUseCase,
  GetTodoByIdUseCase,
  ListTodosUseCase,
  UpdateTodoUseCase,
} from '@application/todo';

import { CreateTodoRequest, UpdateTodoRequest } from '../dtos/requests';
import {
  CreateTodoResponse,
  DeleteTodoResponse,
  GetTodoByIdResponse,
  ListTodosResponse,
  UpdateTodoResponse,
} from '../dtos/responses';
import {
  CreateTodoRestMapper,
  DeleteTodoRestMapper,
  GetTodoByIdRestMapper,
  ListTodosRestMapper,
  REST_MAPPER_TOKENS,
  UpdateTodoRestMapper,
} from '../mappers';

@Controller('api/todos')
export class TodoController {
  constructor(
    private readonly createTodoUseCase: CreateTodoUseCase,
    private readonly updateTodoUseCase: UpdateTodoUseCase,
    private readonly deleteTodoUseCase: DeleteTodoUseCase,
    private readonly getTodoByIdUseCase: GetTodoByIdUseCase,
    private readonly listTodosUseCase: ListTodosUseCase,
    @Inject(REST_MAPPER_TOKENS.CREATE_TODO)
    private readonly createTodoMapper: CreateTodoRestMapper,
    @Inject(REST_MAPPER_TOKENS.UPDATE_TODO)
    private readonly updateTodoMapper: UpdateTodoRestMapper,
    @Inject(REST_MAPPER_TOKENS.DELETE_TODO)
    private readonly deleteTodoMapper: DeleteTodoRestMapper,
    @Inject(REST_MAPPER_TOKENS.GET_TODO_BY_ID)
    private readonly getTodoByIdMapper: GetTodoByIdRestMapper,
    @Inject(REST_MAPPER_TOKENS.LIST_TODOS)
    private readonly listTodosMapper: ListTodosRestMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() request: CreateTodoRequest): Promise<CreateTodoResponse> {
    const command = this.createTodoMapper.toCommand(request);
    const result = await this.createTodoUseCase.execute(command);
    return this.createTodoMapper.toResponse(result);
  }

  @Get()
  async findAll(@Query('status') status?: string): Promise<ListTodosResponse> {
    const query = this.listTodosMapper.toQuery({ status });
    const result = await this.listTodosUseCase.execute(query);
    return this.listTodosMapper.toResponse(result);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<GetTodoByIdResponse> {
    const query = this.getTodoByIdMapper.toQuery({ id });
    const result = await this.getTodoByIdUseCase.execute(query);
    return this.getTodoByIdMapper.toResponse(result);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() request: UpdateTodoRequest,
  ): Promise<UpdateTodoResponse> {
    const command = this.updateTodoMapper.toCommand({ id, request });
    const result = await this.updateTodoUseCase.execute(command);
    return this.updateTodoMapper.toResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<DeleteTodoResponse> {
    const command = this.deleteTodoMapper.toCommand({ id });
    const result = await this.deleteTodoUseCase.execute(command);
    return this.deleteTodoMapper.toResponse(result);
  }
}
