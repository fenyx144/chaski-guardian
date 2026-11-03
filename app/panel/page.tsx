"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Reporte, Mision } from "@/lib/store";
import { SEMAFORO_META } from "@/lib/risk";

const MapaPanel = dynamic(() => import("@/components/MapaPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-white/10 bg-andino-carbon">
      Cargando mapa…
    </div>
  ),
});

const ESTADO_TXT: Record<Mision["estado"], string> = {
  pendiente: "⏳ Pendiente de aprobación humana",
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
      else setAviso("Misión propuesta. Necesita tu aprobación abajo.");
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
    <div className="space-y-6 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Panel del coordinador</h1>
          <p className="mt-1 text-andino-arena/75">
            Reportes de los vecinos, zonas por semáforo y misiones de cuadrilla
            (siempre con aprobación humana).
          </p>
        </div>
        <button
          onClick={recargar}
          className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold hover:bg-white/10"
        >
          ↻ Actualizar
        </button>
      </div>

      {aviso && (
        <p className="rounded-lg bg-andino-ocre/20 p-3 text-sm font-semibold text-andino-ocreClaro">
          {aviso}
        </p>
      )}

      <MapaPanel reportes={reportes} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reportes */}
        <section>
          <h2 className="text-xl font-black">Reportes ({reportes.length})</h2>
          <div className="mt-3 space-y-3">
            {reportes.map((r) => (
              <article key={r.id} className="rounded-xl border border-white/10 bg-andino-carbon p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: SEMAFORO_META[r.semaforo].color }}
                  />
                  <p className="font-bold">
                    {r.tipo} · {r.score}/100
                  </p>
                  <span className="ml-auto text-xs text-andino-arena/60">
                    {r.fuente} · {new Date(r.fecha).toLocaleString("es-PE")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-andino-arena/80">
                  {r.descripcion || "(sin descripción)"}
                </p>
                <p className="mt-1 text-xs text-andino-arena/60">
                  {r.quebradaId} · {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                </p>
                <button
                  onClick={() => proponer(r.id)}
                  disabled={ocupado === r.id}
                  className="mt-2 rounded-full bg-andino-ocre px-4 py-1.5 text-sm font-bold text-andino-negro hover:bg-andino-ocreClaro disabled:opacity-50"
                >
                  {ocupado === r.id ? "Proponiendo…" : "🚑 Proponer misión de cuadrilla"}
                </button>
              </article>
            ))}
            {reportes.length === 0 && (
              <p className="text-sm text-andino-arena/60">Aún no hay reportes.</p>
            )}
          </div>
        </section>

        {/* Misiones */}
        <section>
          <h2 className="text-xl font-black">Misiones de cuadrilla ({misiones.length})</h2>
          <div className="mt-3 space-y-3">
            {misiones.map((m) => (
              <article key={m.id} className="rounded-xl border border-white/10 bg-andino-carbon p-4">
                <p className="font-bold">{m.titulo}</p>
                <p className="mt-1 text-sm">{ESTADO_TXT[m.estado]}</p>
                {m.motivo && (
                  <p className="mt-1 rounded bg-red-900/40 p-2 text-sm text-red-200">{m.motivo}</p>
                )}
                <p className="mt-1 text-xs text-andino-arena/60">
                  {new Date(m.creada).toLocaleString("es-PE")} · {m.lat.toFixed(4)}, {m.lon.toFixed(4)}
                </p>
                {m.estado === "pendiente" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => decidir(m.id, "aprobar")}
                      disabled={ocupado === m.id}
                      className="rounded-full bg-andino-verde px-4 py-1.5 text-sm font-bold text-white hover:bg-andino-verdeOscuro disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => decidir(m.id, "rechazar")}
                      disabled={ocupado === m.id}
                      className="rounded-full border border-red-500 px-4 py-1.5 text-sm font-bold text-red-300 hover:bg-red-900/40 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </article>
            ))}
            {misiones.length === 0 && (
              <p className="text-sm text-andino-arena/60">
                Sin misiones. Propón una desde cualquier reporte.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
