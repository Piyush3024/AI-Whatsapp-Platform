import type { Job } from "bullmq";
import { createJobLogger } from "../lib/logger.js";
import { withTenantContext } from "../lib/prisma.js";
import { env } from "../config/env.js";
import type {
  OutboundMessageJob,
  WhatsAppTestMessageJob,
} from "../types/job-payloads.js";

// ============================================================
// WHATSAPP OUTBOUND PROCESSOR
//
// Steps:
// 1. WhatsApp number se access token fetch karo (DB se)
// 2. Meta Graph API POST call karo
// 3. WAMID (Meta message ID) DB mein store karo
// 4. Message status SENT update karo
// 5. Error pe FAILED mark karo
//
// Rate limits (Meta official docs):
// - Default: ~80 messages/second
// - 429 pe BullMQ exponential backoff retry karega (API side set hai)
//
// 24-hour window rule:
// - Free-form text: sirf 24h customer service window mein
// - Template: window ke bahar bhi (reminders/follow_ups mein)
// - Yahan sirf text type handle karte hain — template Phase 3 mein
//
// API Version: v23.0 (latest confirmed Feb 2026)
// ============================================================

const GRAPH_API_VERSION = "v23.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Meta API response types
interface MetaSendMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>; // WAMID
}

interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

export async function processOutboundMessage(
  job: Job<OutboundMessageJob | WhatsAppTestMessageJob>,
): Promise<void> {
  // Route based on job name
  if (job.name === "send-test-message") {
    await processTestMessage(job as Job<WhatsAppTestMessageJob>);
    return;
  }
  await processOutbound(job as Job<OutboundMessageJob>);
}

async function processOutbound(job: Job<OutboundMessageJob>): Promise<void> {
  const {
    tenantId,
    conversationId,
    messageId,
    phoneNumberId,
    toPhone,
    content,
    messageType,
    templateName,
    templateParams,
  } = job.data;

  const log = createJobLogger("whatsapp-outbound", job.id, tenantId);

  log.info(
    { messageId, toPhone, messageType, phoneNumberId },
    "Processing outbound message",
  );

  // ── Step 1: WhatsApp access token fetch karo ──────────────────────────
  // Har tenant ka apna WhatsApp number + access token ho sakta hai
  // Isliye DB se fetch karte hain — env se nahi
  // Note: Phase 2 mein hum WHATSAPP_ACCESS_TOKEN env use karenge (single number)
  // Phase 3 mein per-tenant token support add karenge
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;

  // ── Step 2: Message payload build karo ───────────────────────────────
  let messagePayload: Record<string, unknown>;

  if (messageType === "text") {
    messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toPhone,
      type: "text",
      text: {
        preview_url: false, // URL preview off — faster delivery
        body: content,
      },
    };
  } else if (messageType === "template" && templateName) {
    // Template message — Phase 3 mein fully implement hoga
    // Basic support abhi
    messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components:
          templateParams && templateParams.length > 0
            ? [
                {
                  type: "body",
                  parameters: templateParams.map((p) => ({
                    type: "text",
                    text: p,
                  })),
                },
              ]
            : [],
      },
    };
  } else {
    throw new Error(
      `Unsupported message type: ${messageType}. ` +
        `Only 'text' and 'template' supported in Phase 2.`,
    );
  }

  // ── Step 3: Meta Graph API call ───────────────────────────────────────
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  let wamid: string;
  let apiCallFailed = false;
  let failureReason = "";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(messagePayload),
    });

    const responseBody = (await response.json()) as
      | MetaSendMessageResponse
      | MetaErrorResponse;

    if (!response.ok) {
      // Meta API error
      const errorBody = responseBody as MetaErrorResponse;
      const errorCode = errorBody.error?.code;
      const errorMessage = errorBody.error?.message ?? "Unknown Meta API error";

      log.error(
        {
          statusCode: response.status,
          errorCode,
          errorMessage,
          messageId,
          toPhone,
        },
        "Meta API returned error",
      );

      // 429 = rate limit — BullMQ retry handle karega
      if (response.status === 429) {
        throw new Error(
          `Meta API rate limited (429) — will retry. Message: ${errorMessage}`,
        );
      }

      // 5xx = Meta server error — retry
      if (response.status >= 500) {
        throw new Error(
          `Meta API server error (${response.status}) — will retry. Message: ${errorMessage}`,
        );
      }

      // 4xx (except 429) = client error — likely permanent
      // Mark FAILED, don't retry (BullMQ will still retry per job config)
      apiCallFailed = true;
      failureReason = `Meta API error ${errorCode}: ${errorMessage}`;
    } else {
      // Success
      const successBody = responseBody as MetaSendMessageResponse;
      wamid = successBody.messages?.[0]?.id ?? "";

      if (!wamid) {
        log.warn(
          { messageId, responseBody },
          "WAMID missing in Meta API response",
        );
      }

      log.info(
        { messageId, wamid, toPhone },
        "Message sent successfully to Meta API",
      );
    }
  } catch (err) {
    // Network error ya throw se — BullMQ retry karega
    if (!apiCallFailed) {
      log.error(
        { err, messageId, toPhone },
        "Meta API call failed — will retry",
      );
      throw err;
    }
  }

  // ── Step 4: DB status update karo ────────────────────────────────────
  await withTenantContext(tenantId, async (tx) => {
    if (apiCallFailed) {
      // FAILED mark karo
      await tx.message.update({
        where: { id: messageId },
        data: {
          status: "FAILED",
          metadata: {
            error: failureReason,
            failedAt: new Date().toISOString(),
          },
        },
      });

      log.warn({ messageId, failureReason }, "Message marked as FAILED in DB");
    } else {
      // SENT mark karo + WAMID store karo
      await tx.message.update({
        where: { id: messageId },
        data: {
          status: "SENT",
          // WAMID metaMessageId mein store karo — webhook status updates match karein
          metaMessageId: wamid!,
          metadata: {
            sentAt: new Date().toISOString(),
            wamid: wamid!,
          },
        },
      });

      log.info(
        { messageId, wamid: wamid!, conversationId },
        "Message status updated to SENT",
      );
    }
  });

  // Agar failed — throw karo taaki BullMQ job failed mark kare
  if (apiCallFailed) {
    throw new Error(`Message send failed permanently: ${failureReason}`);
  }
}

// ============================================================
// TEST MESSAGE HANDLER
// Sends verification test message — no DB logging
// ============================================================

interface TestMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface TestErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

async function processTestMessage(
  job: Job<WhatsAppTestMessageJob>,
): Promise<{ wamid: string }> {
  const { tenantId, phoneNumberId, recipientPhone, message } = job.data;
  const log = createJobLogger("whatsapp-outbound", job.id, tenantId);

  log.info({ phoneNumberId, recipientPhone }, "Sending test message");

  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  const responseBody = (await response.json()) as
    | TestMessageResponse
    | TestErrorResponse;

  if (!response.ok) {
    const errorBody = responseBody as TestErrorResponse;
    const errorMessage = errorBody.error?.message ?? "Unknown error";

    log.error(
      { statusCode: response.status, errorMessage },
      "Test message failed",
    );

    throw new Error(`Failed to send test message: ${errorMessage}`);
  }

  const successBody = responseBody as TestMessageResponse;
  const wamid = successBody.messages?.[0]?.id ?? "";

  log.info({ wamid, recipientPhone }, "Test message sent successfully");

  return { wamid };
}
