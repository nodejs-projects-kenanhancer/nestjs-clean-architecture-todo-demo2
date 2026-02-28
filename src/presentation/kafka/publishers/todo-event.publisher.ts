import { Injectable, Logger } from '@nestjs/common';

import { CompleteTodoResult, CreateTodoResult, UpdateTodoResult } from '@application/todo/index.js';
import { KafkaService } from '@infrastructure/messaging/kafka/index.js';
import { v4 as uuidv4 } from 'uuid';

import {
  TodoCompletedEvent,
  TodoCreatedEvent,
  TodoDeletedEvent,
  TodoEventMessage,
  TodoEventMetadata,
  TodoEventPayload,
  TodoEventType,
  TodoUpdatedEvent,
} from '../dtos/events/index.js';

type TodoResultLike = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class TodoEventPublisher {
  private readonly logger = new Logger(TodoEventPublisher.name);
  private readonly EVENTS_TOPIC = 'todo.events';

  constructor(private readonly kafkaService: KafkaService) {}

  async publishTodoCreated(todo: CreateTodoResult, correlationId?: string): Promise<void> {
    const event: TodoCreatedEvent = {
      metadata: this.createMetadata(correlationId),
      payload: this.mapTodoToPayload(todo),
    };

    await this.publish(TodoEventType.TODO_CREATED, event);
    this.logger.log(`Published TodoCreatedEvent for todo: ${todo.id}`);
  }

  async publishTodoUpdated(todo: UpdateTodoResult, correlationId?: string): Promise<void> {
    const event: TodoUpdatedEvent = {
      metadata: this.createMetadata(correlationId),
      payload: this.mapTodoToPayload(todo),
    };

    await this.publish(TodoEventType.TODO_UPDATED, event);
    this.logger.log(`Published TodoUpdatedEvent for todo: ${todo.id}`);
  }

  async publishTodoDeleted(todoId: string, correlationId?: string): Promise<void> {
    const event: TodoDeletedEvent = {
      metadata: this.createMetadata(correlationId),
      payload: {
        id: todoId,
        deletedAt: new Date().toISOString(),
      },
    };

    await this.publish(TodoEventType.TODO_DELETED, event);
    this.logger.log(`Published TodoDeletedEvent for todo: ${todoId}`);
  }

  async publishTodoCompleted(todo: CompleteTodoResult, correlationId?: string): Promise<void> {
    const event: TodoCompletedEvent = {
      metadata: this.createMetadata(correlationId),
      payload: this.mapTodoToPayload(todo),
    };

    await this.publish(TodoEventType.TODO_COMPLETED, event);
    this.logger.log(`Published TodoCompletedEvent for todo: ${todo.id}`);
  }

  private createMetadata(correlationId?: string): TodoEventMetadata {
    return {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      correlationId,
    };
  }

  private mapTodoToPayload(todo: TodoResultLike): TodoEventPayload {
    return {
      id: todo.id,
      title: todo.title,
      description: todo.description,
      status: todo.status,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }

  private async publish(
    type: TodoEventType,
    event: TodoCreatedEvent | TodoUpdatedEvent | TodoDeletedEvent | TodoCompletedEvent,
  ): Promise<void> {
    if (!this.kafkaService.connected) {
      this.logger.warn('Kafka not connected, skipping event publish');
      return;
    }

    const message: TodoEventMessage = { type, event };

    await this.kafkaService.send(this.EVENTS_TOPIC, [
      {
        key: event.metadata.eventId,
        value: JSON.stringify(message),
      },
    ]);
  }
}
