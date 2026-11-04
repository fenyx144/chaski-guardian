"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import EscenaQuebrada from "@/components/EscenaQuebrada";
import Mascota, { animoDe } from "@/components/Mascota";
import MapaNino from "@/components/MapaNino";
import Boton from "@/components/Boton";
import { Resaltado, Garabato, Nota } from "@/components/Amable";
import { QUEBRADAS } from "@/lib/quebradas";
import { SEMAFORO_META, type Semaforo } from "@/lib/risk";

interface RiesgoApi {
  score: number;
  semaforo: Semaforo;
  explicacion: string;
  lluvia24h?: number;
  lluvia48h?: number;
  openMeteoOk?: boolean;
  nota?: string;
}

interface AnalisisFoto {
  tipo: string;
  gravedad: string;
  acciones: string[];
  resumen: string;
}

const PASOS = [
  {
    n: "1",
    color: "bg-sol",
    titulo: "Reporta",
    texto: "Manda foto, ubicación o mensaje. Tarda menos de un minuto.",
  },
  {
    n: "2",
    color: "bg-naranja text-white",
    titulo: "Mira el semáforo",
    texto: "Verde, amarillo o rojo: así está tu quebrada ahora mismo.",
  },
  {
    n: "3",
    color: "bg-hoja text-white",
    titulo: "Actúa",
    texto: "Sigue las indicaciones y avisa a tus vecinos.",
  },
];

const aparece = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

