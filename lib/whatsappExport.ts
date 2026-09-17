// Interpreta el .txt que exporta WhatsApp al elegir "Exportar chat" en una
// conversación (menú de los 3 puntos > Más > Exportar chat, sin adjuntos).
// El formato varía un poco entre Android e iPhone, pero ambos siguen el
// patrón "fecha, hora - Remitente: mensaje" (iPhone además usa corchetes y
// segundos). Los mensajes de varias líneas quedan como líneas sueltas
// después del encabezado, y se van pegando al mensaje anterior hasta
// encontrar el siguiente encabezado válido.

const PATRON_LINEA =
  /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*([ap]\.?\s?m\.?)?\]?\s*[-–]\s*([^:]+):\s(.*)$/i;

const PLACEHOLDERS_MULTIMEDIA: { patron: RegExp; tipo: string }[] = [
  { patron: /imagen omitida|image omitted/i, tipo: "image" },
  { patron: /video omitido|video omitted/i, tipo: "video" },
  { patron: /audio omitido|audio omitted/i, tipo: "audio" },
  { patron: /documento omitido|document omitted/i, tipo: "document" },
  { patron: /gif omitido|gif omitted/i, tipo: "video" },
  { patron: /sticker omitido|sticker omitted/i, tipo: "sticker" },
  { patron: /multimedia omitid[oa]|media omitted/i, tipo: "image" },
];

export type MensajeExportado = {
  remitente: string;
  fecha: Date;
  tipo: string;
  contenido: string | null;
};

function limpiarLinea(linea: string): string {
  // WhatsApp antepone un caracter invisible (marca de izquierda a derecha)
  // a los mensajes con multimedia; se quita para no ensuciar el texto.
  return linea.replace(/‎/g, "").trimEnd();
}

function parsearFechaHora(
  fechaTexto: string,
  horaTexto: string,
  periodo: string | undefined
): Date | null {
  const [dia, mes, anioCorto] = fechaTexto.split("/").map((v) => parseInt(v, 10));
  if (!dia || !mes || !anioCorto) return null;
  const anio = anioCorto < 100 ? 2000 + anioCorto : anioCorto;

  const partesHora = horaTexto.split(":").map((v) => parseInt(v, 10));
  let horas = partesHora[0] || 0;
  const minutos = partesHora[1] || 0;
  const segundos = partesHora[2] || 0;

  if (periodo) {
    const esPM = /p/i.test(periodo);
    if (esPM && horas < 12) horas += 12;
    if (!esPM && horas === 12) horas = 0;
  }

  const fecha = new Date(anio, mes - 1, dia, horas, minutos, segundos);
  return isNaN(fecha.getTime()) ? null : fecha;
}

export function parsearExportacionWhatsapp(texto: string): MensajeExportado[] {
  const lineas = texto.split(/\r?\n/);
  const mensajes: MensajeExportado[] = [];

  for (const lineaCruda of lineas) {
    const linea = limpiarLinea(lineaCruda);
    if (!linea) continue;

    const match = linea.match(PATRON_LINEA);
    if (match) {
      const [, fechaTexto, horaTexto, periodo, remitente, resto] = match;
      const fecha = parsearFechaHora(fechaTexto, horaTexto, periodo);
      if (fecha) {
        const placeholder = PLACEHOLDERS_MULTIMEDIA.find((p) => p.patron.test(resto));
        mensajes.push({
          remitente: remitente.trim(),
          fecha,
          tipo: placeholder ? placeholder.tipo : "text",
          contenido: placeholder ? null : resto.trim(),
        });
        continue;
      }
    }

    // No es un encabezado nuevo: es la continuación del mensaje anterior
    // (o una línea de sistema antes del primer mensaje real, que se ignora
    // porque no hay a qué mensaje pegarla).
    const ultimo = mensajes[mensajes.length - 1];
    if (ultimo && ultimo.contenido !== null) {
      ultimo.contenido += "\n" + linea;
    }
  }

  return mensajes;
}

export function remitentesUnicos(mensajes: MensajeExportado[]): string[] {
  return Array.from(new Set(mensajes.map((m) => m.remitente)));
}
