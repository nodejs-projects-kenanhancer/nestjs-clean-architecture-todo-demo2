// Base event interface
export interface TodoEventMetadata {
  eventId: string;
  timestamp: string;
  correlationId?: string;
}

// Event payloads
export interface TodoEventPayload {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Events (past tense - something that happened)
export interface TodoCreatedEvent {
  metadata: TodoEventMetadata;
  payload: TodoEventPayload;
}

export interface TodoUpdatedEvent {
  metadata: TodoEventMetadata;
  payload: TodoEventPayload;
}

export interface TodoDeletedEvent {
  metadata: TodoEventMetadata;
  payload: {
    id: string;
    deletedAt: string;
  };
}

export interface TodoCompletedEvent {
  metadata: TodoEventMetadata;
  payload: TodoEventPayload;
}

// Union type for all todo events
export type TodoEvent =
  | TodoCreatedEvent
  | TodoUpdatedEvent
  | TodoDeletedEvent
  | TodoCompletedEvent;

// Event type discriminator
export enum TodoEventType {
  TODO_CREATED = 'TODO_CREATED',
  TODO_UPDATED = 'TODO_UPDATED',
  TODO_DELETED = 'TODO_DELETED',
  TODO_COMPLETED = 'TODO_COMPLETED',
}

// Wrapper for event messages
export interface TodoEventMessage {
  type: TodoEventType;
  event: TodoEvent;
}
