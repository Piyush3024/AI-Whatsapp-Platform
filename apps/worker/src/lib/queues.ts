import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { QUEUE_NAMES } from "../constants/queues.js";
import type { AiReplyJob, OutboundMessageJob } from "../types/job-payloads.js";
import type {
  RemindersQueuePayload,
  FollowUpJob,
} from "../types/job-payloads.js";

// ============================================================
// OUTBOUND QUEUE INSTANCES
//
// Worker processors in queues se consume karte hain,
// lekin downstream queues mein push bhi karte hain.
//
// Example: whatsapp-inbound processor → ai-reply queue mein push
//          ai-reply processor → whatsapp-outbound queue mein push
//
// IMPORTANT: Queue (producer) ke liye alag Redis connection —
// maxRetriesPerRequest default (20) rakho, null nahi.
// Queue fast-fail chahta hai agar Redis down ho.
// Worker connection (null) alag hai — woh forever wait karta hai.
//
// Ref: https://docs.bullmq.io/guide/connections
// ============================================================

// Producer-specific Redis connection — Queue ke liye
const producerRedis = new Redis(env.REDIS_URL, {
  // Default maxRetriesPerRequest (20) — Queue fast-fail kare Redis down pe
  // DO NOT set null here — that's only for Worker connections
  maxRetriesPerRequest: 20,
  enableOfflineQueue: false, // Queue calls fail fast when Redis is down
});

producerRedis.on("error", (err: Error) => {
  // Log karo but don't crash — producer errors recoverable hain
  console.error("[queues] Producer Redis error:", err.message);
});

// ── ai-reply queue ────────────────────────────────────────────────────────
export const aiReplyQueue = new Queue<AiReplyJob>(QUEUE_NAMES.AI_REPLY, {
  connection: producerRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2_000, // 2s, 4s, 8s
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days — debugging ke liye
    },
  },
});

// ── whatsapp-outbound queue ───────────────────────────────────────────────
export const outboundQueue = new Queue<OutboundMessageJob>(
  QUEUE_NAMES.WHATSAPP_OUTBOUND,
  {
    connection: producerRedis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2_000,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  },
);

// ── reminders queue ───────────────────────────────────────────────────────
export const remindersQueue = new Queue<RemindersQueuePayload>(
  QUEUE_NAMES.REMINDERS,
  {
    connection: producerRedis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2_000,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  },
);

// ── follow_ups queue ──────────────────────────────────────────────────────
export const followUpsQueue = new Queue<FollowUpJob>(QUEUE_NAMES.FOLLOW_UPS, {
  connection: producerRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2_000,
    },
    removeOnComplete: { age: 24 * 3600 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

// ── Graceful close ────────────────────────────────────────────────────────
export async function closeQueues(): Promise<void> {
  await aiReplyQueue.close();
  await outboundQueue.close();
  await remindersQueue.close();
  await followUpsQueue.close();
  await producerRedis.quit();
}
