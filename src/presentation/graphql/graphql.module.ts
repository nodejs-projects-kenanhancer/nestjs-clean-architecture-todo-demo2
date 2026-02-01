import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ApplicationModule } from '../../application/application.module';
import { TodoResolver } from './resolvers';
import {
  GRAPHQL_MAPPER_TOKENS,
  CreateTodoGraphqlMapper,
  UpdateTodoGraphqlMapper,
  DeleteTodoGraphqlMapper,
  GetTodoGraphqlMapper,
  ListTodosGraphqlMapper,
} from './mappers';

@Module({
  imports: [
    ApplicationModule,
    NestGraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      formatError: (error) => {
        // Custom error formatting for GraphQL
        return {
          message: error.message,
          extensions: {
            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
            layer: error.extensions?.layer || 'UNKNOWN',
            timestamp: error.extensions?.timestamp || new Date().toISOString(),
            context: error.extensions?.context,
          },
          path: error.path,
        };
      },
    }),
  ],
  providers: [
    TodoResolver,
    {
      provide: GRAPHQL_MAPPER_TOKENS.CREATE_TODO,
      useClass: CreateTodoGraphqlMapper,
    },
    {
      provide: GRAPHQL_MAPPER_TOKENS.UPDATE_TODO,
      useClass: UpdateTodoGraphqlMapper,
    },
    {
      provide: GRAPHQL_MAPPER_TOKENS.DELETE_TODO,
      useClass: DeleteTodoGraphqlMapper,
    },
    {
      provide: GRAPHQL_MAPPER_TOKENS.GET_TODO,
      useClass: GetTodoGraphqlMapper,
    },
    {
      provide: GRAPHQL_MAPPER_TOKENS.LIST_TODOS,
      useClass: ListTodosGraphqlMapper,
    },
  ],
})
export class GraphQLAppModule {}
