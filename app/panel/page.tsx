"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Reporte, Mision } from "@/lib/store";
import { SEMAFORO_META } from "@/lib/risk";
import Boton from "@/components/Boton";

const MapaPanel = dynamic(() => import("@/components/MapaPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-3xl border-2 border-cocoa bg-white font-bold dark:border-crema/25 dark:bg-carboncito">
      Cargando mapa…
    </div>
  ),
});

const ESTADO_TXT: Record<Mision["estado"], string> = {
  pendiente: "⏳ Espera tu aprobación",
  aprobada: "✅ Aprobada",
  rechazada: "❌ Rechazada",
  bloqueada: "⛔ Bloqueada (zona prohibida)",
};

export default function PanelPage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/reportes").then((r) => r.json()),
        fetch("/api/misiones").then((r) => r.json()),
      ]);
      setReportes(r1.reportes ?? []);
      setMisiones(r2.misiones ?? []);
    } catch {
      setAviso("Sin conexión con el servidor.");
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const proponer = async (reporteId: string) => {
    setOcupado(reporteId);
    setAviso("");
    try {
      const res = await fetch("/api/misiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporteId }),
      });
      const data = await res.json();
      if (data.aviso) setAviso(data.aviso);
      else setAviso("Misión propuesta. Revísala y apruébala abajo.");
      await recargar();
    } catch {
      setAviso("No se pudo proponer la misión.");
    } finally {
      setOcupado(null);
    }
  };

  const decidir = async (id: string, accion: "aprobar" | "rechazar") => {
    setOcupado(id);
    try {
      await fetch("/api/misiones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, accion }),
      });
      setAviso(accion === "aprobar" ? "Misión aprobada. ¡Cuadrilla en camino!" : "Misión rechazada.");
      await recargar();
    } catch {
      setAviso("No se pudo registrar tu decisión.");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="puntos space-y-8 pt-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Panel del coordinador</h1>
          <p className="mt-2 max-w-xl font-medium text-cocoa/70 dark:text-crema/75">
            Lo que reportan los vecinos y las cuadrillas en camino. Nada se mueve
            sin tu aprobación.
          </p>
        </div>
        <Boton variante="linea" onClick={recargar} className="px-4 py-2 text-sm">
          ↻ Actualizar
        </Boton>
      </div>

      {aviso && (
        <p className="rounded-2xl border-2 border-cocoa bg-sol/40 p-3 text-sm font-extrabold dark:border-crema/40 dark:bg-sol/20">
          {aviso}
        </p>
      )}

      <MapaPanel reportes={reportes} />

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Reportes */}
        <section>
          <h2 className="font-display text-2xl">Reportes ({reportes.length})</h2>
          <div className="mt-2 divide-y-2 divide-dashed divide-cocoa/20 dark:divide-crema/20">
            {reportes.map((r) => (
              <article key={r.id} className="py-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-cocoa/40"
                    style={{ backgroundColor: SEMAFORO_META[r.semaforo].color }}
                  />
                  <p className="font-extrabold">
                    {r.tipo} · {r.score}/100
                  </p>
                  <span className="ml-auto text-xs font-semibold text-cocoa/55 dark:text-crema/60">
                    {r.fuente} · {new Date(r.fecha).toLocaleString("es-PE")}
                  </span>
                </div>
                <p className="mt-1 font-medium text-cocoa/75 dark:text-crema/80">
                  {r.descripcion || "(sin descripción)"}
                </p>
                <Boton
                  variante="sol"
                  onClick={() => proponer(r.id)}
                  disabled={ocupado === r.id}
                  className="mt-2 px-4 py-1.5 text-sm"
                >
                  {ocupado === r.id ? "Proponiendo…" : "Proponer misión de cuadrilla"}
                </Boton>
              </article>
            ))}
            {reportes.length === 0 && (
              <p className="py-4 font-semibold text-cocoa/55">Aún no hay reportes.</p>
            )}
          </div>
        </section>

        {/* Misiones */}
        <section>
          <h2 className="font-display text-2xl">Cuadrillas ({misiones.length})</h2>
          <div className="mt-2 divide-y-2 divide-dashed divide-cocoa/20 dark:divide-crema/20">
            {misiones.map((m) => (
              <article key={m.id} className="py-4">
                <p className="font-extrabold">{m.titulo}</p>
                <p className="mt-1 text-sm font-bold">{ESTADO_TXT[m.estado]}</p>
                {m.motivo && (
                  <p className="mt-2 rounded-2xl border-2 border-coral/60 bg-coral/10 p-2 text-sm font-bold">
                    {m.motivo}
                  </p>
                )}
                {m.estado === "pendiente" && (
                  <div className="mt-2 flex gap-2">
                    <Boton
                      variante="hoja"
                      onClick={() => decidir(m.id, "aprobar")}
                      disabled={ocupado === m.id}
                      className="px-4 py-1.5 text-sm"
                    >
                      Aprobar
                    </Boton>
                    <Boton
                      variante="linea"
                      onClick={() => decidir(m.id, "rechazar")}
                      disabled={ocupado === m.id}
                      className="px-4 py-1.5 text-sm"
                    >
                      Rechazar
                    </Boton>
                  </div>
                )}
              </article>
            ))}
            {misiones.length === 0 && (
              <p className="py-4 font-semibold text-cocoa/55 dark:text-crema/60">
                Sin misiones. Propón una desde cualquier reporte.
              </p>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
