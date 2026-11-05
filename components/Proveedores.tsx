"use client";

import { MotionConfig } from "framer-motion";
import { LanguageProvider } from "@/lib/i18n";

// Respeta "reducir movimiento" del sistema en todas las animaciones.
export default function Proveedores({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider>{children}</LanguageProvider>
    </MotionConfig>
  );
}
