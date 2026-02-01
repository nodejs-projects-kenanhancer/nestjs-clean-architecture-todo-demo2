export class TodoResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class CreateTodoResponse {
  todo: TodoResponse;
}

export class UpdateTodoResponse {
  todo: TodoResponse;
}

export class DeleteTodoResponse {
  success: boolean;
  deletedId: string;
}

export class GetTodoByIdResponse {
  todo: TodoResponse;
}

export class ListTodosResponse {
  todos: TodoResponse[];
}
