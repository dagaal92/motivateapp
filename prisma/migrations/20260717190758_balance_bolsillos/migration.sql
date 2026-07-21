/*
  Warnings:

  - A unique constraint covering the columns `[shopifyOrderId]` on the table `Pedido` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'EGRESO');

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "shopifyOrderId" TEXT;

-- CreateTable
CREATE TABLE "Cuenta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "saldo" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "monto" INTEGER NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cuenta_nombre_key" ON "Cuenta"("nombre");

-- CreateIndex
CREATE INDEX "Movimiento_cuentaId_idx" ON "Movimiento"("cuentaId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_shopifyOrderId_key" ON "Pedido"("shopifyOrderId");

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
