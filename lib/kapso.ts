const NOMBRE_PLANTILLA_GUIA = "compartir_guia";
const IDIOMA_PLANTILLA_GUIA = "es_CO";
// La plantilla tiene una imagen de encabezado fija; hay que mandarla en
// cada envío (WhatsApp no la recuerda de la plantilla aprobada). Si el
// diseño cambia, solo hay que actualizar este link.
const IMAGEN_ENCABEZADO_GUIA =
  "https://cdn.shopify.com/s/files/1/0570/9751/9284/files/Compartir_Guia_de_Envio.jpg?v=1789525931";

/**
 * telefono viene guardado sin indicativo (normalizarTelefono le quita el
 * "57"). WhatsApp/Kapso esperan el número completo en formato internacional
 * sin "+" ni espacios. Devuelve null si no parece un celular colombiano
 * válido (10 dígitos empezando en 3).
 */
export function formatearTelefonoWhatsapp(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, "");
  if (!/^3\d{9}$/.test(digitos)) return null;
  return `57${digitos}`;
}

export type ResultadoEnvioPlantilla = {
  // El id que WhatsApp/Kapso le asigna al mensaje. Se usa para guardarlo en
  // el historial de conversación (MensajeWhatsapp) sin duplicar lo que
  // pueda llegar luego por el webhook de Kapso para ese mismo mensaje.
  wamid: string | null;
  // Texto ya armado tal como le llegó al cliente, para que el historial de
  // conversación no se quede solo con la etiqueta "Plantilla".
  contenido: string;
};

/**
 * Saca el id del mensaje de la respuesta de Kapso, sin que un cambio de
 * formato en esa respuesta pueda tumbar el envío: para este punto el
 * mensaje ya salió (res.ok ya se validó antes de llamar esto), así que
 * cualquier problema leyendo el id se traga en silencio y solo se pierde
 * la referencia para el historial, nunca el envío en sí.
 */
async function extraerWamid(res: Response): Promise<string | null> {
  try {
    const data = await res.clone().json();
    return data?.messages?.[0]?.id || null;
  } catch {
    return null;
  }
}

type DatosPlantillaGuia = {
  telefono: string;
  nombreCliente: string;
  numeroOrden: string;
  numeroGuia: string;
  transportadora: string;
  // La mayoría de los envíos van por Envia, que no está en el listado de
  // transportadoras de Shopify, así que en Shopify se elige "Otro" y se
  // pega el link en "URL de seguimiento". Cuando esa URL viene, se usa en
  // vez del nombre de la transportadora, porque el cliente puede darle clic
  // y le sirve más que ver "Other".
  urlSeguimiento?: string | null;
};

/**
 * Envía la plantilla de WhatsApp "compartir_guia" a través de la API de
 * Kapso (que hace de proxy hacia la API de WhatsApp Cloud de Meta). Lanza un
 * error si Kapso no confirma el envío; quien la llama decide qué hacer con
 * eso (normalmente: capturarError + responder 500 para que Shopify
 * reintente el webhook más tarde).
 */
export async function enviarPlantillaGuia(
  datos: DatosPlantillaGuia
): Promise<ResultadoEnvioPlantilla> {
  const apiKey = process.env.KAPSO_API_KEY;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
  if (!apiKey || !phoneNumberId) {
    throw new Error("Faltan KAPSO_API_KEY o KAPSO_PHONE_NUMBER_ID en el .env");
  }

  const seguimiento = datos.urlSeguimiento || datos.transportadora;

  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: datos.telefono,
        type: "template",
        template: {
          name: NOMBRE_PLANTILLA_GUIA,
          language: { code: IDIOMA_PLANTILLA_GUIA },
          components: [
            {
              type: "header",
              parameters: [
                { type: "image", image: { link: IMAGEN_ENCABEZADO_GUIA } },
              ],
            },
            {
              type: "body",
              parameters: [
                { type: "text", text: datos.nombreCliente },
                { type: "text", text: datos.numeroOrden },
                { type: "text", text: datos.numeroGuia },
                { type: "text", text: seguimiento },
              ],
            },
          ],
        },
      }),
    }
  );

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Kapso respondió ${res.status} al enviar la plantilla de guía: ${detalle}`);
  }

  const contenido = [
    `Hey ${datos.nombreCliente}!💪🏽`,
    `*Tu pedido #${datos.numeroOrden} ha sido enviado satisfactoriamente* 📦🚚`,
    "",
    "_Puedes hacer seguimiento:_",
    `*Guía:* ${datos.numeroGuia}`,
    `*Síguelo aquí:* ${seguimiento}.`,
    "",
    "Esperamos que te guste el detalle que te enviamos 🎁🤩",
    "",
    "*Confírmanos cuando lo recibas* 🥹",
  ].join("\n");

  return { wamid: await extraerWamid(res), contenido };
}

