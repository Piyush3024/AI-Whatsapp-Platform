import type { Job } from "bullmq";
import { createJobLogger } from "../lib/logger.js";
import { withTenantContext, type TenantTxClient } from "../lib/prisma.js";
import { aiReplyQueue } from "../lib/queues.js";
import type { InboundMessageJob, AiReplyJob } from "../types/job-payloads.js";

const AI_SUPPORTED_TYPES = new Set(["text", "interactive", "button"]);

const CONVERSATION_ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function processInboundMessage(
  job: Job<InboundMessageJob>,
): Promise<void> {
  const { phoneNumberId, wabaId, message, senderPhone, senderName, timestamp } =
    job.data;

  const baseLog = createJobLogger("whatsapp-inbound", job.id, "resolving");

  baseLog.info(
    {
      phoneNumberId,
      wabaId,
      metaMessageId: message.id,
      messageType: message.type,
    },
    "Processing inbound message",
  );

  let tenantId: string;
  let whatsappNumberDbId: string;

  try {
    const result = await withTenantContext("", async (tx) => {
      return tx.whatsAppNumber.findFirst({
        where: {
          phoneNumberId: phoneNumberId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          tenantId: true,
        },
      });
    });

    if (!result) {
      throw new Error(
        `No active WhatsAppNumber found for phoneNumberId: ${phoneNumberId}. ` +
          `Tenant onboarding incomplete or unknown webhook source.`,
      );
    }

    tenantId = result.tenantId;
    whatsappNumberDbId = result.id;
  } catch (err) {
    baseLog.error(
      { err, phoneNumberId },
      "Failed to resolve tenant from phoneNumberId",
    );
    throw err;
  }

  const log = createJobLogger("whatsapp-inbound", job.id, tenantId);

  log.info({ tenantId, whatsappNumberDbId }, "Tenant resolved");

  const result = await withTenantContext(tenantId, async (tx) => {
    const customer = await tx.customer.upsert({
      where: {
        tenantId_phone: {
          tenantId,
          phone: senderPhone,
        },
      },
      create: {
        tenantId,
        phone: senderPhone,
        name: senderName ?? null,
        whatsappId: message.from,
        optInStatus: "OPTED_IN",
      },
      update: {
        ...(senderName && { name: senderName }),
        whatsappId: message.from,
      },
      select: {
        id: true,
        name: true,
        optInStatus: true,
      },
    });

    log.info({ customerId: customer.id }, "Customer upserted");

    if (customer.optInStatus === "OPTED_OUT") {
      log.warn(
        { customerId: customer.id, senderPhone },
        "Customer is opted out — skipping AI reply",
      );

      await saveMessage(
        tx,
        tenantId,
        null,
        message,
        senderPhone,
        timestamp,
        log,
      );
      return null;
    }

    const activeConversationCutoff = new Date(
      Date.now() - CONVERSATION_ACTIVE_WINDOW_MS,
    );

    let conversation = await tx.conversation.findFirst({
      where: {
        tenantId,
        customerId: customer.id,
        whatsappNumberId: whatsappNumberDbId,
        state: { not: "HUMAN_HANDOFF" },
        updatedAt: { gte: activeConversationCutoff },
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, state: true },
    });

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          tenantId,
          customerId: customer.id,
          whatsappNumberId: whatsappNumberDbId,
          state: "GREETING",
          metadata: {},
        },
        select: { id: true, state: true },
      });

      log.info({ conversationId: conversation.id }, "New conversation created");
    } else {
      log.info(
        { conversationId: conversation.id, state: conversation.state },
        "Existing conversation found",
      );
    }

    const savedMessage = await saveMessage(
      tx,
      tenantId,
      conversation.id,
      message,
      senderPhone,
      timestamp,
      log,
    );

    if (!savedMessage) {
      log.warn(
        { metaMessageId: message.id },
        "Duplicate message detected — skipping ai-reply push",
      );
      return null;
    }

    if (!AI_SUPPORTED_TYPES.has(message.type)) {
      log.info(
        { messageType: message.type, messageId: savedMessage.id },
        "Message type not supported for AI reply — skipping",
      );
      return null;
    }

    const inboundContent = extractMessageContent(message);

    if (!inboundContent) {
      log.warn(
        { messageType: message.type },
        "Could not extract text content — skipping AI reply",
      );
      return null;
    }

    const aiReplyJob: AiReplyJob = {
      tenantId,
      conversationId: conversation.id,
      customerId: customer.id,
      messageId: savedMessage.id,
      metaMessageId: message.id,
      inboundContent,
      phoneNumberId,
      senderPhone,
    };

    log.info(
      {
        conversationId: conversation.id,
        messageId: savedMessage.id,
        contentLength: inboundContent.length,
      },
      "AI reply job enqueued",
    );

    return aiReplyJob;
  });

  if (result) {
    await aiReplyQueue.add("generate-ai-reply", result);

    log.info(
      {
        conversationId: result.conversationId,
        messageId: result.messageId,
        contentLength: result.inboundContent.length,
      },
      "AI reply job enqueued",
    );
  }
}

async function saveMessage(
  tx: TenantTxClient,
  tenantId: string,
  conversationId: string | null,
  message: InboundMessageJob["message"],
  senderPhone: string,
  timestamp: string,
  log: ReturnType<typeof createJobLogger>,
): Promise<{ id: string } | null> {
  const existing = await tx.message.findFirst({
    where: { metaMessageId: message.id },
    select: { id: true },
  });

  if (existing) {
    return null;
  }

  const content = extractMessageContent(message);

  const saved = await tx.message.create({
    data: {
      tenantId,
      conversationId: conversationId ?? undefined,
      messageType: mapMessageType(message.type),
      direction: "inbound",
      content,
      status: "DELIVERED",
      metaMessageId: message.id,
      metadata: {
        from: senderPhone,
        timestamp,
        type: message.type,

        raw: JSON.parse(JSON.stringify(message)),
      },
    },
    select: { id: true },
  });

  log.info({ messageId: saved.id, metaMessageId: message.id }, "Message saved");

  return saved;
}

function extractMessageContent(
  message: InboundMessageJob["message"],
): string | null {
  const msg = message as Record<string, unknown>;

  switch (message.type) {
    case "text": {
      const text = msg["text"] as { body?: string } | undefined;
      return text?.body ?? null;
    }

    case "interactive": {
      const interactive = msg["interactive"] as
        | {
            type: string;
            button_reply?: { title: string };
            list_reply?: { title: string };
          }
        | undefined;
      if (!interactive) return null;
      if (interactive.type === "button_reply") {
        return interactive.button_reply?.title ?? null;
      }
      if (interactive.type === "list_reply") {
        return interactive.list_reply?.title ?? null;
      }
      return null;
    }

    case "button": {
      const button = msg["button"] as { text?: string } | undefined;
      return button?.text ?? null;
    }

    default:
      return null;
  }
}

function mapMessageType(
  metaType: string,
): "TEXT" | "TEMPLATE" | "INTERACTIVE" | "MEDIA" | "SYSTEM" {
  switch (metaType) {
    case "text":
      return "TEXT";
    case "interactive":
    case "button":
      return "INTERACTIVE";
    case "image":
    case "audio":
    case "video":
    case "document":
    case "sticker":
      return "MEDIA";
    default:
      return "SYSTEM";
  }
}
