import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// ============================================================
// REDIS CONNECTION FOR BULLMQ WORKERS
//
// CRITICAL RULES (official BullMQ docs se):
// 1. maxRetriesPerRequest: null — MANDATORY for Workers
//    Bina iske ioredis blocked commands pe exception throw karta hai
//    jo worker ko break kar deta hai
//
// 2. retryStrategy — exponential backoff
//    Official docs recommend: Math.max(Math.min(Math.exp(times), 20000), 1000)
//    Min: 1s, Max: 20s — Redis reconnect ke liye
//
// 3. Ek shared connection — multiple workers reuse karein
//    Redis connections ka overhead kam karne ke liye
//
// 4. DO NOT use keyPrefix — BullMQ apna prefix manage karta hai
// ============================================================

export const redisConnection = new Redis(env.REDIS_URL, {
  // MANDATORY for BullMQ workers — without this worker breaks
  maxRetriesPerRequest: null,

  // Exponential backoff — official BullMQ production docs se
  retryStrategy(times: number): number {
    const delay = Math.max(Math.min(Math.exp(times), 20000), 1000);
    logger.warn({ times, delay }, "Redis reconnecting...");
    return delay;
  },

  // Connection events logging
  lazyConnect: false,

  // Enable offline queue for workers — commands wait karte hain reconnect tak
  enableOfflineQueue: true,
});

// ============================================================
// CONNECTION EVENT HANDLERS
// Official docs: worker.on('error') + connection events mandatory
// ============================================================

redisConnection.on("connect", () => {
  logger.info("Redis connected");
});

redisConnection.on("ready", () => {
  logger.info("Redis ready");
});

redisConnection.on("error", (err: Error) => {
  // Log karo but don't crash — retryStrategy handle karega
  logger.error({ err }, "Redis connection error");
});

redisConnection.on("close", () => {
  logger.warn("Redis connection closed");
});

redisConnection.on("reconnecting", () => {
  logger.warn("Redis reconnecting...");
});

// ============================================================
// HEALTH CHECK
// Startup pe verify karo Redis reachable hai
// ============================================================

export async function checkRedisHealth(): Promise<void> {
  try {
    await redisConnection.ping();
    logger.info("Redis health check passed");
  } catch (err) {
    logger.error({ err }, "Redis health check failed");
    throw err;
  }
}

// ============================================================
// GRACEFUL CLOSE
// Shutdown ke waqt call karo
// ============================================================

export async function closeRedis(): Promise<void> {
  await redisConnection.quit();
  logger.info("Redis connection closed gracefully");
}
