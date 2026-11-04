"use client";

import { motion } from "framer-motion";
import type { MouseEventHandler, ReactNode } from "react";

// Botón amable: grueso, con sombra dura que se "aprieta" al pasar el cursor.
type Variante = "sol" | "tinta" | "hoja" | "coral" | "linea";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-cocoa px-5 py-2.5 font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-50 dark:border-crema/80";

const APRIETA =
  "hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0";

const ESTILOS: Record<Variante, string> = {
  sol: `bg-sol text-cocoa shadow-pop ${APRIETA} dark:shadow-pop-noche dark:hover:shadow-none`,
  tinta: `bg-cocoa text-crema shadow-pop-sol ${APRIETA} dark:bg-crema dark:text-cocoa dark:shadow-pop-noche dark:hover:shadow-none`,
  hoja: `bg-hoja text-white shadow-pop ${APRIETA} dark:shadow-pop-noche dark:hover:shadow-none`,
  coral: `bg-coral text-white shadow-pop ${APRIETA} dark:shadow-pop-noche dark:hover:shadow-none`,
  linea: "bg-transparent text-cocoa hover:bg-sol/50 dark:text-crema dark:hover:bg-white/10",
};

interface BotonProps {
  variante?: Variante;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  titulo?: string;
  children: ReactNode;
  className?: string;
}

export default function Boton({
  variante = "sol",
  href,
  onClick,
  disabled,
  titulo,
  children,
  className = "",
}: BotonProps) {
  const cls = `${BASE} ${ESTILOS[variante]} ${className}`;
  if (href) {
    return (
      <motion.a whileTap={{ scale: 0.97 }} href={href} title={titulo} className={cls}>
        {children}
      </motion.a>
    );
  }
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      className={cls}
    >
      {children}
    </motion.button>
  );
}
