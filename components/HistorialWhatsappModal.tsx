"use client";

import { useEffect, useState } from "react";
import { X, MessageCircle } from "lucide-react";

type Mensaje = {
  id: string;
  direccion: "RECIBIDO" | "ENVIADO";
  tipo: string;
  contenido: string | null;
  creadoEn: string;
};

const ETIQUETA_TIPO: Record<string, string> = {
  image: "📷 Imagen",
  video: "🎥 Video",
  audio: "🎤 Nota de voz",
  document: "📄 Documento",
  sticker: "🖼️ Sticker",
  location: "📍 Ubicación",
  contacts: "👤 Contacto",
  template: "📨 Plantilla",
  interactive: "🔘 Mensaje interactivo",
  button: "🔘 Respuesta",
};

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function HistorialWhatsappModal({
  clienteId,
  onClose,
}: {
  clienteId: string | null;
  onClose: () => void;
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nombre, setNombre] = useState<string | null>(null);
  const [telefono, setTelefono] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/clientes/${clienteId}/mensajes`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setMensajes(data.mensajes);
        setNombre(data.cliente.nombre);
        setTelefono(data.cliente.telefono);
      })
      .catch(() => setError("No se pudo cargar el historial de mensajes."))
      .finally(() => setLoading(false));
  }, [clienteId]);

  if (!clienteId) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-borderLight px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-greenSoft text-green flex items-center justify-center shrink-0">
              <MessageCircle size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink2 truncate">
                {nombre || "Historial de WhatsApp"}
              </h2>
              <p className="text-xs text-muted2">{telefono}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted2 hover:bg-paper hover:text-ink2 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-paper">
          {loading ? (
            <p className="text-sm text-muted2 text-center">Cargando…</p>
          ) : error ? (
            <p className="text-sm text-red text-center">{error}</p>
          ) : mensajes.length === 0 ? (
            <p className="text-sm text-muted2 text-center">
              Todavía no hay mensajes registrados con este cliente.
            </p>
          ) : (
            mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.direccion === "ENVIADO" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    m.direccion === "ENVIADO"
                      ? "bg-accent text-white rounded-br-sm"
                      : "bg-white border border-borderLight text-ink2 rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {m.tipo === "text"
                      ? m.contenido || "—"
                      : ETIQUETA_TIPO[m.tipo] || `📎 ${m.tipo}`}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      m.direccion === "ENVIADO" ? "text-white/70" : "text-muted2"
                    }`}
                  >
                    {fmtHora(m.creadoEn)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-borderLight px-5 py-3 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted2">Solo lectura — no envía mensajes desde aquí.</p>
          <button
            onClick={onClose}
            className="bg-paper hover:bg-borderLight text-ink2 text-sm font-medium px-4 py-1.5 rounded-md transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
