-- CreateTable
CREATE TABLE "AssistantIntentStats" (
    "id" SERIAL NOT NULL,
    "intent" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "scoreSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantIntentStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssistantIntentStats_intent_key" ON "AssistantIntentStats"("intent");
