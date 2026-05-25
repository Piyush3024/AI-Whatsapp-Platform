// apps/api/src/modules/billing/esewa.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  generateEsewaSignature,
  verifyEsewaSignature,
  decodeEsewaCallbackData,
  paisaToEsewaAmount,
  type EsewaPaymentPayload,
} from '../../lib/esewa.util.js';
import type { InitiateEsewaPaymentDto } from './dto/initiate-esewa-payment.dto.js';
import type { EsewaVerifyDto } from './dto/esewa-verify.dto.js';

// ── eSewa URLs ─────────────────────────────────────────────────────────────

const ESEWA_URLS = {
  sandbox: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
  live: 'https://epay.esewa.com.np/api/epay/main/v2/form',
} as const;

@Injectable()
export class EsewaService {
  private readonly logger = new Logger(EsewaService.name);

  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly successUrl: string;
  private readonly failureUrl: string;
  private readonly mode: 'sandbox' | 'live';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.merchantId = this.config.getOrThrow<string>('esewa.merchantId');
    this.secretKey = this.config.getOrThrow<string>('esewa.secretKey');
    this.successUrl = this.config.getOrThrow<string>('esewa.successUrl');
    this.failureUrl = this.config.getOrThrow<string>('esewa.failureUrl');
    this.mode = this.config.getOrThrow<'sandbox' | 'live'>('esewa.mode');
  }

  // ── Initiate Payment ────────────────────────────────────────────────────
  //
  // Flow:
  //   1. Plan fetch + validate
  //   2. Unique transactionUuid generate karo (stored in Invoice.metadata)
  //   3. HMAC-SHA256 signature generate karo
  //   4. Payload return karo → frontend form banake eSewa pe submit karega
  //
  // No Invoice record yet — sirf pending state. Invoice verify() mein banega.

  async initiatePayment(
    tenantId: string,
    userId: string,
    dto: InitiateEsewaPaymentDto,
  ): Promise<{ transactionUuid: string; payload: EsewaPaymentPayload }> {
    // Plan fetch karo
    const plan = await this.prisma.db.plan.findFirst({
      where: { id: dto.planId, isActive: true, deletedAt: null },
    });

    if (!plan) throw new NotFoundException('Plan not found');

    // Plan NPR currency mein hona chahiye
    if (plan.currency !== 'NPR') {
      throw new BadRequestException(
        'eSewa only supports NPR currency. Use Stripe for other currencies.',
      );
    }

    // Tenant + member fetch
    const tenant = await this.prisma.db.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Unique transaction UUID — eSewa isko transaction_uuid kehta hai
    // Ye hum Invoice.metadata mein store karenge for verification
    const transactionUuid = randomUUID();

    // Paisa → NPR string (eSewa format)
    const amountStr = paisaToEsewaAmount(plan.price);

    // HMAC-SHA256 signature
    const signature = generateEsewaSignature(
      amountStr,
      transactionUuid,
      this.merchantId,
      this.secretKey,
    );

    const payload: EsewaPaymentPayload = {
      amount: amountStr,
      tax_amount: '0',
      total_amount: amountStr,
      product_service_charge: '0',
      product_delivery_charge: '0',
      transaction_uuid: transactionUuid,
      product_code: this.merchantId,
      success_url: this.successUrl,
      failure_url: this.failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
      esewa_url: ESEWA_URLS[this.mode],
    };

    // Pending intent record — Invoice nahi, sirf metadata track karo
    // Actual Invoice verify() mein banega (after eSewa confirms)
    // Subscription bhi verify() mein banega
    //
    // Hum tenantId + planId + transactionUuid ek temp record mein store karte hain
    // taaki verify() mein plan resolve ho sake without JWT
    // (eSewa callback mein JWT nahi hota — browser redirect hai)
    //
    // Approach: Subscription table mein pending row banao status='pending_esewa'
    // Verify mein update karenge to 'active'

    // Existing pending subscription check karo — no duplicates
    const existingPending = await this.prisma.db.subscription.findFirst({
      where: {
        tenantId,
        status: 'pending_esewa',
        deletedAt: null,
      },
    });

    if (existingPending) {
      // Old pending row update karo with new transactionUuid
      await this.prisma.db.subscription.update({
        where: { id: existingPending.id },
        data: {
          planId: plan.id,
          // transactionUuid ko metadata mein store karo
          // Subscription schema mein metadata field nahi hai
          // Isliye stripeSubscriptionId field reuse karte hain as esewaTransactionUuid
          // (field name mismatch — acceptable tradeoff: schema change avoid karna)
          stripeSubscriptionId: `esewa_${transactionUuid}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      await this.prisma.db.subscription.create({
        data: {
          tenantId,
          planId: plan.id,
          status: 'pending_esewa',
          stripeSubscriptionId: `esewa_${transactionUuid}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    this.logger.log(
      { tenantId, planId: plan.id, transactionUuid, amount: amountStr },
      'eSewa payment initiated',
    );

    return { transactionUuid, payload };
  }

  // ── Verify Callback ─────────────────────────────────────────────────────
  //
  // eSewa redirects: GET /billing/esewa/verify?data=<base64_json>
  //
  // Steps:
  //   1. Base64 decode → JSON parse
  //   2. Signature verify (tamper check)
  //   3. Status check — must be "COMPLETE"
  //   4. Idempotency — already processed invoice check
  //   5. Subscription activate + Invoice create
  //   6. Tenant ACTIVE karo
  //
  // Note: Ye endpoint @Public() hai — JWT nahi hoga (browser redirect)
  // Security: eSewa signature verify hi authentication hai

  async verifyPayment(
    dto: EsewaVerifyDto,
  ): Promise<{ success: boolean; message: string }> {
    // Step 1: Decode Base64 → JSON
    let callbackData: ReturnType<typeof decodeEsewaCallbackData>;
    try {
      callbackData = decodeEsewaCallbackData(dto.data);
    } catch {
      throw new BadRequestException(
        'Invalid eSewa callback data — Base64 decode failed',
      );
    }

    this.logger.log(
      {
        transactionUuid: callbackData.transaction_uuid,
        status: callbackData.status,
        transactionCode: callbackData.transaction_code,
      },
      'eSewa callback received',
    );

    // Step 2: Signature verification — tamper check
    // eSewa's response itself is signed — verify it
    const signedFields = callbackData.signed_field_names.split(',');

    // Build the data string from signed fields in order
    const dataToVerify = signedFields
      .map(
        (field) =>
          `${field}=${callbackData[field as keyof typeof callbackData]}`,
      )
      .join(',');

    const expectedSig = generateEsewaSignature(
      callbackData.total_amount,
      callbackData.transaction_uuid,
      callbackData.product_code,
      this.secretKey,
    );

    // Verify using our dedicated function
    const isValid = verifyEsewaSignature(
      callbackData.total_amount,
      callbackData.transaction_uuid,
      callbackData.product_code,
      this.secretKey,
      callbackData.signature,
    );

    if (!isValid) {
      this.logger.warn(
        {
          transactionUuid: callbackData.transaction_uuid,
          receivedSig: callbackData.signature,
          expectedSig,
          dataToVerify,
        },
        'eSewa callback signature verification FAILED — possible tamper attempt',
      );
      throw new BadRequestException('eSewa signature verification failed');
    }

    // Step 3: Status must be COMPLETE
    if (callbackData.status !== 'COMPLETE') {
      this.logger.warn(
        {
          status: callbackData.status,
          transactionUuid: callbackData.transaction_uuid,
        },
        'eSewa payment not complete',
      );
      return {
        success: false,
        message: `Payment status: ${callbackData.status}`,
      };
    }

    // Step 4: Idempotency — already processed check
    const alreadyProcessed = await this.prisma.db.invoice.findFirst({
      where: { stripeInvoiceId: `esewa_${callbackData.transaction_code}` },
    });

    if (alreadyProcessed) {
      this.logger.log(
        { transactionCode: callbackData.transaction_code },
        'eSewa callback already processed — skipping',
      );
      return { success: true, message: 'Payment already processed' };
    }

    // Step 5: Find the pending subscription by transactionUuid
    const pendingSub = await this.prisma.db.subscription.findFirst({
      where: {
        stripeSubscriptionId: `esewa_${callbackData.transaction_uuid}`,
        status: 'pending_esewa',
        deletedAt: null,
      },
      include: { plan: true },
    });

    if (!pendingSub) {
      this.logger.error(
        { transactionUuid: callbackData.transaction_uuid },
        'eSewa verify: no matching pending subscription found',
      );
      throw new BadRequestException(
        'No pending subscription found for this transaction',
      );
    }

    // eSewa amount format: "1,500.0" — clean karo for storage
    const cleanAmount = parseFloat(callbackData.total_amount.replace(/,/g, ''));
    // Back to paisa (integer)
    const amountPaisa = Math.round(cleanAmount * 100);

    // Step 6: Activate subscription + create Invoice — atomic transaction
    await this.prisma.db.$transaction([
      // Subscription activate karo
      this.prisma.db.subscription.update({
        where: { id: pendingSub.id },
        data: {
          status: 'active',
          stripeSubscriptionId: null, // clear the temp esewa_ field
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),

      // Invoice create karo
      this.prisma.db.invoice.create({
        data: {
          tenantId: pendingSub.tenantId,
          subscriptionId: pendingSub.id,
          // stripeInvoiceId field reuse — esewa transaction code store
          stripeInvoiceId: `esewa_${callbackData.transaction_code}`,
          totalAmount: amountPaisa,
          currency: 'NPR',
          status: 'PAID',
          dueDate: new Date(),
          lineItems: {
            create: [
              {
                type: 'subscription',
                description: `${pendingSub.plan.name} — eSewa payment`,
                quantity: 1,
                unitAmount: amountPaisa,
                totalAmount: amountPaisa,
                metadata: {
                  esewaTransactionCode: callbackData.transaction_code,
                  esewaTransactionUuid: callbackData.transaction_uuid,
                  paymentGateway: 'esewa',
                },
              },
            ],
          },
        },
      }),

      // Tenant ACTIVE karo
      this.prisma.db.tenant.update({
        where: { id: pendingSub.tenantId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    this.logger.log(
      {
        tenantId: pendingSub.tenantId,
        planId: pendingSub.planId,
        transactionCode: callbackData.transaction_code,
        amountPaisa,
      },
      'eSewa payment verified — subscription activated',
    );

    return {
      success: true,
      message: 'Payment verified and subscription activated',
    };
  }
}
