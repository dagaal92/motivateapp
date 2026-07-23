"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo iniciar sesión");
      }
      const next = searchParams.get("next");
      window.location.href = next && next.startsWith("/") ? next : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Contraseña incorrecta");
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Logo withTagline />
        </div>

        <div className="bg-card border border-borderLight rounded-xl p-6 sm:p-7 shadow-sm">
          <div className="mb-5">
            <h1 className="text-lg font-semibold text-ink2">Bienvenido de nuevo</h1>
            <p className="text-sm text-muted2 mt-1">
              Ingresá la contraseña para acceder a la gestión de pedidos
            </p>
          </div>

          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted2 mb-1 block">Contraseña</label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted2"
                />
                <input
                  autoFocus
                  required
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-borderLight rounded-md pl-9 pr-10 py-2.5 text-sm text-ink2 placeholder:text-muted2 focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted2 hover:text-ink2 transition-colors"
                  title={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-redSoft text-red text-sm px-3 py-2 rounded-md">{error}</div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full flex items-center justify-center gap-2 bg-accent text-white text-sm font-medium py-2.5 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {enviando ? "Ingresando…" : "Ingresar"}
              {!enviando && <ArrowRight size={15} />}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted2 mt-5">
          Gestión de pedidos
        </p>
      </div>
    </main>
  );
}
