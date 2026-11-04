"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { QUEBRADAS } from "@/lib/quebradas";
import { SEMAFORO_META, type Semaforo } from "@/lib/risk";
import Mascota from "@/components/Mascota";

// Plan B: chat que simula WhatsApp para demos sin configuración externa.
// Usa la misma lógica que el webhook (/api/risk, /api/analyze, /api/reportes).

interface Mensaje {
  id: number;
  de: "yo" | "yaku";
  texto?: string;
  imagen?: string;
  ubicacion?: string;
}

let siguienteId = 1;
const mk = (m: Omit<Mensaje, "id">): Mensaje => ({ ...m, id: siguienteId++ });

const BIENVENIDA =
  "¡Hola! Soy Yaku Guardian 🌊. Envíame tu ubicación 📍 para darte el semáforo de tu zona, " +
  "una foto 📷 del daño para analizarla, o escríbeme AYUDA.";

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([mk({ de: "yaku", texto: BIENVENIDA })]);
  const [texto, setTexto] = useState("");
  const [quebradaId, setQuebradaId] = useState(QUEBRADAS[0].id);
  const [escribiendo, setEscribiendo] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, escribiendo]);

  const decir = (m: Omit<Mensaje, "id">) =>
    setMensajes((prev) => [...prev, mk(m)]);

  const enviarUbicacion = async () => {
    const q = QUEBRADAS.find((x) => x.id === quebradaId) ?? QUEBRADAS[0];
    decir({ de: "yo", ubicacion: `${q.nombre} (${q.lat.toFixed(4)}, ${q.lon.toFixed(4)})` });
    setEscribiendo(true);
    try {
      const res = await fetch(`/api/risk?lat=${q.lat}&lon=${q.lon}`);
      const r = (await res.json()) as {
        score: number;
        semaforo: Semaforo;
        explicacion: string;
      };
      const meta = SEMAFORO_META[r.semaforo];
      decir({
        de: "yaku",
        texto:
          `${q.nombre}\nSemáforo: ${meta.titulo} (${r.score}/100)\n${r.explicacion}\nQué hacer: ${meta.accion}`,
      });
      // El reporte también llega al panel del coordinador.
      await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: q.lat,
          lon: q.lon,
          quebradaId: q.id,
          tipo: "consulta",
          descripcion: "Consulta de semáforo desde el chat demo.",
        }),
      }).catch(() => undefined);
    } catch {
      decir({ de: "yaku", texto: "No pude consultar el semáforo. Revisa tu conexión e intenta de nuevo." });
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
          decir({ de: "yaku", texto: `No pude analizar la foto: ${data.error ?? "error desconocido"}` });
        } else {
          decir({
            de: "yaku",
            texto:
              `Análisis: ${data.tipo} · gravedad ${data.gravedad}\n${data.resumen}\n\n` +
              `Qué hacer:\n1. ${data.acciones?.[0] ?? ""}\n2. ${data.acciones?.[1] ?? ""}\n3. ${data.acciones?.[2] ?? ""}`,
          });
        }
      } catch {
        decir({ de: "yaku", texto: "Sin conexión con el servidor de análisis." });
      } finally {
        setEscribiendo(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const enviarTexto = () => {
    const t = texto.trim();
    if (!t) return;
    decir({ de: "yo", texto: t });
    setTexto("");
    const bajo = t.toLowerCase();
    setTimeout(() => {
      if (bajo.includes("ayuda") || bajo.includes("hola") || bajo.includes("menu")) {
        decir({ de: "yaku", texto: BIENVENIDA });
      } else {
        decir({
          de: "yaku",
          texto:
            `Anotado: "${t.slice(0, 200)}". Para ayudarte mejor, envíame tu ubicación 📍 ` +
            "con el botón de abajo o una foto 📷 del daño.",
        });
      }
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="puntos mx-auto max-w-2xl space-y-4 pt-10"
    >
      <div>
        <h1 className="font-display text-4xl md:text-5xl">Chat demo</h1>
        <p className="mt-2 font-medium text-cocoa/70 dark:text-crema/70">
          Como hablar con Yaku Guardian por WhatsApp, pero sin configurar nada.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border-2 border-cocoa shadow-pop dark:border-crema/25 dark:shadow-pop-noche">
        {/* Cabecera */}
        <div className="flex items-center gap-3 bg-sol/60 px-4 py-2 dark:bg-carboncito">
          <Mascota animo="feliz" saludo size={52} />
          <div>
            <p className="font-display text-lg leading-tight">Yaku Guardian</p>
            <p className="text-xs font-bold text-hoja">
              {escribiendo ? "escribiendo…" : "en línea"}
            </p>
          </div>
        </div>

        {/* Mensajes */}
        <div className="chat-scroll h-[420px] space-y-2 overflow-y-auto border-y-2 border-cocoa/15 bg-[#efeae2] p-4 dark:border-white/10 dark:bg-[#0b141a]">
          {mensajes.map((m) => (
            <div key={m.id} className={`flex ${m.de === "yo" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm font-medium shadow-sm ${
                  m.de === "yo"
                    ? "bg-[#d9fdd3] text-stone-900 dark:bg-[#005c4b] dark:text-white"
                    : "bg-white text-stone-900 dark:bg-[#202c33] dark:text-gray-100"
                }`}
              >
                {m.imagen && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imagen} alt="Foto enviada" className="mb-1 max-h-48 rounded-xl" />
                )}
                {m.ubicacion && <p>📍 {m.ubicacion}</p>}
                {m.texto && <p>{m.texto}</p>}
              </div>
            </div>
          ))}
          {escribiendo && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-stone-500 dark:bg-[#202c33] dark:text-gray-300">
                …
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        {/* Entrada */}
        <div className="space-y-2 bg-[#f0f2f5] p-3 dark:bg-[#1f2c34]">
          <div className="flex items-center gap-2 text-sm font-bold">
            <label className="text-stone-600 dark:text-gray-300">
              Mi quebrada:
              <select
                value={quebradaId}
                onChange={(e) => setQuebradaId(e.target.value)}
                className="ml-2 rounded-xl border-2 border-cocoa/30 bg-white p-1.5 text-stone-900 dark:border-white/20 dark:bg-[#0b141a] dark:text-white"
              >
                {QUEBRADAS.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={enviarUbicacion}
              title="Enviar ubicación"
              className="rounded-2xl border-2 border-cocoa/30 bg-white px-3 py-2 text-lg hover:bg-sol/50 dark:border-white/20 dark:bg-[#0b141a] dark:hover:bg-white/10"
            >
              📍
            </button>
            <button
              onClick={() => fotoRef.current?.click()}
              title="Enviar foto"
              className="rounded-2xl border-2 border-cocoa/30 bg-white px-3 py-2 text-lg hover:bg-sol/50 dark:border-white/20 dark:bg-[#0b141a] dark:hover:bg-white/10"
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
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviarTexto()}
              placeholder="Escribe un mensaje"
              className="flex-1 rounded-2xl border-2 border-cocoa/30 bg-white px-4 py-2 text-sm font-semibold text-stone-900 placeholder:text-stone-400 dark:border-white/20 dark:bg-[#0b141a] dark:text-white dark:placeholder:text-gray-400"
            />
            <button
              onClick={enviarTexto}
              className="rounded-2xl border-2 border-cocoa bg-hoja px-4 py-2 font-black text-white hover:brightness-110 dark:border-white/20"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
