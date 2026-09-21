"use client";

import { useEffect, useRef, useState } from "react";
import { X, MessageCircle, Upload } from "lucide-react";

type Mensaje = {
  id: string;
  direccion: "RECIBIDO" | "ENVIADO";
  tipo: string;
  contenido: string | null;
  creadoEn: string;
};

type VistaPreviaImportacion = {
  totalMensajes: number;
  remitentes: string[];
  muestra: { remitente: string; contenido: string | null }[];
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

  const [mostrarImportar, setMostrarImportar] = useState(false);
  const [importando, setImportando] = useState(false);
  const [errorImportar, setErrorImportar] = useState<string | null>(null);
  const [textoArchivo, setTextoArchivo] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaImportacion | null>(null);
  const [resultadoImportacion, setResultadoImportacion] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const cargarMensajes = () => {
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
  };

  useEffect(() => {
    if (!clienteId) return;
    cargarMensajes();
    setMostrarImportar(false);
    setTextoArchivo(null);
    setVistaPrevia(null);
    setResultadoImportacion(null);
    setErrorImportar(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const seleccionarArchivo = async (file: File) => {
    setErrorImportar(null);
    setResultadoImportacion(null);
    setVistaPrevia(null);
    const texto = await file.text();
    setTextoArchivo(texto);
    setImportando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/mensajes/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo leer el archivo");
      setVistaPrevia(data);
    } catch (err) {
      setErrorImportar(err instanceof Error ? err.message : "No se pudo leer el archivo");
    } finally {
      setImportando(false);
    }
  };

  const confirmarImportacion = async (remitenteNegocio: string) => {
    if (!textoArchivo) return;
    setImportando(true);
    setErrorImportar(null);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/mensajes/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoArchivo, remitenteNegocio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo importar la conversación");
      setResultadoImportacion(
        `Listo: ${data.insertados} mensajes importados${
          data.omitidos > 0 ? `, ${data.omitidos} ya estaban guardados` : ""
        }.`
      );
      setVistaPrevia(null);
      setTextoArchivo(null);
      cargarMensajes();
    } catch (err) {
      setErrorImportar(err instanceof Error ? err.message : "No se pudo importar la conversación");
    } finally {
      setImportando(false);
    }
  };

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
                    {m.contenido || ETIQUETA_TIPO[m.tipo] || `📎 ${m.tipo}`}
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

        <div className="border-t border-borderLight px-5 py-3 shrink-0 space-y-3">
          {!mostrarImportar ? (
            <button
              onClick={() => setMostrarImportar(true)}
              className="flex items-center gap-2 text-xs font-medium text-accent hover:text-accent/70 transition-colors"
            >
              <Upload size={13} />
              Importar conversación anterior (.txt exportado de WhatsApp)
            </button>
          ) : (
            <div className="bg-paper border border-borderLight rounded-lg p-3 space-y-2">
              {!vistaPrevia && (
                <>
                  <p className="text-xs text-muted2">
                    En WhatsApp: abre la conversación → los 3 puntos → Más → Exportar chat
                    (sin adjuntos), y sube aquí el archivo .txt.
                  </p>
                  <input
                    ref={inputArchivoRef}
                    type="file"
                    accept=".txt"
                    disabled={importando}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) seleccionarArchivo(file);
                    }}
                    className="text-xs text-ink2"
                  />
                  {importando && <p className="text-xs text-muted2">Leyendo archivo…</p>}
                </>
              )}

              {vistaPrevia && (
                <>
                  <p className="text-xs text-ink2">
                    Se encontraron <strong>{vistaPrevia.totalMensajes}</strong> mensajes entre:
                  </p>
                  <p className="text-xs text-muted2">
                    ¿Cuál de estos nombres eres tú / tu negocio en esta conversación?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {vistaPrevia.remitentes.map((r) => (
                      <button
                        key={r}
                        disabled={importando}
                        onClick={() => confirmarImportacion(r)}
                        className="text-xs font-medium bg-accentSoft text-accent px-3 py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {importando && <p className="text-xs text-muted2">Importando…</p>}
                </>
              )}

              {errorImportar && <p className="text-xs text-red">{errorImportar}</p>}
              {resultadoImportacion && (
                <p className="text-xs text-green">{resultadoImportacion}</p>
              )}

              <button
                onClick={() => {
                  setMostrarImportar(false);
                  setVistaPrevia(null);
                  setTextoArchivo(null);
                  setErrorImportar(null);
                  if (inputArchivoRef.current) inputArchivoRef.current.value = "";
                }}
                className="text-xs text-muted2 hover:text-ink2 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
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
    </div>
  );
}
