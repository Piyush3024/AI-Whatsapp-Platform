// apps/api/src/modules/invitation/invitation.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvitationService } from './invitation.service.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  // ── Create Invitation (OWNER / ADMIN only) ───────────────────────────────

  @Post()
  @Roles('OWNER', 'ADMIN')
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  async createInvitation(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationService.createInvitation(
      user.tenantId,
      user.sub,
      dto,
    );
  }

  // ── List Invitations (OWNER / ADMIN only) ────────────────────────────────

  @Get()
  @Roles('OWNER', 'ADMIN')
  async listInvitations(@CurrentUser() user: JwtPayload) {
    return this.invitationService.listInvitations(user.tenantId);
  }

  // ── Validate Token (@Public — no JWT) ────────────────────────────────────
  // Frontend "Accept" page calls this to show invite metadata before form fill

  @Public()
  @Get('validate')
  async validateToken(@Query('token') token: string) {
    return this.invitationService.validateToken(token);
  }

  // ── Accept Invitation (@Public — no JWT) ─────────────────────────────────
  // Returns auth tokens → auto-login after account creation

  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.invitationService.acceptInvitation(dto);
  }

  // ── Revoke Invitation (OWNER / ADMIN only) ───────────────────────────────

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvitation(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitationService.revokeInvitation(user.tenantId, id);
  }
}
