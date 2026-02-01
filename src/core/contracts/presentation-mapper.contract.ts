// REST Mapper Interfaces
export interface IRestCommandMapper<TRequest, TCommand, TResult, TResponse> {
  toCommand(request: TRequest): TCommand;
  toResponse(result: TResult): TResponse;
}

export interface IRestQueryMapper<TParams, TQuery, TResult, TResponse> {
  toQuery(params: TParams): TQuery;
  toResponse(result: TResult): TResponse;
}

// GraphQL Mapper Interfaces
export interface IGraphqlMutationMapper<TInput, TCommand, TResult, TType> {
  toCommand(input: TInput): TCommand;
  toType(result: TResult): TType;
}

export interface IGraphqlQueryMapper<TArgs, TQuery, TResult, TType> {
  toQuery(args: TArgs): TQuery;
  toType(result: TResult): TType;
}

// Kafka Mapper Interfaces
export interface IKafkaCommandMapper<TMessage, TCommand, TResult, TPayload> {
  toCommand(message: TMessage): TCommand;
  toPayload(result: TResult, correlationId: string): TPayload;
}

export interface IKafkaQueryMapper<TMessage, TQuery, TResult, TPayload> {
  toQuery(message: TMessage): TQuery;
  toPayload(result: TResult, correlationId: string): TPayload;
}
