import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerOptInStatus } from '@whatsapp-ai/db/generated/prisma';

/**
 * Enum for sortable fields
 */
export enum CustomerSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  PHONE = 'phone',
  UPDATED_AT = 'updatedAt',
}

/**
 * Enum for sort order
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for querying customers with pagination, search, and filters.
 *
 * Best Practices:
 * - All fields optional (query params)
 * - Defaults applied for pagination
 * - Search is case-insensitive
 * - Validation with sensible limits
 */
export class CustomerQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search term (searches name, phone, email, notes)',
    example: 'rajesh',
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by opt-in status',
    enum: CustomerOptInStatus,
  })
  @IsOptional()
  @IsEnum(CustomerOptInStatus, { message: 'Invalid opt-in status' })
  status?: CustomerOptInStatus;

  @ApiPropertyOptional({
    description: 'Filter by specific tag',
    example: 'vip',
  })
  @IsOptional()
  @IsString({ message: 'Tag must be a string' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  tag?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: CustomerSortBy,
    default: CustomerSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(CustomerSortBy, { message: 'Invalid sort field' })
  sortBy?: CustomerSortBy = CustomerSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Invalid sort order' })
  sortOrder?: SortOrder = SortOrder.DESC;
}

/**
 * Response type for paginated customer list
 */
export interface PaginatedCustomerResponse {
  items: CustomerResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Customer response type
 */
export interface CustomerResponse {
  id: string;
  tenantId: string;
  name: string | null;
  phone: string;
  email: string | null;
  whatsappId: string | null;
  optInStatus: CustomerOptInStatus;
  notes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Customer stats response type
 */
export interface CustomerStatsResponse {
  total: number;
  optedIn: number;
  optedOut: number;
  pending: number;
  newThisMonth: number;
  newThisWeek: number;
}
