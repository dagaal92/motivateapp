// Limitador de intentos de login en memoria. Es "best effort": no persiste
// entre cold starts ni se comparte entre instancias serverless distintas,
// pero sí frena intentos automatizados dentro de una misma instancia
// caliente, que es la mayoría del tráfico real de fuerza bruta.
const INTENTOS_MAX = 5;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

type Registro = { intentos: number; venceEn: number };
const intentosPorIp = new Map<string, Registro>();

export function intentosExcedidos(ip: string): boolean {
  const registro = intentosPorIp.get(ip);
  if (!registro) return false;
  if (Date.now() > registro.venceEn) {
    intentosPorIp.delete(ip);
    return false;
  }
  return registro.intentos >= INTENTOS_MAX;
}

export function registrarIntentoFallido(ip: string) {
  const ahora = Date.now();
  const registro = intentosPorIp.get(ip);
  if (!registro || ahora > registro.venceEn) {
    intentosPorIp.set(ip, { intentos: 1, venceEn: ahora + VENTANA_MS });
  } else {
    registro.intentos += 1;
  }
}

export function limpiarIntentos(ip: string) {
  intentosPorIp.delete(ip);
}
