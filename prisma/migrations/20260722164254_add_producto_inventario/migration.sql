-- AlterTable
ALTER TABLE "ProductoPedido" ADD COLUMN     "productoId" TEXT;

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "shopifyProductId" TEXT,
    "shopifyVariantId" TEXT,
    "nombre" TEXT NOT NULL,
    "variante" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Producto_shopifyVariantId_key" ON "Producto"("shopifyVariantId");

-- CreateIndex
CREATE INDEX "Producto_nombre_idx" ON "Producto"("nombre");

-- CreateIndex
CREATE INDEX "ProductoPedido_productoId_idx" ON "ProductoPedido"("productoId");

-- AddForeignKey
ALTER TABLE "ProductoPedido" ADD CONSTRAINT "ProductoPedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
