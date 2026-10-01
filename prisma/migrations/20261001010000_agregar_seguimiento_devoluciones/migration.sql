-- AlterTable
-- IF NOT EXISTS por si acaso: al no haber base de datos separada para vista
-- previa, dos deploys pueden intentar esta migración casi al mismo tiempo.
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "devueltoEn" TIMESTAMP(3);
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "devolucionRecibidaEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Pedido_devolucionRecibidaEn_idx" ON "Pedido"("devolucionRecibidaEn");
