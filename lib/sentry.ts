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
 */
export function capturarError(error: unknown) {
  console.error(error);
  if (!process.env.SENTRY_DSN) return;
  asegurarInicializado();
  Sentry.captureException(error);
}
