import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * LoginDto — Email + Password se login karne ke liye.
 */
export class LoginDto {
  @ApiProperty({
    example: 'rahul@sharmasalon.com',
  })
  @IsEmail({}, { message: 'Valid email address daalo' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'StrongPass@123',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72) // bcrypt 72 char limit
  password!: string;
}
