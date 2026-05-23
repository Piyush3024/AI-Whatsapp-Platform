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
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service.js';
import {
  CreateBookingDto,
  UpdateBookingDto,
  UpdateBookingStatusDto,
  BookingQueryDto,
  CalendarQueryDto,
} from './dto/index.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/client.js';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller({ path: 'bookings', version: '1' })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @SkipThrottle({ default: false })
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: BookingQueryDto,
  ) {
    return this.bookingsService.findAll(query);
  }

  @Get('stats')
  @SkipThrottle({ default: false })
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats() {
    return this.bookingsService.getStats();
  }

  @Get('calendar')
  @SkipThrottle({ default: false })
  @ApiOperation({ summary: 'Get calendar view of bookings' })
  @ApiResponse({
    status: 200,
    description: 'Calendar data retrieved successfully',
  })
  async getCalendar(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: CalendarQueryDto,
  ) {
    return this.bookingsService.getCalendar(query);
  }

  @Get(':id')
  @SkipThrottle({ default: false })
  @ApiOperation({ summary: 'Get a single booking' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or conflict' })
  @ApiResponse({ status: 404, description: 'Customer or service not found' })
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Booking conflict' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update booking status' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 204, description: 'Booking deleted successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.bookingsService.remove(id);
  }
}
