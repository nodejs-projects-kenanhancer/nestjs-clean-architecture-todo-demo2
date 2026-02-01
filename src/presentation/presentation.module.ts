import { Module } from '@nestjs/common';

import { GraphQLAppModule } from './graphql/graphql.module';
import { KafkaAppModule } from './kafka/kafka.module';
import { RestModule } from './rest/rest.module';

@Module({
  imports: [RestModule, GraphQLAppModule, KafkaAppModule],
})
export class PresentationModule {}
