/**
 * Tope de seguridad para listados que hoy no tienen paginación real en la
 * UI (pedidos, deudas, inventario). No es "la" solución de escalabilidad —
 * es una red para que una tabla que crezca sin límite no tumbe la página ni
 * la respuesta del API. Si algún día se acerca a este número, hay que
 * construir paginación de verdad en esa pantalla (como ya tiene Clientes).
 */
export const LIMITE_LISTADO_SEGURIDAD = 5000;
