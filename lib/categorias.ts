export const CATEGORIAS_MAESTRAS = [
  { key: "PRIORIDAD", label: "Prioridad" },
  { key: "GENERAL", label: "General" },
  { key: "TRANSPORTADORA", label: "Transportadora" },
  { key: "ENVIO", label: "Envío" },
  { key: "INGRESO_DINERO", label: "Ingreso Dinero" },
  { key: "DEPARTAMENTO", label: "Departamento" },
  { key: "MUNICIPIO", label: "Municipio" },
  { key: "COLOR", label: "Color" },
  { key: "REFERENCIA", label: "Referencia" },
  { key: "CATEGORIA_GASTO", label: "Categoría de gasto" },
  { key: "CATEGORIA_INGRESO", label: "Categoría de ingreso" },
] as const;

export type CategoriaMaestra = (typeof CATEGORIAS_MAESTRAS)[number]["key"];
