"use client";

import { useState } from "react";
import Mascota from "@/components/Mascota";

export default function PanelLoginPage() {
  // Acceso de DEMOSTRACION: las credenciales vienen PRELLENADAS a proposito
  // para que el jurado entre sin friccion. Son editables.
  const [usuario, setUsuario] = useState("coordinador");
  const [contrasena, setContrasena] = useState("demo");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setError("");
    try {
      const res = await fetch("/api/panel-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Usuario o contraseña incorrectos.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") ? next : "/panel";
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEntrando(false);
    }
  };

  const campo =
    "mt-1 w-full rounded-2xl border-2 border-cocoa/40 bg-white px-3 py-2.5 font-semibold focus:border-cocoa focus:outline-none dark:border-crema/30 dark:bg-noche dark:text-crema dark:focus:border-crema";

  return (
    <div className="mx-auto max-w-md pt-12">
      <div className="rounded-3xl border-2 border-cocoa bg-white p-6 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
        <div className="flex items-center gap-3">
          <Mascota animo="feliz" size={56} />
          <h1 className="font-display text-3xl leading-none">Panel del coordinador</h1>
        </div>
        <p className="mt-3 rounded-2xl bg-sol/40 p-3 text-sm font-bold dark:bg-sol/20">
          Acceso de demostración: las credenciales ya están cargadas para el
          jurado. En un uso real, cada coordinador tendría su propia cuenta.
        </p>
        <form onSubmit={entrar} className="mt-4 space-y-3">
          <label className="block text-sm font-extrabold">
            Usuario
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              className={campo}
            />
          </label>
          <label className="block text-sm font-extrabold">
            Contraseña
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              className={campo}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-2xl bg-red-600/10 p-3 text-sm font-extrabold text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={entrando}
            className="w-full rounded-2xl border-2 border-cocoa bg-cocoa px-5 py-2.5 font-extrabold text-crema shadow-pop-sol transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-crema/80 dark:bg-crema dark:text-cocoa dark:shadow-pop-noche"
          >
            {entrando ? "Entrando…" : "Entrar al panel"}
          </button>
        </form>
      </div>
    </div>
  );
}
