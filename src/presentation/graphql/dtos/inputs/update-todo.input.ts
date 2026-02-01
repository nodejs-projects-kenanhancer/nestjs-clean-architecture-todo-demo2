import { Field, InputType } from '@nestjs/graphql';

import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UpdateTodoInput {
  @Field()
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
  status?: string;
}
