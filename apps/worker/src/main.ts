// ============================================================
// WORKER ENTRY POINT
//
// Boot sequence:
// 1. Env validation (Zod — fails fast if missing vars)
// 2. Redis health check
// 3. Prisma connect
// 4. Start all BullMQ workers
// 5. Attach SIGINT/SIGTERM handlers for graceful shutdown
//
// Graceful shutdown sequence:
// 1. Stop accepting new jobs (worker.close())
// 2. Wait for in-flight jobs to complete
// 3. Disconnect Prisma
// 4. Quit Redis
// 5. process.exit(0)
// ============================================================

import "../config/env.js"; // Validate env first — before anything else

import { Worker } from "bullmq";
import { redisConnection, checkRedisHealth, closeRedis } from "../lib/redis.js";
import { connectPrisma, disconnectPrisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { QUEUE_NAMES } from "../constants/queues.js";

// ============================================================
// UNHANDLED ERROR HANDLERS
// Official BullMQ production docs se — mandatory
// ============================================================

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

// ============================================================
// WORKER REGISTRY
// Phase 2 mein processors import karke yahan register honge
// Abhi placeholder processors hain — real logic Phase 2 mein
// ============================================================

const workers: Worker[] = [];

function createWorkers(): Worker[] {
  const created: Worker[] = [];

  // Placeholder processor — Phase 2 mein replace hoga
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

  // whatsapp-inbound worker
  const inboundWorker = new Worker(QUEUE_NAMES.WHATSAPP_INBOUND, placeholder, {
    connection: redisConnection,
    concurrency: 10, // 10 concurrent inbound messages
    // Retry config — 3 attempts, exponential backoff starting 2s
    // Note: retry config is set on Queue when adding jobs (API side)
    // Worker just processes — retry is queue-level config
  });

  // ai-reply worker — lower concurrency (OpenAI rate limits)
  const aiReplyWorker = new Worker(QUEUE_NAMES.AI_REPLY, placeholder, {
    connection: redisConnection,
    concurrency: 5,
  });

  // whatsapp-outbound worker
  const outboundWorker = new Worker(
    QUEUE_NAMES.WHATSAPP_OUTBOUND,
    placeholder,
    {
      connection: redisConnection,
      concurrency: 10,
    },
  );

  // reminders worker
  const remindersWorker = new Worker(QUEUE_NAMES.REMINDERS, placeholder, {
    connection: redisConnection,
    concurrency: 5,
  });

  // follow_ups worker
  const followUpsWorker = new Worker(QUEUE_NAMES.FOLLOW_UPS, placeholder, {
    connection: redisConnection,
    concurrency: 5,
  });

  // embeddings worker — heavy CPU/IO, low concurrency
  const embeddingsWorker = new Worker(QUEUE_NAMES.EMBEDDINGS, placeholder, {
    connection: redisConnection,
    concurrency: 2,
  });

  // analytics worker
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

// ============================================================
// ATTACH EVENT LISTENERS TO ALL WORKERS
// Official BullMQ docs: error listener MANDATORY
// Without it — worker silently stops processing on error
// ============================================================

function attachWorkerListeners(workerList: Worker[]): void {
  for (const worker of workerList) {
    const queueName = worker.name;

    // MANDATORY — without this worker stops processing on error
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

// ============================================================
// GRACEFUL SHUTDOWN
// Official BullMQ docs pattern — SIGINT + SIGTERM
// ============================================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(
    { signal },
    "Shutdown signal received — starting graceful shutdown",
  );

  try {
    // Step 1: Stop all workers from picking up new jobs
    // worker.close() waits for in-flight jobs to complete
    logger.info("Closing all workers...");
    await Promise.all(workers.map((w) => w.close()));
    logger.info("All workers closed");

    // Step 2: Disconnect Prisma
    await disconnectPrisma();

    // Step 3: Close Redis
    await closeRedis();

    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during graceful shutdown — forcing exit");
    process.exit(1);
  }
}

// ============================================================
// MAIN BOOT FUNCTION
// ============================================================

async function main(): Promise<void> {
  logger.info("🚀 Worker starting...");

  // Step 1: Redis health check
  await checkRedisHealth();

  // Step 2: Prisma connect
  await connectPrisma();

  // Step 3: Create and register all workers
  const created = createWorkers();
  workers.push(...created);

  // Step 4: Attach event listeners
  attachWorkerListeners(workers);

  // Step 5: Register shutdown handlers
  process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));

  logger.info(
    {
      workers: workers.map((w) => w.name),
      count: workers.length,
    },
    "✅ All workers started successfully",
  );
}

// Boot
main().catch((err: Error) => {
  logger.error({ err }, "Fatal error during worker startup");
  process.exit(1);
});
