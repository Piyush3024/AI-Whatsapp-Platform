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

  async initiatePayment(
    tenantId: string,
    userId: string,
    dto: InitiateEsewaPaymentDto,
  ): Promise<{ transactionUuid: string; payload: EsewaPaymentPayload }> {
    const plan = await this.prisma.db.plan.findFirst({
      where: { id: dto.planId, isActive: true, deletedAt: null },
    });

    if (!plan) throw new NotFoundException('Plan not found');

    if (plan.currency !== 'NPR') {
      throw new BadRequestException(
        'eSewa only supports NPR currency. Use Stripe for other currencies.',
      );
    }

    const tenant = await this.prisma.db.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const transactionUuid = randomUUID();

    const amountStr = paisaToEsewaAmount(plan.price);

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

    const existingPending = await this.prisma.db.subscription.findFirst({
      where: {
        tenantId,
        status: 'pending_esewa',
        deletedAt: null,
      },
    });

    if (existingPending) {
      await this.prisma.db.subscription.update({
        where: { id: existingPending.id },
        data: {
          planId: plan.id,

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

  async verifyPayment(
    dto: EsewaVerifyDto,
  ): Promise<{ success: boolean; message: string }> {
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

    const signedFields = callbackData.signed_field_names.split(',');

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

    const cleanAmount = parseFloat(callbackData.total_amount.replace(/,/g, ''));

    const amountPaisa = Math.round(cleanAmount * 100);

    await this.prisma.db.$transaction([
      this.prisma.db.subscription.update({
        where: { id: pendingSub.id },
        data: {
          status: 'active',
          stripeSubscriptionId: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      this.prisma.db.invoice.create({
        data: {
          tenantId: pendingSub.tenantId,
          subscriptionId: pendingSub.id,
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