export default function Home() {
  const [quebradaId, setQuebradaId] = useState(QUEBRADAS[0].id);
  const [riesgo, setRiesgo] = useState<RiesgoApi | null>(null);
  const [cargando, setCargando] = useState(false);

  // Formulario de reporte
  const [tipo, setTipo] = useState("desborde");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [analisis, setAnalisis] = useState<AnalisisFoto | null>(null);
  const [errorFoto, setErrorFoto] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reporteOk, setReporteOk] = useState("");

  const quebrada = QUEBRADAS.find((q) => q.id === quebradaId) ?? QUEBRADAS[0];

  const cargarRiesgo = useCallback(async () => {
    setCargando(true);
    try {
      const q = QUEBRADAS.find((x) => x.id === quebradaId) ?? QUEBRADAS[0];
      const res = await fetch(`/api/risk?lat=${q.lat}&lon=${q.lon}`);
      const data = (await res.json()) as RiesgoApi;
      setRiesgo(data);
    } catch {
      setRiesgo(null);
    } finally {
      setCargando(false);
    }
  }, [quebradaId]);

  useEffect(() => {
    cargarRiesgo();
  }, [cargarRiesgo]);

  const semaforo: Semaforo = riesgo?.semaforo ?? "verde";
  const meta = SEMAFORO_META[semaforo];

  const onFoto = (f: File | undefined) => {
    setErrorFoto("");
    setAnalisis(null);
    if (!f) {
      setFoto(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(f);
  };

  const analizarFoto = async () => {
    if (!foto) return;
    setAnalizando(true);
    setErrorFoto("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: foto }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorFoto(data.error ?? "No se pudo analizar la foto.");
      } else {
        setAnalisis(data as AnalisisFoto);
        if (data.tipo && data.tipo !== "otro") setTipo(data.tipo as string);
      }
    } catch {
      setErrorFoto("Sin conexión con el servidor de análisis.");
    } finally {
      setAnalizando(false);
    }
  };

  const enviarReporte = async () => {
    setEnviando(true);
    setReporteOk("");
    try {
      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: quebrada.lat,
          lon: quebrada.lon,
          quebradaId: quebrada.id,
          tipo,
          descripcion,
          foto: foto ?? undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setReporteOk("¡Listo! Tu reporte ya lo ve el coordinador.");
      setDescripcion("");
    } catch {
      setReporteOk("No se pudo enviar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const campo =
    "mt-1 w-full rounded-2xl border-2 border-cocoa/40 bg-white px-3 py-2.5 font-semibold placeholder:font-normal placeholder:text-cocoa/40 focus:border-cocoa focus:outline-none dark:border-crema/30 dark:bg-noche dark:text-crema dark:placeholder:text-crema/40 dark:focus:border-crema";

  return (
    <div className="puntos space-y-14 pt-10">
      {/* Héroe */}
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.4 }}
          >
            <span className="inline-block rounded-full border-2 border-cocoa bg-white px-4 py-1 text-sm font-extrabold shadow-pop-sm dark:border-crema/80 dark:bg-carboncito dark:shadow-pop-noche">
              Arequipa · Alerta temprana comunitaria
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-4 font-display text-4xl leading-[1.08] md:text-6xl"
          >
            Antes de la lluvia, tu barrio <Resaltado>ya lo sabe</Resaltado>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-4 max-w-md text-lg font-medium text-cocoa/75 dark:text-crema/80"
          >
            Yaku Guardian avisa a los vecinos de quebrada cuando la lluvia trae
            peligro. Reporta, mira el semáforo y actúa a tiempo.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-6 flex flex-wrap items-center gap-3"
          >
            <Boton variante="tinta" href="#nino-vivo">
              Ver El Niño en vivo ↓
            </Boton>
            <Boton variante="linea" href="/panel">
              Panel del coordinador →
            </Boton>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3 flex items-center gap-3"
          >
            <Mascota animo="feliz" saludo size={84} />
            <Nota>¡hola, soy Yaku!</Nota>
          </motion.div>
        </div>

        {/* Semáforo */}
        <motion.div
          key={semaforo}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative rounded-3xl border-2 border-cocoa bg-white p-6 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche"
        >
          <div className="yaku-flotar absolute -top-12 right-4">
            <Mascota animo={animoDe(semaforo)} size={92} />
          </div>
          <div className="flex items-center justify-between gap-3 pt-4">
            <h2 className="font-display text-xl">¿Cómo está mi quebrada?</h2>
            <select
              value={quebradaId}
              onChange={(e) => setQuebradaId(e.target.value)}
              className="rounded-xl border-2 border-cocoa/50 bg-crema px-2 py-1.5 text-sm font-bold dark:border-crema/30 dark:bg-noche"
              aria-label="Elige tu quebrada"
            >
              {QUEBRADAS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <motion.span
              key={semaforo}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 12 }}
              className="inline-block h-16 w-16 shrink-0 rounded-full border-2 border-cocoa"
              style={{ backgroundColor: meta.color }}
              aria-label={meta.titulo}
            />
            <div>
              <p className="font-display text-4xl leading-none">
                {cargando ? "…" : riesgo?.score}
                <span className="text-lg text-cocoa/50 dark:text-crema/50">/100</span>
              </p>
              <p className="mt-1 font-extrabold" style={{ color: meta.color }}>
                {cargando ? "Consultando…" : meta.titulo}
              </p>
            </div>
          </div>
          {riesgo && (
            <p className="mt-3 text-sm font-semibold text-cocoa/70 dark:text-crema/70">
              Han caído {riesgo.lluvia24h?.toFixed(1)} mm y se esperan{" "}
              {riesgo.lluvia48h?.toFixed(1)} mm
              {!riesgo.openMeteoOk && " (sin conexión al servicio de lluvia)"}
            </p>
          )}
          {riesgo && <p className="mt-2 font-medium">{riesgo.explicacion}</p>}
          <p className="mt-3 font-extrabold">👉 {meta.accion}</p>
          <p className="mt-1 text-xs font-semibold text-cocoa/55 dark:text-crema/55">
            {riesgo?.nota}
          </p>
        </motion.div>
      </section>

      {/* El Niño en vivo */}
      <motion.section id="nino-vivo" {...aparece} className="scroll-mt-24">
        <h2 className="font-display text-3xl md:text-4xl">
          El Niño, <Garabato>ahora mismo</Garabato>
        </h2>
        <p className="mt-2 max-w-2xl font-medium text-cocoa/70 dark:text-crema/70">
          Mira cómo está el mar hoy. Toca el botón Ubicarme para ver tu zona.
        </p>
        <div className="mt-5">
          <MapaNino />
        </div>
      </motion.section>

      {/* Escena */}
      <motion.figure {...aparece}>
        <div className="overflow-hidden rounded-3xl border-2 border-cocoa shadow-pop dark:border-crema/25 dark:shadow-pop-noche">
          <EscenaQuebrada semaforo={semaforo} />
        </div>
        <figcaption className="mt-3 text-center">
          <Nota giro="-rotate-1">¡así reacciona tu barrio según el color!</Nota>
        </figcaption>
      </motion.figure>

      {/* Cómo funciona */}
      <motion.section {...aparece}>
        <h2 className="font-display text-3xl md:text-4xl">
          Así de <Garabato>simple</Garabato>
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {PASOS.map((p) => (
            <div
              key={p.n}
              className="rounded-3xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche"
            >
              <p
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-cocoa font-display text-xl dark:border-crema/60 ${p.color}`}
              >
                {p.n}
              </p>
              <h3 className="mt-3 font-display text-xl">{p.titulo}</h3>
              <p className="mt-1 font-medium text-cocoa/75 dark:text-crema/75">{p.texto}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Reportar */}
      <motion.section {...aparece}>
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="font-display text-3xl md:text-4xl">
            ¿Ves algo <Garabato color="#ff5833">raro</Garabato> en el cauce?
          </h2>
          <Mascota animo="sorpresa" size={88} className="yaku-rebote" />
        </div>
        <p className="mt-2 font-semibold text-cocoa/70 dark:text-crema/70">
          {quebrada.nombre} · {quebrada.distrito}
        </p>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-extrabold">
              ¿Qué ves?
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
                <option value="desborde">El agua se sale del cauce</option>
                <option value="deslizamiento">Baja lodo o piedras</option>
                <option value="vía cortada">La vía está cortada</option>
                <option value="vivienda afectada">Hay una vivienda afectada</option>
                <option value="otro">Otra cosa</option>
              </select>
            </label>
            <label className="block text-sm font-extrabold">
              Cuéntanos más
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Ej: el agua cruza la pista frente al mercado…"
                className={campo}
              />
            </label>
            <Boton variante="hoja" onClick={enviarReporte} disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar reporte"}
            </Boton>
            {reporteOk && <p className="font-extrabold text-hoja">{reporteOk}</p>}
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-extrabold">
              Foto (opcional)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFoto(e.target.files?.[0])}
                className="mt-1 w-full text-sm font-semibold"
              />
            </label>
            {foto && (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto}
                  alt="Foto del reporte"
                  className="max-h-48 rounded-2xl border-2 border-cocoa dark:border-crema/40"
                />
                <Boton variante="linea" onClick={analizarFoto} disabled={analizando} className="px-4 py-1.5 text-sm">
                  {analizando ? "Analizando…" : "Analizar foto"}
                </Boton>
              </div>
            )}
            {errorFoto && (
              <p className="rounded-2xl border-2 border-coral/60 bg-coral/10 p-3 text-sm font-bold">
                {errorFoto}
              </p>
            )}
            {analisis && (
              <div className="space-y-1 text-sm">
                <p className="font-display text-lg">
                  {analisis.tipo} · gravedad {analisis.gravedad}
                </p>
                <p className="font-medium text-cocoa/75 dark:text-crema/75">{analisis.resumen}</p>
                <p className="pt-1 font-extrabold">Qué hacer:</p>
                <ol className="list-decimal space-y-1 pl-5 font-medium">
                  {analisis.acciones.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
