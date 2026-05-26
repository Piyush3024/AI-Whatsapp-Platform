import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsDateRangeDto } from './dto/analytics-date-range.dto.js';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'High-level tenant stats (all-time)' })
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('usage')
  @ApiOperation({
    summary: 'DailyUsageAggregate rows with optional date range',
  })
  async getUsage(@Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getUsage(query);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Inbound/outbound message counts grouped by date' })
  async getMessageStats(@Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getMessageStats(query);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Booking stats: by status, by location, revenue' })
  async getBookingStats(@Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getBookingStats(query);
  }
}
