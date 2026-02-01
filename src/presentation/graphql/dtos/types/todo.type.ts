import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TodoType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description: string | null;

  @Field()
  status: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class DeleteTodoResultType {
  @Field()
  success: boolean;

  @Field()
  deletedId: string;
}
