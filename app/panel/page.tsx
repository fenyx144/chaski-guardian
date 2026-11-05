"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Reporte, Mision, Propuesta } from "@/lib/store";
import type { EstadoSimulacion } from "@/lib/simulacion-estado";
import { CASOS_FICTICIOS } from "@/lib/evaluacion";
import { calcularRiesgo, SEMAFORO_META } from "@/lib/risk";
import type { Cuadrilla } from "@/lib/cuadrillas";
import type { Voluntario } from "@/lib/voluntarios";
import Boton from "@/components/Boton";
import BotonEscuchar from "@/components/BotonEscuchar";

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
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [simulacion, setSimulacion] = useState<EstadoSimulacion>({ activa: false, quebradasRojas: [], alertas: [], iniciada: null });
  const [simulando, setSimulando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/reportes").then((r) => r.json()),
        fetch("/api/misiones").then((r) => r.json()),
        fetch("/api/cuadrillas").then((r) => r.json()),
      ]);
      setReportes(r1.reportes ?? []);
      setMisiones(r2.misiones ?? []);
      setCuadrillas(r3.cuadrillas ?? []);
      setVoluntarios(r3.voluntarios ?? []);
      setPropuestas(r3.propuestas ?? []);
      const r4 = await fetch("/api/simulacion").then((r) => r.json()).catch(() => null);
      if (r4?.simulacion) setSimulacion(r4.simulacion);
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

  const pedirPropuesta = async (reporteId: string) => {
    setOcupado(reporteId);
    setAviso("");
    try {
      const res = await fetch("/api/cuadrillas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporteId }),
      });
      const data = await res.json();
      setAviso(data.aviso ?? data.error ?? "Propuesta lista. Revísala abajo.");
      await recargar();
    } catch {
      setAviso("No se pudo pedir la propuesta.");
    } finally {
      setOcupado(null);
    }
  };

  const alternarSimulacion = async () => {
    setSimulando(true);
    setAviso("");
    try {
      const res = await fetch("/api/simulacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: simulacion.activa ? "detener" : "activar" }),
      });
      const data = await res.json();
      if (data.simulacion) setSimulacion(data.simulacion);
      setAviso(data.aviso ?? data.error ?? "");
      await recargar();
    } catch {
      setAviso("No se pudo cambiar la práctica.");
    } finally {
      setSimulando(false);
    }
  };

  const decidirAlerta = async (quebradaId: string, accion: "aprobar" | "rechazar") => {
    setOcupado(quebradaId);
    try {
      const res = await fetch("/api/simulacion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quebradaId, accion }),
      });
      const data = await res.json();
      if (data.simulacion) setSimulacion(data.simulacion);
      setAviso(data.aviso ?? data.error ?? "");
    } catch {
      setAviso("No se pudo registrar tu decisión sobre la alerta.");
    } finally {
      setOcupado(null);
    }
  };

  const decidirPropuesta = async (id: string, accion: "aprobar" | "rechazar") => {
    setOcupado(id);
    try {
      await fetch("/api/cuadrillas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, accion }),
      });
      setAviso(accion === "aprobar" ? "Propuesta aprobada. Recién ahora la cuadrilla queda asignada." : "Propuesta rechazada. Nadie fue asignado.");
      await recargar();
    } catch {
      setAviso("No se pudo registrar tu decisión.");
    } finally {
      setOcupado(null);
    }
  };

  const cerrarSesion = async () => {
    try {
      await fetch("/api/panel-logout", { method: "POST" });
    } catch { /* la cookie se borra al volver al login de todos modos */ }
    window.location.href = "/panel-login";
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
        <div className="flex flex-wrap gap-2">
          <Boton variante="linea" onClick={recargar} className="px-4 py-2 text-sm">
            ↻ Actualizar
          </Boton>
          <Boton variante="linea" onClick={cerrarSesion} className="px-4 py-2 text-sm">
            Cerrar sesión
          </Boton>
        </div>
      </div>

      {aviso && (
        <p className="rounded-2xl border-2 border-cocoa bg-sol/40 p-3 text-sm font-extrabold dark:border-crema/40 dark:bg-sol/20">
          {aviso}
        </p>
      )}

      {/* Práctica de alerta a los vecinos con alertas de WhatsApp */}
      <section className="rounded-3xl border-2 border-dashed border-coral/70 bg-coral/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">
              Práctica de alerta a los vecinos{" "}
              {simulacion.activa && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">PRÁCTICA ACTIVA</span>
              )}
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-cocoa/65 dark:text-crema/70">
              Práctica, no es una alerta real: pone las quebradas en rojo. La IA
              propone, una persona aprueba: Muse redacta la alerta y recién cuando
              la apruebas se envía por WhatsApp a los suscriptores.
              Sin credenciales de WhatsApp, el envío queda marcado “simulado”.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <Boton
              variante={simulacion.activa ? "linea" : "tinta"}
              onClick={alternarSimulacion}
              disabled={simulando}
              className="px-4 py-2 text-sm"
            >
              {simulando ? "Trabajando…" : simulacion.activa ? "Detener práctica" : "Practicar alerta a los vecinos"}
            </Boton>
            <p className="max-w-xs text-xs font-bold text-cocoa/60 dark:text-crema/65">
              Simulacro del coordinador: Muse redacta la alerta y tú decides si se envía. No es una alerta real.
            </p>
          </div>
        </div>
        {simulacion.alertas.map((a) => (
          <article key={a.quebradaId} className="mt-3 rounded-2xl border-2 border-cocoa/20 bg-white p-4 dark:border-crema/20 dark:bg-carboncito">
            <p className="font-extrabold">
              🔴 {a.nombre}{" "}
              <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-xs font-black text-red-700 dark:text-red-300">PRÁCTICA</span>{" "}
              <span className="text-sm font-bold text-cocoa/60 dark:text-crema/65">
                {(a.estado ?? "pendiente") === "pendiente"
                  ? "⏳ Pendiente de tu aprobación: aún no se envía nada"
                  : a.estado === "rechazada"
                  ? "❌ Rechazada: no se envió nada"
                  : a.envio === "enviado"
                  ? `✅ Enviada a ${a.vecinos} vecinos`
                  : `✅ Aprobada · envío simulado a ${a.vecinos} vecinos`}
              </span>
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium">{a.texto}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <BotonEscuchar texto={a.texto} />
              {(a.estado ?? "pendiente") === "pendiente" && (
                <>
                  <Boton variante="hoja" onClick={() => decidirAlerta(a.quebradaId, "aprobar")} disabled={ocupado === a.quebradaId} className="px-4 py-1.5 text-sm">
                    Aprobar y enviar
                  </Boton>
                  <Boton variante="linea" onClick={() => decidirAlerta(a.quebradaId, "rechazar")} disabled={ocupado === a.quebradaId} className="px-4 py-1.5 text-sm">
                    Rechazar
                  </Boton>
                </>
              )}
            </div>
            {a.numeros.length > 0 && (
              <p className="mt-2 text-xs font-bold text-cocoa/55 dark:text-crema/60">
                Números: {a.numeros.join(" · ")}
              </p>
            )}
          </article>
        ))}
      </section>

      {/* Mini evaluación con casos ficticios etiquetados */}
      <section>
        <h2 className="font-display text-2xl">
          Mini evaluación{" "}
          <span className="rounded-full bg-sol px-2 py-0.5 text-xs font-black text-cocoa">casos ficticios · datos de ejemplo</span>
        </h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold text-cocoa/65 dark:text-crema/70">
          Cinco casos inventados para comprobar el semáforo sin esperar una
          emergencia. Si falta lluvia, caudal o distancia, el resultado correcto
          es “información insuficiente”, nunca verde.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CASOS_FICTICIOS.map((c) => {
            const r = calcularRiesgo(c.entrada);
            const ok = r.semaforo === c.esperado;
            return (
              <article key={c.nombre} className="rounded-2xl border-2 border-cocoa/25 bg-white p-3 dark:border-crema/25 dark:bg-carboncito">
                <p className="font-extrabold">{c.nombre}</p>
                <p className="mt-1 text-xs font-semibold text-cocoa/60 dark:text-crema/65">{c.descripcion}</p>
                <p className="mt-2 text-sm font-bold">
                  <span style={{ color: SEMAFORO_META[r.semaforo].color }}>●</span>{" "}
                  {ok ? "✓" : "✗"} esperado {c.esperado} · obtenido {r.semaforo}
                </p>
                <p className="text-xs font-bold text-cocoa/50 dark:text-crema/55">CASO FICTICIO</p>
              </article>
            );
          })}
        </div>
      </section>

      <MapaPanel reportes={reportes} />

      {/* Cuadrillas de ejemplo y voluntarios inscritos */}
      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-2xl">
            Cuadrillas{" "}
            <span className="rounded-full bg-sol px-2 py-0.5 text-xs font-black text-cocoa">datos de ejemplo</span>
          </h2>
          <div className="mt-2 divide-y-2 divide-dashed divide-cocoa/20 dark:divide-crema/20">
            {cuadrillas.map((c) => (
              <article key={c.id} className="py-3">
                <p className="font-extrabold">{c.nombre}</p>
                <p className="text-sm font-semibold text-cocoa/65 dark:text-crema/70">
                  {c.tipo} · {c.estado} · <span className="text-cocoa/50 dark:text-crema/50">datos de ejemplo</span>
                </p>
              </article>
            ))}
            {cuadrillas.length === 0 && <p className="py-3 font-semibold text-cocoa/55">Sin cuadrillas.</p>}
          </div>
        </section>
        <section>
          <h2 className="font-display text-2xl">Voluntarios inscritos ({voluntarios.length})</h2>
          <div className="mt-2 divide-y-2 divide-dashed divide-cocoa/20 dark:divide-crema/20">
            {voluntarios.map((v) => (
              <article key={v.id} className="py-3">
                <p className="font-extrabold">{v.nombre}</p>
                <p className="text-sm font-semibold text-cocoa/65 dark:text-crema/70">
                  {v.habilidad} · {v.distrito} · {v.disponibilidad}
                </p>
              </article>
            ))}
            {voluntarios.length === 0 && (
              <p className="py-3 font-semibold text-cocoa/55 dark:text-crema/60">
                Aún no hay voluntarios. Se inscriben con el botón “Quiero ser voluntario”.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Propuestas de Muse: nadie se asigna sin aprobacion humana */}
      <section>
        <h2 className="font-display text-2xl">Propuestas de Muse ({propuestas.length})</h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold text-cocoa/65 dark:text-crema/70">
          Muse Spark solo propone. Nadie queda asignado hasta que apruebes, y las
          zonas prohibidas bloquean la propuesta antes de consultar al modelo.
          Las cuadrillas son datos de ejemplo.
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {propuestas.map((p) => (
            <article key={p.id} className="rounded-3xl border-2 border-cocoa bg-white p-4 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
              <p className="font-extrabold">
                {p.cuadrillaSugerida ?? "Sin cuadrilla"} ·{" "}
                <span className="text-sm">{p.reporteTipo}</span>
              </p>
              <p className="mt-1 text-sm font-bold">{ESTADO_TXT[p.estado]}</p>
              <p className="text-xs font-bold text-cocoa/55 dark:text-crema/60">
                Origen: {p.origen === "muse-spark-1.3" ? "Muse Spark (muse-spark-1.3)" : p.origen} ·{" "}
                {new Date(p.creada).toLocaleString("es-PE")} · datos de ejemplo
              </p>
              <p className="mt-2 text-sm font-medium">{p.motivo}</p>
              {p.voluntariosAsignados.length > 0 && (
                <p className="mt-2 text-sm font-semibold">
                  Voluntarios: {p.voluntariosAsignados.map((v) => `${v.nombre} (${v.habilidad})`).join(", ")}
                </p>
              )}
              {p.equipoNecesario.length > 0 && (
                <p className="mt-1 text-sm font-semibold">
                  Equipo: {p.equipoNecesario.join(", ")}
                </p>
              )}
              {p.estado === "pendiente" && (
                <div className="mt-3 flex gap-2">
                  <Boton variante="hoja" onClick={() => decidirPropuesta(p.id, "aprobar")} disabled={ocupado === p.id} className="px-4 py-1.5 text-sm">
                    Aprobar
                  </Boton>
                  <Boton variante="linea" onClick={() => decidirPropuesta(p.id, "rechazar")} disabled={ocupado === p.id} className="px-4 py-1.5 text-sm">
                    Rechazar
                  </Boton>
                </div>
              )}
            </article>
          ))}
        </div>
        {propuestas.length === 0 && (
          <p className="py-3 font-semibold text-cocoa/55 dark:text-crema/60">
            Sin propuestas. En un reporte en rojo, toca “Pedir propuesta a Muse”.
          </p>
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Reportes */}
        <section>
          <h2 className="font-display text-2xl">Reportes ({reportes.length})</h2>
          <div className="mt-2 divide-y-2 divide-dashed divide-cocoa/20 dark:divide-crema/20">
            {reportes.map((r) => (
              <article
                key={r.id}
                className={`py-4 ${r.tipo.includes("ALERTA") ? "rounded-2xl border-2 border-red-500 bg-red-50 px-3 dark:bg-red-950/40" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-cocoa/40"
                    style={{ backgroundColor: SEMAFORO_META[r.semaforo].color }}
                  />
                  <p className="font-extrabold">
                    {r.tipo} · {r.score != null ? `${r.score}/100` : "sin puntaje"}
                  </p>
                  <span className="ml-auto text-xs font-semibold text-cocoa/55 dark:text-crema/60">
                    {r.fuente} · {new Date(r.fecha).toLocaleString("es-PE")}
                  </span>
                </div>
                <p className="mt-1 font-medium text-cocoa/75 dark:text-crema/80">
                  {r.descripcion || "(sin descripción)"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Boton
                    variante="sol"
                    onClick={() => proponer(r.id)}
                    disabled={ocupado === r.id}
                    className="px-4 py-1.5 text-sm"
                  >
                    {ocupado === r.id ? "Proponiendo…" : "Proponer misión de cuadrilla"}
                  </Boton>
                  {r.semaforo === "rojo" && (
                    <Boton
                      variante="tinta"
                      onClick={() => pedirPropuesta(r.id)}
                      disabled={ocupado === r.id}
                      className="px-4 py-1.5 text-sm"
                    >
                      {ocupado === r.id ? "Consultando a Muse…" : "🤖 Pedir propuesta a Muse"}
                    </Boton>
                  )}
                </div>
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
