"use client";

import { useEffect, useRef, useState } from "react";
import { QUEBRADAS } from "@/lib/quebradas";
import { SEMAFORO_META, type Semaforo } from "@/lib/risk";

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
    <div className="mx-auto max-w-2xl space-y-4 pt-8">
      <div>
        <h1 className="text-3xl font-black">Chat demo (WhatsApp)</h1>
        <p className="mt-1 text-sm text-andino-arena/70">
          Simula el bot de WhatsApp sin configurar nada: usa la misma lógica que
          el webhook real.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 shadow-xl">
        {/* Cabecera */}
        <div className="flex items-center gap-3 bg-[#1f2c34] px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-andino-verde text-xl font-black text-white">
            Y
          </span>
          <div>
            <p className="font-bold text-white">Yaku Guardian</p>
            <p className="text-xs text-green-300">
              {escribiendo ? "escribiendo…" : "en línea"}
            </p>
          </div>
        </div>

        {/* Mensajes */}
        <div className="chat-scroll h-[420px] space-y-2 overflow-y-auto bg-[#0b141a] bg-[radial-gradient(circle_at_20%_20%,rgba(47,158,68,0.08),transparent_50%)] p-4">
          {mensajes.map((m) => (
            <div key={m.id} className={`flex ${m.de === "yo" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow ${
                  m.de === "yo" ? "bg-[#005c4b] text-white" : "bg-[#202c33] text-gray-100"
                }`}
              >
                {m.imagen && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imagen} alt="Foto enviada" className="mb-1 max-h-48 rounded" />
                )}
                {m.ubicacion && <p>📍 {m.ubicacion}</p>}
                {m.texto && <p>{m.texto}</p>}
              </div>
            </div>
          ))}
          {escribiendo && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-[#202c33] px-4 py-2 text-sm text-gray-300">…</div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        {/* Entrada */}
        <div className="space-y-2 bg-[#1f2c34] p-3">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-300">
              Mi quebrada:
              <select
                value={quebradaId}
                onChange={(e) => setQuebradaId(e.target.value)}
                className="ml-2 rounded-lg bg-[#0b141a] p-1.5 text-white"
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
              className="rounded-full bg-[#0b141a] px-3 py-2 text-lg hover:bg-white/10"
            >
              📍
            </button>
            <button
              onClick={() => fotoRef.current?.click()}
              title="Enviar foto"
              className="rounded-full bg-[#0b141a] px-3 py-2 text-lg hover:bg-white/10"
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
              className="flex-1 rounded-full bg-[#0b141a] px-4 py-2 text-sm text-white placeholder-gray-400"
            />
            <button
              onClick={enviarTexto}
              className="rounded-full bg-andino-verde px-4 py-2 font-bold text-white hover:bg-andino-verdeOscuro"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
