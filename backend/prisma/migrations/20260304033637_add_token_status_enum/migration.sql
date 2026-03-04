/*
  Warnings:

  - The `status` column on the `RefreshToken` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED');

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "status",
ADD COLUMN     "status" "TokenStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "RefreshToken_sessionId_idx" ON "RefreshToken"("sessionId");
