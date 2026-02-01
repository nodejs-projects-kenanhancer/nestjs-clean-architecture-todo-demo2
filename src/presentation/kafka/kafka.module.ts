import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { TodoEventHandler } from './handlers';
import { TodoEventPublisher } from './publishers';

@Module({
  imports: [ApplicationModule],
  providers: [TodoEventHandler, TodoEventPublisher],
  exports: [TodoEventPublisher],
})
export class KafkaAppModule {}
