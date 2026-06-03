import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

interface PlanLimits {
  maxMessages?: number;
  [key: string]: unknown;
}

export async function isMessageLimitExceeded(
  tenantId: string,
): Promise<boolean> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    let maxMessages: number;

    if (!subscription) {
      // Trial tenant — conservative default
      maxMessages = 100;
    } else {
      const limits = subscription.plan.limits as PlanLimits;
      if (limits.maxMessages == null) return false; // unlimited
      maxMessages = limits.maxMessages;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const aggregate = await prisma.dailyUsageAggregate.findUnique({
      where: { tenantId_date: { tenantId, date: today } },
      select: { messagesOut: true },
    });

    const used = aggregate?.messagesOut ?? 0;
    const exceeded = used >= maxMessages;

    if (exceeded) {
      logger.warn(
        { tenantId, used, limit: maxMessages },
        "Daily message limit exceeded — skipping outbound send",
      );
    }

    return exceeded;
  } catch (err) {
    logger.error(
      { err, tenantId },
      "Failed to check message limit — failing open",
    );
    return false;
  }
}
