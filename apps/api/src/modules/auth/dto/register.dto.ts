import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'Sharma Salon',
    description: 'Business name (Tenant name)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessName!: string;

  @ApiProperty({
    example: 'Rahul Sharma',
    description: "Owner's Full Name",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'rahul@sharmasalon.com',
    description: 'Login email (unique)',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'StrongPass@123',
    description:
      'Password - min 8 chars, one uppercase, one lowercase, one number, one special char',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password is too long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password!: string;
}
