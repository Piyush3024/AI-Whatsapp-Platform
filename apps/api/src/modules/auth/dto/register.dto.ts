import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RegisterDto — Naya tenant + owner user create karne ke liye.
 *
 * Ye SaaS platform hai — register karte waqt:
 * 1. Naya Tenant banta hai (business account)
 * 2. Naya User banta hai
 * 3. TenantMember banta hai OWNER role ke saath
 *
 * Sab kuch AuthService.register() mein ek transaction mein hota hai.
 */
export class RegisterDto {
  // ── Business / Tenant info ──────────────────────────────────────────────

  @ApiProperty({
    example: 'Sharma Salon',
    description: 'Business ka naam — tenant name ban jaata hai',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessName!: string;

  // ── User info ───────────────────────────────────────────────────────────

  @ApiProperty({
    example: 'Rahul Sharma',
    description: 'Owner ka poora naam',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'rahul@sharmasalon.com',
    description: 'Login ke liye email — unique hona chahiye',
  })
  @IsEmail({}, { message: 'Valid email address daalo' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'StrongPass@123',
    description:
      'Password — min 8 chars, ek uppercase, ek lowercase, ek number, ek special char',
  })
  @IsString()
  @MinLength(8, { message: 'Password kam se kam 8 characters ka hona chahiye' })
  @MaxLength(72, { message: 'Password zyada lamba hai' }) // bcrypt 72 char limit
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password mein ek uppercase, ek lowercase, ek number aur ek special character hona chahiye',
  })
  password!: string;
}
