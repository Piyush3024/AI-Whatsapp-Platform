import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { QUEUE_NAMES } from "../constants/queues.js";
import type {
  AiReplyJob,
  OutboundMessageJob,
  EmbeddingJob,
  HumanHandoffNotifyJob,
  RemindersQueuePayload,
  FollowUpJob,
} from "../types/job-payloads.js";

const producerRedis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 20,
  enableOfflineQueue: false,
});

producerRedis.on("error", (err: Error) => {
  console.error("[queues] Producer Redis error:", err.message);
});

export const aiReplyQueue = new Queue<AiReplyJob>(QUEUE_NAMES.AI_REPLY, {
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
});

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

export const embeddingsQueue = new Queue<EmbeddingJob>(QUEUE_NAMES.EMBEDDINGS, {
  connection: producerRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: { age: 24 * 3600 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

export const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, {
  connection: producerRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: { age: 24 * 3600 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

export const notificationsQueue = new Queue<HumanHandoffNotifyJob>(
  QUEUE_NAMES.NOTIFICATIONS,
  {
    connection: producerRedis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  },
);

export async function closeQueues(): Promise<void> {
  await aiReplyQueue.close();
  await outboundQueue.close();
  await remindersQueue.close();
  await analyticsQueue.close();
  await embeddingsQueue.close();
  await followUpsQueue.close();
  await notificationsQueue.close();
  await producerRedis.quit();
}
