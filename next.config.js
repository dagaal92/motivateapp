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
};

module.exports = nextConfig;
