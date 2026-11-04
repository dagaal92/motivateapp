-- AlterTable
-- IF NOT EXISTS por si acaso: al no haber base de datos separada para vista
-- previa, dos deploys pueden intentar esta migración casi al mismo tiempo.
ALTER TABLE "Movimiento" ADD COLUMN IF NOT EXISTS "fecha" TIMESTAMP(3);
ALTER TABLE "Movimiento" ADD COLUMN IF NOT EXISTS "afectaSaldo" BOOLEAN NOT NULL DEFAULT true;

-- Para los movimientos existentes no había forma de elegir una fecha
-- distinta a "ahora", así que "fecha" coincide con "creadoEn".
UPDATE "Movimiento" SET "fecha" = "creadoEn" WHERE "fecha" IS NULL;

ALTER TABLE "Movimiento" ALTER COLUMN "fecha" SET DEFAULT now();
ALTER TABLE "Movimiento" ALTER COLUMN "fecha" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Movimiento_fecha_idx" ON "Movimiento"("fecha");
