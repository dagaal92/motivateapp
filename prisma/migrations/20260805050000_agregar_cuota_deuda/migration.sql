-- CreateTable
CREATE TABLE "CuotaDeuda" (
    "id" TEXT NOT NULL,
    "deudaId" TEXT NOT NULL,
    "numeroCuota" TEXT NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "capital" INTEGER NOT NULL,
    "interes" INTEGER NOT NULL,
    "otros" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuotaDeuda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CuotaDeuda_deudaId_idx" ON "CuotaDeuda"("deudaId");

-- AddForeignKey
ALTER TABLE "CuotaDeuda" ADD CONSTRAINT "CuotaDeuda_deudaId_fkey" FOREIGN KEY ("deudaId") REFERENCES "Deuda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: cronograma real de Sistecrédito
INSERT INTO "CuotaDeuda" ("id","deudaId","numeroCuota","fechaVencimiento","capital","interes","otros","total","pagada","creadoEn")
VALUES
  ('cuota_sistecredito_inicial', 'deuda_seed_sistecredito', 'Inicial', TIMESTAMP '2026-05-22', 0, 0, 0, 0, true, CURRENT_TIMESTAMP),
  ('cuota_sistecredito_1', 'deuda_seed_sistecredito', '1', TIMESTAMP '2026-06-22', 199290, 25894, 29963, 255147, true, CURRENT_TIMESTAMP),
  ('cuota_sistecredito_2', 'deuda_seed_sistecredito', '2', TIMESTAMP '2026-07-22', 203389, 21795, 29963, 255147, false, CURRENT_TIMESTAMP),
  ('cuota_sistecredito_3', 'deuda_seed_sistecredito', '3', TIMESTAMP '2026-08-22', 207572, 17612, 29963, 255147, false, CURRENT_TIMESTAMP),
  ('cuota_sistecredito_4', 'deuda_seed_sistecredito', '4', TIMESTAMP '2026-09-22', 211842, 13342, 29963, 255147, false, CURRENT_TIMESTAMP),
  ('cuota_sistecredito_5', 'deuda_seed_sistecredito', '5', TIMESTAMP '2026-10-22', 216199, 8985, 29963, 255147, false, CURRENT_TIMESTAMP),
  ('cuota_sistecredito_6', 'deuda_seed_sistecredito', '6', TIMESTAMP '2026-11-22', 220648, 4538, 29962, 255148, false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
