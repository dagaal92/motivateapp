-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "nombre" TEXT,
    "email" TEXT,
    "ciudad" TEXT,
    "departamento" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_telefono_key" ON "Cliente"("telefono");
