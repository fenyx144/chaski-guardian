"use client";

import { useState } from "react";
import { QUEBRADAS } from "@/lib/quebradas";

// Suscripción a alertas por WhatsApp: teléfono +51, quebrada y consentimiento.
// Guarda en data/suscriptores.json vía /api/suscriptores. Sin login.

const campo =
  "mt-1 w-full rounded-xl border-2 border-cocoa/40 bg-white px-3 py-2 font-semibold text-cocoa placeholder:font-normal placeholder:text-cocoa/40 focus:border-cocoa focus:outline-none dark:border-crema/30 dark:bg-noche dark:text-crema";

export default function SuscripcionWhatsApp() {
  const [telefono, setTelefono] = useState("");
  const [quebradaId, setQuebradaId] = useState(QUEBRADAS[0].id);
  const [consentimiento, setConsentimiento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);

  const enviar = async () => {
    setEnviando(true);
    setMensaje("");
    try {
      const res = await fetch("/api/suscriptores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, quebradaId, consentimiento }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEsError(false);
      setMensaje(data.mensaje);
      setTelefono("");
      setConsentimiento(false);
    } catch (e) {
      setEsError(true);
      setMensaje(e instanceof Error ? e.message : "No se pudo guardar tu suscripción.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-3xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
      <p className="font-display text-2xl leading-tight">Alertas por WhatsApp</p>
      <p className="mt-1 text-sm font-semibold text-cocoa/65 dark:text-crema/70">
        Déjanos tu número y te avisamos cuando tu quebrada se ponga en amarillo o
        rojo. Solo alertas, nada de publicidad.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-extrabold">
          Tu WhatsApp
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+51 987 654 321"
            inputMode="tel"
            className={campo}
          />
        </label>
        <label className="block text-sm font-extrabold">
          Tu quebrada
          <select value={quebradaId} onChange={(e) => setQuebradaId(e.target.value)} className={campo}>
            {QUEBRADAS.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={consentimiento}
          onChange={(e) => setConsentimiento(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#2f9e44]"
        />
        Acepto recibir alertas de Chaski Guardian por WhatsApp cuando mi quebrada
        esté en riesgo.
      </label>
      <button
        onClick={enviar}
        disabled={enviando || !telefono.trim() || !consentimiento}
        className="mt-3 rounded-2xl border-2 border-cocoa bg-hoja px-5 py-2.5 font-display text-white shadow-pop-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 dark:border-crema/60"
      >
        {enviando ? "Guardando…" : "📲 Quiero mis alertas"}
      </button>
      {mensaje && (
        <p
          className={`mt-3 rounded-xl p-3 text-sm font-bold ${
            esError ? "bg-coral/15 text-cocoa dark:text-crema" : "bg-crema text-cocoa/85 dark:bg-noche dark:text-crema/90"
          }`}
          role="status"
        >
          {mensaje}
        </p>
      )}
    </div>
  );
}
