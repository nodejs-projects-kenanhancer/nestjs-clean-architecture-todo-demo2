export class TodoDeletedPayload {
  eventId: string;
  timestamp: string;
  correlationId?: string;
  deletedId: string;
  deletedAt: string;
}
