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
export async function enviarPlantillaGuia(datos: DatosPlantillaGuia): Promise<void> {
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
}
