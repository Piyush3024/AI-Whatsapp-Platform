import type { Job } from "bullmq";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

const GRAPH_API_VERSION = "v23.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface MetaPhoneNumberResponse {
  id: string;
  display_phone_number: string;
  quality_rating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
}

interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

// Map Meta quality rating string to 0.0–1.0 float
function ratingToScore(rating: string): number {
  switch (rating) {
    case "GREEN":
      return 1.0;
    case "YELLOW":
      return 0.5;
    case "RED":
      return 0.1;
    default:
      return 0.0;
  }
}

export async function processQualityScoreJob(job: Job): Promise<void> {
  if (job.name !== "sync-quality-scores") {
    logger.warn(
      { jobName: job.name },
      "Unknown quality-score job name — skipping",
    );
    return;
  }

  logger.info("Starting WhatsApp quality score sync sweep");

  try {
    const numbers = await prisma.whatsAppNumber.findMany({
      where: {
        isActive: true,
        phoneNumberId: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        phoneNumberId: true,
        phoneNumber: true,
        qualityScore: true,
      },
    });

    if (numbers.length === 0) {
      logger.info("No active WhatsApp numbers to sync — skipping");
      return;
    }

    logger.info(
      { count: numbers.length },
      "Syncing quality scores for WhatsApp numbers",
    );

    let successCount = 0;
    let failCount = 0;

    for (const number of numbers) {
      try {
        const url = `${GRAPH_API_BASE}/${number.phoneNumberId}?fields=id,display_phone_number,quality_rating`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        const body = (await response.json()) as
          | MetaPhoneNumberResponse
          | MetaErrorResponse;

        if (!response.ok) {
          const errorBody = body as MetaErrorResponse;
          logger.warn(
            {
              phoneNumberId: number.phoneNumberId,
              phoneNumber: number.phoneNumber,
              statusCode: response.status,
              error: errorBody.error?.message,
            },
            "Meta API returned error for phone number — skipping",
          );
          failCount++;
          continue;
        }

        const successBody = body as MetaPhoneNumberResponse;
        const newScore = ratingToScore(successBody.quality_rating);

        if (newScore !== number.qualityScore) {
          await prisma.whatsAppNumber.update({
            where: { id: number.id },
            data: { qualityScore: newScore },
          });

          logger.info(
            {
              phoneNumberId: number.phoneNumberId,
              phoneNumber: number.phoneNumber,
              oldScore: number.qualityScore,
              newScore,
              rating: successBody.quality_rating,
            },
            "Quality score updated",
          );
        } else {
          logger.debug(
            {
              phoneNumberId: number.phoneNumberId,
              score: newScore,
            },
            "Quality score unchanged — skipping update",
          );
        }

        successCount++;

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        logger.error(
          {
            err,
            phoneNumberId: number.phoneNumberId,
            phoneNumber: number.phoneNumber,
          },
          "Failed to sync quality score for number — continuing",
        );
        failCount++;
      }
    }

    logger.info(
      { total: numbers.length, successCount, failCount },
      "Quality score sync sweep complete",
    );
  } catch (err) {
    logger.error({ err }, "Quality score sync sweep failed");
    throw err;
  }
}
