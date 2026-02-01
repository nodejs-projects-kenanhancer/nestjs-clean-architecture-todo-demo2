import { ArgsType, Field, ID } from '@nestjs/graphql';

@ArgsType()
export class GetTodoArgs {
  @Field(() => ID)
  id: string;
}
