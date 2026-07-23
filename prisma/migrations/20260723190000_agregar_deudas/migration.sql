-- CreateEnum
CREATE TYPE "EstadoDeuda" AS ENUM ('ACTIVA', 'PAGADA');

-- CreateTable
CREATE TABLE "Deuda" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "entidad" TEXT,
    "montoTotal" INTEGER NOT NULL,
    "saldoPendiente" INTEGER NOT NULL,
    "cuotaMensual" INTEGER,
    "diaPago" INTEGER NOT NULL,
    "cuentaId" TEXT,
    "estado" "EstadoDeuda" NOT NULL DEFAULT 'ACTIVA',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deuda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoDeuda" (
    "id" TEXT NOT NULL,
    "deudaId" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "movimientoId" TEXT,
    "monto" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoDeuda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deuda_estado_idx" ON "Deuda"("estado");

-- CreateIndex
CREATE INDEX "Deuda_cuentaId_idx" ON "Deuda"("cuentaId");

-- CreateIndex
CREATE UNIQUE INDEX "PagoDeuda_movimientoId_key" ON "PagoDeuda"("movimientoId");

-- CreateIndex
CREATE INDEX "PagoDeuda_deudaId_idx" ON "PagoDeuda"("deudaId");

-- CreateIndex
CREATE INDEX "PagoDeuda_cuentaId_idx" ON "PagoDeuda"("cuentaId");

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeuda" ADD CONSTRAINT "PagoDeuda_deudaId_fkey" FOREIGN KEY ("deudaId") REFERENCES "Deuda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeuda" ADD CONSTRAINT "PagoDeuda_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoDeuda" ADD CONSTRAINT "PagoDeuda_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: deudas reales iniciales (Sistecrédito + 2 créditos Bancolombia)
INSERT INTO "Deuda" ("id","nombre","entidad","montoTotal","saldoPendiente","cuotaMensual","diaPago","cuentaId","estado","notas","creadoEn","actualizadoEn")
VALUES
  (
    'deuda_seed_sistecredito',
    'Sistecrédito',
    'Sistecrédito',
    1530883,
    1530883,
    255147,
    22,
    NULL,
    'ACTIVA',
    'Crédito por $1.258.940 a 6 cuotas desde el 22/05/2026 (cuota inicial en 0). La cuota 6 es de $255.148, el resto de $255.147. Ninguna cuota quedó marcada como pagada: regístralas con "Registrar pago" a medida que las hayas cubierto.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'deuda_seed_bancolombia_8137',
    'Crédito de Consumo Bancolombia ...8137',
    'Bancolombia',
    22000000,
    20782258,
    NULL,
    24,
    (SELECT id FROM "Cuenta" WHERE nombre = 'Bancolombia' LIMIT 1),
    'ACTIVA',
    'Personal tasa fija s.desempleo (06140118137). Desembolso 24/11/2025 por $22.000.000. Plazo 60 meses, tasa 21,56% E.A. Seguros: desempleo $61.776, vida deudor $30.518. La cuota mensual fija no aparecía en la captura: complétala desde "Editar" cuando la confirmes en el extracto.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'deuda_seed_bancolombia_8528',
    'Crédito de Consumo Bancolombia ...8528',
    'Bancolombia',
    15000000,
    14389864,
    NULL,
    6,
    (SELECT id FROM "Cuenta" WHERE nombre = 'Bancolombia' LIMIT 1),
    'ACTIVA',
    'Personal tasa fija s.desempleo (06140118528). Desembolso 6/01/2026 por $15.000.000. Plazo 60 meses, tasa 24,60% E.A. Seguros: desempleo $42.120, vida deudor $12.197. La cuota mensual fija no aparecía en la captura: complétala desde "Editar" cuando la confirmes en el extracto.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO NOTHING;
