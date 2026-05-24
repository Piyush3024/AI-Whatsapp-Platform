/*
  Warnings:

  - Added the required column `message` to the `scheduled_reminders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "scheduled_reminders" ADD COLUMN     "message" TEXT NOT NULL;
