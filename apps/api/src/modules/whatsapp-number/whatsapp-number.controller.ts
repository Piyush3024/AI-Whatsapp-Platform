import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { WhatsAppNumberService } from './whatsapp-number.service.js';
import {
  CreateWhatsAppNumberDto,
  UpdateWhatsAppNumberDto,
  QueryWhatsAppNumberDto,
  SendTestMessageDto,
} from './dto/index.js';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

@ApiTags('WhatsApp Numbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('whatsapp-numbers')
export class WhatsAppNumberController {
  constructor(private readonly service: WhatsAppNumberService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Add a new WhatsApp number' })
  @ApiResponse({ status: 201, description: 'Number created successfully' })
  @ApiResponse({ status: 409, description: 'Number already registered' })
  async create(
    @Body() dto: CreateWhatsAppNumberDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.create(dto, tenantId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiOperation({ summary: 'List all WhatsApp numbers' })
  @ApiResponse({ status: 200, description: 'List retrieved' })
  async findAll(
    @Query() query: QueryWhatsAppNumberDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.findAll(query, tenantId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get WhatsApp number details' })
  @ApiResponse({ status: 200, description: 'Number details' })
  @ApiResponse({ status: 404, description: 'Number not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update WhatsApp number' })
  @ApiResponse({ status: 200, description: 'Number updated' })
  @ApiResponse({ status: 404, description: 'Number not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWhatsAppNumberDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete WhatsApp number' })
  @ApiResponse({ status: 204, description: 'Number deleted' })
  @ApiResponse({ status: 404, description: 'Number not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    await this.service.remove(id, tenantId);
  }

  @Post(':id/test')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Send test message from this number' })
  @ApiResponse({ status: 201, description: 'Test message queued' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async sendTestMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendTestMessageDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.sendTestMessage(
      id,
      dto.recipientPhone,
      dto.message,
      tenantId,
    );
  }
}
