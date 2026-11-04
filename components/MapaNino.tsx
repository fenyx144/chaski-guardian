"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Mascota from "@/components/Mascota";

interface NinoData {
  oni: number;
  fase: "El Niño" | "La Niña" | "Neutral";
}

interface DatosMapa {
  lats: number[];
  lons: number[];
  paso: number;
  sst: (number | null)[][];
  aire: (number | null)[][];
  nubes: (number | null)[][];
  lluvia: (number | null)[][];
}

type Capa = "mar" | "aire" | "lluvia" | "nubes";

const AREQUIPA: [number, number] = [-71.54, -16.4];

type RGBA = [number, number, number, number];

const BANDAS: Record<Capa, (v: number | null) => RGBA | null> = {
  mar: (v) => {
    if (v === null) return null;
    if (v < 18) return [27, 58, 122, 210];
    if (v < 20) return [47, 111, 181, 210];
    if (v < 22) return [63, 167, 201, 210];
    if (v < 24) return [111, 194, 180, 210];
    if (v < 26) return [232, 200, 50, 210];
    if (v < 28) return [239, 125, 38, 210];
    if (v < 30) return [255, 88, 51, 210];
    return [179, 38, 30, 220];
  },
  aire: (v) => {
    if (v === null) return null;
    if (v < 10) return [27, 58, 122, 200];
    if (v < 15) return [47, 111, 181, 200];
    if (v < 20) return [63, 167, 201, 200];
    if (v < 25) return [232, 200, 50, 200];
    if (v < 30) return [255, 88, 51, 200];
    return [179, 38, 30, 210];
  },
  lluvia: (v) => {
    if (v === null || v <= 0) return null;
    if (v < 2) return [188, 216, 245, 210];
    if (v < 10) return [91, 155, 213, 215];
    if (v < 30) return [31, 95, 168, 220];
    return [106, 63, 181, 225];
  },
  nubes: (v) => {
    if (v === null) return null;
    if (v < 15) return [255, 255, 255, 50];
    if (v < 40) return [217, 212, 197, 190];
    if (v < 70) return [154, 147, 138, 200];
    return [74, 70, 64, 210];
  },
};

const LEYENDAS: Record<Capa, [string, string][]> = {
  mar: [["Fría (menos de 20°)", "#2f6fb5"], ["Normal (20 a 26°)", "#e8c832"], ["Caliente (más de 26°)", "#ff5833"]],
  aire: [["Frío (menos de 15°)", "#2f6fb5"], ["Normal (15 a 25°)", "#e8c832"], ["Caliente (más de 25°)", "#ff5833"]],
  lluvia: [["Poca (menos de 10 mm)", "#5b9bd5"], ["Mucha (10 mm o más)", "#1f5fa8"]],
  nubes: [["Despejado", "#d9d4c5"], ["Nublado", "#4a4640"]],
};

const FRASE: Record<Capa, (v: number) => string> = {
  mar: (v) => `Aquí el mar está a ${v} grados: ${v >= 27 ? "agua caliente" : v < 22 ? "agua fría" : "agua normal"}.`,
  aire: (v) => `Aquí el aire está a ${v} grados.`,
  lluvia: (v) => (v <= 0 ? "Aquí no llovió ayer ni hoy." : `Aquí cayeron ${v} mm entre ayer y hoy.`),
  nubes: (v) => (v < 40 ? "Aquí está despejado." : "Aquí está nublado."),
};

function fraseEstado(d: NinoData): { titulo: string; detalle: string; animo: "feliz" | "preocupado" | "alerta" } {
  if (d.fase === "El Niño") {
    return d.oni >= 1.5
      ? { titulo: "El mar está muy caliente: El Niño está fuerte.", detalle: "Cuida mucho tu quebrada si llueve.", animo: "alerta" }
      : { titulo: "El mar está caliente: hay El Niño.", detalle: "Atento a la lluvia y a tu quebrada.", animo: "alerta" };
  }
  if (d.fase === "La Niña") {
    return { titulo: "El mar está frío: hay La Niña.", detalle: "Igual cuida tu quebrada si llueve.", animo: "preocupado" };
  }
  return { titulo: "El mar está normal: no hay El Niño.", detalle: "Igual mira tu semáforo si llueve.", animo: "feliz" };
}

