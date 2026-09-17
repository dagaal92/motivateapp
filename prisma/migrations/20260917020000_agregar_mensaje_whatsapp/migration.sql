-- CreateEnum
CREATE TYPE "DireccionMensaje" AS ENUM ('RECIBIDO', 'ENVIADO');

-- CreateTable
CREATE TABLE "MensajeWhatsapp" (
    "id" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" "DireccionMensaje" NOT NULL,
    "tipo" TEXT NOT NULL,
    "contenido" TEXT,
    "wamid" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeWhatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MensajeWhatsapp_wamid_key" ON "MensajeWhatsapp"("wamid");

-- CreateIndex
CREATE INDEX "MensajeWhatsapp_telefono_creadoEn_idx" ON "MensajeWhatsapp"("telefono", "creadoEn");
