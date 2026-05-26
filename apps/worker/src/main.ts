import "./config/env.js";
import { processInboundMessage } from "./processors/whatsapp-inbound.processor.js";
import { processAiReply } from "./processors/ai-reply.processor.js";
import { processEmbedding } from "./processors/embeddings.processor.js";
import { processFollowUpJob } from "./processors/follow-ups.processor.js";
import type {
  InboundMessageJob,
  AiReplyJob,
  EmbeddingJob,
  FollowUpJob,
} from "./types/job-payloads.js";
import { processOutboundMessage } from "./processors/whatsapp-outbound.processor.js";
import type { OutboundMessageJob } from "./types/job-payloads.js";
import { closeQueues } from "./lib/queues.js";
import { Worker } from "bullmq";
import { redisConnection, checkRedisHealth, closeRedis } from "./lib/redis.js";
import { connectPrisma, disconnectPrisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";
import { QUEUE_NAMES } from "./constants/queues.js";
import {
  processReminderJob,
  type ReminderJobPayload,
} from "./processors/reminders.processor.js";
import { remindersQueue } from "./lib/queues.js";

process.on("uncaughtException", (err: Error) => {
  logger.error({ err }, "Uncaught exception — worker will exit");
  process.exit(1);
});

process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>) => {
    logger.error({ reason, promise }, "Unhandled rejection — worker will exit");
    process.exit(1);
  },
);

const workers: Worker[] = [];

function createWorkers(): Worker[] {
  const created: Worker[] = [];

  const placeholder = async (job: {
    id?: string;
    name: string;
    data: unknown;
  }) => {
    logger.info(
      { jobId: job.id, jobName: job.name },
      "Job received — processor not implemented yet",
    );
  };

  const inboundWorker = new Worker<InboundMessageJob>(
    QUEUE_NAMES.WHATSAPP_INBOUND,
    processInboundMessage,
    {
      connection: redisConnection,
      concurrency: 10,
    },
  );

  const aiReplyWorker = new Worker<AiReplyJob>(
    QUEUE_NAMES.AI_REPLY,
    processAiReply,
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  const outboundWorker = new Worker<OutboundMessageJob>(
    QUEUE_NAMES.WHATSAPP_OUTBOUND,
    processOutboundMessage,
    {
      connection: redisConnection,
      concurrency: 10,
    },
  );

  const remindersWorker = new Worker<ReminderJobPayload>(
    QUEUE_NAMES.REMINDERS,
    processReminderJob,
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  const followUpsWorker = new Worker<FollowUpJob>(
    QUEUE_NAMES.FOLLOW_UPS,
    processFollowUpJob,
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  const embeddingsWorker = new Worker<EmbeddingJob>(
    QUEUE_NAMES.EMBEDDINGS,
    processEmbedding,
    {
      connection: redisConnection,
      concurrency: 2,
    },
  );

  const analyticsWorker = new Worker(QUEUE_NAMES.ANALYTICS, placeholder, {
    connection: redisConnection,
    concurrency: 5,
  });

  created.push(
    inboundWorker,
    aiReplyWorker,
    outboundWorker,
    remindersWorker,
    followUpsWorker,
    embeddingsWorker,
    analyticsWorker,
  );

  return created;
}

function attachWorkerListeners(workerList: Worker[]): void {
  for (const worker of workerList) {
    const queueName = worker.name;
    worker.on("error", (err: Error) => {
      logger.error({ err, queue: queueName }, "Worker error");
    });

    worker.on("failed", (job, err: Error) => {
      logger.error(
        { jobId: job?.id, queue: queueName, err, attempts: job?.attemptsMade },
        "Job failed",
      );
    });

    worker.on("completed", (job) => {
      logger.info({ jobId: job.id, queue: queueName }, "Job completed");
    });

    worker.on("stalled", (jobId: string) => {
      logger.warn({ jobId, queue: queueName }, "Job stalled");
    });
  }
}

await remindersQueue.add(
  "sweep-due-reminders",
  { sweep: true },
  {
    repeat: { every: 60_000 },
    jobId: "sweeper-due-reminders",
    removeOnComplete: true,
    removeOnFail: false,
  },
);
logger.info("Reminders sweeper repeatable job registered");

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(
    { signal },
    "Shutdown signal received — starting graceful shutdown",
  );

  try {
    logger.info("Closing all workers...");
    await Promise.all(workers.map((w) => w.close()));
    logger.info("All workers closed");

    await closeQueues();

    await disconnectPrisma();

    await closeRedis();

    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during graceful shutdown — forcing exit");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  logger.info("Worker starting...");

  await checkRedisHealth();
  await connectPrisma();

  const created = createWorkers();
  workers.push(...created);

  attachWorkerListeners(workers);

  process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));

  logger.info(
    {
      workers: workers.map((w) => w.name),
      count: workers.length,
    },
    "All workers started successfully",
  );
}

main().catch((err: Error) => {
  logger.error({ err }, "Fatal error during worker startup");
  process.exit(1);
});
