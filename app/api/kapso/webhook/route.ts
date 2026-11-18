import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizarTelefono } from "@/lib/normalizar";
import {
  verificarFirmaKapso,
  extraerTelefonoContraparte,
  extraerDatosMensaje,
} from "@/lib/kapsoWebhook";
import { capturarError } from "@/lib/sentry";
import { pareceComando, interpretarComando } from "@/lib/comandoWhatsapp";
import { crearMovimiento } from "@/lib/movimientos";
import { enviarTextoWhatsapp } from "@/lib/kapso";

// Kapso manda aquí cada mensaje de WhatsApp de la conversación (los que
// escribe el cliente y los que le escribe el equipo, manual o automático),
// para poder saber cuándo fue el último contacto con cada cliente.
const EVENTOS_RELEVANTES = new Set(["whatsapp.message.received", "whatsapp.message.sent"]);

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Comando de movimientos por WhatsApp del dueño:
 *   <ingreso|egreso> <monto> <cuenta> <categoria> [descripción libre]
 * Crea el movimiento y contesta por WhatsApp confirmando qué quedó
 * registrado, o explicando qué no se entendió.
 */
async function procesarComandoMovimiento(telefono: string, texto: string) {
  const cuentas = await prisma.cuenta.findMany({ select: { id: true, nombre: true } });
  const resultado = interpretarComando(texto, cuentas);

  if (!resultado.ok) {
    await enviarTextoWhatsapp(telefono, `⚠️ ${resultado.error}`);
    return;
  }

  const { datos } = resultado;
  await prisma.$transaction((tx: Prisma.TransactionClient) =>
    crearMovimiento(tx, {
      cuentaId: datos.cuentaId,
      tipo: datos.tipo,
      monto: datos.monto,
      categoria: datos.categoria,
      descripcion: datos.descripcion,
    })
  );

  const etiqueta = datos.tipo === "INGRESO" ? "Ingreso" : "Egreso";
  const lineas = [
    `✅ ${etiqueta} registrado: ${fmt(datos.monto)}`,
    `${datos.cuentaNombre} · ${datos.categoria}`,
  ];
  if (datos.descripcion) lineas.push(datos.descripcion);
  await enviarTextoWhatsapp(telefono, lineas.join("\n"));
}

export async function POST(req: NextRequest) {
  const secret = process.env.KAPSO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Falta KAPSO_WEBHOOK_SECRET en el .env");
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  const rawBody = await req.text();
  const firmaHeader = req.headers.get("x-webhook-signature");

  if (!verificarFirmaKapso(rawBody, firmaHeader, secret)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const evento = req.headers.get("x-webhook-event");
  if (!evento || !EVENTOS_RELEVANTES.has(evento)) {
    return NextResponse.json({ ok: true, ignorado: "evento no relevante" });
  }

  try {
    const payload = JSON.parse(rawBody);
    const telefonoCrudo = extraerTelefonoContraparte(payload);
    const telefono = normalizarTelefono(telefonoCrudo);

    if (!telefono) {
      await capturarError(
        new Error(`Webhook de Kapso (${evento}) sin teléfono reconocible: ${rawBody.slice(0, 800)}`)
      );
      return NextResponse.json({ ok: true, ignorado: "sin teléfono" });
    }

    const direccion = evento === "whatsapp.message.received" ? "RECIBIDO" : "ENVIADO";
    const { tipo, contenido, wamid } = extraerDatosMensaje(payload);

    // Guarda el mensaje (y de paso deduplica reintentos del mismo webhook
    // por "wamid") ANTES de procesar nada más: si Kapso reintenta un
    // comando de movimiento ya procesado, acá se corta y nunca se llega a
    // crear el movimiento dos veces.
    let esDuplicado = false;
    try {
      await prisma.mensajeWhatsapp.create({
        data: { telefono, direccion, tipo, contenido, wamid },
      });
    } catch (error) {
      esDuplicado =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!esDuplicado) throw error;
    }

    if (esDuplicado) {
      return NextResponse.json({ ok: true, ignorado: "duplicado" });
    }

    // Mensaje del dueño (no de un cliente) con un comando de movimiento: se
    // procesa aparte, sin tocar "último contacto" de ningún cliente.
    const telefonoDueño = normalizarTelefono(process.env.KAPSO_OWNER_PHONE);
    if (
      direccion === "RECIBIDO" &&
      telefonoDueño &&
      telefono === telefonoDueño &&
      tipo === "text" &&
      contenido &&
      pareceComando(contenido)
    ) {
      await procesarComandoMovimiento(telefono, contenido);
      return NextResponse.json({ ok: true });
    }

    const resultado = await prisma.cliente.updateMany({
      where: { telefono },
      data: { ultimoContactoWhatsapp: new Date() },
    });

    if (resultado.count === 0) {
      // No es necesariamente un error (puede ser un número que aún no
      // tiene ficha de Cliente), pero vale la pena verlo en Sentry para
      // confirmar que estamos leyendo el teléfono correcto del payload.
      await capturarError(
        new Error(`Webhook de Kapso (${evento}): ningún cliente con teléfono ${telefono}`)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json({ error: "No se pudo procesar el mensaje" }, { status: 500 });
  }
}
