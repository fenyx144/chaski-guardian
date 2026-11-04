"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Semaforo } from "@/lib/risk";
import yakuImg from "@/public/mascota-yaku.png";

// Yaku, el cuy guardián: mascota oficial del proyecto (imagen del usuario).
// Se presenta en marco sticker blanco para que funcione en tema claro y oscuro.
// La foto es fija: se anima con balanceos/saltos CSS y reacciona al toque.

export type Animo = "feliz" | "preocupado" | "alerta" | "sorpresa";

export function animoDe(semaforo: Semaforo): Exclude<Animo, "sorpresa"> {
  return semaforo === "rojo" ? "alerta" : semaforo === "amarillo" ? "preocupado" : "feliz";
}

export default function Mascota({
  animo = "feliz",
  saludo = false,
  size = 120,
  className = "",
}: {
  animo?: Animo;
  /** Si es true, la imagen se mece saludando en bucle. */
  saludo?: boolean;
  size?: number;
  className?: string;
}) {
  const movimiento = saludo
    ? "yaku-mascota-saludo"
    : animo === "alerta"
    ? "yaku-mascota-susto"
    : animo === "preocupado"
    ? "yaku-mascota-duda"
    : undefined;

  return (
    <span
      role="img"
      aria-label={`Yaku, el cuy guardián, ${animo}${saludo ? ", saludando" : ""}`}
      className="inline-block overflow-hidden rounded-[26%] border-[3px] border-cocoa bg-white leading-none dark:border-crema/70"
    >
      <motion.span
        className="block"
        whileHover={{ scale: 1.05, rotate: -2 }}
        whileTap={{ scale: 0.85, rotate: 3 }}
        transition={{ type: "spring", stiffness: 400, damping: 12 }}
        title="¡Toca a Yaku!"
      >
        <Image
          src={yakuImg}
          alt=""
          width={size}
          height={Math.round((size * yakuImg.height) / yakuImg.width)}
          className={`${movimiento ?? ""} ${className}`}
          priority={size > 80}
        />
      </motion.span>
    </span>
  );
}
