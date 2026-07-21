# Motívate — Pedidos

MVP de gestión de pedidos para Motívate. Next.js + Prisma + PostgreSQL (Neon).

## Poner a correr en local

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Configurar la base de datos**

   Copia `.env.example` a `.env` y pega tu connection string de Neon:

   ```bash
   cp .env.example .env
   ```

   Recomendado: crea un **branch de Neon** aparte para desarrollo local, así no tocas los datos de producción. En el dashboard de Neon: tu proyecto → Branches → Create branch.

3. **Crear las tablas en la base de datos**

   ```bash
   npx prisma migrate dev --name init
   ```

   Esto crea la tabla `Pedido` en la base de datos que pusiste en `DATABASE_URL`.

4. **Levantar el servidor**

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

## Qué incluye este MVP

- Panel de pedidos con conteo por estado y valor total activo
- Crear pedido (cliente, teléfono, dirección, ciudad, producto, cantidad, valor, notas)
- Cambiar estado del pedido directamente desde la tabla (Pendiente → Confirmado → En camino → Entregado / Cancelado)

## Cómo ir escalando esto

Ideas para las siguientes iteraciones, en orden sugerido:
1. Autenticación simple (para cuando entre más gente del equipo)
2. Filtros y búsqueda en la tabla (por estado, ciudad, fecha)
3. Historial de cambios de estado por pedido
4. Integración con WhatsApp para las confirmaciones automáticas de COD
5. Exportar pedidos a Excel/CSV
6. Métricas: tasa de confirmación, tiempo promedio de entrega

Cuando quieras desplegarlo (no solo local), Vercel es la ruta más simple para Next.js — conecta el repo de GitHub y listo, sin configuración de servidor.

## Comandos útiles

- `npx prisma studio` — interfaz visual para ver/editar los datos directamente
- `npx prisma migrate dev` — aplicar cambios nuevos al schema
