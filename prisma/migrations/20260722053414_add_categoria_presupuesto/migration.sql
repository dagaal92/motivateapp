-- AlterTable
ALTER TABLE "Movimiento" ADD COLUMN     "categoria" TEXT;

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Presupuesto_anio_mes_idx" ON "Presupuesto"("anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_categoria_tipo_anio_mes_key" ON "Presupuesto"("categoria", "tipo", "anio", "mes");

-- CreateIndex
CREATE INDEX "Movimiento_categoria_idx" ON "Movimiento"("categoria");

-- Backfill: categorizar movimientos automáticos ya existentes (flete y venta)
UPDATE "Movimiento" SET "categoria" = 'Flete'
  WHERE "descripcion" ~ '^(Flete pedido|Reversión flete pedido|Reversión flete - pedido eliminado)';
UPDATE "Movimiento" SET "categoria" = 'Venta'
  WHERE "descripcion" ~ '^(Venta pedido|Reversión venta pedido)';
