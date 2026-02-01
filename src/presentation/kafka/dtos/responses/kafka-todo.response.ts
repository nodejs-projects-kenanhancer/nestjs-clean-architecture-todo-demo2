export interface KafkaTodoResponse {
  correlationId: string;
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    layer: string;
  };
}

export interface TodoKafkaData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteTodoKafkaData {
  success: boolean;
  deletedId: string;
}

export interface ListTodosKafkaData {
  todos: TodoKafkaData[];
}
