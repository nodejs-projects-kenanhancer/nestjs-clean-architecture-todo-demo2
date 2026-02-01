export class UpdateTodoMessage {
  correlationId: string;
  id: string;
  title?: string;
  description?: string;
  status?: string;
}
