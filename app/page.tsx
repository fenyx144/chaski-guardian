"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Mascota, { animoDe } from "@/components/Mascota";
import MapaNino from "@/components/MapaNino";
import MapaQuebrada from "@/components/MapaQuebrada";
import MapaPanel from "@/components/MapaPanel";
import VoluntarioBoton from "@/components/VoluntarioBoton";
import SuscripcionWhatsApp from "@/components/SuscripcionWhatsApp";
import BotonEscuchar from "@/components/BotonEscuchar";
import type { Reporte } from "@/lib/store";
import Boton from "@/components/Boton";
import { Resaltado, Garabato, Nota } from "@/components/Amable";
import { QUEBRADAS } from "@/lib/quebradas";
import { SEMAFORO_META, type Semaforo } from "@/lib/risk";
import { useIdioma, type Clave } from "@/lib/i18n";

interface RiesgoApi {
  score: number;
  semaforo: Semaforo;
  explicacion: string;
  lluvia24h?: number;
  lluvia48h?: number;
  openMeteoOk?: boolean;
  distanciaKm?: number;
  caudal?: { hoy: number | null; max7: number | null };
  nota?: string;
}

interface AnalisisFoto {
  tipo: string;
  gravedad: string;
  acciones: string[];
  resumen: string;
  medicion?: {
    tapadoPct: number;
    aguaPct: number;
    escombrosPct: number;
    cajas: {
      cauce: { x: number; y: number; w: number; h: number }[];
      agua: { x: number; y: number; w: number; h: number }[];
      escombros: { x: number; y: number; w: number; h: number }[];
    };
  } | null;
}

const PASOS: { n: "1" | "2" | "3"; color: string }[] = [
  { n: "1", color: "bg-sol" },
  { n: "2", color: "bg-naranja text-white" },
  { n: "3", color: "bg-hoja text-white" },
];

const aparece = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

