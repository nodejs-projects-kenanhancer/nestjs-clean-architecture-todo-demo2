export class TodoCreatedPayload {
  eventId: string;
  timestamp: string;
  correlationId?: string;
  todo: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}
