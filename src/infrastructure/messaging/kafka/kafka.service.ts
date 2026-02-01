import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { Admin, Consumer, Kafka, Producer } from 'kafkajs';

import { KafkaError } from '../../errors';

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;
  private isConnected = false;

  constructor() {
    const config: KafkaConfig = {
      clientId: process.env.KAFKA_CLIENT_ID || 'todo-app',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: process.env.KAFKA_GROUP_ID || 'todo-consumer-group',
    };

    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: config.groupId });
    this.admin = this.kafka.admin();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch {
      this.logger.warn('Kafka connection failed, running without Kafka support');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.producer.connect();
      await this.consumer.connect();
      await this.admin.connect();
      this.isConnected = true;
      this.logger.log('Kafka connected successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new KafkaError('connect', message);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      await this.admin.disconnect();
      this.isConnected = false;
      this.logger.log('Kafka disconnected');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Kafka disconnect error: ${message}`);
    }
  }

  async send(topic: string, messages: { key?: string; value: string }[]): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Kafka not connected, skipping message send');
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new KafkaError('send', message);
    }
  }

  async subscribe(topic: string, fromBeginning = false): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Kafka not connected, skipping subscribe');
      return;
    }

    try {
      await this.consumer.subscribe({ topic, fromBeginning });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new KafkaError('subscribe', message);
    }
  }

  getConsumer(): Consumer {
    return this.consumer;
  }

  getProducer(): Producer {
    return this.producer;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
