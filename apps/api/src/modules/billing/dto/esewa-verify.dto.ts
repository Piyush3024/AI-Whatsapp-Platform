import { IsString, IsNotEmpty } from 'class-validator';

export class EsewaVerifyDto {
  @IsString()
  @IsNotEmpty()
  data!: string;
}
