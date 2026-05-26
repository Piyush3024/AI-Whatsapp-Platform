import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'rahul@sharmasalon.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'StrongPass@123',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;
}
