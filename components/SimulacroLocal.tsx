"use client";

import { createContext, useContext, useState } from "react";
import ChatWidget from "@/components/ChatWidget";

// Simulacro de crecida LOCAL de la portada: el estado vive solo en este
// componente (useState). No toca el store, no llama a /api/simulacion,
// no envia WhatsApp ni guarda reportes: solo cambia lo que ve ESTE
// visitante. El estado se pasa a ChatWidget como prop `simulacro`.
const SimulacroCtx = createContext<{
  activo: boolean;
  setActivo: (v: boolean) => void;
}>({ activo: false, setActivo: () => undefined });

export const useSimulacroLocal = () => useContext(SimulacroCtx);

export default function SimulacroLocal({ children }: { children: React.ReactNode }) {
  const [activo, setActivo] = useState(false);
  return (
    <SimulacroCtx.Provider value={{ activo, setActivo }}>
      {children}
      <ChatWidget simulacro={activo} />
    </SimulacroCtx.Provider>
  );
}
