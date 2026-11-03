"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import EscenaQuebrada from "@/components/EscenaQuebrada";
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
    n: "1 · Reportar",
    titulo: "El vecino avisa",
    texto: "Foto, ubicación o mensaje por WhatsApp o desde esta web.",
  },
  {
    n: "2 · Evaluar",
    titulo: "El sistema estima el riesgo",
    texto: "Lluvia real de Open-Meteo + pendiente de tu quebrada = semáforo.",
  },
  {
    n: "3 · Actuar",
    titulo: "Todos saben qué hacer",
    texto: "Acciones claras y cuadrillas con aprobación humana.",
  },
];

export default function Home() {
  const [quebradaId, setQuebradaId] = useState(QUEBRADAS[0].id);
  const [riesgo, setRiesgo] = useState<RiesgoApi | null>(null);
  const [cargando, setCargando] = useState(false);
  const [demo, setDemo] = useState(false);

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

  const cargarRiesgo = useCallback(async (forzarDemo: boolean) => {
    setCargando(true);
    try {
      const q = QUEBRADAS.find((x) => x.id === quebradaId) ?? QUEBRADAS[0];
      const url = `/api/risk?lat=${q.lat}&lon=${q.lon}${forzarDemo ? "&demo=rojo" : ""}`;
      const res = await fetch(url);
      const data = (await res.json()) as RiesgoApi;
      setRiesgo(data);
    } catch {
      setRiesgo(null);
    } finally {
      setCargando(false);
    }
  }, [quebradaId]);

  useEffect(() => {
    cargarRiesgo(demo);
  }, [cargarRiesgo, demo]);

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
      setReporteOk("Reporte enviado. El coordinador lo verá en el panel.");
      setDescripcion("");
    } catch {
      setReporteOk("No se pudo enviar el reporte. Reintenta.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-10 pt-8">
      {/* Héroe */}
      <section className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-andino-ocreClaro">
            Arequipa · Alerta temprana comunitaria
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
            Yaku Guardian cuida tu quebrada
          </h1>
          <p className="mt-3 text-lg text-andino-arena/80">
            Reporta lo que ves, recibe el semáforo de tu zona y actúa a tiempo
            ante las lluvias de El Niño.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setDemo((d) => !d)}
              className={`rounded-full px-6 py-3 font-bold shadow transition-colors ${
                demo
                  ? "bg-andino-ocre text-andino-negro hover:bg-andino-ocreClaro"
                  : "bg-red-700 text-white hover:bg-red-600"
              }`}
            >
              {demo ? "☀️ Volver a datos reales" : "🌧️ Simular lluvia fuerte"}
            </button>
            <a
              href="/panel"
              className="rounded-full border border-andino-verde px-6 py-3 font-bold text-andino-verde hover:bg-andino-verde hover:text-white"
            >
              Ir al panel del coordinador
            </a>
          </div>
          {demo && (
            <p className="mt-3 rounded-lg bg-red-900/40 p-3 text-sm font-semibold text-red-200">
              MODO DEMO: semáforo forzado a rojo para la demostración en video.
            </p>
          )}
        </div>

        {/* Semáforo */}
        <motion.div
          key={semaforo + String(demo)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-andino-carbon p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Semáforo de tu zona</h2>
            <select
              value={quebradaId}
              onChange={(e) => setQuebradaId(e.target.value)}
              className="rounded-lg bg-andino-negro p-2 text-sm"
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
            <span
              className="inline-block h-16 w-16 rounded-full shadow-lg"
              style={{ backgroundColor: meta.color }}
              aria-label={meta.titulo}
            />
            <div>
              <p className="text-xl font-black" style={{ color: meta.color }}>
                {cargando ? "Consultando…" : meta.titulo}
              </p>
              {riesgo && (
                <p className="text-sm text-andino-arena/70">
                  Puntaje {riesgo.score}/100 · {riesgo.lluvia24h?.toFixed(1)} mm
                  en 24 h · {riesgo.lluvia48h?.toFixed(1)} mm pronosticados
                  {!riesgo.openMeteoOk && !demo && " (sin conexión a Open-Meteo)"}
                </p>
              )}
            </div>
          </div>
          {riesgo && <p className="mt-3 text-sm">{riesgo.explicacion}</p>}
          <p className="mt-2 rounded bg-white/5 p-2 text-sm font-semibold">
            👉 {meta.accion}
          </p>
          <p className="mt-2 text-xs text-andino-arena/60">{riesgo?.nota}</p>
        </motion.div>
      </section>

      {/* Escena */}
      <section>
        <EscenaQuebrada semaforo={semaforo} />
      </section>

      {/* Flujo */}
      <section>
        <h2 className="text-2xl font-black">Flujo único: Reportar → Evaluar → Actuar</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {PASOS.map((p) => (
            <div key={p.n} className="rounded-xl border border-white/10 bg-andino-carbon p-5">
              <p className="text-sm font-bold text-andino-ocreClaro">{p.n}</p>
              <h3 className="mt-1 text-lg font-bold">{p.titulo}</h3>
              <p className="mt-1 text-sm text-andino-arena/75">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reportar */}
      <section className="rounded-xl border border-white/10 bg-andino-carbon p-6">
        <h2 className="text-2xl font-black">Reportar lo que ves</h2>
        <p className="mt-1 text-sm text-andino-arena/70">
          Quebrada: {quebrada.nombre} ({quebrada.distrito}) · pendiente estimada{" "}
          {quebrada.pendienteEstimada}°
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm font-bold">
              Tipo de daño
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="mt-1 w-full rounded-lg bg-andino-negro p-2.5"
              >
                <option value="desborde">Desborde</option>
                <option value="deslizamiento">Deslizamiento</option>
                <option value="vía cortada">Vía cortada</option>
                <option value="vivienda afectada">Vivienda afectada</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label className="block text-sm font-bold">
              Describe lo que ves
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Ej: el agua cruza la pista frente al mercado…"
                className="mt-1 w-full rounded-lg bg-andino-negro p-2.5"
              />
            </label>
            <button
              onClick={enviarReporte}
              disabled={enviando}
              className="rounded-full bg-andino-verde px-6 py-2.5 font-bold text-white hover:bg-andino-verdeOscuro disabled:opacity-50"
            >
              {enviando ? "Enviando…" : "Enviar reporte"}
            </button>
            {reporteOk && <p className="text-sm font-semibold text-andino-ocreClaro">{reporteOk}</p>}
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-bold">
              Foto del daño (opcional)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFoto(e.target.files?.[0])}
                className="mt-1 w-full text-sm"
              />
            </label>
            {foto && (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto} alt="Foto del reporte" className="max-h-48 rounded-lg" />
                <button
                  onClick={analizarFoto}
                  disabled={analizando}
                  className="rounded-full border border-andino-ocre px-5 py-2 text-sm font-bold text-andino-ocreClaro hover:bg-andino-ocre hover:text-andino-negro disabled:opacity-50"
                >
                  {analizando ? "Analizando…" : "Analizar foto con IA"}
                </button>
              </div>
            )}
            {errorFoto && (
              <p className="rounded bg-red-900/40 p-2 text-sm text-red-200">{errorFoto}</p>
            )}
            {analisis && (
              <div className="rounded-lg bg-white/5 p-3 text-sm">
                <p className="font-bold">
                  {analisis.tipo} · gravedad {analisis.gravedad}
                </p>
                <p className="text-andino-arena/80">{analisis.resumen}</p>
                <ol className="mt-1 list-decimal pl-5">
                  {analisis.acciones.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
