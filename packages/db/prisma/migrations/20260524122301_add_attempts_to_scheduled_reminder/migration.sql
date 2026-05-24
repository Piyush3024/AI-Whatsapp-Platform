-- AlterTable
ALTER TABLE "scheduled_reminders" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;