const IMAGEN_ENCABEZADO_CONFIRMACION_PAGADO =
  "https://cdn.shopify.com/s/files/1/0570/9751/9284/files/Confirmar_Pedido-_-Pago_Online.jpg?v=1789994889";
const IMAGEN_ENCABEZADO_CONFIRMACION_CONTRAENTREGA =
  "https://cdn.shopify.com/s/files/1/0570/9751/9284/files/Confirmar_Pedido-_-Pago_Contra_Entrega.jpg?v=1789993423";

const NOMBRE_PLANTILLA_CONFIRMACION_PAGADO = "confirmacion_pedido_pagado";
const NOMBRE_PLANTILLA_CONFIRMACION_CONTRAENTREGA = "v1_1_confirmar_pedido_contraentrega";

async function enviarMensajePlantilla(opciones: {
  telefono: string;
  nombrePlantilla: string;
  imagenEncabezado: string;
  parametros: string[];
}): Promise<{ wamid: string | null }> {
  const apiKey = process.env.KAPSO_API_KEY;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
  if (!apiKey || !phoneNumberId) {
    throw new Error("Faltan KAPSO_API_KEY o KAPSO_PHONE_NUMBER_ID en el .env");
  }

  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opciones.telefono,
        type: "template",
        template: {
          name: opciones.nombrePlantilla,
          language: { code: IDIOMA_PLANTILLA_GUIA },
          components: [
            {
              type: "header",
              parameters: [
                { type: "image", image: { link: opciones.imagenEncabezado } },
              ],
            },
            {
              type: "body",
              parameters: opciones.parametros.map((texto) => ({ type: "text", text: texto })),
            },
          ],
        },
      }),
    }
  );

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(
      `Kapso respondió ${res.status} al enviar la plantilla ${opciones.nombrePlantilla}: ${detalle}`
    );
  }

  return { wamid: await extraerWamid(res) };
}

type DatosConfirmacionPagado = {
  telefono: string;
  nombreCliente: string;
  numeroOrden: string;
  productos: string;
};

/** Pedido ya pagado (no contraentrega): un solo aviso, sin respuesta esperada. */
export async function enviarPlantillaConfirmacionPagado(
  datos: DatosConfirmacionPagado
): Promise<ResultadoEnvioPlantilla> {
  const { wamid } = await enviarMensajePlantilla({
    telefono: datos.telefono,
    nombrePlantilla: NOMBRE_PLANTILLA_CONFIRMACION_PAGADO,
    imagenEncabezado: IMAGEN_ENCABEZADO_CONFIRMACION_PAGADO,
    parametros: [datos.nombreCliente, datos.numeroOrden, datos.productos],
  });

  const contenido = [
    `*¡Pedido confirmado, ${datos.nombreCliente}!*💪`,
    `Pedido #${datos.numeroOrden}:`,
    `🛍️ ${datos.productos}`,
    "",
    "Ya quedó en nuestras manos y lo estamos preparando para que no le bajes al ritmo.",
    "",
    "*Pronto te compartimos la guía de envío* 🤩",
  ].join("\n");

  return { wamid, contenido };
}

type DatosConfirmacionContraentrega = {
  telefono: string;
  nombreCliente: string;
  productos: string;
  direccion: string;
  valorAPagar: string;
};

/**
 * Primer mensaje del flujo de contraentrega (con botones de respuesta
 * rápida). Solo manda el mensaje inicial; la respuesta del cliente y los
 * recordatorios (v2-v5) son un flujo aparte, todavía no implementado.
 */
export async function enviarPlantillaConfirmacionContraentrega(
  datos: DatosConfirmacionContraentrega
): Promise<ResultadoEnvioPlantilla> {
  const { wamid } = await enviarMensajePlantilla({
    telefono: datos.telefono,
    nombrePlantilla: NOMBRE_PLANTILLA_CONFIRMACION_CONTRAENTREGA,
    imagenEncabezado: IMAGEN_ENCABEZADO_CONFIRMACION_CONTRAENTREGA,
    parametros: [datos.nombreCliente, datos.productos, datos.direccion, datos.valorAPagar],
  });

  const contenido = [
    `¡Hola ${datos.nombreCliente}! 👋✨ Soy Luisa, de Motívate 💪 *¡Mil gracias por tu compra!*`,
    "",
    'Ya estamos alistando tu pedido. Antes de despacharlo, *necesitamos saber si todo esta correcto:*',
    "",
    `👕 *Producto:* ${datos.productos}`,
    `📍 *Dirección:* ${datos.direccion}`,
    `💰 *Valor a pagar contraentrega:* $${datos.valorAPagar}`,
    "",
    '¿Toda la info está bien? Respóndeme "Sí, todo bien" y hoy mismo sale tu pedido 🚚',
  ].join("\n");

  return { wamid, contenido };
}
