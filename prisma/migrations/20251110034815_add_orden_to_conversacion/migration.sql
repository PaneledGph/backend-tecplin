/*
  Warnings:

  - A unique constraint covering the columns `[ordenId]` on the table `conversacion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "conversacion" ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cerradoEn" TIMESTAMP(3),
ADD COLUMN     "ordenId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "conversacion_ordenId_key" ON "conversacion"("ordenId");

-- AddForeignKey
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "orden"("id") ON DELETE SET NULL ON UPDATE CASCADE;
