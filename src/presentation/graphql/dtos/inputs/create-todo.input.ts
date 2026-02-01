import { Field, InputType } from '@nestjs/graphql';

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateTodoInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
