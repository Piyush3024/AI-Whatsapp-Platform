import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,

  retryStrategy(times: number): number {
    const delay = Math.max(Math.min(Math.exp(times), 20000), 1000);
    logger.warn({ times, delay }, "Redis reconnecting...");
    return delay;
  },

  lazyConnect: false,

  enableOfflineQueue: true,
});

redisConnection.on("connect", () => {
  logger.info("Redis connected");
});

redisConnection.on("ready", () => {
  logger.info("Redis ready");
});

redisConnection.on("error", (err: Error) => {
  logger.error({ err }, "Redis connection error");
});

redisConnection.on("close", () => {
  logger.warn("Redis connection closed");
});

redisConnection.on("reconnecting", () => {
  logger.warn("Redis reconnecting...");
});

export async function checkRedisHealth(): Promise<void> {
  try {
    await redisConnection.ping();
    logger.info("Redis health check passed");
  } catch (err) {
    logger.error({ err }, "Redis health check failed");
    throw err;
  }
}

export async function closeRedis(): Promise<void> {
  await redisConnection.quit();
  logger.info("Redis connection closed gracefully");
}
