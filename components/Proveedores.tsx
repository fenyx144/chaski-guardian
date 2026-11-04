"use client";

import { MotionConfig } from "framer-motion";

// Respeta "reducir movimiento" del sistema en todas las animaciones.
export default function Proveedores({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
