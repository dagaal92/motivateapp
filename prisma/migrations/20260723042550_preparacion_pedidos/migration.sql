-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "completadoEn" TIMESTAMP(3),
ADD COLUMN     "impreso" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Pedido_general_idx" ON "Pedido"("general");

-- CreateIndex
CREATE INDEX "Pedido_completadoEn_idx" ON "Pedido"("completadoEn");
