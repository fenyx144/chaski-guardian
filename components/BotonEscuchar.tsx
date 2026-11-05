"use client";

import { useEffect, useState } from "react";
import { useIdioma } from "@/lib/i18n";

// Botón "Escuchar": lee el texto en voz alta con la voz del navegador
// (speechSynthesis). Pensado para adultos mayores y personas que no leen
// bien: el semáforo y la alerta se pueden OÍR en español, quechua o inglés.
// Sin librerías ni modelos: es la voz del propio celular/navegador.

const IDIOMA_VOZ: Record<string, string> = {
  es: "es-PE",
  qu: "qu-PE",
  en: "en-US",
};

export default function BotonEscuchar({
  texto,
  className = "",
}: {
  /** Lo que se va a leer en voz alta. */
  texto: string;
  className?: string;
}) {
  const { t, lang } = useIdioma();
  const [hablando, setHablando] = useState(false);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch { /* sin voz */ }
    };
  }, []);

  const alternar = () => {
    if (!("speechSynthesis" in window)) return;
    if (hablando) {
      window.speechSynthesis.cancel();
      setHablando(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = IDIOMA_VOZ[lang] ?? "es-PE";
    u.rate = 0.92; // un poco más lento: se entiende mejor
    u.onend = () => setHablando(false);
    u.onerror = () => setHablando(false);
    setHablando(true);
    window.speechSynthesis.speak(u);
  };

  return (
    <button
      onClick={alternar}
      aria-pressed={hablando}
      className={`rounded-xl border-2 border-cocoa bg-sol px-3 py-1.5 text-sm font-extrabold text-cocoa shadow-pop-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none dark:border-crema/60 ${className}`}
    >
      {hablando ? t("voz.detener") : t("voz.escuchar")}
    </button>
  );
}
