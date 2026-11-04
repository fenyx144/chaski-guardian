"use client";

import { motion } from "framer-motion";
import type { Semaforo } from "@/lib/risk";

// Escena 2D ilustrada: quebrada arequipeña con personajes que reaccionan al semáforo.
// Verde: tranquilos · Amarillo: miran al cielo · Rojo: corren al refugio.

type Pose = "tranquilo" | "cielo" | "correr";

const poseDe = (s: Semaforo): Pose =>
  s === "rojo" ? "correr" : s === "amarillo" ? "cielo" : "tranquilo";

interface FiguraProps {
  x: number;
  y: number;
  escala?: number;
  piel: string;
  ropa: string;
  pantalon: string;
  pose: Pose;
  refugioX: number;
  accesorio?: "sombrero" | "chullo" | "gorra" | "canasta" | "cana" | "trenza";
  etiqueta?: string;
}

function Figura({
  x,
  y,
  escala = 1,
  piel,
  ropa,
  pantalon,
  pose,
  refugioX,
  accesorio,
  etiqueta,
}: FiguraProps) {
  const destinoX = pose === "correr" ? refugioX : x;
  const inclinacion = pose === "correr" ? 14 : 0;
  const cabezaRot = pose === "cielo" ? -32 : pose === "correr" ? 8 : 0;

  return (
    <motion.g
      initial={false}
      animate={{ x: destinoX, y, scale: escala }}
      transition={{ type: "spring", stiffness: 60, damping: 14 }}
      style={{ originX: "0px", originY: "0px" }}
    >
      {pose === "correr" && (
        <g stroke="#e8a94e" strokeWidth="2" strokeLinecap="round" opacity="0.8">
          <line x1="-34" y1="-34" x2="-18" y2="-34" />
          <line x1="-38" y1="-24" x2="-16" y2="-24" />
          <line x1="-30" y1="-14" x2="-16" y2="-14" />
        </g>
      )}
      {pose === "cielo" && (
        <text x="16" y="-52" fontSize="16" fill="#e8a94e" fontWeight="bold">
          ?
        </text>
      )}
      <motion.g
        initial={false}
        animate={{ rotate: inclinacion }}
        style={{ originX: "0px", originY: "0px" }}
      >
        {/* piernas */}
        {pose === "correr" ? (
          <g stroke={pantalon} strokeWidth="5" strokeLinecap="round">
            <line x1="0" y1="-22" x2="12" y2="0" />
            <line x1="0" y1="-22" x2="-12" y2="-3" />
          </g>
        ) : (
          <g stroke={pantalon} strokeWidth="5" strokeLinecap="round">
            <line x1="0" y1="-22" x2="-4" y2="0" />
            <line x1="0" y1="-22" x2="4" y2="0" />
          </g>
        )}
        {/* cuerpo / poncho */}
        {accesorio === "sombrero" ? (
          <path d="M-11 -44 L11 -44 L15 -20 L-15 -20 Z" fill={ropa} />
        ) : (
          <rect x="-8" y="-44" width="16" height="24" rx="6" fill={ropa} />
        )}
        {/* brazos */}
        {pose === "correr" ? (
          <g stroke={piel} strokeWidth="4" strokeLinecap="round">
            <line x1="6" y1="-40" x2="16" y2="-30" />
            <line x1="-6" y1="-40" x2="-16" y2="-32" />
          </g>
        ) : pose === "cielo" ? (
          <g stroke={piel} strokeWidth="4" strokeLinecap="round">
            <line x1="6" y1="-40" x2="12" y2="-52" />
            <line x1="-6" y1="-40" x2="-12" y2="-50" />
          </g>
        ) : (
          <g stroke={piel} strokeWidth="4" strokeLinecap="round">
            <line x1="6" y1="-40" x2="8" y2="-24" />
            <line x1="-6" y1="-40" x2="-8" y2="-24" />
          </g>
        )}
        {/* cabeza */}
        <motion.g
          initial={false}
          animate={{ rotate: cabezaRot }}
          style={{ originX: "0px", originY: "-44px" }}
        >
          <circle cx="0" cy="-52" r="10" fill={piel} />
          {pose === "cielo" ? (
            <g fill="#141210">
              <circle cx="-3.5" cy="-55" r="1.4" />
              <circle cx="3.5" cy="-55" r="1.4" />
            </g>
          ) : (
            <g fill="#141210">
              <circle cx="-3.5" cy="-52" r="1.4" />
              <circle cx="3.5" cy="-52" r="1.4" />
            </g>
          )}
          {pose === "correr" ? (
            <ellipse cx="0" cy="-47" rx="2.4" ry="3" fill="#141210" />
          ) : (
            <path
              d="M-4 -47 Q0 -45 4 -47"
              stroke="#141210"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          )}
          {accesorio === "sombrero" && (
            <g>
              <ellipse cx="0" cy="-59" rx="13" ry="3.4" fill="#8a5a24" />
              <rect x="-6" y="-68" width="12" height="10" rx="3" fill="#a06a2c" />
            </g>
          )}
          {accesorio === "chullo" && (
            <g>
              <path d="M-9 -54 A9 9 0 0 1 9 -54 L7 -64 A5 5 0 0 0 -7 -64 Z" fill="#7c2d3e" />
              <circle cx="0" cy="-65" r="2.6" fill="#e8a94e" />
            </g>
          )}
          {accesorio === "gorra" && (
            <g>
              <path d="M-9 -55 A9 9 0 0 1 9 -55 L9 -57 L-9 -57 Z" fill="#1d5c2e" />
              <rect x="6" y="-58" width="9" height="3" rx="1.5" fill="#1d5c2e" />
            </g>
          )}
          {accesorio === "trenza" && (
            <g stroke="#2b2b2b" strokeWidth="3" strokeLinecap="round">
              <line x1="-9" y1="-52" x2="-11" y2="-40" />
              <line x1="9" y1="-52" x2="11" y2="-40" />
            </g>
          )}
        </motion.g>
        {accesorio === "canasta" && (
          <g>
            <rect x="10" y="-26" width="14" height="10" rx="2" fill="#a06a2c" />
            <line x1="8" y1="-26" x2="24" y2="-26" stroke="#6e4520" strokeWidth="2" />
          </g>
        )}
        {accesorio === "cana" && pose !== "correr" && (
          <line x1="10" y1="-30" x2="26" y2="-58" stroke="#6e4520" strokeWidth="2.5" />
        )}
      </motion.g>
      {etiqueta && (
        <text
          x="0"
          y="14"
          fontSize="10"
          fill="#efe3cb"
          textAnchor="middle"
          opacity="0.85"
        >
          {etiqueta}
        </text>
      )}
    </motion.g>
  );
}

