"use client";

import { useState } from "react";

type PuntoMes = { mes: number; totalPedidos: number };

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WIDTH = 640;
const HEIGHT = 220;
const PAD_TOP = 32;
const PAD_BOTTOM = 26;
const PAD_X = 16;
const PLOT_W = WIDTH - PAD_X * 2;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const GRID_LINES = 4;

export default function PedidosPorMesChart({
  datos,
  mesSeleccionado,
}: {
  datos: PuntoMes[];
  mesSeleccionado: number | null;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tablaAbierta, setTablaAbierta] = useState(false);

  const maxValor = Math.max(1, ...datos.map((d) => d.totalPedidos));
  const techo = maxValor * 1.25;
  const paso = PLOT_W / (Math.max(datos.length, 2) - 1);

  const puntos = datos.map((d, i) => ({
    ...d,
    x: PAD_X + i * paso,
    y: PAD_TOP + PLOT_H - (d.totalPedidos / techo) * PLOT_H,
  }));

  const linePath = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const activo = hoverIdx !== null ? puntos[hoverIdx] : null;

  return (
    <div className="bg-card border border-borderLight rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-ink2">Total de pedidos por mes</p>
        <button
          onClick={() => setTablaAbierta((v) => !v)}
          className="text-xs font-medium text-accent hover:underline"
        >
          {tablaAbierta ? "Ver gráfico" : "Ver como tabla"}
        </button>
      </div>

      {tablaAbierta ? (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                <th className="px-3 py-2">Mes</th>
                <th className="px-3 py-2 text-right">Total pedidos</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr
                  key={d.mes}
                  className={`border-t border-borderLight ${
                    d.mes === mesSeleccionado ? "bg-accentSoft/50" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-ink2">{MESES_LARGOS[d.mes - 1]}</td>
                  <td className="px-3 py-2 text-right font-medium text-ink2">
                    {d.totalPedidos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-1">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            role="img"
            aria-label="Total de pedidos por mes"
          >
            {Array.from({ length: GRID_LINES }).map((_, i) => {
              const y = PAD_TOP + (i * PLOT_H) / (GRID_LINES - 1);
              return (
                <line
                  key={i}
                  x1={PAD_X}
                  x2={WIDTH - PAD_X}
                  y1={y}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth={1}
                />
              );
            })}

            <path
              d={linePath}
              fill="none"
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {puntos.map((p, i) => {
              const esSeleccionado = p.mes === mesSeleccionado;
              return (
                <g key={p.mes}>
                  {esSeleccionado && (
                    <text
                      x={p.x}
                      y={p.y - 12}
                      textAnchor="middle"
                      className="fill-ink2 text-[11px] font-semibold"
                    >
                      {p.totalPedidos}
                    </text>
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={esSeleccionado ? 6 : 4}
                    fill={esSeleccionado ? "#2F6FED" : "#FFFFFF"}
                    stroke={esSeleccionado ? "#FFFFFF" : "#9CA3AF"}
                    strokeWidth={2}
                  />
                  <text
                    x={p.x}
                    y={HEIGHT - 6}
                    textAnchor="middle"
                    className={`text-[10px] ${
                      esSeleccionado ? "fill-accent font-semibold" : "fill-muted2"
                    }`}
                  >
                    {MESES_CORTOS[p.mes - 1]}
                  </text>
                  <rect
                    x={p.x - paso / 2}
                    y={0}
                    width={paso}
                    height={HEIGHT}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={`${MESES_LARGOS[p.mes - 1]}: ${p.totalPedidos} pedidos`}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onFocus={() => setHoverIdx(i)}
                    onBlur={() => setHoverIdx(null)}
                  />
                </g>
              );
            })}

            {activo && (
              <line
                x1={activo.x}
                x2={activo.x}
                y1={PAD_TOP}
                y2={PAD_TOP + PLOT_H}
                stroke="#2F6FED"
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.4}
              />
            )}
          </svg>

          {activo && (
            <div
              className="absolute pointer-events-none bg-ink2 text-white text-xs rounded-md px-2 py-1 shadow-lg -translate-x-1/2 -translate-y-full whitespace-nowrap"
              style={{ left: `${(activo.x / WIDTH) * 100}%`, top: `${(activo.y / HEIGHT) * 100}%` }}
            >
              <span className="font-semibold">{activo.totalPedidos}</span> pedidos ·{" "}
              {MESES_LARGOS[activo.mes - 1]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
