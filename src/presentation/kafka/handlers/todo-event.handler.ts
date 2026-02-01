import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { KafkaService } from '../../../infrastructure/messaging/kafka';
import {
  TodoCompletedEvent,
  TodoCreatedEvent,
  TodoDeletedEvent,
  TodoEventMessage,
  TodoEventType,
  TodoUpdatedEvent,
} from '../dtos/events';

@Injectable()
export class TodoEventHandler implements OnModuleInit {
  private readonly logger = new Logger(TodoEventHandler.name);
  private readonly EVENTS_TOPIC = 'todo.events';

  constructor(private readonly kafkaService: KafkaService) {}

  async onModuleInit(): Promise<void> {
    if (!this.kafkaService.connected) {
      this.logger.warn('Kafka not connected, skipping event handler initialization');
      return;
    }

    try {
      await this.kafkaService.subscribe(this.EVENTS_TOPIC);
      await this.startConsuming();
      this.logger.log(`Listening for events on topic: ${this.EVENTS_TOPIC}`);
    } catch (error) {
      this.logger.error('Failed to initialize Kafka event handler', error);
    }
  }

  private async startConsuming(): Promise<void> {
    const consumer = this.kafkaService.getConsumer();

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const value = message.value?.toString();
          if (!value) {
            return;
          }

          const eventMessage = JSON.parse(value) as TodoEventMessage;
          await this.handleEvent(eventMessage);
        } catch (error) {
          this.logger.error('Error processing Kafka event', error);
        }
      },
    });
  }

  private async handleEvent(message: TodoEventMessage): Promise<void> {
    const { type, event } = message;

    this.logger.log(`Received event: ${type}`);

    switch (type) {
      case TodoEventType.TODO_CREATED:
        await this.handleTodoCreated(event as TodoCreatedEvent);
        break;
      case TodoEventType.TODO_UPDATED:
        await this.handleTodoUpdated(event as TodoUpdatedEvent);
        break;
      case TodoEventType.TODO_DELETED:
        await this.handleTodoDeleted(event as TodoDeletedEvent);
        break;
      case TodoEventType.TODO_COMPLETED:
        await this.handleTodoCompleted(event as TodoCompletedEvent);
        break;
      default:
        this.logger.warn(`Unknown event type: ${String(type)}`);
    }
  }

  private handleTodoCreated(event: TodoCreatedEvent): Promise<void> {
    this.logger.log(`Todo created: ${event.payload.id} - ${event.payload.title}`);
    // React to the event - e.g., update local cache, trigger notifications, etc.
    return Promise.resolve();
  }

  private handleTodoUpdated(event: TodoUpdatedEvent): Promise<void> {
    this.logger.log(`Todo updated: ${event.payload.id} - ${event.payload.title}`);
    // React to the event
    return Promise.resolve();
  }

  private handleTodoDeleted(event: TodoDeletedEvent): Promise<void> {
    this.logger.log(`Todo deleted: ${event.payload.id}`);
    // React to the event
    return Promise.resolve();
  }

  private handleTodoCompleted(event: TodoCompletedEvent): Promise<void> {
    this.logger.log(`Todo completed: ${event.payload.id} - ${event.payload.title}`);
    // React to the event
    return Promise.resolve();
  }
}