export default function Home() {
  const { t, lang } = useIdioma();
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

  const [reportes, setReportes] = useState<Reporte[]>([]);
  const cargarReportes = useCallback(async () => {
    try {
      const res = await fetch("/api/reportes");
      const data = (await res.json()) as { reportes?: Reporte[] };
      setReportes(data.reportes ?? []);
    } catch { /* el mapa queda con lo que haya */ }
  }, []);
  useEffect(() => { cargarReportes(); }, [cargarReportes]);

  const quebrada = QUEBRADAS.find((q) => q.id === quebradaId) ?? QUEBRADAS[0];

  const cargarRiesgo = useCallback(async () => {
    setCargando(true);
    try {
      const q = QUEBRADAS.find((x) => x.id === quebradaId) ?? QUEBRADAS[0];
      const res = await fetch(`/api/risk?lat=${q.lat}&lon=${q.lon}&lang=${lang}`);
      const data = (await res.json()) as RiesgoApi;
      setRiesgo(data);
    } catch {
      setRiesgo(null);
    } finally {
      setCargando(false);
    }
  }, [quebradaId, lang]);

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
        setAnalisis({
          tipo,
          gravedad: semaforo === "rojo" ? "grave" : semaforo === "amarillo" ? "moderada" : "leve",
          acciones: [t(`accion.${semaforo}` as Clave), t("consejos.t3"), t("consejos.l4")],
          resumen: t("foto.sinModelo"),
        });
      } else {
        setAnalisis(data as AnalisisFoto);
        if (data.tipo && data.tipo !== "otro") setTipo(data.tipo as string);
      }
    } catch {
      setAnalisis({
        tipo,
        gravedad: semaforo === "rojo" ? "grave" : semaforo === "amarillo" ? "moderada" : "leve",
        acciones: [t(`accion.${semaforo}` as Clave), t("consejos.t3"), t("consejos.l4")],
        resumen: t("foto.sinModelo"),
      });
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
      setReporteOk(t("reporte.ok"));
      cargarReportes();
      setDescripcion("");
    } catch {
      setReporteOk(t("reporte.fallo"));
    } finally {
      setEnviando(false);
    }
  };

  const campo =
    "mt-1 w-full rounded-2xl border-2 border-cocoa/40 bg-white px-3 py-2.5 font-semibold placeholder:font-normal placeholder:text-cocoa/40 focus:border-cocoa focus:outline-none dark:border-crema/30 dark:bg-noche dark:text-crema dark:placeholder:text-crema/40 dark:focus:border-crema";

  return (
    <div className="puntos space-y-14 pt-10">
      {/* Héroe */}
      <section className="max-w-3xl">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.4 }}
          >
            <span className="inline-block rounded-full border-2 border-cocoa bg-white px-4 py-1 text-sm font-extrabold shadow-pop-sm dark:border-crema/80 dark:bg-carboncito dark:shadow-pop-noche">
              {t("home.insignia")}
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-4 font-display text-4xl leading-[1.08] md:text-6xl"
          >
            {t("home.tituloA")} <Resaltado>{t("home.tituloB")}</Resaltado>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-4 max-w-md text-lg font-medium text-cocoa/75 dark:text-crema/80"
          >
            {t("home.sub")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-6 flex flex-wrap items-center gap-3"
          >
            <Boton variante="tinta" href="#nino-vivo">
              {t("home.btnVivo")}
            </Boton>
            <Boton variante="linea" href="/panel">
              {t("home.btnPanel")}
            </Boton>
            <VoluntarioBoton />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3 flex items-center gap-3"
          >
            <Mascota animo="feliz" saludo size={84} />
            <Nota>{t("home.hola")}</Nota>
          </motion.div>
        </div>

      </section>

      {/* El Niño en vivo */}
      <motion.section id="nino-vivo" {...aparece} className="scroll-mt-24">
        <h2 className="font-display text-3xl md:text-4xl">
          {t("nino.tituloA")} <Garabato>{t("nino.tituloB")}</Garabato>
        </h2>
        <p className="mt-2 max-w-2xl font-medium text-cocoa/70 dark:text-crema/70">
          {t("nino.sub")}
        </p>
        <div className="mt-5">
          <MapaNino
            onElegirQuebrada={(id) => {
              setQuebradaId(id);
              document.getElementById("mi-quebrada")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </div>
      </motion.section>

      {/* Sección fusionada: semáforo + quebrada/torrentera de cerca */}
      <motion.section id="mi-quebrada" {...aparece} className="scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl md:text-4xl">
            {t("semaforo.titulo")}
          </h2>
          <select
            value={quebradaId}
            onChange={(e) => setQuebradaId(e.target.value)}
            className="rounded-xl border-2 border-cocoa/50 bg-white px-3 py-2 text-sm font-bold dark:border-crema/30 dark:bg-noche"
            aria-label={t("semaforo.eligir")}
          >
            {QUEBRADAS.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nombre}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 max-w-3xl font-medium text-cocoa/70 dark:text-crema/70">{t("fusion.sub")}</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MapaQuebrada lat={quebrada.lat} lon={quebrada.lon} nombre={quebrada.nombre} semaforo={semaforo} caudal={riesgo?.caudal?.hoy ?? null} reportes={reportes.filter((r) => r.quebradaId === quebrada.id)} />
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
            <div className="border-b-2 border-cocoa/10 pb-3 dark:border-crema/10">
              <div className="flex items-center gap-3">
                <span className="inline-block h-12 w-12 shrink-0 rounded-full border-2 border-cocoa" style={{ backgroundColor: meta.color }} aria-label={t(`semaforo.${semaforo}` as Clave)} />
                <div>
                  <p className="font-display text-3xl leading-none">{cargando ? "…" : riesgo?.score}<span className="text-base text-cocoa/50 dark:text-crema/50">/100</span></p>
                  <p className="font-extrabold" style={{ color: meta.color }}>{cargando ? t("semaforo.consultando") : t(`semaforo.${semaforo}` as Clave)}</p>
                </div>
                <Mascota animo={animoDe(semaforo)} size={56} className="ml-auto" />
              </div>
              <p className="mt-2 text-sm font-semibold text-cocoa/70 dark:text-crema/70">{quebrada.nombre} · {quebrada.distrito}</p>
              {riesgo && <p className="mt-1 text-sm font-semibold text-cocoa/70 dark:text-crema/70">{t("semaforo.lluvia", { a: riesgo.lluvia24h?.toFixed(1) ?? "0", b: riesgo.lluvia48h?.toFixed(1) ?? "0" })}{!riesgo.openMeteoOk && ` ${t("semaforo.sinConexion")}`}</p>}
              {riesgo && <p className="mt-1 text-sm font-medium">{riesgo.explicacion}</p>}
              <p className="mt-2 text-sm font-extrabold">👉 {t(`accion.${semaforo}` as Clave)}</p>
              {riesgo?.nota && <p className="mt-1 text-xs font-semibold text-cocoa/55 dark:text-crema/55">{riesgo.nota}</p>}
              <div className="mt-3">
                <BotonEscuchar
                  texto={`${quebrada.nombre}. ${t(`semaforo.${semaforo}` as Clave)}: ${riesgo?.score ?? ""}/100. ${riesgo?.explicacion ?? ""} ${t(`accion.${semaforo}` as Clave)}`}
                />
              </div>
            </div>
            <p className="font-display text-lg leading-tight">{t("datos.titulo")}</p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-extrabold text-cocoa/60 dark:text-crema/60">{t("datos.caudal")}</dt>
                <dd className="font-display text-2xl">
                  {riesgo?.caudal?.hoy != null ? `${riesgo.caudal.hoy} m³/s` : "—"}
                </dd>
                {riesgo?.caudal?.max7 != null && (
                  <dd className="font-semibold text-cocoa/60 dark:text-crema/60">
                    {t("datos.max7", { v: riesgo.caudal.max7 })}
                  </dd>
                )}
              </div>
              <div>
                <dt className="font-extrabold text-cocoa/60 dark:text-crema/60">{t("datos.distancia")}</dt>
                <dd className="font-display text-2xl">
                  {riesgo?.distanciaKm != null ? `${riesgo.distanciaKm} km` : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-extrabold text-cocoa/60 dark:text-crema/60">{t("datos.pendiente")}</dt>
                <dd className="font-display text-2xl">~{quebrada.pendienteEstimada}°</dd>
              </div>
            </dl>
            <div className="rounded-xl border-2 border-cocoa/15 bg-sol/25 p-3 text-xs font-semibold leading-relaxed dark:border-crema/15 dark:bg-noche">
              <p className="font-display text-sm">{t("torre.asi", { tipo: lang === "en" ? quebrada.tipoEn : quebrada.tipo })}</p>
              <p className="mt-1">{lang === "en" ? quebrada.descripcionEn : quebrada.descripcion}</p>
              <p className="mt-1">💧 <strong>{t("torre.agua")}</strong> {lang === "en" ? quebrada.regimenEn : quebrada.regimen}</p>
              <p>🧱 <strong>{t("torre.arrastra")}</strong> {lang === "en" ? quebrada.arrastraEn : quebrada.arrastra}</p>
              <p>📅 <strong>{t("torre.temporada")}</strong> {lang === "en" ? quebrada.temporadaEn : quebrada.temporada}</p>
              <p className="mt-1">{t("torre.aviso")}</p>
            </div>
            <p className="mt-auto rounded-xl bg-crema p-3 text-xs font-bold text-cocoa/70 dark:bg-noche dark:text-crema/70">
              {t("datos.nota")}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Mapa de reportes de toda Arequipa (el panel del coordinador tiene el suyo) */}
      <motion.section {...aparece}>
        <h2 className="font-display text-3xl md:text-4xl">{t("reportesMapa.titulo")}</h2>
        <p className="mt-2 max-w-2xl font-medium text-cocoa/70 dark:text-crema/70">{t("reportesMapa.sub")}</p>
        <div className="mt-5">
          <MapaPanel reportes={reportes} />
        </div>
      </motion.section>

      {/* Alertas por WhatsApp */}
      <motion.section {...aparece}>
        <SuscripcionWhatsApp />
      </motion.section>

      {/* Consejos segun el semaforo y la torrentera */}
      <motion.section {...aparece}>
        <h2 className="font-display text-3xl md:text-4xl">
          {t("consejos.tituloA")} <Garabato>{t("consejos.tituloB")}</Garabato>
        </h2>
        <p className="mt-2 max-w-2xl font-medium text-cocoa/70 dark:text-crema/70">
          {t("consejos.sub", { q: quebrada.nombre, c: t(`semaforo.${semaforo}` as Clave).toLowerCase() })}
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
            <p className="font-display text-xl">{t("consejos.semaforo")}</p>
            <p className="mt-2 font-extrabold" style={{ color: meta.color }}>{t(`semaforo.${semaforo}` as Clave)}</p>
            <p className="mt-1 font-medium text-cocoa/75 dark:text-crema/75">{t(`accion.${semaforo}` as Clave)}</p>
            {riesgo && <p className="mt-2 text-sm font-semibold text-cocoa/60 dark:text-crema/60">{riesgo.explicacion}</p>}
          </div>
          <div className="rounded-xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
            <p className="font-display text-xl">{t("consejos.torrentera")}</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 font-medium text-cocoa/75 dark:text-crema/75">
              <li>{t("consejos.t1")}</li>
              <li>{t("consejos.t2")}</li>
              <li>{t("consejos.t3")}</li>
              <li>{t("consejos.t4")}</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
            <p className="font-display text-xl">{t("consejos.listo")}</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 font-medium text-cocoa/75 dark:text-crema/75">
              <li>{t("consejos.l1")}</li>
              <li>{t("consejos.l2")}</li>
              <li>{t("consejos.l3")}</li>
              <li>{t("consejos.l4")}</li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Cómo funciona */}
      <motion.section {...aparece}>
        <h2 className="font-display text-3xl md:text-4xl">
          {t("pasos.tituloA")} <Garabato>{t("pasos.tituloB")}</Garabato>
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
              <h3 className="mt-3 font-display text-xl">{t(`paso${p.n}.titulo` as Clave)}</h3>
              <p className="mt-1 font-medium text-cocoa/75 dark:text-crema/75">{t(`paso${p.n}.texto` as Clave)}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Reportar */}
      <motion.section {...aparece}>
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="font-display text-3xl md:text-4xl">
            {t("reporte.tituloA")} <Garabato color="#ff5833">{t("reporte.tituloB")}</Garabato> {t("reporte.tituloC")}
          </h2>
          <Mascota animo="sorpresa" size={88} className="yaku-rebote" />
        </div>
        <p className="mt-2 font-semibold text-cocoa/70 dark:text-crema/70">
          {quebrada.nombre} · {quebrada.distrito}
        </p>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-extrabold">
              {t("reporte.queVes")}
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
                <option value="desborde">{t("reporte.opDesborde")}</option>
                <option value="deslizamiento">{t("reporte.opDeslizamiento")}</option>
                <option value="vía cortada">{t("reporte.opVia")}</option>
                <option value="vivienda afectada">{t("reporte.opVivienda")}</option>
                <option value="otro">{t("reporte.opOtro")}</option>
              </select>
            </label>
            <label className="block text-sm font-extrabold">
              {t("reporte.cuentanos")}
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder={t("reporte.placeholder")}
                className={campo}
              />
            </label>
            <Boton variante="hoja" onClick={enviarReporte} disabled={enviando}>
              {enviando ? t("reporte.enviando") : t("reporte.enviar")}
            </Boton>
            {reporteOk && <p className="font-extrabold text-hoja">{reporteOk}</p>}
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-extrabold">
              {t("reporte.foto")}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFoto(e.target.files?.[0])}
                className="mt-1 w-full text-sm font-semibold"
              />
            </label>
            {foto && (
              <div className="space-y-3">
                <div className="relative inline-block max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto}
                    alt="Foto del reporte"
                    className="max-h-48 rounded-2xl border-2 border-cocoa dark:border-crema/40"
                  />
                  {analisis?.medicion && (
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Segmentación SAM del cauce">
                      {analisis.medicion.cajas.cauce.map((c, i) => (
                        <rect key={`c${i}`} x={c.x * 100} y={c.y * 100} width={c.w * 100} height={c.h * 100} fill="none" stroke="#ffffff" strokeWidth={1.2} strokeDasharray={3} />
                      ))}
                      {analisis.medicion.cajas.agua.map((c, i) => (
                        <rect key={`a${i}`} x={c.x * 100} y={c.y * 100} width={c.w * 100} height={c.h * 100} fill="#29b6f6" fillOpacity={0.35} stroke="#29b6f6" strokeWidth={1} />
                      ))}
                      {analisis.medicion.cajas.escombros.map((c, i) => (
                        <rect key={`e${i}`} x={c.x * 100} y={c.y * 100} width={c.w * 100} height={c.h * 100} fill="#f59e0b" fillOpacity={0.4} stroke="#f59e0b" strokeWidth={1} />
                      ))}
                    </svg>
                  )}
                </div>
                {analisis?.medicion && (
                  <p className="text-xs font-bold text-cocoa/60 dark:text-crema/65">
                    SAM 3.1: <span className="text-sky-600">■ agua</span> · <span className="text-amber-600">■ escombros</span> · cauce con línea blanca
                  </p>
                )}
                <Boton variante="linea" onClick={analizarFoto} disabled={analizando} className="px-4 py-1.5 text-sm">
                  {analizando ? t("reporte.analizando") : t("reporte.analizar")}
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
                  {analisis.tipo} · {t("foto.nivel")} {analisis.gravedad === "grave" ? "🔴" : analisis.gravedad === "moderada" ? "🟡" : "🟢"} {analisis.gravedad}
                </p>
                <p className="font-medium text-cocoa/75 dark:text-crema/75">{analisis.resumen}</p>
                {analisis.medicion && (
                  <div className="pt-1">
                    <p className="text-sm font-extrabold">
                      Cauce tapado: ~{analisis.medicion.tapadoPct}%{" "}
                      <span className="font-bold text-cocoa/55 dark:text-crema/60">
                        (agua {analisis.medicion.aguaPct}% · escombros {analisis.medicion.escombrosPct}%) · medido por SAM 3.1
                      </span>
                    </p>
                    <div className="mt-1 h-3 w-full overflow-hidden rounded-full border border-cocoa/40 bg-white dark:bg-noche">
                      <div
                        className={`h-full ${analisis.medicion.tapadoPct >= 50 ? "bg-red-500" : analisis.medicion.tapadoPct >= 25 ? "bg-amber-400" : "bg-green-500"}`}
                        style={{ width: `${analisis.medicion.tapadoPct}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="pt-1 font-extrabold">{t("reporte.queHacer")}</p>
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
