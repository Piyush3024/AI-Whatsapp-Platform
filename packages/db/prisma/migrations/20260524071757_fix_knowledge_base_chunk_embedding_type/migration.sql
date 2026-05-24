/*
  Warnings:

  - The values [ACTIVE] on the enum `DocumentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `updatedAt` on the `knowledge_base_chunks` table. All the data in the column will be lost.
  - Made the column `embedding` on table `knowledge_base_chunks` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `checksum` to the `knowledge_base_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `knowledge_base_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `knowledge_base_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileType` to the `knowledge_base_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storagePath` to the `knowledge_base_documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentStatus_new" AS ENUM ('UPLOADING', 'PROCESSING', 'EMBEDDING', 'READY', 'ARCHIVED', 'FAILED');
ALTER TABLE "public"."knowledge_base_documents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "knowledge_base_documents" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TYPE "DocumentStatus" RENAME TO "DocumentStatus_old";
ALTER TYPE "DocumentStatus_new" RENAME TO "DocumentStatus";
DROP TYPE "public"."DocumentStatus_old";
ALTER TABLE "knowledge_base_documents" ALTER COLUMN "status" SET DEFAULT 'UPLOADING';
COMMIT;

-- AlterTable
ALTER TABLE "knowledge_base_chunks" DROP COLUMN "updatedAt",
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "tokenCount" INTEGER,
ALTER COLUMN "embedding" SET NOT NULL;

-- AlterTable
ALTER TABLE "knowledge_base_documents" ADD COLUMN     "checksum" TEXT NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "fileType" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "storagePath" TEXT NOT NULL,
ALTER COLUMN "fileUrl" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'UPLOADING';
