-- CreateTable
CREATE TABLE "evidencia" (
    "id" SERIAL NOT NULL,
    "ordenid" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "mimetype" TEXT,
    "size" INTEGER,
    "userid" TEXT,
    "userrole" TEXT,
    "username" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversacion" (
    "id" SERIAL NOT NULL,
    "usuario1Id" INTEGER NOT NULL,
    "usuario2Id" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensaje" (
    "id" SERIAL NOT NULL,
    "conversacionId" INTEGER NOT NULL,
    "remitenteId" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leidoEn" TIMESTAMP(3),

    CONSTRAINT "mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidencia_ordenid_idx" ON "evidencia"("ordenid");

-- CreateIndex
CREATE INDEX "evidencia_timestamp_idx" ON "evidencia"("timestamp");

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_ordenid_fkey" FOREIGN KEY ("ordenid") REFERENCES "orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_usuario1Id_fkey" FOREIGN KEY ("usuario1Id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_usuario2Id_fkey" FOREIGN KEY ("usuario2Id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "conversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
