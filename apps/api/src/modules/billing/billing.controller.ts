// apps/api/src/modules/billing/billing.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { BillingService } from './billing.service.js';
import { EsewaService } from './esewa.service.js';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';
import { CreatePortalSessionDto } from './dto/create-portal-session.dto.js';
import { InitiateEsewaPaymentDto } from './dto/initiate-esewa-payment.dto.js';
import { EsewaVerifyDto } from './dto/esewa-verify.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly esewaService: EsewaService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PLANS
  // ──────────────────────────────────────────────────────────────────────────

  @Public()
  @SkipThrottle()
  @Get('plans')
  async getPlans() {
    return this.billingService.getPlans();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTION
  // ──────────────────────────────────────────────────────────────────────────

  @Get('subscription')
  async getSubscription(@CurrentUser() user: JwtPayload) {
    return this.billingService.getCurrentSubscription(user.tenantId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STRIPE — Checkout + Portal + Webhook
  // ──────────────────────────────────────────────────────────────────────────

  @Post('stripe/checkout')
  @Roles('OWNER', 'ADMIN')
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  async createCheckoutSession(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.billingService.createCheckoutSession(
      user.tenantId,
      user.sub,
      dto,
    );
  }

  @Post('stripe/portal')
  @Roles('OWNER', 'ADMIN')
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  async createPortalSession(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePortalSessionDto,
  ) {
    return this.billingService.createPortalSession(user.tenantId, dto);
  }

  // Stripe webhook — @Public() + @SkipThrottle()
  // rawBody mandatory for HMAC verification
  @Public()
  @SkipThrottle()
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body not available — check main.ts rawBody config');
    }
    await this.billingService.handleWebhook(rawBody, signature);
    return { received: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ESEWA — Initiate + Verify
  // ──────────────────────────────────────────────────────────────────────────

  // Step 1: Business owner initiates eSewa payment (JWT protected)
  // Returns signed payload → frontend auto-submits HTML form to eSewa
  @Post('esewa/initiate')
  @Roles('OWNER', 'ADMIN')
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  async initiateEsewaPayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiateEsewaPaymentDto,
  ) {
    return this.esewaService.initiatePayment(user.tenantId, user.sub, dto);
  }

  // Step 2: eSewa redirects here after payment (browser redirect — no JWT)
  // eSewa sends: GET /billing/esewa/verify?data=<base64_json>
  // Security: eSewa HMAC signature verification inside service
  @Public()
  @SkipThrottle()
  @Get('esewa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEsewaPayment(@Query() dto: EsewaVerifyDto) {
    return this.esewaService.verifyPayment(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INVOICES (common — both Stripe + eSewa invoices)
  // ──────────────────────────────────────────────────────────────────────────

  @Get('invoices')
  async getInvoices(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.billingService.getInvoices(user.tenantId, page, limit);
  }
}
