import type { Job } from "bullmq";
import { createJobLogger } from "../lib/logger.js";
import { withTenantContext, type TenantTxClient } from "../lib/prisma.js";
import { aiReplyQueue } from "../lib/queues.js";
import type { InboundMessageJob, AiReplyJob } from "../types/job-payloads.js";

// ============================================================
// WHATSAPP INBOUND PROCESSOR
//
// Steps:
// 1. phoneNumberId → tenantId resolve (no RLS needed — WhatsAppNumber lookup)
// 2. RLS context set via withTenantContext
// 3. Customer upsert (phone se find ya create)
// 4. Conversation find ya create (active = last 24h)
// 5. Message save (metaMessageId = idempotency key)
// 6. ai-reply queue mein push
//
// Idempotency:
// Message.metaMessageId @unique hai schema mein —
// duplicate webhook delivery pe upsert silently skip karega
//
// Text-only Phase 2:
// image/audio/document/location = log + skip (Phase 3 mein handle hoga)
// ============================================================

// Supported message types jo AI reply de sakta hai
const AI_SUPPORTED_TYPES = new Set(["text", "interactive", "button"]);

// Active conversation window — 24 hours
const CONVERSATION_ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function processInboundMessage(
  job: Job<InboundMessageJob>,
): Promise<void> {
  const { phoneNumberId, wabaId, message, senderPhone, senderName, timestamp } =
    job.data;

  // Temporary logger — tenantId abhi nahi pata
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

  // ── Step 1: phoneNumberId → tenantId resolve ──────────────────────────
  // WhatsApp number table mein lookup — RLS bypass karke (system-level query)
  // Kyun system query? WhatsAppNumber lookup tenant context se pehle hota hai
  // isliye empty string tenant context use karte hain

  let tenantId: string;
  let whatsappNumberDbId: string;

  try {
    const result = await withTenantContext("", async (tx) => {
      // RLS policies check karte hain app.current_tenant_id
      // Empty string = system context = RLS bypass for this lookup
      // Note: WhatsAppNumber.phoneNumber = display number, yahan phoneNumberId (Meta ID) se match karein
      return tx.whatsAppNumber.findFirst({
        where: {
          // Meta's phone_number_id stored in phoneNumberId field
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
      // Unknown phoneNumberId — yeh number humari DB mein nahi hai
      // Job fail karo — retry nahi chahiye (permanent failure)
      throw new Error(
        `No active WhatsAppNumber found for phoneNumberId: ${phoneNumberId}. ` +
          `Tenant onboarding incomplete ya unknown webhook source.`,
      );
    }

    tenantId = result.tenantId;
    whatsappNumberDbId = result.id;
  } catch (err) {
    baseLog.error(
      { err, phoneNumberId },
      "Failed to resolve tenant from phoneNumberId",
    );
    throw err; // BullMQ retry karega
  }

  // Ab tenant-aware logger banao
  const log = createJobLogger("whatsapp-inbound", job.id, tenantId);

  log.info({ tenantId, whatsappNumberDbId }, "Tenant resolved");

  // ── Step 2-6: Tenant context ke andar sab operations ─────────────────
  await withTenantContext(tenantId, async (tx) => {
    // ── Step 2: Customer upsert ──────────────────────────────────────────
    // phone se find karo, nahi mila toh create karo
    // tenantId + phone = unique constraint schema mein

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
        optInStatus: "OPTED_IN", // WhatsApp se message aaya = opted in
      },
      update: {
        // Name update karo agar pehle nahi tha
        ...(senderName && { name: senderName }),
        whatsappId: message.from,
        // optInStatus change nahi karo — customer ne manually opt-out kiya ho sakta hai
      },
      select: {
        id: true,
        name: true,
        optInStatus: true,
      },
    });

    log.info({ customerId: customer.id }, "Customer upserted");

    // Opt-out check — opted-out customer ko AI reply nahi dena
    if (customer.optInStatus === "OPTED_OUT") {
      log.warn(
        { customerId: customer.id, senderPhone },
        "Customer is opted out — skipping AI reply",
      );
      // Message save karo but ai-reply push mat karo
      await saveMessage(
        tx,
        tenantId,
        null,
        message,
        senderPhone,
        timestamp,
        log,
      );
      return;
    }

    // ── Step 3: Conversation find ya create ───────────────────────────────
    // Active conversation = last 24h mein same customer + whatsappNumber
    const activeConversationCutoff = new Date(
      Date.now() - CONVERSATION_ACTIVE_WINDOW_MS,
    );

    let conversation = await tx.conversation.findFirst({
      where: {
        tenantId,
        customerId: customer.id,
        whatsappNumberId: whatsappNumberDbId,
        // Human handoff mein nahi hai
        state: { not: "HUMAN_HANDOFF" },
        // 24h ke andar updated
        updatedAt: { gte: activeConversationCutoff },
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, state: true },
    });

    if (!conversation) {
      // Naya conversation start karo
      conversation = await tx.conversation.create({
        data: {
          tenantId,
          customerId: customer.id,
          whatsappNumberId: whatsappNumberDbId,
          state: "GREETING", // Naya conversation = greeting state
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

    // ── Step 4: Message save ──────────────────────────────────────────────
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
      // Duplicate message — already processed
      log.warn(
        { metaMessageId: message.id },
        "Duplicate message detected — skipping ai-reply push",
      );
      return;
    }

    // ── Step 5: AI reply queue mein push ─────────────────────────────────
    // Sirf supported types ke liye
    if (!AI_SUPPORTED_TYPES.has(message.type)) {
      log.info(
        { messageType: message.type, messageId: savedMessage.id },
        "Message type not supported for AI reply — skipping",
      );
      return;
    }

    // Message content extract karo
    const inboundContent = extractMessageContent(message);

    if (!inboundContent) {
      log.warn(
        { messageType: message.type },
        "Could not extract text content — skipping AI reply",
      );
      return;
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

    await aiReplyQueue.add("generate-ai-reply", aiReplyJob);

    log.info(
      {
        conversationId: conversation.id,
        messageId: savedMessage.id,
        contentLength: inboundContent.length,
      },
      "AI reply job enqueued",
    );
  });
}

// ============================================================
// HELPER: Message DB mein save karo
// metaMessageId @unique — duplicate pe null return karta hai
// ============================================================

async function saveMessage(
  tx: TenantTxClient,
  tenantId: string,
  conversationId: string | null,
  message: InboundMessageJob["message"],
  senderPhone: string,
  timestamp: string,
  log: ReturnType<typeof createJobLogger>,
): Promise<{ id: string } | null> {
  // Pehle check karo duplicate nahi hai
  const existing = await tx.message.findFirst({
    where: { metaMessageId: message.id },
    select: { id: true },
  });

  if (existing) {
    return null; // Duplicate — skip
  }

  // Naya message create karo
  const content = extractMessageContent(message);

  const saved = await tx.message.create({
    data: {
      tenantId,
      conversationId: conversationId ?? "", // Conversation nahi hai toh empty (opted-out case)
      messageType: mapMessageType(message.type),
      direction: "inbound",
      content,
      status: "DELIVERED", // Meta ne deliver kar diya — hum receive kar liye
      metaMessageId: message.id,
      metadata: {
        from: senderPhone,
        timestamp,
        type: message.type,
        // Raw message store karo debugging ke liye
        raw: JSON.parse(JSON.stringify(message)),
      },
    },
    select: { id: true },
  });

  log.info({ messageId: saved.id, metaMessageId: message.id }, "Message saved");

  return saved;
}

// ============================================================
// HELPER: Message content extract karo (text/interactive)
// ============================================================

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
