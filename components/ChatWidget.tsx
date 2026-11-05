"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QUEBRADAS } from "@/lib/quebradas";
import type { Semaforo } from "@/lib/risk";
import { useIdioma } from "@/lib/i18n";

// Chatbot flotante con texto, foto, ubicación y notas de voz (transcripción).

interface Mensaje {
  id: number;
  de: "yo" | "chaski";
  texto?: string;
  imagen?: string;
  ubicacion?: string;
}

/** Codifica un AudioBuffer como WAV PCM16 mono a 16 kHz (lo que pide Muse Voice). */
function aWav16k(buffer: AudioBuffer): Blob {
  const datos = buffer.getChannelData(0);
  const ab = new ArrayBuffer(44 + datos.length * 2);
  const v = new DataView(ab);
  const txt = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  txt(0, "RIFF");
  v.setUint32(4, 36 + datos.length * 2, true);
  txt(8, "WAVE");
  txt(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  txt(36, "data");
  v.setUint32(40, datos.length * 2, true);
  for (let i = 0; i < datos.length; i++) {
    const m = Math.max(-1, Math.min(1, datos[i]));
    v.setInt16(44 + i * 2, m < 0 ? m * 0x8000 : m * 0x7fff, true);
  }
  return new Blob([ab], { type: "audio/wav" });
}

/** La nota del navegador viene en webm/opus: se pasa a WAV 16 kHz para Muse. */
async function convertirAWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(buf.duration * 16000)), 16000);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(off.destination);
    src.start();
    return aWav16k(await off.startRendering());
  } finally {
    ctx.close().catch(() => undefined);
  }
}

let siguienteId = 1;
const mk = (m: Omit<Mensaje, "id">): Mensaje => ({ ...m, id: siguienteId++ });

