-- CreateTable
CREATE TABLE "tecnico_ubicacion" (
    "tecnicoid" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "precision" DOUBLE PRECISION,
    "ordenid" INTEGER,
    "actualizadoen" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tecnico_ubicacion_pkey" PRIMARY KEY ("tecnicoid")
);

-- CreateTable
CREATE TABLE "tecnico_ubicacion_log" (
    "id" SERIAL NOT NULL,
    "tecnicoid" INTEGER NOT NULL,
    "ordenid" INTEGER,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "precision" DOUBLE PRECISION,
    "creadoen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tecnico_ubicacion_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tecnico_ubicacion_log_ordenid_idx" ON "tecnico_ubicacion_log"("ordenid");

-- CreateIndex
CREATE INDEX "tecnico_ubicacion_log_tecnicoid_creadoen_idx" ON "tecnico_ubicacion_log"("tecnicoid", "creadoen");

-- AddForeignKey
ALTER TABLE "tecnico_ubicacion" ADD CONSTRAINT "tecnico_ubicacion_tecnicoId_fkey" FOREIGN KEY ("tecnicoid") REFERENCES "tecnico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecnico_ubicacion" ADD CONSTRAINT "tecnico_ubicacion_ordenId_fkey" FOREIGN KEY ("ordenid") REFERENCES "orden"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecnico_ubicacion_log" ADD CONSTRAINT "tecnico_ubicacion_log_tecnicoId_fkey" FOREIGN KEY ("tecnicoid") REFERENCES "tecnico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecnico_ubicacion_log" ADD CONSTRAINT "tecnico_ubicacion_log_ordenId_fkey" FOREIGN KEY ("ordenid") REFERENCES "orden"("id") ON DELETE SET NULL ON UPDATE CASCADE;
