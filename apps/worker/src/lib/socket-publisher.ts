import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const publisher = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
});

publisher.on("error", (err: Error) => {
  logger.error({ err }, "Socket publisher Redis error");
});

export const SOCKET_CHANNEL = "socket:events";

export interface SocketEvent {
  type: "message:new" | "conversation:updated";
  tenantId: string;
  conversationId: string;
  message?: {
    id: string;
    content: string | null;
    direction: string;
    messageType: string;
    status: string;
    createdAt: string;
  };
}

export async function publishSocketEvent(event: SocketEvent): Promise<void> {
  try {
    await publisher.publish(SOCKET_CHANNEL, JSON.stringify(event));
  } catch (err) {
    logger.error({ err, event }, "Failed to publish socket event");
  }
}

export async function closeSocketPublisher(): Promise<void> {
  await publisher.quit();
}
