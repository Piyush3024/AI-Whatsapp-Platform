import { type Job } from "bullmq";
import { z } from "zod";
import { Prisma, MessageStatus } from "@whatsapp-ai/db/generated/prisma";

import { prisma, withTenantContext } from "../lib/prisma.js";
import { logger, createJobLogger } from "../lib/logger.js";
import type { StatusUpdateJob } from "../types/job-payloads.js";

const StatusUpdateJobSchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  tenantId: z.string().uuid(),
  status: z.object({
    id: z.string().min(1),
    status: z.enum(["sent", "delivered", "read", "failed"]),
    timestamp: z.string(),
    recipient_id: z.string(),
    errors: z
      .array(
        z.object({
          code: z.number(),
          title: z.string(),
        }),
      )
      .optional(),
  }),
});

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: MessageStatus.SENT,
  delivered: MessageStatus.DELIVERED,
  read: MessageStatus.READ,
  failed: MessageStatus.FAILED,
};

export async function processAnalyticsJob(job: Job): Promise<void> {
  if (job.name === "aggregate-usage") {
    return aggregateUsage();
  }

  if (job.name === "status-update") {
    return processStatusUpdate(job as Job<StatusUpdateJob>);
  }

  logger.warn({ jobName: job.name }, "Unknown analytics job name — skipping");
}

async function aggregateUsage(): Promise<void> {
  const now = new Date();
  logger.info({ timestamp: now }, "Starting usage aggregation sweep");

  try {
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const tenantRows = await prisma.usageEvent.findMany({
      where: { createdAt: { gte: twoDaysAgo } },
      select: { tenantId: true },
      distinct: ["tenantId"],
    });

    if (tenantRows.length === 0) {
      logger.info("No usage events to aggregate");
      return;
    }

    logger.info(
      { tenantCount: tenantRows.length },
      "Aggregating usage for tenants",
    );

    for (const { tenantId } of tenantRows) {
      await aggregateTenantUsage(tenantId, twoDaysAgo, now);
    }

    logger.info(
      { tenantCount: tenantRows.length },
      "Usage aggregation sweep complete",
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Usage aggregation sweep failed",
    );
    throw error; // BullMQ retry
  }
}

async function aggregateTenantUsage(
  tenantId: string,
  from: Date,
  to: Date,
): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<
    {
      date: Date;
      messages_in: bigint;
      messages_out: bigint;
      ai_calls: bigint;
      bookings_created: bigint;
    }[]
  >(
    `
    SELECT
      DATE_TRUNC('day', "createdAt") AS date,
      COUNT(*) FILTER (WHERE type = 'MESSAGE_INBOUND')  AS messages_in,
      COUNT(*) FILTER (WHERE type = 'MESSAGE_OUTBOUND') AS messages_out,
      COUNT(*) FILTER (WHERE type = 'AI_CALL')          AS ai_calls,
      COUNT(*) FILTER (WHERE type = 'BOOKING_CREATED')  AS bookings_created
    FROM "usage_events"
    WHERE "tenantId" = $1
      AND "createdAt" >= $2
      AND "createdAt" <= $3
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
    `,
    tenantId,
    from,
    to,
  );

  for (const row of rows) {
    await prisma.dailyUsageAggregate.upsert({
      where: {
        tenantId_date: {
          tenantId,
          date: row.date,
        },
      },
      create: {
        tenantId,
        date: row.date,
        messagesIn: Number(row.messages_in),
        messagesOut: Number(row.messages_out),
        aiCalls: Number(row.ai_calls),
        bookingsCreated: Number(row.bookings_created),
      },
      update: {
        messagesIn: Number(row.messages_in),
        messagesOut: Number(row.messages_out),
        aiCalls: Number(row.ai_calls),
        bookingsCreated: Number(row.bookings_created),
      },
    });
  }

  logger.debug({ tenantId, days: rows.length }, "Tenant usage aggregated");
}

async function processStatusUpdate(job: Job<StatusUpdateJob>): Promise<void> {
  const log = createJobLogger("analytics", job.id, "resolving");

  const { phoneNumberId } = job.data;

  const whatsappNumber = await prisma.whatsAppNumber.findFirst({
    where: { phoneNumberId, isActive: true, deletedAt: null },
    select: { tenantId: true },
  });

  if (!whatsappNumber) {
    log.warn(
      { phoneNumberId },
      "No WhatsApp number found for phoneNumberId — dropping status update",
    );
    return;
  }

  const tenantId = whatsappNumber.tenantId;

  const dataWithTenant = { ...job.data, tenantId };

  const parsed = StatusUpdateJobSchema.safeParse(dataWithTenant);
  if (!parsed.success) {
    log.error(
      { errors: parsed.error.flatten() },
      "Invalid status-update payload — dropping",
    );
    return;
  }

  const { status } = parsed.data;
  const dbStatus = STATUS_MAP[status.status];

  if (!dbStatus) {
    log.warn({ metaStatus: status.status }, "Unknown Meta status — skipping");
    return;
  }

  log.info(
    { metaMessageId: status.id, metaStatus: status.status, dbStatus },
    "Processing message status update",
  );

  try {
    await withTenantContext(tenantId, async (tx) => {
      const message = await tx.message.findFirst({
        where: { tenantId, metaMessageId: status.id },
        select: { id: true, status: true },
      });

      if (!message) {
        log.warn(
          { metaMessageId: status.id },
          "Message not found — may already be processed",
        );
        return;
      }

      const STATUS_RANK: Record<string, number> = {
        QUEUED: 0,
        SENT: 1,
        DELIVERED: 2,
        READ: 3,
        FAILED: 4,
      };

      const currentRank = STATUS_RANK[message.status] ?? 0;
      const newRank = STATUS_RANK[dbStatus] ?? 0;

      if (newRank <= currentRank && dbStatus !== "FAILED") {
        log.info(
          { current: message.status, incoming: dbStatus },
          "Status downgrade ignored",
        );
        return;
      }

      const updateData: {
        status: MessageStatus;
        metadata?: Prisma.InputJsonValue;
      } = { status: dbStatus };

      if (dbStatus === "FAILED" && status.errors?.length) {
        updateData.metadata = {
          failureCode: status.errors[0]?.code,
          failureTitle: status.errors[0]?.title,
          failedAt: new Date().toISOString(),
        };
      }

      await tx.message.update({
        where: { id: message.id },
        data: updateData,
      });

      log.info({ messageId: message.id, dbStatus }, "Message status updated");
    });
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Status update failed",
    );
    throw error;
  }
}
