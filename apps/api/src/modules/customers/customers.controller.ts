import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { CustomersService } from './customers.service.js';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
  CustomerResponse,
  PaginatedCustomerResponse,
  CustomerStatsResponse,
} from './dto/index.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @SkipThrottle({ default: false })
  @ApiOperation({
    summary: 'Get all customers',
    description:
      'Retrieve a paginated list of customers with search and filters',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPTED_IN', 'OPTED_OUT', 'PENDING'],
  })
  @ApiQuery({
    name: 'tag',
    required: false,
    type: String,
    description: 'Filter by tag',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'name', 'phone'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'List of customers retrieved successfully',
  })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: CustomerQueryDto,
  ): Promise<PaginatedCustomerResponse> {
    return this.customersService.findAll(query);
  }

  @Get('stats')
  @SkipThrottle({ default: false })
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Get customer statistics',
    description: 'Retrieve aggregate statistics for customer dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats(): Promise<CustomerStatsResponse> {
    return this.customersService.getStats();
  }

  @Get(':id')
  @SkipThrottle({ default: false })
  @ApiOperation({
    summary: 'Get a single customer',
    description: 'Retrieve customer details by ID',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CustomerResponse> {
    return this.customersService.findOne(id);
  }

  @Post()
  @Throttle({ strict: { limit: 30, ttl: 60_000 } })
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Create a new customer',
    description: 'Create a new customer with provided details',
  })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({
    status: 409,
    description: 'Customer with this phone already exists',
  })
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateCustomerDto,
  ): Promise<CustomerResponse> {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @Throttle({ strict: { limit: 30, ttl: 60_000 } })
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Update a customer',
    description: 'Update customer details (partial update)',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({
    status: 409,
    description: 'Customer with this phone already exists',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateCustomerDto,
  ): Promise<CustomerResponse> {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Delete a customer',
    description: 'Soft delete a customer',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID', type: 'string' })
  @ApiResponse({ status: 204, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.customersService.remove(id);
  }

  @Get(':id/conversations')
  @SkipThrottle({ default: false })
  @ApiOperation({
    summary: 'Get customer conversations',
    description: 'Retrieve all conversations for a specific customer',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getConversations(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedCustomerResponse> {
    return this.customersService.getConversations(id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
