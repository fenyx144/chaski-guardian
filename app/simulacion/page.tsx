"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SEMAFORO_META, type Semaforo } from "@/lib/risk";

const Simulacion3D = dynamic(() => import("@/components/Simulacion3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[440px] items-center justify-center rounded-xl border border-white/10 bg-andino-carbon">
      Cargando terreno 3D…
    </div>
  ),
});

const NIVELES: Semaforo[] = ["verde", "amarillo", "rojo"];

export default function SimulacionPage() {
  const [nivel, setNivel] = useState<Semaforo>("amarillo");

  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-3xl font-black">Simulación de quebrada</h1>
        <p className="mt-2 max-w-2xl text-andino-arena/80">
          Cómo baja el agua por el cauce según el nivel de riesgo. Mueve el
          selector y observa el caudal, la lluvia y las casas en el recorrido.
        </p>
        <p className="mt-2 inline-block rounded-lg bg-andino-ocre/20 px-3 py-1 text-sm font-bold text-andino-ocreClaro">
          ⚠️ Simulación ilustrativa: no representa caudales reales ni predice
          eventos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Nivel de riesgo">
        {NIVELES.map((n) => (
          <button
            key={n}
            onClick={() => setNivel(n)}
            aria-pressed={nivel === n}
            className={`rounded-full px-5 py-2 font-bold transition-all ${
              nivel === n
                ? "text-white shadow-lg"
                : "bg-white/10 text-andino-arena/70 hover:bg-white/20"
            }`}
            style={nivel === n ? { backgroundColor: SEMAFORO_META[n].color } : undefined}
          >
            {SEMAFORO_META[n].titulo}
          </button>
        ))}
      </div>

      <Simulacion3D semaforo={nivel} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-andino-carbon p-4 text-sm">
          <p className="font-bold text-andino-ocreClaro">El cauce</p>
          <p className="mt-1 text-andino-arena/75">
            El agua baja por el centro del valle. En rojo, el caudal crece y se
            acerca a las casas.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-andino-carbon p-4 text-sm">
          <p className="font-bold text-andino-ocreClaro">Las casas</p>
          <p className="mt-1 text-andino-arena/75">
            Viviendas a ambos lados del recorrido: las más cercanas al cauce son
            las más expuestas.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-andino-carbon p-4 text-sm">
          <p className="font-bold text-andino-ocreClaro">El refugio verde</p>
          <p className="mt-1 text-andino-arena/75">
            Punto seguro en lo alto, lejos del agua. En rojo, dirígete allí sin
            cruzar la quebrada.
          </p>
        </div>
      </div>
    </div>
  );
}
