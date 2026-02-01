import { Module } from '@nestjs/common';
import { RestModule } from './rest/rest.module';
import { GraphQLAppModule } from './graphql/graphql.module';
import { KafkaAppModule } from './kafka/kafka.module';

@Module({
  imports: [RestModule, GraphQLAppModule, KafkaAppModule],
})
export class PresentationModule {}
