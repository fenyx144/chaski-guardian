import type { Semaforo } from "@/lib/risk";

// Yaku, el cuy guardián: mascota original en SVG inspirada en la referencia del
// usuario (cuy con capa azul y escudo). Expresión según el semáforo y
// animaciones CSS (saludo, parpadeo, rebote).

export type Animo = "feliz" | "preocupado" | "alerta" | "sorpresa";

export function animoDe(semaforo: Semaforo): Exclude<Animo, "sorpresa"> {
  return semaforo === "rojo" ? "alerta" : semaforo === "amarillo" ? "preocupado" : "feliz";
}

function Estrella({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z"
      fill="#ffc933"
      stroke="#3d2b1f"
      strokeWidth="1"
      transform={`translate(${x} ${y}) scale(${s})`}
    />
  );
}

export default function Mascota({
  animo = "feliz",
  saludo = false,
  size = 120,
  className = "",
}: {
  animo?: Animo;
  /** Si es true, levanta la patita y saluda en bucle. */
  saludo?: boolean;
  size?: number;
  className?: string;
}) {
  const pupilaY = animo === "preocupado" ? 92 : 95;
  const pupilaR = animo === "sorpresa" ? 7.5 : animo === "alerta" ? 7 : 6;

  return (
    <svg
      width={size}
      height={(size * 230) / 200}
      viewBox="0 0 200 230"
      role="img"
      aria-label={`Yaku, el cuy guardián, ${animo}${saludo ? ", saludando" : ""}`}
      className={className}
    >
      {/* destellos */}
      <Estrella x={26} y={62} s={1} />
      <Estrella x={164} y={36} s={0.8} />
      <Estrella x={178} y={96} s={0.6} />

      {/* capa */}
      <path
        d="M52 66 Q26 150 38 204 Q100 188 162 204 Q174 150 148 66 Q124 50 100 50 Q76 50 52 66 Z"
        fill="#1f6fb5"
        stroke="#3d2b1f"
        strokeWidth="3"
      />
      <path
        d="M52 66 Q26 150 38 204 Q70 196 84 192 Q60 150 66 70 Z"
        fill="#185a94"
      />
      {/* broche de la capa */}
      <circle cx="100" cy="74" r="7" fill="#ffc933" stroke="#3d2b1f" strokeWidth="2.5" />

      {/* orejas */}
      <circle cx="58" cy="52" r="17" fill="#a8703f" stroke="#3d2b1f" strokeWidth="3" />
      <circle cx="58" cy="52" r="8" fill="#7c4f28" />
      <circle cx="142" cy="52" r="17" fill="#a8703f" stroke="#3d2b1f" strokeWidth="3" />
      <circle cx="142" cy="52" r="8" fill="#7c4f28" />

      {/* cuerpo y cabeza */}
      <ellipse cx="100" cy="152" rx="56" ry="58" fill="#a8703f" stroke="#3d2b1f" strokeWidth="3" />
      <ellipse cx="100" cy="172" rx="34" ry="36" fill="#c08a5a" />
      <circle cx="100" cy="100" r="48" fill="#a8703f" stroke="#3d2b1f" strokeWidth="3" />
      {/* mancha clara de la cara */}
      <ellipse cx="100" cy="102" rx="29" ry="37" fill="#f6ecdd" />

      {/* ojos (parpadean) */}
      <g className="yaku-ojos">
        <circle cx="84" cy={pupilaY} r={pupilaR} fill="#241a13" />
        <circle cx="116" cy={pupilaY} r={pupilaR} fill="#241a13" />
        <circle cx={84 + 2} cy={pupilaY - 2} r="2" fill="#fff" />
        <circle cx={116 + 2} cy={pupilaY - 2} r="2" fill="#fff" />
      </g>
      {animo === "alerta" && (
        <g stroke="#3d2b1f" strokeWidth="3.5" strokeLinecap="round">
          <line x1="74" y1="80" x2="92" y2="85" />
          <line x1="126" y1="80" x2="108" y2="85" />
        </g>
      )}
      {animo === "sorpresa" && (
        <g fill="none" stroke="#3d2b1f" strokeWidth="3" strokeLinecap="round">
          <path d="M74 80 Q84 73 94 79" />
          <path d="M106 79 Q116 73 126 80" />
        </g>
      )}
      {/* chapitas */}
      <ellipse cx="72" cy="112" rx="7" ry="5" fill="#e8907f" opacity="0.8" />
      <ellipse cx="128" cy="112" rx="7" ry="5" fill="#e8907f" opacity="0.8" />
      {/* nariz y boca */}
      <ellipse cx="100" cy="116" rx="6" ry="4.5" fill="#d67f7f" stroke="#3d2b1f" strokeWidth="1.5" />
      {animo === "feliz" && (
        <path
          d="M90 126 Q100 133 110 126"
          fill="none"
          stroke="#3d2b1f"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
      {animo === "preocupado" && (
        <path
          d="M92 129 q4 -3 8 0 q4 3 8 0"
          fill="none"
          stroke="#3d2b1f"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
      {animo === "alerta" && (
        <ellipse cx="100" cy="130" rx="5" ry="7" fill="#3d2b1f" />
      )}
      {animo === "sorpresa" && (
        <ellipse cx="100" cy="131" rx="6" ry="8.5" fill="#3d2b1f" />
      )}
      {animo === "preocupado" && (
        <path
          d="M142 66 c4 6 4 10 0 12 c-4 -2 -4 -6 0 -12"
          fill="#7db8e8"
          stroke="#3d2b1f"
          strokeWidth="1.5"
        />
      )}

      {/* patita derecha: saluda o descansa */}
      {saludo ? (
        <g className="yaku-saludo">
          <line x1="126" y1="148" x2="154" y2="110" stroke="#3d2b1f" strokeWidth="20" strokeLinecap="round" />
          <line x1="126" y1="148" x2="154" y2="110" stroke="#8f5a30" strokeWidth="13" strokeLinecap="round" />
          <circle cx="157" cy="106" r="11" fill="#8f5a30" stroke="#3d2b1f" strokeWidth="2.5" />
          <g fill="none" stroke="#3d2b1f" strokeWidth="3" strokeLinecap="round" opacity="0.35">
            <path d="M173 92 q8 10 4 24" />
            <path d="M184 86 q10 13 5 31" />
          </g>
        </g>
      ) : (
        <ellipse cx="132" cy="168" rx="12" ry="16" fill="#8f5a30" stroke="#3d2b1f" strokeWidth="2.5" />
      )}
      {/* patas */}
      <ellipse cx="80" cy="208" rx="14" ry="8" fill="#c08a5a" stroke="#3d2b1f" strokeWidth="2.5" />
      <ellipse cx="122" cy="208" rx="14" ry="8" fill="#c08a5a" stroke="#3d2b1f" strokeWidth="2.5" />

      {/* escudo con gota */}
      <g transform={animo === "alerta" ? "translate(-4 -6)" : undefined}>
        <path
          d="M52 122 L84 134 V164 Q84 188 52 198 Q20 188 20 164 V134 Z"
          fill="#ffc933"
          stroke="#3d2b1f"
          strokeWidth="3"
        />
        <path
          d="M52 130 L76 138 V162 Q76 180 52 188 Q28 180 28 162 V138 Z"
          fill="#2fa8c7"
        />
        <path
          d="M52 142 C52 142 42 154 42 160 a10 10 0 0 0 20 0 C62 154 52 142 52 142 Z"
          fill="#fff"
        />
      </g>
    </svg>
  );
}
