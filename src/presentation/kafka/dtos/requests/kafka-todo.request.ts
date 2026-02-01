export enum KafkaTodoAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  GET_BY_ID = 'GET_BY_ID',
  LIST = 'LIST',
}

export interface KafkaTodoMessage {
  correlationId: string;
  action: KafkaTodoAction;
  payload: unknown;
}

export interface CreateTodoKafkaPayload {
  title: string;
  description?: string;
}

export interface UpdateTodoKafkaPayload {
  id: string;
  title?: string;
  description?: string;
  status?: string;
}

export interface DeleteTodoKafkaPayload {
  id: string;
}

export interface GetTodoByIdKafkaPayload {
  id: string;
}

export interface ListTodosKafkaPayload {
  status?: string;
}
