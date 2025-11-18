/*
  Warnings:

  - A unique constraint covering the columns `[intent,version]` on the table `AssistantIntentStats` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."AssistantIntentStats_intent_key";

-- AlterTable
ALTER TABLE "AssistantIntentStats" ADD COLUMN     "version" TEXT NOT NULL DEFAULT 'v1';

-- CreateIndex
CREATE UNIQUE INDEX "AssistantIntentStats_intent_version_key" ON "AssistantIntentStats"("intent", "version");
