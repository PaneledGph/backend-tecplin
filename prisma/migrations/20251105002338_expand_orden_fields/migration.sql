-- AlterTable
ALTER TABLE "orden" ADD COLUMN     "costoEstimado" DOUBLE PRECISION,
ADD COLUMN     "costoFinal" DOUBLE PRECISION,
ADD COLUMN     "emailContacto" TEXT,
ADD COLUMN     "horarioPreferido" TEXT,
ADD COLUMN     "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "materialesRequeridos" TEXT,
ADD COLUMN     "nombreContacto" TEXT,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "telefonoContacto" TEXT,
ADD COLUMN     "tiempoEstimadoHoras" INTEGER,
ADD COLUMN     "ubicacionLatitud" DOUBLE PRECISION,
ADD COLUMN     "ubicacionLongitud" DOUBLE PRECISION;
