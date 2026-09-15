/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit lee sus .afm de métricas de fuente con rutas relativas a su propio
  // __dirname en tiempo de ejecución. Si webpack lo empaqueta dentro de un
  // chunk de la función serverless (comportamiento por defecto), ese
  // __dirname deja de apuntar al paquete real y la lectura del archivo
  // falla en producción aunque funcione en local. Se marca como paquete
  // externo para que se resuelva desde node_modules en tiempo de ejecución,
  // y se asegura que esos archivos viajen en el paquete de despliegue.
  experimental: {
    serverComponentsExternalPackages: ["pdfmake", "pdfkit"],
  },
  outputFileTracingIncludes: {
    "/api/preparacion/etiquetas": ["./node_modules/pdfkit/js/data/**"],
  },
  // Headers de defensa en profundidad. La CSP se calibró revisando qué carga
  // realmente la app: fuentes con next/font (se sirven desde el propio
  // dominio, no desde Google), un solo <img> a /logos/*.png (mismo origen) y,
  // desde que se agregó Sentry, reportes de error hacia *.sentry.io. Se deja
  // 'unsafe-inline' en script-src (Next inyecta un <script> inline para
  // hidratar la página) y en style-src (varias barras de progreso usan
  // style={{width}} en línea); sin eso la app no cargaría. Migrar a nonces
  // para quitar 'unsafe-inline' es un cambio más grande que se puede hacer
  // después.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.sentry.io",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
