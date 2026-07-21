-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "cuentaFleteId" TEXT;

-- CreateIndex
CREATE INDEX "Pedido_cuentaFleteId_idx" ON "Pedido"("cuentaFleteId");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_cuentaFleteId_fkey" FOREIGN KEY ("cuentaFleteId") REFERENCES "Cuenta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
