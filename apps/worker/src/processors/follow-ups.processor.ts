import { type Job } from "bullmq";
import { z } from "zod";

import { withTenantContext } from "../lib/prisma.js";
import { createJobLogger } from "../lib/logger.js";
import { outboundQueue } from "../lib/queues.js";
import type { FollowUpJob, OutboundMessageJob } from "../types/job-payloads.js";

const FollowUpJobSchema = z.object({
  tenantId: z.string().uuid(),
  bookingId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerPhone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  followUpType: z.enum(["post_appointment", "re_booking"]),
  messageBody: z.string().min(1).max(1024),
});

export async function processFollowUpJob(job: Job<FollowUpJob>): Promise<void> {
  const { tenantId } = job.data;
  const log = createJobLogger("follow_ups", job.id, tenantId);

  const parsed = FollowUpJobSchema.safeParse(job.data);
  if (!parsed.success) {
    log.error(
      { errors: parsed.error.flatten() },
      "Invalid follow-up job payload — dropping",
    );

    return;
  }

  const { bookingId, customerId, customerPhone, followUpType, messageBody } =
    parsed.data;

  log.info(
    { bookingId, followUpType, attempt: job.attemptsMade + 1 },
    "Processing follow-up job",
  );

  await withTenantContext(tenantId, async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, tenantId, status: "COMPLETED" },
      select: { id: true },
    });

    if (!booking) {
      log.warn(
        { bookingId },
        "Booking not found or not COMPLETED — skipping follow-up",
      );
      return;
    }

    const customer = await tx.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { optInStatus: true },
    });

    if (!customer) {
      log.warn({ customerId }, "Customer not found — skipping follow-up");
      return;
    }

    if (customer.optInStatus === "OPTED_OUT") {
      log.info({ customerId }, "Customer opted out — skipping follow-up");
      return;
    }

    const whatsappNumber = await tx.whatsAppNumber.findFirst({
      where: { tenantId, isDefault: true, isActive: true },
      select: { id: true, phoneNumberId: true },
    });

    if (!whatsappNumber) {
      log.error(
        { tenantId },
        "No default WhatsApp number — cannot send follow-up",
      );
      throw new Error("No default WhatsApp number configured");
    }

    let conversation = await tx.conversation.findFirst({
      where: {
        tenantId,
        customerId,
        whatsappNumberId: whatsappNumber.id,
        state: { not: "HUMAN_HANDOFF" },
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          tenantId,
          customerId,
          whatsappNumberId: whatsappNumber.id,
          state: "IDLE",
        },
        select: { id: true },
      });
    }

    const savedMessage = await tx.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        messageType: "TEXT",
        direction: "outbound",
        content: messageBody,
        status: "QUEUED",
        metadata: {
          followUpType,
          bookingId,
          source: "follow_up_processor",
        },
      },
      select: { id: true },
    });

    const outboundJob: OutboundMessageJob = {
      tenantId,
      conversationId: conversation.id,
      messageId: savedMessage.id,
      phoneNumberId: whatsappNumber.phoneNumberId ?? whatsappNumber.id,
      toPhone: customerPhone,
      content: messageBody,
      messageType: "text",
    };

    await outboundQueue.add("send-whatsapp-message", outboundJob, {});

    log.info(
      { bookingId, followUpType, customerPhone, messageId: savedMessage.id },
      "Follow-up sent to outbound queue successfully",
    );
  });
}
