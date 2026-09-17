-- CreateEnum
-- Envuelto en DO/EXCEPTION porque, al no haber una base de datos separada
-- para vista previa, dos deploys pueden intentar aplicar esta migración
-- casi al mismo tiempo contra la misma base real; sin esto, el segundo
-- fallaría con "type already exists" y bloquearía futuras migraciones.
DO $$ BEGIN
    CREATE TYPE "DireccionMensajeWhatsapp" AS ENUM ('RECIBIDO', 'ENVIADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MensajeWhatsapp" (
    "id" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" "DireccionMensajeWhatsapp" NOT NULL,
    "tipo" TEXT NOT NULL,
    "contenido" TEXT,
    "wamid" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeWhatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MensajeWhatsapp_wamid_key" ON "MensajeWhatsapp"("wamid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MensajeWhatsapp_telefono_creadoEn_idx" ON "MensajeWhatsapp"("telefono", "creadoEn");
