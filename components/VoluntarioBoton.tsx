"use client";

import { useState } from "react";
import { HABILIDADES } from "@/lib/cuadrillas";
import { useIdioma, type Clave } from "@/lib/i18n";

// Botón "Quiero ser voluntario": abre un formulario simple y guarda la
// inscripción en data/voluntarios.json vía /api/voluntarios. Sin login.
// Los valores guardados (habilidad, disponibilidad) quedan en español:
// son los datos que lee el panel; solo se traduce lo que se muestra.

const DISPONIBILIDADES: { valor: string; clave: Clave }[] = [
  { valor: "Cuando haya emergencia", clave: "disp.emergencia" },
  { valor: "Fines de semana", clave: "disp.fines" },
  { valor: "Mañanas", clave: "disp.mananas" },
  { valor: "Tardes", clave: "disp.tardes" },
  { valor: "Noches", clave: "disp.noches" },
  { valor: "Entre semana", clave: "disp.semana" },
];

const campo =
  "mt-1 w-full rounded-xl border-2 border-cocoa/40 bg-white px-3 py-2 font-semibold text-cocoa placeholder:font-normal placeholder:text-cocoa/40 focus:border-cocoa focus:outline-none";

export default function VoluntarioBoton({ className = "" }: { className?: string }) {
  const { t } = useIdioma();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [distrito, setDistrito] = useState("");
  const [habilidad, setHabilidad] = useState<string>(HABILIDADES[0]);
  const [disponibilidad, setDisponibilidad] = useState(DISPONIBILIDADES[0].valor);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const enviar = async () => {
    setEnviando(true);
    setMensaje("");
    try {
      const res = await fetch("/api/voluntarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, distrito, habilidad, disponibilidad }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje(t("vol.gracias", { nombre: nombre.split(" ")[0] }));
      setNombre("");
      setDistrito("");
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : t("vol.error"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className={`rounded-2xl border-2 border-cocoa bg-hoja px-5 py-2.5 font-display text-white shadow-pop-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:border-crema/60 ${className}`}
      >
        🤝 {t("vol.boton")}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={t("vol.titulo")}>
          <div className="w-full max-w-md rounded-3xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/40 dark:bg-carboncito">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl leading-tight">{t("vol.titulo")}</p>
                <p className="mt-1 text-sm font-semibold text-cocoa/65 dark:text-crema/70">
                  {t("vol.sub")}
                </p>
              </div>
              <button onClick={() => setAbierto(false)} aria-label={t("vol.cerrar")} className="rounded-lg px-2 py-1 text-lg font-black hover:bg-black/10">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-extrabold">
                {t("vol.nombre")}
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: María Quispe" className={campo} />
              </label>
              <label className="block text-sm font-extrabold">
                {t("vol.distrito")}
                <input value={distrito} onChange={(e) => setDistrito(e.target.value)} placeholder="Ej: Paucarpata" className={campo} />
              </label>
              <label className="block text-sm font-extrabold">
                {t("vol.habilidad")}
                <select value={habilidad} onChange={(e) => setHabilidad(e.target.value)} className={campo}>
                  {HABILIDADES.map((h) => (
                    <option key={h} value={h}>
                      {t(`hab.${h}` as Clave)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-extrabold">
                {t("vol.disponibilidad")}
                <select value={disponibilidad} onChange={(e) => setDisponibilidad(e.target.value)} className={campo}>
                  {DISPONIBILIDADES.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {t(d.clave)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={enviar}
                disabled={enviando || !nombre.trim() || !distrito.trim()}
                className="w-full rounded-2xl border-2 border-cocoa bg-sol px-5 py-2.5 font-display text-cocoa shadow-pop-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50"
              >
                {enviando ? t("vol.guardando") : t("vol.inscribir")}
              </button>
              {mensaje && <p className="rounded-xl bg-crema p-3 text-sm font-bold text-cocoa/80 dark:bg-noche dark:text-crema/85">{mensaje}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
