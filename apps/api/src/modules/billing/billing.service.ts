// apps/api/src/modules/billing/billing.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';
import type { CreatePortalSessionDto } from './dto/create-portal-session.dto.js';

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.config.getOrThrow<string>('stripe.secretKey'),
      {
        // Latest stable API version (2026)
        apiVersion: '2026-04-22.dahlia',
        typescript: true,
      },
    );
  }

  // ── Plans ──────────────────────────────────────────────────

  async getPlans() {
    return this.prisma.db.plan.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { price: 'asc' },
    });
  }

  // ── Subscription ───────────────────────────────────────────

  async getCurrentSubscription(tenantId: string) {
    const subscription = await this.prisma.db.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return subscription;
  }

  // ── Checkout Session ───────────────────────────────────────

  async createCheckoutSession(
    tenantId: string,
    userId: string,
    dto: CreateCheckoutSessionDto,
  ) {
    // Plan exist karta hai check karo
    const plan = await this.prisma.db.plan.findFirst({
      where: { id: dto.planId, isActive: true, deletedAt: null },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Tenant + user info fetch karo
    const tenant = await this.prisma.db.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const member = await this.prisma.db.tenantMember.findFirst({
      where: { tenantId, userId, deletedAt: null },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException('Tenant member not found');
    }

    // Existing Stripe customer check karo
    const existingSub = await this.prisma.db.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    let stripeCustomerId = existingSub?.stripeCustomerId ?? null;

    // Stripe customer create karo agar nahi hai
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: member.user.email,
        name: tenant.name,
        metadata: {
          tenantId,
          userId,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Plan mein stripePriceId hona chahiye
    // Plan.limits JSON mein stripePriceId store hai
    const planLimits = plan.limits as Record<string, unknown>;
    const stripePriceId = planLimits['stripePriceId'] as string | undefined;

    if (!stripePriceId) {
      throw new BadRequestException(
        'Plan is not configured with a Stripe price',
      );
    }

    // Checkout session create karo
    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      metadata: {
        tenantId,
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          tenantId,
          planId: plan.id,
        },
      },
      allow_promotion_codes: true,
    });

    this.logger.log(
      { tenantId, planId: plan.id, sessionId: session.id },
      'Checkout session created',
    );

    return { sessionId: session.id, url: session.url };
  }

  // ── Customer Portal Session ────────────────────────────────

  async createPortalSession(tenantId: string, dto: CreatePortalSessionDto) {
    const subscription = await this.prisma.db.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException(
        'No Stripe customer found. Please subscribe to a plan first.',
      );
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: dto.returnUrl,
    });

    return { url: session.url };
  }

  // ── Invoices ───────────────────────────────────────────────

  async getInvoices(tenantId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      this.prisma.db.invoice.findMany({
        where: { tenantId, deletedAt: null },
        include: { lineItems: true, subscription: { include: { plan: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.db.invoice.count({
        where: { tenantId, deletedAt: null },
      }),
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Webhook Handler ────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.getOrThrow<string>(
      'stripe.webhookSecret',
    );

    let event: Stripe.Event;

    try {
      // Raw body mandatory — JSON parse se signature fail hoti hai
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(
        { message },
        'Stripe webhook signature verification failed',
      );
      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    this.logger.log(
      { eventType: event.type, eventId: event.id },
      'Stripe webhook received',
    );

    // Route to handler — idempotent (duplicate events safely ignored)
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        this.logger.log(
          { eventType: event.type },
          'Unhandled Stripe event type — skipping',
        );
    }
  }

  // ── Webhook Sub-handlers ───────────────────────────────────

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const tenantId = session.metadata?.['tenantId'];
    const planId = session.metadata?.['planId'];

    if (!tenantId || !planId) {
      this.logger.error(
        { sessionId: session.id },
        'checkout.session.completed missing metadata',
      );
      return;
    }

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!stripeSubscriptionId) {
      this.logger.error(
        { sessionId: session.id },
        'No subscription id in session',
      );
      return;
    }

    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : (session.customer?.id ?? null);

    // Stripe se period fetch karo
    const stripeSub =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

    if ('deleted' in stripeSub && stripeSub.deleted) {
      this.logger.error(
        { stripeSubscriptionId },
        'Retrieved subscription is deleted',
      );
      return;
    }

    const item = stripeSub.items?.data?.[0];
    const periodStart = item?.current_period_start
      ? new Date(item.current_period_start * 1000)
      : new Date();
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : new Date();

    // Idempotent — same session double fire hone pe duplicate nahi banega
    const existing = await this.prisma.db.subscription.findFirst({
      where: { tenantId, stripeSubscriptionId },
    });

    if (existing) {
      await this.prisma.db.subscription.update({
        where: { id: existing.id },
        data: {
          planId,
          stripeCustomerId,
          status: stripeSub.status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          deletedAt: null,
        },
      });
    } else {
      await this.prisma.db.subscription.create({
        data: {
          tenantId,
          planId,
          stripeCustomerId,
          stripeSubscriptionId,
          status: stripeSub.status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    // Tenant ACTIVE karo
    await this.prisma.db.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(
      { tenantId, planId, stripeSubscriptionId },
      'Subscription activated',
    );
  }

  private async handleSubscriptionUpdated(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = stripeSub.metadata?.['tenantId'];

    if (!tenantId) {
      this.logger.warn(
        { subscriptionId: stripeSub.id },
        'customer.subscription.updated missing tenantId metadata',
      );
      return;
    }

    const item = stripeSub.items?.data?.[0];
    const periodStart = item?.current_period_start
      ? new Date(item.current_period_start * 1000)
      : new Date();
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : new Date();

    await this.prisma.db.subscription.updateMany({
      where: { tenantId, stripeSubscriptionId: stripeSub.id },
      data: {
        status: stripeSub.status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    this.logger.log(
      { tenantId, subscriptionId: stripeSub.id, status: stripeSub.status },
      'Subscription updated',
    );
  }

  private async handleSubscriptionDeleted(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = stripeSub.metadata?.['tenantId'];

    if (!tenantId) {
      this.logger.warn(
        { subscriptionId: stripeSub.id },
        'customer.subscription.deleted missing tenantId metadata',
      );
      return;
    }

    await this.prisma.db.subscription.updateMany({
      where: { tenantId, stripeSubscriptionId: stripeSub.id },
      data: {
        status: 'canceled',
        deletedAt: new Date(),
      },
    });

    // Tenant status SUSPENDED karo
    await this.prisma.db.tenant.update({
      where: { id: tenantId },
      data: { status: 'SUSPENDED' },
    });

    this.logger.log(
      { tenantId, subscriptionId: stripeSub.id },
      'Subscription cancelled — tenant suspended',
    );
  }

  private async handleInvoicePaid(
    stripeInvoice: Stripe.Invoice,
  ): Promise<void> {
    // stripeInvoiceId unique check — idempotency
    const existing = await this.prisma.db.invoice.findFirst({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (existing) {
      this.logger.log(
        { stripeInvoiceId: stripeInvoice.id },
        'invoice.paid already processed — skipping',
      );
      return;
    }

    let stripeSubscriptionId: string | undefined;
    if (
      stripeInvoice.parent &&
      stripeInvoice.parent.type === 'subscription_details' &&
      stripeInvoice.parent.subscription_details
    ) {
      const rawSub = stripeInvoice.parent.subscription_details.subscription;
      stripeSubscriptionId =
        typeof rawSub === 'string' ? rawSub : (rawSub?.id ?? undefined);
    }

    if (!stripeSubscriptionId) return;

    const subscription = await this.prisma.db.subscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (!subscription) {
      this.logger.warn(
        { stripeSubscriptionId },
        'invoice.paid: subscription not found in DB',
      );
      return;
    }

    // Invoice record create karo
    await this.prisma.db.invoice.create({
      data: {
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        stripeInvoiceId: stripeInvoice.id,
        // amount_paid in cents → paisa (already integer)
        totalAmount: stripeInvoice.amount_paid,
        currency: stripeInvoice.currency.toUpperCase(),
        status: 'PAID',
        dueDate: stripeInvoice.due_date
          ? new Date(stripeInvoice.due_date * 1000)
          : new Date(),
        lineItems: {
          create: stripeInvoice.lines.data.map((line) => ({
            type: 'subscription',
            description: line.description ?? 'Subscription charge',
            quantity: line.quantity ?? 1,
            unitAmount: line.amount,
            totalAmount: line.amount * (line.quantity ?? 1),
            metadata: { stripeLineItemId: line.id },
          })),
        },
      },
    });

    this.logger.log(
      { tenantId: subscription.tenantId, stripeInvoiceId: stripeInvoice.id },
      'Invoice record created',
    );
  }

  private async handleInvoicePaymentFailed(
    stripeInvoice: Stripe.Invoice,
  ): Promise<void> {
    let stripeSubscriptionId: string | undefined;
    if (
      stripeInvoice.parent &&
      stripeInvoice.parent.type === 'subscription_details' &&
      stripeInvoice.parent.subscription_details
    ) {
      const rawSub = stripeInvoice.parent.subscription_details.subscription;
      stripeSubscriptionId =
        typeof rawSub === 'string' ? rawSub : (rawSub?.id ?? undefined);
    }

    if (!stripeSubscriptionId) return;

    const subscription = await this.prisma.db.subscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (!subscription) return;

    // Status sync karo
    await this.prisma.db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'past_due' },
    });

    this.logger.warn(
      {
        tenantId: subscription.tenantId,
        stripeInvoiceId: stripeInvoice.id,
        stripeSubscriptionId,
      },
      'Invoice payment failed — subscription marked past_due',
    );
  }
}
