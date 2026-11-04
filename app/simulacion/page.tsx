"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import { SEMAFORO_META, type Semaforo } from "@/lib/risk";
import Boton from "@/components/Boton";

const Simulacion3D = dynamic(() => import("@/components/Simulacion3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[440px] items-center justify-center rounded-3xl border-2 border-cocoa bg-white font-bold dark:border-crema/25 dark:bg-carboncito">
      Cargando terreno 3D…
    </div>
  ),
});

const NIVELES: { id: Semaforo; variante: "hoja" | "sol" | "coral" }[] = [
  { id: "verde", variante: "hoja" },
  { id: "amarillo", variante: "sol" },
  { id: "rojo", variante: "coral" },
];

const NOTAS = [
  {
    titulo: "El cauce",
    texto: "El agua baja por el centro del valle. En rojo, el caudal crece y se acerca a las casas.",
  },
  {
    titulo: "Las casas",
    texto: "Viviendas a ambos lados del recorrido: las más cercanas al cauce son las más expuestas.",
  },
  {
    titulo: "El refugio verde",
    texto: "Punto seguro en lo alto, lejos del agua. En rojo, dirígete allí sin cruzar la quebrada.",
  },
];

export default function SimulacionPage() {
  const [nivel, setNivel] = useState<Semaforo>("amarillo");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="puntos space-y-6 pt-10"
    >
      <div>
        <h1 className="font-display text-4xl md:text-5xl">Simulación de quebrada</h1>
        <p className="mt-2 max-w-2xl font-medium text-cocoa/70 dark:text-crema/80">
          Cómo baja el agua por el cauce según el nivel de riesgo. Cambia el
          selector y mira el caudal, la lluvia y las casas.
        </p>
        <p className="mt-3 inline-block -rotate-1 rounded-full border-2 border-cocoa bg-sol px-4 py-1 text-sm font-extrabold shadow-pop-sm dark:border-crema/60 dark:shadow-pop-noche">
          Simulación ilustrativa, no caudales reales.
        </p>
      </div>

      <div className="flex flex-wrap gap-3" role="group" aria-label="Nivel de riesgo">
        {NIVELES.map((n) => (
          <Boton
            key={n.id}
            variante={n.variante}
            onClick={() => setNivel(n.id)}
            className={
              nivel === n.id ? "outline outline-2 outline-offset-2 outline-cocoa dark:outline-crema" : "opacity-70"
            }
          >
            {SEMAFORO_META[n.id].titulo}
          </Boton>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border-2 border-cocoa shadow-pop dark:border-crema/25 dark:shadow-pop-noche">
        <Simulacion3D semaforo={nivel} />
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {NOTAS.map((n) => (
          <div key={n.titulo} className="border-t-2 border-dashed border-cocoa/30 pt-3 dark:border-crema/25">
            <p className="font-display text-lg">{n.titulo}</p>
            <p className="mt-1 text-sm font-medium text-cocoa/70 dark:text-crema/75">{n.texto}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
