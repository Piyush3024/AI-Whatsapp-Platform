import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

interface PlanLimits {
  maxMessages?: number;
  [key: string]: unknown;
}

/**
 * Returns true if the tenant has exceeded their daily outbound message limit.
 * Used by the whatsapp-outbound processor before sending to Meta API.
 * Does NOT throw — returns a boolean so the processor decides what to do.
 */
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
    // Fail open — if we can't check the limit, allow the message through
    // to avoid blocking legitimate messages due to DB issues
    logger.error(
      { err, tenantId },
      "Failed to check message limit — failing open",
    );
    return false;
  }
}