function Lluvia({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return null;
  const gotas = Array.from({ length: cantidad }, (_, i) => {
    // Pseudoaleatorio determinista para no romper el render.
    const x = (i * 53 + 11) % 800;
    const y0 = (i * 97) % 320;
    const delay = ((i * 13) % 90) / 100;
    const largo = 10 + ((i * 7) % 10);
    return { x, y0, delay, largo };
  });
  return (
    <g stroke="#7db8e8" strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
      {gotas.map((g, i) => (
        <line
          key={i}
          x1={g.x}
          y1={g.y0}
          x2={g.x - 3}
          y2={g.y0 + g.largo}
          className="yaku-gota"
          style={{ animationDelay: `${g.delay}s` }}
        />
      ))}
    </g>
  );
}

export default function EscenaQuebrada({ semaforo }: { semaforo: Semaforo }) {
  const pose = poseDe(semaforo);
  const cielo =
    semaforo === "rojo"
      ? ["#1a2233", "#2b3a55"]
      : semaforo === "amarillo"
      ? ["#3a3a55", "#6e5a3a"]
      : ["#274b73", "#4a7fb5"];
  const lluviaN = semaforo === "rojo" ? 110 : semaforo === "amarillo" ? 40 : 0;
  const aguaAncho = semaforo === "rojo" ? 96 : semaforo === "amarillo" ? 62 : 40;

  return (
    <svg
      viewBox="0 0 800 420"
      className="block h-auto w-full"
      role="img"
      aria-label={`Escena de quebrada en semáforo ${semaforo}`}
    >
      <defs>
        <linearGradient id="yaku-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cielo[0]} />
          <stop offset="100%" stopColor={cielo[1]} />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="800" height="310" fill="url(#yaku-cielo)" />
      {/* Misti */}
      <path
        d="M560 310 L660 120 L700 170 L730 140 L800 310 Z"
        fill="#3d4a63"
      />
      <path d="M660 120 L700 170 L680 178 L662 160 Z" fill="#e8e4da" />
      {/* cerros */}
      <path d="M0 310 L120 190 L260 310 Z" fill="#4a5a3a" />
      <path d="M200 310 L330 210 L470 310 Z" fill="#42523a" />

      {semaforo === "verde" && (
        <g className="yaku-flotar">
          <circle cx="110" cy="70" r="26" fill="#e8a94e" />
          <circle cx="110" cy="70" r="34" fill="#e8a94e" opacity="0.25" />
        </g>
      )}
      {semaforo !== "verde" && (
        <g fill={semaforo === "rojo" ? "#3a3f4d" : "#555a6a"}>
          <ellipse cx="180" cy="80" rx="70" ry="24" />
          <ellipse cx="420" cy="60" rx="90" ry="28" />
          <ellipse cx="620" cy="90" rx="75" ry="24" />
        </g>
      )}
      {semaforo === "rojo" && (
        <motion.polygon
          points="430,90 410,140 424,140 405,185 445,130 430,130 448,90"
          fill="#ffe066"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      {/* suelo */}
      <rect x="0" y="310" width="800" height="110" fill="#2e2a22" />
      <rect x="0" y="310" width="800" height="10" fill="#3d382c" />

      {/* cauce de la quebrada */}
      <motion.polygon
        initial={false}
        animate={{
          opacity: semaforo === "rojo" ? 1 : 0.85,
        }}
        points={`370,60 ${430 - 0},60 ${400 + aguaAncho / 2},310 ${400 - aguaAncho / 2},310`}
        fill={semaforo === "rojo" ? "#3d6f96" : "#4a7fa5"}
      />
      {semaforo === "rojo" && (
        <g fill="#cfe8f5" opacity="0.8">
          <ellipse cx="392" cy="200" rx="14" ry="4" />
          <ellipse cx="408" cy="250" rx="18" ry="5" />
          <ellipse cx="398" cy="295" rx="22" ry="5" />
        </g>
      )}

      {/* casas */}
      <g>
        <rect x="60" y="272" width="60" height="42" fill="#c9b48a" />
        <polygon points="55,272 90,248 125,272" fill="#8a4a2a" />
        <rect x="168" y="280" width="52" height="34" fill="#b59a72" />
        <polygon points="163,280 194,260 225,280" fill="#7c3a24" />
        <rect x="470" y="276" width="56" height="38" fill="#c9b48a" />
        <polygon points="465,276 498,254 531,276" fill="#8a4a2a" />
      </g>

      {/* refugio */}
      <g>
        <rect x="672" y="252" width="90" height="62" rx="4" fill="#1d5c2e" />
        <polygon points="664,252 717,218 770,252" fill="#e8a94e" />
        <rect x="700" y="278" width="26" height="36" fill="#141210" />
        <line x1="717" y1="218" x2="717" y2="196" stroke="#efe3cb" strokeWidth="3" />
        <rect x="717" y="196" width="26" height="14" fill="#e03131" />
        <text x="717" y="244" fontSize="12" fill="#fff" textAnchor="middle" fontWeight="bold">
          REFUGIO
        </text>
      </g>

      <Lluvia cantidad={lluviaN} />

      {/* personajes */}
      <Figura x={110} y={330} piel="#b07a4f" ropa="#7c2d3e" pantalon="#3a3a3a" pose={pose} refugioX={640} accesorio="sombrero" etiqueta="Campesino" />
      <Figura x={215} y={335} piel="#c08a5a" ropa="#2f6f9e" pantalon="#2b2b2b" pose={pose} refugioX={655} accesorio="trenza" etiqueta="Mamá" />
      <Figura x={252} y={345} escala={0.72} piel="#c08a5a" ropa="#e8a94e" pantalon="#3a5a8a" pose={pose} refugioX={668} etiqueta="Niña" />
      <Figura x={330} y={338} escala={0.8} piel="#b07a4f" ropa="#2f9e44" pantalon="#4a4a4a" pose={pose} refugioX={682} accesorio="gorra" etiqueta="Niño" />
      <Figura x={470} y={332} piel="#a06a42" ropa="#3a6a8a" pantalon="#2b2b2b" pose={pose} refugioX={630} accesorio="cana" etiqueta="Pescador" />
      <Figura x={560} y={330} escala={0.92} piel="#b07a4f" ropa="#5a3a6a" pantalon="#2b2b2b" pose={pose} refugioX={646} accesorio="canasta" etiqueta="Abuela" />

      <text x="12" y="410" fontSize="11" fill="#efe3cb" opacity="0.7">
        Ilustración: los personajes reaccionan al semáforo de su quebrada.
      </text>
    </svg>
  );
}
