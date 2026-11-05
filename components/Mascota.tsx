"use client";

import { motion } from "framer-motion";
import type { Semaforo } from "@/lib/risk";

// Chaski, el cuy mensajero: marioneta de 2 capas (cabeza + cuerpo) recortadas de
// la imagen oficial. Cada capa se mueve por separado: la cabeza cabecea, el
// cuerpo respira y todo reacciona al toque. El fondo blanco une las capas.

export type Animo = "feliz" | "preocupado" | "alerta" | "sorpresa";

export function animoDe(semaforo: Semaforo): Exclude<Animo, "sorpresa"> {
  return semaforo === "rojo" ? "alerta" : semaforo === "amarillo" ? "preocupado" : "feliz";
}

const CABEZA_ANIM: Record<Animo, string> = {
  feliz: "yaku-cabeza",
  preocupado: "yaku-cabeza-duda",
  alerta: "yaku-cabeza-susto",
  sorpresa: "yaku-cabeza",
};

export default function Mascota({
  animo = "feliz",
  saludo = false,
  size = 120,
  className = "",
}: {
  animo?: Animo;
  /** Si es true, la cabeza se mueve más rápido como saludando. */
  saludo?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Chaski, el cuy mensajero, ${animo}${saludo ? ", saludando" : ""}`}
      className="inline-block overflow-hidden rounded-[26%] border-[3px] border-cocoa bg-white leading-none dark:border-crema/70"
      style={{ width: size, aspectRatio: "735 / 509" }}
    >
      <motion.span
        className="relative block h-full w-full"
        whileHover={{ scale: 1.05, rotate: -1 }}
        whileTap={{ scale: 0.88, rotate: 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 12 }}
        title="¡Toca a Chaski!"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascota-cuerpo.png"
          alt=""
          aria-hidden
          draggable={false}
          className="yaku-cuerpo absolute select-none"
          style={{ left: 0, top: "45.19%", width: "100%" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascota-cabeza.png"
          alt=""
          aria-hidden
          draggable={false}
          className={`absolute select-none ${saludo ? "yaku-cabeza-saludo" : CABEZA_ANIM[animo]} ${className}`}
          style={{ left: "20.41%", top: 0, width: "51.7%" }}
        />
      </motion.span>
    </span>
  );
}
