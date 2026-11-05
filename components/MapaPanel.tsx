"use client";

import { useEffect, useRef, useState } from "react";
import type { Reporte } from "@/lib/store";
import { SEMAFORO_META } from "@/lib/risk";
import { ZONAS_PROHIBIDAS } from "@/lib/zonas";

// Mapa de reportes SIN MapLibre: foto satelital real (teselas Esri World
// Imagery) con arrastre, zoom, puntos por semáforo y zonas prohibidas.
// Solo matemática de teselas (Web Mercator), sin librerías nuevas.

const CENTRO: [number, number] = [-71.54, -16.395]; // [lon, lat] Arequipa
const TILE = 256;

function mundo(lon: number, lat: number, zoom: number): [number, number] {
  const escala = TILE * 2 ** zoom;
  const x = ((lon + 180) / 360) * escala;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * escala;
  return [x, y];
}

export default function MapaPanel({ reportes }: { reportes: Reporte[] }) {
  const cajaRef = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ ancho: 900, alto: 420 });
  const [zoom, setZoom] = useState(11);
  const [centro, setCentro] = useState<[number, number]>(() => mundo(CENTRO[0], CENTRO[1], 11));
  const [elegido, setElegido] = useState<Reporte | null>(null);
  const arrastre = useRef<{ x: number; y: number; centro: [number, number] } | null>(null);

  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    const medir = () => setTam({ ancho: caja.clientWidth, alto: caja.clientHeight });
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(caja);
    return () => obs.disconnect();
  }, []);

  const cambiarZoom = (nuevo: number) => {
    const z = Math.min(17, Math.max(9, nuevo));
    if (z === zoom) return;
    const factor = 2 ** (z - zoom);
    setCentro(([x, y]) => [x * factor, y * factor]);
    setZoom(z);
  };

  // Teselas que cubren la caja
  const [cx, cy] = centro;
  const x0 = Math.floor((cx - tam.ancho / 2) / TILE);
  const x1 = Math.floor((cx + tam.ancho / 2) / TILE);
  const y0 = Math.floor((cy - tam.alto / 2) / TILE);
  const y1 = Math.floor((cy + tam.alto / 2) / TILE);
  const maxTile = 2 ** zoom - 1;
  const teselas: { x: number; y: number; left: number; top: number }[] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (x < 0 || y < 0 || x > maxTile || y > maxTile) continue;
      teselas.push({ x, y, left: x * TILE - (cx - tam.ancho / 2), top: y * TILE - (cy - tam.alto / 2) });
    }
  }

  const aPantalla = (lon: number, lat: number): [number, number] => {
    const [wx, wy] = mundo(lon, lat, zoom);
    return [wx - cx + tam.ancho / 2, wy - cy + tam.alto / 2];
  };

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-cocoa shadow-pop dark:border-crema/25 dark:shadow-pop-noche">
      <div
        ref={cajaRef}
        className="relative h-[420px] w-full cursor-grab touch-none select-none overflow-hidden bg-[#101a12] active:cursor-grabbing"
        aria-label="Foto satelital de Arequipa con los reportes de los vecinos"
        onPointerDown={(e) => {
          arrastre.current = { x: e.clientX, y: e.clientY, centro };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!arrastre.current) return;
          setCentro([
            arrastre.current.centro[0] - (e.clientX - arrastre.current.x),
            arrastre.current.centro[1] - (e.clientY - arrastre.current.y),
          ]);
        }}
        onPointerUp={() => (arrastre.current = null)}
        onPointerLeave={() => (arrastre.current = null)}
        onWheel={(e) => cambiarZoom(zoom + (e.deltaY < 0 ? 1 : -1))}
      >
        {teselas.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${zoom}-${t.x}-${t.y}`}
            src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${t.y}/${t.x}`}
            alt=""
            draggable={false}
            className="absolute max-w-none"
            style={{ left: t.left, top: t.top, width: TILE, height: TILE }}
          />
        ))}

        {/* Zonas prohibidas */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {ZONAS_PROHIBIDAS.map((z) => (
            <polygon
              key={z.id}
              points={z.poligono.map(([lon, lat]) => aPantalla(lon, lat).join(",")).join(" ")}
              fill="#e03131"
              fillOpacity={0.3}
              stroke="#e03131"
              strokeWidth={2}
            />
          ))}
        </svg>

        {/* Reportes */}
        {reportes.map((r) => {
          const [left, top] = aPantalla(r.lon, r.lat);
          if (left < -20 || top < -20 || left > tam.ancho + 20 || top > tam.alto + 20) return null;
          return (
            <button
              key={r.id}
              onClick={() => setElegido(r)}
              aria-label={`Reporte ${r.tipo}, ${r.score} de 100`}
              className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
              style={{ left, top, backgroundColor: SEMAFORO_META[r.semaforo].color }}
            />
          );
        })}

        {/* Detalle del reporte elegido */}
        {elegido && (
          <div className="absolute left-3 top-3 max-w-[75%] rounded-xl bg-black/70 px-3 py-2 text-xs font-bold leading-relaxed text-white">
            <p>
              {elegido.tipo} · {elegido.score}/100 · {new Date(elegido.fecha).toLocaleString("es-PE")}
            </p>
            <p className="font-medium">{elegido.descripcion || "(sin descripción)"}</p>
            <button onClick={() => setElegido(null)} className="mt-1 rounded bg-white/20 px-2 py-0.5">
              Cerrar
            </button>
          </div>
        )}

        {/* Zoom */}
        <div className="absolute right-3 top-3 flex flex-col gap-1">
          <button onClick={() => cambiarZoom(zoom + 1)} aria-label="Acercar" className="rounded-lg border-2 border-cocoa bg-white px-2.5 py-1 font-black text-cocoa">
            +
          </button>
          <button onClick={() => cambiarZoom(zoom - 1)} aria-label="Alejar" className="rounded-lg border-2 border-cocoa bg-white px-2.5 py-1 font-black text-cocoa">
            −
          </button>
        </div>
        <p className="absolute bottom-2 left-3 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-bold text-white">
          Foto satelital: Esri World Imagery · Arrastra para moverte, rueda o +/− para acercar
        </p>
      </div>
      <div className="flex flex-wrap gap-3 border-t-2 border-cocoa/15 bg-white px-4 py-2 text-xs font-bold text-cocoa/70 dark:border-white/10 dark:bg-carboncito dark:text-crema/75">
        <span>🟢 Bajo</span>
        <span>🟡 Moderado</span>
        <span>🔴 Alto</span>
        <span>🟥 Zona prohibida</span>
      </div>
    </div>
  );
}