function calorURL(vals: (number | null)[][], capa: Capa): string {
  const h = vals.length;
  const w = vals[0].length;
  const chico = document.createElement("canvas");
  chico.width = w;
  chico.height = h;
  const c = chico.getContext("2d")!;
  const banda = BANDAS[capa];
  for (let r = 0; r < h; r++) {
    for (let q = 0; q < w; q++) {
      const col = banda(vals[r][q]);
      if (!col) continue;
      c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${col[3] / 255})`;
      c.fillRect(q, h - 1 - r, 1, 1);
    }
  }
  const grande = document.createElement("canvas");
  grande.width = w * 8;
  grande.height = h * 8;
  const g = grande.getContext("2d")!;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(chico, 0, 0, grande.width, grande.height);
  return grande.toDataURL("image/png");
}

export default function MapaNino() {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const [datos, setDatos] = useState<NinoData | null>(null);
  const [rejilla, setRejilla] = useState<DatosMapa | null>(null);
  const [capa, setCapa] = useState<Capa>("mar");
  const [pintando, setPintando] = useState(true);
  const [avisoUbic, setAvisoUbic] = useState("");
  const marcadorUsuario = useRef<maplibregl.Marker | null>(null);

  const pintar = useCallback(
    (m: DatosMapa, c: Capa) => {
      const map = mapa.current;
      if (!map) return;
      const vals = m[capaKey(c)];
      const url = calorURL(vals, c);
      const medio = m.paso / 2;
      const bounds: [[number, number], [number, number]] = [
        [m.lons[0] - medio, m.lats[0] - medio],
        [m.lons[m.lons.length - 1] + medio, m.lats[m.lats.length - 1] + medio],
      ];
      const src = map.getSource("capa") as unknown as
        | { updateImage?: (o: { url: string }) => void }
        | undefined;
      if (src?.updateImage) {
        src.updateImage({ url });
        return;
      }
      map.addSource("capa", { type: "image", url, coordinates: [bounds[0], [bounds[1][0], bounds[0][1]], bounds[1], [bounds[0][0], bounds[1][1]]] });
      map.addLayer({ id: "capa-fill", type: "raster", source: "capa", paint: { "raster-opacity": 0.85 } });
    },
    []
  );

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-100, -8],
      zoom: 3,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.dragRotate.disable();
    mapa.current = map;

    map.on("load", async () => {
      try {
        const [rNino, rMar] = await Promise.all([fetch("/api/nino"), fetch("/api/mar")]);
        if (!rNino.ok || !rMar.ok) throw new Error();
        setDatos((await rNino.json()) as NinoData);
        const m = (await rMar.json()) as DatosMapa;
        setRejilla(m);
        pintar(m, "mar");
      } catch {
        /* el mapa base sigue visible */
      } finally {
        setPintando(false);
      }

      map.on("click", "capa-fill", (e) => {
        const g = rejillaRef.current;
        const cc = capaRef.current;
        if (!g || !e.lngLat) return;
        const qi = Math.round((e.lngLat.lng - g.lons[0]) / g.paso);
        const ri = Math.round((e.lngLat.lat - g.lats[0]) / g.paso);
        if (ri < 0 || ri >= g.lats.length || qi < 0 || qi >= g.lons.length) return;
        const v = g[capaKey(cc)][ri][qi];
        if (v === null || v === undefined) return;
        new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<strong>${FRASE[cc](v)}</strong>`).addTo(map);
      });

      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;border-radius:9999px;background:#ff5833;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)";
      new maplibregl.Marker({ element: el })
        .setLngLat(AREQUIPA)
        .setPopup(new maplibregl.Popup().setHTML("<strong>Arequipa</strong><br/>Tus quebradas están aquí."))
        .addTo(map);
    });

    return () => {
      map.remove();
      mapa.current = null;
    };
  }, [pintar]);

  const rejillaRef = useRef<DatosMapa | null>(null);
  const capaRef = useRef<Capa>("mar");
  useEffect(() => {
    rejillaRef.current = rejilla;
  }, [rejilla]);

  useEffect(() => {
    capaRef.current = capa;
    if (rejilla) pintar(rejilla, capa);
  }, [capa, rejilla, pintar]);

  const ubicarme = () => {
    const map = mapa.current;
    if (!map || !("geolocation" in navigator)) {
      setAvisoUbic("Tu celular no permite ubicarte.");
      return;
    }
    setAvisoUbic("Buscando dónde estás…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setAvisoUbic("");
        map.flyTo({ center: [lon, lat], zoom: 9, duration: 2500 });
        marcadorUsuario.current?.remove();
        marcadorUsuario.current = new maplibregl.Marker({ color: "#ffc933" })
          .setLngLat([lon, lat])
          .addTo(map);
        try {
          const res = await fetch(`/api/risk?lat=${lat}&lon=${lon}`);
          const r = (await res.json()) as { semaforo?: string };
          marcadorUsuario.current.setPopup(
            new maplibregl.Popup().setHTML(
              `<strong>Tú estás aquí</strong><br/>Tu color: ${r.semaforo ?? "?"}`
            )
          ).togglePopup();
        } catch {
          setAvisoUbic("Te ubicamos, pero no llegó tu color.");
        }
      },
      () => setAvisoUbic("Activa el GPS y permite el acceso."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const estado = datos ? fraseEstado(datos) : null;
  const capas: { id: Capa; nombre: string; icono: string }[] = [
    { id: "mar", nombre: "Mar", icono: "🌊" },
    { id: "aire", nombre: "Aire", icono: "🌡️" },
    { id: "lluvia", nombre: "Lluvia", icono: "🌧️" },
    { id: "nubes", nombre: "Nubes", icono: "☁️" },
  ];

  return (
    <div className="space-y-4">
      {estado && (
        <div className="flex items-center gap-4 rounded-3xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
          <Mascota animo={estado.animo} size={86} className="shrink-0" />
          <div>
            <p className="font-display text-2xl leading-tight md:text-3xl">{estado.titulo}</p>
            <p className="mt-1 font-bold text-cocoa/70 dark:text-crema/70">{estado.detalle}</p>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl border-2 border-cocoa shadow-pop dark:border-crema/25 dark:shadow-pop-noche">
        <div ref={contenedor} className="h-[400px] w-full md:h-[480px]" aria-label="Mapa de calor del Pacífico" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {capas.map((c) => (
            <button
              key={c.id}
              onClick={() => setCapa(c.id)}
              aria-pressed={capa === c.id}
              className={`rounded-xl border-2 px-3 py-1.5 text-sm font-extrabold backdrop-blur transition-all ${
                capa === c.id
                  ? "border-cocoa bg-sol text-cocoa"
                  : "border-white/40 bg-black/60 text-white hover:bg-black/80"
              }`}
            >
              {c.icono} {c.nombre}
            </button>
          ))}
        </div>
        {pintando && (
          <p className="absolute bottom-4 left-3 rounded-xl bg-black/60 px-3 py-1.5 text-xs font-extrabold text-white">
            Pintando el mapa…
          </p>
        )}
        <button
          onClick={ubicarme}
          className="absolute bottom-4 right-3 rounded-2xl border-2 border-cocoa bg-sol px-4 py-2 text-sm font-extrabold text-cocoa shadow-pop-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          📍 Ubicarme
        </button>
        {avisoUbic && (
          <p className="absolute bottom-16 right-3 max-w-[60%] rounded-xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
            {avisoUbic}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-extrabold">
        {LEYENDAS[capa].map(([t, c]) => (
          <span key={t} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-cocoa/40" style={{ backgroundColor: c }} />
            {t}
          </span>
        ))}
        <span className="ml-auto text-xs font-bold text-cocoa/55 dark:text-crema/55">
          Toca el mapa para saber cómo está · Datos: Open-Meteo
        </span>
      </div>
    </div>
  );
}

function capaKey(c: Capa): "sst" | "aire" | "lluvia" | "nubes" {
  return c === "mar" ? "sst" : c;
}
