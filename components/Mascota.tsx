"use client";

import { motion } from "framer-motion";
import type { Semaforo } from "@/lib/risk";

// Chaski, el cuy guardián: pegatinas recortadas de la lámina oficial
// (public/mascotas/*.png). Cada ánimo usa su emoción de la lámina.

export type Animo = "feliz" | "preocupado" | "alerta" | "sorpresa";

export function animoDe(semaforo: Semaforo): Exclude<Animo, "sorpresa"> {
  return semaforo === "rojo" ? "alerta" : semaforo === "verde" ? "feliz" : "preocupado";
}

const STICKER: Record<Animo, string> = {
  feliz: "/mascotas/alegre.png",
  preocupado: "/mascotas/preocupado.png",
  alerta: "/mascotas/asustado.png",
  sorpresa: "/mascotas/sorpresa.png",
};

export default function Mascota({
  animo = "feliz",
  saludo = false,
  size = 120,
  className = "",
}: {
  animo?: Animo;
  /** Si es true, usa la pegatina saludando. */
  saludo?: boolean;
  size?: number;
  className?: string;
}) {
  const src = saludo ? "/mascotas/saludando.png" : STICKER[animo];
  return (
    <motion.span
      role="img"
      aria-label={`Chaski, el cuy guardián, ${saludo ? "saludando" : animo}`}
      whileHover={{ scale: 1.05, rotate: -1 }}
      whileTap={{ scale: 0.9, rotate: 2 }}
      transition={{ type: "spring", stiffness: 400, damping: 12 }}
      title="¡Toca a Chaski!"
      className={`inline-block overflow-hidden rounded-[26%] border-[3px] border-cocoa bg-white leading-none dark:border-crema/70 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden draggable={false} className="h-full w-full select-none object-cover" />
    </motion.span>
  );
}
