"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Mascota from "@/components/Mascota";

interface NinoData {
  oni: number;
  fase: "El Niño" | "La Niña" | "Neutral";
}

interface Anomalia {
  lats: number[];
  lons: number[];
  vals: (number | null)[][];
}

interface ClimaGrid {
  lats: number[];
  lons: number[];
  paso: number;
  aire: (number | null)[][];
  nubes: (number | null)[][];
  lluvia: (number | null)[][];
}

type Vista = "mar" | "clima";

const AREQUIPA: [number, number] = [-71.54, -16.4];

function bandaAnom(v: number | null): string | null {
  if (v === null) return null;
  if (v < -3) return "#082567";
  if (v < -2) return "#08519c";
  if (v < -1) return "#3182bd";
  if (v < -0.5) return "#9ecae1";
  if (v < 0.5) return "#f4f1e6";
  if (v < 1) return "#fee08b";
  if (v < 2) return "#fdae61";
  if (v < 3) return "#f46d43";
  if (v < 4) return "#d73027";
  return "#a50026";
}

const SVG_SOL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke="#3d2b1f" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="5" fill="#ffc933"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" fill="none"/></g></svg>`;
const SVG_SOL_NUBE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="9" cy="9" r="4" fill="#ffc933" stroke="#3d2b1f" stroke-width="1.4"/><path d="M7 20h9a4.5 4.5 0 0 0 .8-8.9A6 6 0 0 0 5.3 12 3.8 3.8 0 0 0 7 20Z" fill="#f5f2ea" stroke="#3d2b1f" stroke-width="1.4"/></svg>`;
const SVG_NUBE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 19h9.5a4.8 4.8 0 0 0 .9-9.5A6.5 6.5 0 0 0 4.8 11 4 4 0 0 0 7 19Z" fill="#f5f2ea" stroke="#3d2b1f" stroke-width="1.4"/></svg>`;
const SVG_LLUVIA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 15h9.5a4.8 4.8 0 0 0 .9-9.5A6.5 6.5 0 0 0 4.8 7 4 4 0 0 0 7 15Z" fill="#f5f2ea" stroke="#3d2b1f" stroke-width="1.4"/><g stroke="#1f6fb5" stroke-width="2" stroke-linecap="round"><path d="M8 18l-1 2.4M13 18l-1 2.4M18 18l-1 2.4"/></g></svg>`;

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

