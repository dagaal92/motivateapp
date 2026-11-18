// Interpreta mensajes de WhatsApp del dueño con el formato fijo:
//   <ingreso|egreso> <monto> <cuenta> <categoria> [descripción libre]
// Ejemplo: "egreso 50000 nequi transporte gasolina moto"

const quitarAcentos = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const normalizar = (s: string) => quitarAcentos(s).toLowerCase().trim();

// Una palabra clave por categoría real (las de OpcionMaestra). Si agregas
// categorías nuevas en Maestros, agrega aquí su palabra clave para poder
// usarlas por WhatsApp.
const CATEGORIAS_GASTO: Record<string, string> = {
  ajuste: "Ajuste de saldo",
  alimentacion: "Alimentación",
  arriendo: "Arriendo y servicios",
  comisiones: "Comisiones pasarela de pago",
  confeccion: "Confección",
  flete: "Flete",
  personales: "Gastos personales",
  impuestos: "Impuestos y gastos bancarios",
  insumos: "Insumos e inventario",
  moda: "Moda y accesorios",
  nomina: "Nómina",
  obligaciones: "Obligaciones financieras",
  operativos: "Operativos",
  otros: "Otros gastos",
  prestamos: "Préstamos a terceros",
  publicidad: "Publicidad",
  snacks: "Snacks",
  telas: "Telas",
  transferencia: "Transferencia entre cuentas",
  transporte: "Transporte",
};

const CATEGORIAS_INGRESO: Record<string, string> = {
  ajuste: "Ajuste de saldo",
  inversion: "Inversión",
  otros: "Otros ingresos",
  transferencia: "Transferencia entre cuentas",
  venta: "Venta",
};

export type ComandoInterpretado = {
  tipo: "INGRESO" | "EGRESO";
  monto: number;
  cuentaId: string;
  cuentaNombre: string;
  categoria: string;
  descripcion: string | null;
};

export type ResultadoInterpretacion =
  | { ok: true; datos: ComandoInterpretado }
  | { ok: false, error: string };

function listaCategorias(tipo: "INGRESO" | "EGRESO") {
  return Object.keys(tipo === "EGRESO" ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO).join(", ");
}

/** true si el mensaje parece un intento de comando (para no responder a
 * cualquier mensaje casual que el dueño le mande al número del negocio). */
export function pareceComando(texto: string): boolean {
  const primera = normalizar(texto).split(/\s+/)[0];
  return primera === "ingreso" || primera === "egreso";
}

export function interpretarComando(
  texto: string,
  cuentas: { id: string; nombre: string }[]
): ResultadoInterpretacion {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const [tipoCrudo, montoCrudo, cuentaCrudo, categoriaCrudo, ...resto] = palabras;

  const tipoNorm = normalizar(tipoCrudo || "");
  if (tipoNorm !== "ingreso" && tipoNorm !== "egreso") {
    return { ok: false, error: 'El primer dato debe ser "ingreso" o "egreso".' };
  }
  const tipo: "INGRESO" | "EGRESO" = tipoNorm === "ingreso" ? "INGRESO" : "EGRESO";

  if (!montoCrudo) {
    return { ok: false, error: "Falta el monto." };
  }
  const monto = Number(montoCrudo.replace(/[.,]/g, ""));
  if (!monto || isNaN(monto) || monto <= 0) {
    return { ok: false, error: `No entendí el monto "${montoCrudo}". Escríbelo solo en números, ej: 50000.` };
  }

  if (!cuentaCrudo) {
    return {
      ok: false,
      error: `Falta la cuenta. Opciones: ${cuentas.map((c) => normalizar(c.nombre).replace(/\s+/g, "")).join(", ")}.`,
    };
  }
  const cuentaBuscada = normalizar(cuentaCrudo).replace(/\s+/g, "");
  const cuenta = cuentas.find((c) => normalizar(c.nombre).replace(/\s+/g, "") === cuentaBuscada);
  if (!cuenta) {
    return {
      ok: false,
      error: `No reconocí la cuenta "${cuentaCrudo}". Opciones: ${cuentas
        .map((c) => normalizar(c.nombre).replace(/\s+/g, ""))
        .join(", ")}.`,
    };
  }

  if (!categoriaCrudo) {
    return { ok: false, error: `Falta la categoría. Opciones: ${listaCategorias(tipo)}.` };
  }
  const mapaCategorias = tipo === "EGRESO" ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO;
  const categoria = mapaCategorias[normalizar(categoriaCrudo)];
  if (!categoria) {
    return {
      ok: false,
      error: `No reconocí la categoría "${categoriaCrudo}". Opciones: ${listaCategorias(tipo)}.`,
    };
  }

  const descripcion = resto.length > 0 ? resto.join(" ") : null;

  return {
    ok: true,
    datos: { tipo, monto, cuentaId: cuenta.id, cuentaNombre: cuenta.nombre, categoria, descripcion },
  };
}
