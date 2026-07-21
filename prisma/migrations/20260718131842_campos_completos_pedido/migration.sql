-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "departamento" TEXT,
ADD COLUMN     "envio" TEXT,
ADD COLUMN     "general" TEXT,
ADD COLUMN     "ingresoDinero" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "numeroGuia" TEXT,
ADD COLUMN     "numeroOrden" TEXT,
ADD COLUMN     "prioridad" TEXT,
ADD COLUMN     "transportadora" TEXT,
ALTER COLUMN "cliente" DROP NOT NULL,
ALTER COLUMN "direccion" DROP NOT NULL,
ALTER COLUMN "ciudad" DROP NOT NULL,
ALTER COLUMN "producto" DROP NOT NULL,
ALTER COLUMN "cantidad" DROP NOT NULL,
ALTER COLUMN "cantidad" DROP DEFAULT,
ALTER COLUMN "valorTotal" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "ProductoPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "color" TEXT,
    "referencia" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FletePedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,
    "observacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FletePedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcionMaestra" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpcionMaestra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductoPedido_pedidoId_idx" ON "ProductoPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "FletePedido_pedidoId_idx" ON "FletePedido"("pedidoId");

-- CreateIndex
CREATE INDEX "OpcionMaestra_categoria_idx" ON "OpcionMaestra"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "OpcionMaestra_categoria_valor_key" ON "OpcionMaestra"("categoria", "valor");

-- AddForeignKey
ALTER TABLE "ProductoPedido" ADD CONSTRAINT "ProductoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FletePedido" ADD CONSTRAINT "FletePedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
