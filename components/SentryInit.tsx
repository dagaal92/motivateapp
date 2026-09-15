"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

let inicializado = false;

/**
 * Inicializa Sentry en el navegador una sola vez. No usa el plugin de
 * webpack de @sentry/nextjs (withSentryConfig) a propósito: next.config.js
 * ya tiene una configuración delicada para el empaquetado de pdfkit que no
 * se quiere arriesgar a romper.
 */
export default function SentryInit() {
  useEffect(() => {
    if (inicializado) return;
    inicializado = true;
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  }, []);

  return null;
}