export default function MapaNino() {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const [datos, setDatos] = useState<NinoData | null>(null);
  const [vista, setVista] = useState<Vista>("mar");
  const [pintando, setPintando] = useState(true);
  const [avisoUbic, setAvisoUbic] = useState("");
  const marcadorUsuario = useRef<maplibregl.Marker | null>(null);
  const anomRef = useRef<Anomalia | null>(null);
  const climaRef = useRef<ClimaGrid | null>(null);
  const vistaRef = useRef<Vista>("mar");

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      bounds: [[-103, -35], [-55, 9]],
      maxBounds: [[-145, -72], [-20, 45]],
      minZoom: 2.2,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.dragRotate.disable();
    mapa.current = map;

    map.on("load", async () => {
      try {
        const [rNino, rAnom, rMar] = await Promise.all([
          fetch("/api/nino"),
          fetch("/api/anomalia"),
          fetch("/api/mar"),
        ]);
        if (rNino.ok) setDatos((await rNino.json()) as NinoData);

        if (rAnom.ok) {
          const a = (await rAnom.json()) as Anomalia;
          anomRef.current = a;
          const w = a.lons.length;
          const h = a.lats.length;
          const cv = document.createElement("canvas");
          cv.width = w;
          cv.height = h;
          const c = cv.getContext("2d")!;
          for (let r = 0; r < h; r++) {
            for (let q = 0; q < w; q++) {
              const col = bandaAnom(a.vals[r][q]);
              if (!col) continue;
              c.fillStyle = col;
              c.fillRect(q, h - 1 - r, 1, 1);
            }
          }
          const sw: [number, number] = [a.lons[0] - 0.25, a.lats[0] - 0.25];
          const ne: [number, number] = [a.lons[w - 1] + 0.25, a.lats[h - 1] + 0.25];
          map.addSource("anom", {
            type: "image",
            url: cv.toDataURL("image/png"),
            coordinates: [sw, [ne[0], sw[1]], ne, [sw[0], ne[1]]],
          });
          map.addLayer({
            id: "anom-fill",
            type: "raster",
            source: "anom",
            paint: { "raster-opacity": 0.92, "raster-resampling": "nearest" },
          });
        }

        if (rMar.ok) {
          const g = (await rMar.json()) as ClimaGrid;
          climaRef.current = g;
          const cargar = (svg: string) =>
            new Promise<HTMLImageElement>((res, rej) => {
              const img = new Image();
              img.onload = () => res(img);
              img.onerror = rej;
              img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
            });
          const [sol, solNube, nube, lluviaImg] = await Promise.all([
            cargar(SVG_SOL),
            cargar(SVG_SOL_NUBE),
            cargar(SVG_NUBE),
            cargar(SVG_LLUVIA),
          ]);
          const icono = (lluvia: number | null, nubes: number | null) =>
            (lluvia ?? 0) >= 2 ? lluviaImg : (nubes ?? 0) >= 70 ? nube : (nubes ?? 0) >= 40 ? solNube : sol;

          const cols: number[] = [];
          const rows: number[] = [];
          g.lons.forEach((lo, i) => { if (lo >= -90 && lo <= -35) cols.push(i); });
          g.lats.forEach((la, i) => { if (la >= -55 && la <= 10) rows.push(i); });
          const CEL = 44;
          const cv = document.createElement("canvas");
          cv.width = cols.length * CEL;
          cv.height = rows.length * CEL;
          const c = cv.getContext("2d")!;
          rows.forEach((r, ri) => {
            cols.forEach((q, ci) => {
              const img = icono(g.lluvia[r][q], g.nubes[r][q]);
              const x = ci * CEL + (CEL - 34) / 2;
              const y = (rows.length - 1 - ri) * CEL + (CEL - 34) / 2;
              c.drawImage(img, x, y, 34, 34);
            });
          });
          const sw: [number, number] = [g.lons[cols[0]] - g.paso / 2, g.lats[rows[0]] - g.paso / 2];
          const ne: [number, number] = [
            g.lons[cols[cols.length - 1]] + g.paso / 2,
            g.lats[rows[rows.length - 1]] + g.paso / 2,
          ];
          map.addSource("clima", {
            type: "image",
            url: cv.toDataURL("image/png"),
            coordinates: [sw, [ne[0], sw[1]], ne, [sw[0], ne[1]]],
          });
          map.addLayer({
            id: "clima-fill",
            type: "raster",
            source: "clima",
            layout: { visibility: "none" },
            paint: { "raster-opacity": 0.95 },
          });
        }
      } catch {
        /* el mapa base sigue visible */
      } finally {
        setPintando(false);
      }

      map.on("click", (e) => {
        if (vistaRef.current === "mar") {
          const a = anomRef.current;
          if (!a) return;
          const pasoLat = a.lats.length > 1 ? a.lats[1] - a.lats[0] : 0.5;
          const pasoLon = a.lons.length > 1 ? a.lons[1] - a.lons[0] : 0.5;
          const ri = Math.round((e.lngLat.lat - a.lats[0]) / pasoLat);
          const qi = Math.round((e.lngLat.lng - a.lons[0]) / pasoLon);
          if (ri < 0 || ri >= a.lats.length || qi < 0 || qi >= a.lons.length) return;
          const v = a.vals[ri][qi];
          if (v === null || v === undefined) return;
          const texto =
            v >= 0.5
              ? `Aquí el mar está ${v} grados más caliente que lo normal.`
              : v <= -0.5
              ? `Aquí el mar está ${Math.abs(v)} grados más frío que lo normal.`
              : "Aquí el mar está normal.";
          new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<strong>${texto}</strong>`).addTo(map);
        } else {
          const g = climaRef.current;
          if (!g) return;
          const ri = Math.round((e.lngLat.lat - g.lats[0]) / g.paso);
          const qi = Math.round((e.lngLat.lng - g.lons[0]) / g.paso);
          if (ri < 0 || ri >= g.lats.length || qi < 0 || qi >= g.lons.length) return;
          const lluvia = g.lluvia[ri][qi] ?? 0;
          const nubes = g.nubes[ri][qi] ?? 0;
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `<strong>Aire: ${g.aire[ri][qi] ?? "?"}°</strong><br/>` +
                `${nubes >= 70 ? "Nublado" : nubes >= 40 ? "Sol y nubes" : "Despejado"} (${nubes}%)<br/>` +
                `${lluvia > 0 ? `Lluvia: ${lluvia} mm entre ayer y hoy.` : "Sin lluvia ayer ni hoy."}`
            )
            .addTo(map);
        }
      });

      const etiqueta = document.createElement("div");
      etiqueta.textContent = "PERÚ";
      etiqueta.style.cssText =
        "font-family:var(--font-display),sans-serif;font-size:22px;letter-spacing:4px;color:#3d2b1f;text-shadow:0 0 6px #fff,0 0 6px #fff,0 0 6px #fff;pointer-events:none";
      new maplibregl.Marker({ element: etiqueta }).setLngLat([-73.8, -10.5]).addTo(map);

      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#ff5833;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)";
      new maplibregl.Marker({ element: el })
        .setLngLat(AREQUIPA)
        .setPopup(new maplibregl.Popup().setHTML("<strong>Arequipa</strong><br/>Tus quebradas están aquí."))
        .addTo(map);
    });

    return () => {
      map.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    vistaRef.current = vista;
    const map = mapa.current;
    if (!map) return;
    const aplicar = () => {
      if (map.getLayer("anom-fill")) map.setLayoutProperty("anom-fill", "visibility", vista === "mar" ? "visible" : "none");
      if (map.getLayer("clima-fill")) map.setLayoutProperty("clima-fill", "visibility", vista === "clima" ? "visible" : "none");
    };
    if (map.loaded()) aplicar();
    else map.once("load", aplicar);
  }, [vista]);

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
        map.setMaxBounds();
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

  const leyendaMar: [string, string][] = [
    ["Mucho más frío", "#08519c"],
    ["Más frío", "#9ecae1"],
    ["Normal", "#f4f1e6"],
    ["Más caliente", "#fdae61"],
    ["Mucho más caliente", "#a50026"],
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
        <div ref={contenedor} className="h-[400px] w-full md:h-[480px]" aria-label="Mapa del estado del mar y el clima" />
        <div className="absolute left-3 top-3 flex gap-2">
          <button
            onClick={() => setVista("mar")}
            aria-pressed={vista === "mar"}
            className={`rounded-xl border-2 px-3 py-1.5 text-sm font-extrabold backdrop-blur transition-all ${
              vista === "mar" ? "border-cocoa bg-sol text-cocoa" : "border-white/40 bg-black/60 text-white hover:bg-black/80"
            }`}
          >
            🌊 Mar
          </button>
          <button
            onClick={() => setVista("clima")}
            aria-pressed={vista === "clima"}
            className={`rounded-xl border-2 px-3 py-1.5 text-sm font-extrabold backdrop-blur transition-all ${
              vista === "clima" ? "border-cocoa bg-sol text-cocoa" : "border-white/40 bg-black/60 text-white hover:bg-black/80"
            }`}
          >
            🌦️ Clima
          </button>
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

      {vista === "mar" ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-extrabold">
          {leyendaMar.map(([t, c]) => (
            <span key={t} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm border border-cocoa/40" style={{ backgroundColor: c }} />
              {t}
            </span>
          ))}
          <span className="ml-auto text-xs font-bold text-cocoa/55 dark:text-crema/55">
            Comparado con lo normal · NOAA
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-extrabold">
          <span>☀️ Sol</span>
          <span>🌤️ Sol y nubes</span>
          <span>☁️ Nublado</span>
          <span>🌧️ Lluvia</span>
          <span className="ml-auto text-xs font-bold text-cocoa/55 dark:text-crema/55">
            Toca el mapa para ver el detalle · Open-Meteo
          </span>
        </div>
      )}
    </div>
  );
}
