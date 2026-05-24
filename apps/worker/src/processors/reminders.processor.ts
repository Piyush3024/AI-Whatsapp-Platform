import { type Job } from "bullmq";
import { z } from "zod";

import { prisma, withTenantContext } from "../lib/prisma.js";
import { logger, createJobLogger } from "../lib/logger.js";
import { outboundQueue, remindersQueue } from "../lib/queues.js";
import { ReminderRuleType } from "@whatsapp-ai/db/generated/prisma";
import type { OutboundMessageJob } from "../types/job-payloads.js";

// ============================================================
// Job Payload Schema
// ============================================================

export const ReminderJobPayloadSchema = z.object({
  tenantId: z.string().uuid(),
  bookingId: z.string().uuid(),
  ruleType: z.nativeEnum(ReminderRuleType),
});

export type ReminderJobPayload = z.infer<typeof ReminderJobPayloadSchema>;

// ============================================================
// Constants
// ============================================================

const MAX_RETRY_ATTEMPTS = 3;

// ============================================================
// Processor
// ============================================================

export async function processReminderJob(
  job: Job<ReminderJobPayload>,
): Promise<void> {
  const { tenantId, bookingId, ruleType } = job.data;
  const log = createJobLogger("reminders", job.id, tenantId);

  log.info(
    {
      bookingId,
      ruleType,
      attempt: job.attemptsMade + 1,
    },
    "Processing reminder job",
  );

  try {
    // Use tenant context for RLS
    const result = await withTenantContext(tenantId, async (tx) => {
      // Find the pending scheduled reminder with booking + customer
      const scheduledReminder = await tx.scheduledReminder.findFirst({
        where: {
          tenantId,
          bookingId,
          ruleType,
          status: "PENDING",
        },
        include: {
          booking: {
            include: {
              customer: true,
              location: true,
            },
          },
        },
      });

      if (!scheduledReminder) {
        log.warn(
          { bookingId, ruleType },
          "No pending scheduled reminder found",
        );
        return null;
      }

      // Check if customer has opted out
      if (scheduledReminder.booking.customer.optInStatus === "OPTED_OUT") {
        log.info(
          { customerId: scheduledReminder.booking.customerId },
          "Customer has opted out of notifications",
        );

        await tx.scheduledReminder.update({
          where: { id: scheduledReminder.id },
          data: {
            status: "CANCELLED",
            error: "Customer opted out",
          },
        });

        return null;
      }

      // Get default WhatsApp number for tenant (not on Booking — separate relation)
      const whatsappNumber = await tx.whatsAppNumber.findFirst({
        where: {
          tenantId,
          isDefault: true,
          isActive: true,
        },
      });

      if (!whatsappNumber) {
        log.error(
          { tenantId, bookingId },
          "No default WhatsApp number found for reminder",
        );

        await tx.scheduledReminder.update({
          where: { id: scheduledReminder.id },
          data: {
            status: "FAILED",
            error: "No default WhatsApp number configured",
            attempts: scheduledReminder.attempts + 1,
          },
        });

        throw new Error("No default WhatsApp number configured");
      }

      // ── Find or create Conversation ─────────────────────────────────────
      let conversation = await tx.conversation.findFirst({
        where: {
          tenantId,
          customerId: scheduledReminder.booking.customerId,
          whatsappNumberId: whatsappNumber.id,
          state: { not: "HUMAN_HANDOFF" },
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!conversation) {
        conversation = await tx.conversation.create({
          data: {
            tenantId,
            customerId: scheduledReminder.booking.customerId,
            whatsappNumberId: whatsappNumber.id,
            state: "IDLE",
          },
        });
      }

      // ── Save Message record in DB ───────────────────────────────────────
      const savedMessage = await tx.message.create({
        data: {
          tenantId,
          conversationId: conversation.id,
          messageType: "TEXT",
          direction: "outbound",
          content: scheduledReminder.message,
          status: "QUEUED",
          metadata: {
            reminderId: scheduledReminder.id,
            ruleType,
          },
        },
      });

      // ── Queue the outbound message ──────────────────────────────────────
      const outboundJob: OutboundMessageJob = {
        tenantId,
        conversationId: conversation.id,
        messageId: savedMessage.id,
        phoneNumberId: whatsappNumber.phoneNumberId ?? whatsappNumber.id,
        toPhone: scheduledReminder.booking.customer.phone,
        content: scheduledReminder.message,
        messageType: "text",
      };

      await outboundQueue.add("send-whatsapp-message", outboundJob);

      // Update reminder status
      await tx.scheduledReminder.update({
        where: { id: scheduledReminder.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });

      log.info(
        {
          scheduledReminderId: scheduledReminder.id,
          customerPhone: scheduledReminder.booking.customer.phone,
        },
        "Reminder sent successfully",
      );

      return scheduledReminder;
    });

    if (!result) {
      log.info({ bookingId }, "Reminder job skipped (no action needed)");
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isRetryable = job.attemptsMade < MAX_RETRY_ATTEMPTS;

    log.error(
      {
        bookingId,
        error: errorMessage,
        attempt: job.attemptsMade + 1,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        isRetryable,
      },
      "Reminder job failed",
    );

    // Update scheduled reminder with error
    await withTenantContext(tenantId, async (tx) => {
      // Fetch current attempts to do a plain integer update
      const current = await tx.scheduledReminder.findFirst({
        where: { tenantId, bookingId, ruleType, status: "PENDING" },
        select: { attempts: true },
      });

      await tx.scheduledReminder.updateMany({
        where: {
          tenantId,
          bookingId,
          ruleType,
          status: "PENDING",
        },
        data: {
          status: isRetryable ? "PENDING" : "FAILED",
          error: errorMessage,
          attempts: (current?.attempts ?? 0) + 1,
        },
      });
    });

    if (isRetryable) {
      // Throw to trigger BullMQ retry
      throw error;
    }
  }
}

// ============================================================
// Scheduled Reminders Sweeper
// ============================================================

/**
 * Process all pending reminders that are due
 * This runs periodically to catch any missed reminders
 */
export async function processDueReminders(): Promise<void> {
  const now = new Date();

  logger.info({ timestamp: now }, "Sweeping for due reminders");

  try {
    const dueReminders = await prisma.scheduledReminder.findMany({
      where: {
        status: "PENDING",
        scheduledAt: {
          lte: now,
        },
      },
      take: 100, // Process in batches
      orderBy: {
        scheduledAt: "asc",
      },
    });

    logger.info({ count: dueReminders.length }, "Found due reminders");

    for (const reminder of dueReminders) {
      await remindersQueue.add(
        "process-reminder",
        {
          tenantId: reminder.tenantId,
          bookingId: reminder.bookingId,
          ruleType: reminder.ruleType,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
          jobId: `reminder-${reminder.id}`,
        },
      );
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Error sweeping reminders",
    );
  }
}
