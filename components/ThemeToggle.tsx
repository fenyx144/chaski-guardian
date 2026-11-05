"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  const cambiar = () => {
    const next = !oscuro;
    setOscuro(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("chaski-tema", next ? "oscuro" : "claro");
    } catch {
      /* modo privado: se queda en memoria */
    }
  };

  return (
    <motion.button
      onClick={cambiar}
      whileTap={{ scale: 0.9 }}
      aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={oscuro ? "Tema claro" : "Tema oscuro"}
      className="rounded-lg border border-stone-300 p-2 text-stone-600 transition-colors hover:bg-stone-900/5 dark:border-white/15 dark:text-andino-arena dark:hover:bg-white/10"
    >
      <motion.span
        key={String(oscuro)}
        initial={{ rotate: -40, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        className="block h-5 w-5"
      >
        {oscuro ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
          </svg>
        )}
      </motion.span>
    </motion.button>
  );
}
