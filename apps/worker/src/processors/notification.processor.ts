import type { Job } from "bullmq";
import { createJobLogger } from "../lib/logger.js";
import { withTenantContext, prisma } from "../lib/prisma.js";
import { outboundQueue } from "../lib/queues.js";
import type { HumanHandoffNotifyJob } from "../types/job-payloads.js";

export async function processNotificationJob(
  job: Job<HumanHandoffNotifyJob>,
): Promise<void> {
  const {
    tenantId,
    conversationId,
    customerId,
    customerPhone,
    customerName,
    assignedStaffId,
  } = job.data;

  const log = createJobLogger("notifications", job.id, tenantId);

  log.info(
    { conversationId, assignedStaffId },
    "Processing human handoff notification",
  );

  const customerDisplay = customerName ?? customerPhone;

  const membersToNotify = await withTenantContext(tenantId, async (tx) => {
    return tx.tenantMember.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        deletedAt: null,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { userId: true },
    });
  });

  const userIds = new Set(membersToNotify.map((m) => m.userId));

  if (assignedStaffId) {
    const staffRecord = await withTenantContext(tenantId, async (tx) => {
      return tx.staff.findFirst({
        where: { id: assignedStaffId, tenantId, deletedAt: null },
        select: { userId: true, phone: true, name: true },
      });
    });

    if (staffRecord?.userId) {
      userIds.add(staffRecord.userId);
    }
  }

  if (userIds.size > 0) {
    const notifications = Array.from(userIds).map((userId) => ({
      tenantId,
      userId,
      type: "HUMAN_HANDOFF",
      title: "Customer needs human assistance",
      body: `${customerDisplay} has been flagged for human handoff in conversation.`,
      metadata: {
        conversationId,
        customerId,
        customerPhone,
        customerName: customerName ?? null,
      },
    }));

    await prisma.notification.createMany({ data: notifications });

    log.info(
      { count: notifications.length, conversationId },
      "In-app notifications created",
    );
  }

  if (assignedStaffId) {
    const staffWithPhone = await withTenantContext(tenantId, async (tx) => {
      return tx.staff.findFirst({
        where: { id: assignedStaffId, tenantId, deletedAt: null },
        select: { phone: true, name: true },
      });
    });

    if (staffWithPhone?.phone) {
      const whatsappNumber = await withTenantContext(tenantId, async (tx) => {
        return tx.whatsAppNumber.findFirst({
          where: {
            tenantId,
            isActive: true,
            isDefault: true,
            deletedAt: null,
            phoneNumberId: { not: null },
          },
          select: { id: true, phoneNumberId: true },
        });
      });

      if (whatsappNumber?.phoneNumberId) {
        const staffMessage =
          ` *Human Handoff Alert*\n\n` +
          `Customer *${customerDisplay}* (${customerPhone}) needs your assistance.\n\n` +
          `Please check the dashboard to continue the conversation.`;

        const systemMessage = await withTenantContext(tenantId, async (tx) => {
          return tx.message.create({
            data: {
              tenantId,
              conversationId,
              messageType: "SYSTEM",
              direction: "outbound",
              content: staffMessage,
              status: "QUEUED",
              metadata: {
                systemType: "HUMAN_HANDOFF_STAFF_NOTIFY",
                staffId: assignedStaffId,
                staffPhone: staffWithPhone.phone,
              },
            },
            select: { id: true },
          });
        });

        await outboundQueue.add(
          "send-whatsapp-message",
          {
            tenantId,
            conversationId,
            messageId: systemMessage.id,
            phoneNumberId: whatsappNumber.phoneNumberId,
            toPhone: staffWithPhone.phone,
            content: staffMessage,
            messageType: "text",
          },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 2_000 },
          },
        );

        log.info(
          {
            staffPhone: staffWithPhone.phone,
            assignedStaffId,
            conversationId,
          },
          "WhatsApp notification queued for assigned staff",
        );
      } else {
        log.warn(
          { tenantId, assignedStaffId },
          "No default WhatsApp number found — skipping staff WhatsApp notification",
        );
      }
    } else {
      log.warn(
        { assignedStaffId },
        "Assigned staff has no phone number — skipping WhatsApp notification",
      );
    }
  }

  log.info(
    { conversationId },
    "Human handoff notification processing complete",
  );
}
