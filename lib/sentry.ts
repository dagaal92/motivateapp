import * as Sentry from "@sentry/nextjs";

let inicializado = false;

function asegurarInicializado() {
  if (inicializado) return;
  inicializado = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // sin DSN configurada, no se envía nada
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}

/**
 * Registra un error tanto en los logs del servidor (como ya se hacía) como
 * en Sentry, si SENTRY_DSN está configurada. Sin esa variable, se comporta
 * exactamente igual que antes (solo console.error).
 *
 * Se espera explícitamente (flush) a que el evento salga por la red antes
 * de continuar: en una función serverless de Vercel, el proceso puede
 * terminar apenas se envía la respuesta HTTP, y si no se espera, la llamada
 * de red hacia Sentry queda a medias y el evento nunca llega.
 */
export async function capturarError(error: unknown) {
  console.error(error);
  if (!process.env.SENTRY_DSN) return;
  asegurarInicializado();
  Sentry.captureException(error);
  await Sentry.flush(2000);
}