export default function ChatWidget({ simulacro = false }: { simulacro?: boolean }) {
  const { t, lang } = useIdioma();
  const [abierto, setAbierto] = useState(true);
  // La ventana permanece abierta: recuerda si quedó abierta al navegar o recargar.
  useEffect(() => {
    try {
      if (localStorage.getItem("chaski-chat-abierto") === "1") setAbierto(true);
    } catch { /* sin almacenamiento */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("chaski-chat-abierto", abierto ? "1" : "0");
    } catch { /* sin almacenamiento */ }
  }, [abierto]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [quebradaId, setQuebradaId] = useState(QUEBRADAS[0].id);
  const [escribiendo, setEscribiendo] = useState(false);
  const [enviandoAlerta, setEnviandoAlerta] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Respaldo sin clave: reconocimiento de voz del navegador, en vivo.
  const vozRef = useRef("");
  const reconocimientoRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (abierto && mensajes.length === 0) {
      setMensajes([mk({ de: "chaski", texto: t("chat.bienvenida") })]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, escribiendo, abierto]);

  const decir = (m: Omit<Mensaje, "id">) => setMensajes((prev) => [...prev, mk(m)]);

  const procesarTexto = (t2: string) => {
    const bajo = t2.toLowerCase();
    setTimeout(() => {
      if (bajo.includes("ayuda") || bajo.includes("help") || bajo.includes("hola") || bajo.includes("menu")) {
        decir({ de: "chaski", texto: t("chat.bienvenida") });
      } else {
        decir({
          de: "chaski",
          texto:
            lang === "en"
              ? `Noted: "${t2.slice(0, 200)}". Send me your location 📍 or a photo 📷 so I can help better.`
              : `Anotado: "${t2.slice(0, 200)}". Envíame tu ubicación 📍 o una foto 📷 para ayudarte mejor.`,
        });
      }
    }, 500);
  };

  const enviarUbicacion = async () => {
    const q = QUEBRADAS.find((x) => x.id === quebradaId) ?? QUEBRADAS[0];
    decir({ de: "yo", ubicacion: `${q.nombre} (${q.lat.toFixed(4)}, ${q.lon.toFixed(4)})` });
    setEscribiendo(true);
    try {
      const res = await fetch(`/api/risk?lat=${q.lat}&lon=${q.lon}&lang=${lang}${simulacro ? "&demo=rojo" : ""}`);
      const r = (await res.json()) as { score: number | null; semaforo: Semaforo; explicacion: string };
      decir({
        de: "chaski",
        texto:
          `${q.nombre}\n${t(`semaforo.${r.semaforo}` as "semaforo.verde")} ${r.score != null ? `(${r.score}/100)` : "(sin puntaje)"}\n${r.explicacion}` +
          `\n${lang === "en" ? "What to do" : "Qué hacer"}: ${t(`accion.${r.semaforo}` as "accion.verde")}`,
      });
      // En simulacro no se guarda ningun reporte: es solo para mirar.
      if (!simulacro) {
        await fetch("/api/reportes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: q.lat,
            lon: q.lon,
            quebradaId: q.id,
            tipo: "consulta",
            descripcion: "Consulta desde el chatbot.",
          }),
        }).catch(() => undefined);
      }
    } catch {
      decir({ de: "chaski", texto: lang === "en" ? "Couldn't check the traffic light." : "No pude consultar el semáforo." });
    } finally {
      setEscribiendo(false);
    }
  };

  const enviarFoto = (f: File | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      decir({ de: "yo", imagen: dataUrl });
      setEscribiendo(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          decir({
            de: "chaski",
            texto:
              `⚠️ ${t("reporte.noAnalizar")}\n${t("foto.sinModelo")}\n\n${t("reporte.queHacer")}\n` +
              `1. ${t("consejos.t1")}\n2. ${t("consejos.t3")}\n3. ${t("consejos.l4")}`,
          });
        } else {
          decir({
            de: "chaski",
            texto:
              `${data.tipo} · ${t("reporte.gravedad")} ${data.gravedad}\n${data.resumen}\n` +
              (data.medicion ? `🧱 Cauce tapado ~${data.medicion.tapadoPct}% (agua ${data.medicion.aguaPct}%, escombros ${data.medicion.escombrosPct}%) · SAM 3.1\n` : "") +
              `\n` +
              `${t("reporte.queHacer")}\n1. ${data.acciones?.[0] ?? ""}\n2. ${data.acciones?.[1] ?? ""}\n3. ${data.acciones?.[2] ?? ""}\n⚠️ ${lang === "en" ? "Muse could not verify live flow or trapped people. Decision pending a human coordinator." : "Muse no pudo verificar el caudal en vivo ni personas atrapadas. Decisión pendiente de un coordinador humano."}`,
          });
        }
      } catch {
        decir({
          de: "chaski",
          texto:
            `⚠️ ${t("reporte.sinConexion")}\n${t("foto.sinModelo")}\n\n${t("reporte.queHacer")}\n` +
            `1. ${t("consejos.t1")}\n2. ${t("consejos.t3")}\n3. ${t("consejos.l4")}`,
        });
      } finally {
        setEscribiendo(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const enviarAlerta = async () => {
    if (enviandoAlerta) return;
    // En simulacro el SOS no envia nada real: solo avisa que es practica.
    if (simulacro) {
      decir({
        de: "chaski",
        texto:
          lang === "en"
            ? "Drill: no real alert was sent."
            : "Simulacro: no se envió ninguna alerta real.",
      });
      return;
    }
    setEnviandoAlerta(true);
    const q = QUEBRADAS.find((x) => x.id === quebradaId) ?? QUEBRADAS[0];
    decir({ de: "yo", texto: "🚨 ¡ALERTA! Necesito ayuda" });
    let lat = q.lat;
    let lon = q.lon;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch {
      /* se usa la quebrada elegida */
    }
    try {
      const resReporte = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lon,
          quebradaId: q.id,
          tipo: "🚨 ALERTA",
          descripcion:
            lang === "en"
              ? "Emergency alert sent from the chat. Needs help now."
              : "Alerta de emergencia enviada desde el chat. Necesita ayuda ahora.",
        }),
      });
      if (!resReporte.ok) {
        let detalle = `HTTP ${resReporte.status}`;
        try {
          const data = (await resReporte.json()) as { error?: string };
          if (data.error) detalle = data.error;
        } catch { /* se usa el estado HTTP */ }
        decir({
          de: "chaski",
          texto:
            lang === "en"
              ? `⚠️ Your alert could not be registered: ${detalle}. If there is immediate danger, call 115, 116 or 105.`
              : `⚠️ No se pudo registrar tu alerta: ${detalle}. Si hay peligro inmediato llama al 115, 116 o 105.`,
        });
        return;
      }
      const res = await fetch(`/api/risk?lat=${lat}&lon=${lon}&lang=${lang}${simulacro ? "&demo=rojo" : ""}`);
      const r = (await res.json()) as { semaforo: Semaforo };
      decir({
        de: "chaski",
        texto:
          lang === "en"
            ? `🚨 Your alert has been registered for the coordinator. This does not guarantee that help will arrive; if there is immediate danger, call 115, 116 or 105.\nYour color: ${r.semaforo}.\nNOW: go to high ground, away from the ravine. Do not cross water.`
            : `🚨 Tu alerta quedó registrada para el coordinador. Esto no garantiza que llegue ayuda; si hay peligro inmediato llama al 115, 116 o 105.\nTu color: ${r.semaforo}.\nAHORA: ve a zona alta, lejos de la quebrada. No cruces el agua.`,
      });
    } catch {
      decir({
        de: "chaski",
        texto:
          lang === "en"
            ? "The alert couldn't be sent. If there is danger, call 115 Civil Defense, 116 Firefighters or 105 Police now."
            : "No se pudo enviar la alerta. Si hay peligro, llama ahora al 115 Defensa Civil, 116 Bomberos o 105 Policía.",
      });
    } finally {
      setEnviandoAlerta(false);
    }
  };

  const enviarTexto = () => {
    const v = texto.trim();
    if (!v) return;
    decir({ de: "yo", texto: v });
    setTexto("");
    procesarTexto(v);
  };

  const alternarGrabacion = async () => {
    if (grabando) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Escucha en vivo con el navegador (respaldo si Muse no responde).
      vozRef.current = "";
      try {
        const w = window as unknown as Record<string, unknown>;
        const SR = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
          | (new () => {
              lang: string;
              continuous: boolean;
              interimResults: boolean;
              onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
              onerror: (() => void) | null;
              start: () => void;
              stop: () => void;
            })
          | undefined;
        if (SR) {
          const r = new SR();
          r.lang = lang === "en" ? "en-US" : "es-PE";
          r.continuous = true;
          r.interimResults = false;
          r.onresult = (e) => {
            let txt = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) txt += e.results[i][0].transcript;
            }
            if (txt) vozRef.current = `${vozRef.current} ${txt}`.trim();
          };
          r.onerror = () => undefined;
          r.start();
          reconocimientoRef.current = r;
        }
      } catch {
        reconocimientoRef.current = null;
      }
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        try {
          reconocimientoRef.current?.stop();
        } catch { /* ya detenido */ }
        reconocimientoRef.current = null;
        setGrabando(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        // Muse Voice solo acepta WAV PCM: convertir la nota webm a WAV 16 kHz.
        let aEnviar: Blob = blob;
        try {
          aEnviar = await convertirAWav(blob);
        } catch { /* se envía el original y queda el respaldo del navegador */ }
        const reader = new FileReader();
        reader.onload = async () => {
          setTranscribiendo(true);
          try {
            const res = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: reader.result as string }),
            });
            const data = await res.json();
            if (!res.ok || !data.texto) throw new Error(data.error);
            decir({ de: "yo", texto: `🎙️ ${data.texto}` });
            procesarTexto(data.texto as string);
          } catch (e) {
            // Muse no pudo (p. ej. clave rechazada): usar la voz del navegador.
            const voz = vozRef.current.trim();
            if (voz) {
              decir({ de: "yo", texto: `🎙️ ${voz}` });
              procesarTexto(voz);
            } else {
              console.error("Transcripción sin resultado:", e);
              decir({ de: "chaski", texto: t("widget.errorAudio") });
            }
          } finally {
            setTranscribiendo(false);
          }
        };
        reader.readAsDataURL(aEnviar);
      };
      recorderRef.current = rec;
      rec.start();
      setGrabando(true);
    } catch {
      decir({ de: "chaski", texto: t("widget.sinMicro") });
    }
  };

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="fixed bottom-24 right-3 z-50 flex h-[min(560px,calc(100dvh-8rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border-2 border-cocoa bg-white shadow-pop dark:border-crema/40 dark:bg-carboncito dark:shadow-pop-noche sm:right-5"
            role="dialog"
            aria-label={t("widget.titulo")}
          >
            {/* Cabecera */}
            <div className="flex items-center gap-2 bg-sol/70 px-3 py-2 dark:bg-carboncito">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mascotas/saludando.png"
                alt=""
                className="h-11 w-11 rounded-full border-2 border-cocoa bg-white object-cover object-top"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-base leading-tight">{t("widget.titulo")}</p>
                <p className="text-xs font-bold text-hoja">
                  {transcribiendo ? t("widget.transcribiendo") : escribiendo ? t("chat.escribiendo") : t("chat.enLinea")}
                </p>
              </div>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="ml-auto rounded-lg px-2 py-1 text-lg font-black hover:bg-black/10"
              >
                ✕
              </button>
            </div>

            {/* Mensajes */}
            <div className="chat-scroll flex-1 space-y-2 overflow-y-auto bg-[#efeae2] p-3 dark:bg-[#0b141a]">
              {mensajes.map((m) => (
                <div key={m.id} className={`flex ${m.de === "yo" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm font-medium shadow-sm ${
                      m.de === "yo"
                        ? "bg-[#d9fdd3] text-stone-900 dark:bg-[#005c4b] dark:text-white"
                        : "bg-white text-stone-900 dark:bg-[#202c33] dark:text-gray-100"
                    }`}
                  >
                    {m.imagen && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imagen} alt="" className="mb-1 max-h-40 rounded-xl" />
                    )}
                    {m.ubicacion && <p>📍 {m.ubicacion}</p>}
                    {m.texto && <p>{m.texto}</p>}
                  </div>
                </div>
              ))}
              <div ref={finRef} />
            </div>

            {/* Botón de alerta */}
            <button
              onClick={enviarAlerta}
              disabled={enviandoAlerta}
              className="mx-2.5 mt-2.5 rounded-2xl border-2 border-red-900 bg-red-600 px-3 py-2.5 font-display text-base text-white shadow hover:bg-red-500 disabled:opacity-60"
            >
              {enviandoAlerta
                ? lang === "en"
                  ? "Sending alert…"
                  : "Enviando alerta…"
                : lang === "en"
                ? "🚨 ALERT — I NEED HELP"
                : "🚨 ALERTA — NECESITO AYUDA"}
            </button>
            <p className="mx-3 mt-1.5 text-center text-[11px] font-bold leading-snug text-cocoa/60 dark:text-crema/65">
              {lang === "en"
                ? "This button does not guarantee that an authority has received your request. It only alerts the Chaski Guardian coordinator. Emergencies: 115 · 116 · 105."
                : "Este botón no garantiza que una autoridad haya recibido tu solicitud. Solo avisa al coordinador de Chaski Guardian. Emergencias: 115 · 116 · 105."}
            </p>

            {/* Entrada */}
            <div className="space-y-2 border-t-2 border-cocoa/10 bg-[#f0f2f5] p-2.5 dark:border-white/10 dark:bg-[#1f2c34]">
              <label className="flex items-center gap-2 text-xs font-extrabold text-stone-600 dark:text-gray-300">
                {t("chat.miQuebrada")}
                <select
                  value={quebradaId}
                  onChange={(e) => setQuebradaId(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border-2 border-cocoa/25 bg-white p-1 text-stone-900 dark:border-white/20 dark:bg-[#0b141a] dark:text-white"
                >
                  {QUEBRADAS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-1.5">
                <button
                  onClick={enviarUbicacion}
                  title="Ubicación"
                  className="rounded-xl border-2 border-cocoa/25 bg-white px-2 py-2 text-base hover:bg-sol/50 dark:border-white/20 dark:bg-[#0b141a]"
                >
                  📍
                </button>
                <button
                  onClick={() => fotoRef.current?.click()}
                  title="Foto"
                  className="rounded-xl border-2 border-cocoa/25 bg-white px-2 py-2 text-base hover:bg-sol/50 dark:border-white/20 dark:bg-[#0b141a]"
                >
                  📷
                </button>
                <input
                  ref={fotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => enviarFoto(e.target.files?.[0])}
                />
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarTexto();
                    }
                  }}
                  rows={1}
                  placeholder={t("widget.placeholder")}
                  className="max-h-24 flex-1 resize-none rounded-2xl border-2 border-cocoa/25 bg-white px-3 py-2 text-sm font-semibold text-stone-900 placeholder:text-stone-400 dark:border-white/20 dark:bg-[#0b141a] dark:text-white"
                />
                <button
                  onClick={alternarGrabacion}
                  title={grabando ? t("widget.detener") : t("widget.grabar")}
                  aria-label={grabando ? t("widget.detener") : t("widget.grabar")}
                  className={`rounded-xl border-2 px-2.5 py-2 text-base ${
                    grabando
                      ? "animate-pulse border-red-700 bg-red-600 text-white"
                      : "border-cocoa/25 bg-white hover:bg-sol/50 dark:border-white/20 dark:bg-[#0b141a]"
                  }`}
                >
                  {grabando ? "⏹" : "🎤"}
                </button>
                <button
                  onClick={enviarTexto}
                  aria-label="Enviar"
                  className="rounded-xl border-2 border-cocoa bg-hoja px-3 py-2 font-black text-white hover:brightness-110 dark:border-white/20"
                >
                  ➤
                </button>
              </div>
              {grabando && (
                <p className="text-center text-xs font-extrabold text-red-700 dark:text-red-300">
                  ● {lang === "en" ? "Recording… tap ⏹ to send" : "Grabando… toca ⏹ para enviar"}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante */}
      <motion.button
        onClick={() => setAbierto((v) => !v)}
        whileTap={{ scale: 0.92 }}
        aria-label={t("widget.abrir")}
        className="fixed bottom-5 right-3 z-50 flex items-center gap-2 rounded-full border-2 border-cocoa bg-sol py-1.5 pl-1.5 pr-4 font-display text-sm shadow-pop hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:border-crema/60 dark:shadow-pop-noche sm:right-5"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascotas/saludando.png"
          alt=""
          className="h-10 w-10 rounded-full border-2 border-cocoa bg-white object-cover object-top"
        />
        {t("widget.abrir")}
      </motion.button>
    </>
  );
}
