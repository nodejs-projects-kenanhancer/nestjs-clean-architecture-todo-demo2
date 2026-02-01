import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class ListTodosArgs {
  @Field({ nullable: true })
  status?: string;
}
