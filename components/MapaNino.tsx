"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface RegionAnomalias {
  n12: number;
  n3: number;
  n4: number;
  n34: number;
  mes: string;
}

interface NinoData {
  oni: number;
  periodo: string;
  fase: "El Niño" | "La Niña" | "Neutral";
  historial: { periodo: string; valor: number }[];
  regiones: RegionAnomalias;
}

const FASE_COLOR: Record<NinoData["fase"], string> = {
  "El Niño": "#ff5833",
  "La Niña": "#1f6fb5",
  Neutral: "#b98a1d",
};

function colorRegion(a: number): string {
  if (a >= 1.5) return "#b3261e";
  if (a >= 1.0) return "#e05a1f";
  if (a >= 0.5) return "#ef7d26";
  if (a > -0.5) return "#d9c9a8";
  if (a > -1.5) return "#2f6fb5";
  return "#1a4f8a";
}

const fmt = (a: number) => `${a > 0 ? "+" : ""}${a.toFixed(1)}°`;

const AREQUIPA: [number, number] = [-71.54, -16.4];

function regionesGeo(reg: RegionAnomalias) {
  const vals: Record<string, number> = {
    "Niño 1+2": reg.n12,
    "Niño 3": reg.n3,
    "Niño 3.4": reg.n34,
  };
  const polys: [string, number[][][]][] = [
    ["Niño 1+2", [[[-90, 0], [-80, 0], [-80, -10], [-90, -10], [-90, 0]]]],
    ["Niño 3", [[[-150, 5], [-90, 5], [-90, -5], [-150, -5], [-150, 5]]]],
    ["Niño 3.4", [[[-170, 5], [-120, 5], [-120, -5], [-170, -5], [-170, 5]]]],
    ["Niño 4a", [[[160, 5], [180, 5], [180, -5], [160, -5], [160, 5]]]],
    ["Niño 4b", [[[-180, 5], [-150, 5], [-150, -5], [-180, -5], [-180, 5]]]],
  ];
  return {
    type: "FeatureCollection",
    features: polys.map(([nombre, coords]) => {
      const base = nombre.startsWith("Niño 4") ? "Niño 4" : nombre;
      return {
        type: "Feature",
        properties: {
          nombre: base,
          valor: fmt(vals[base] ?? reg.n4),
          color: colorRegion(vals[base] ?? reg.n4),
        },
        geometry: { type: "Polygon", coordinates: coords },
      };
    }),
  };
}

export default function MapaNino() {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const [datos, setDatos] = useState<NinoData | null>(null);
  const [error, setError] = useState("");
  const [avisoUbic, setAvisoUbic] = useState("");
  const marcadorUsuario = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-130, 2],
      zoom: 2,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.dragRotate.disable();
    mapa.current = map;

    map.on("load", async () => {
      try {
        const res = await fetch("/api/nino");
        if (!res.ok) throw new Error();
        const d = (await res.json()) as NinoData;
        setDatos(d);
        map.addSource("ninos", {
          type: "geojson",
          data: regionesGeo(d.regiones) as unknown as GeoJSON.FeatureCollection,
        });
        map.addLayer({
          id: "ninos-fill",
          type: "fill",
          source: "ninos",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.55 },
        });
        map.addLayer({
          id: "ninos-line",
          type: "line",
          source: "ninos",
          paint: { "line-color": "#3d2b1f", "line-width": 1.5 },
        });
        map.addLayer({
          id: "ninos-label",
          type: "symbol",
          source: "ninos",
          layout: {
            "text-field": ["concat", ["get", "nombre"], " ", ["get", "valor"]],
            "text-size": 12,
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#241a13",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          },
        });
      } catch {
        setError("Monitoreo no disponible por ahora.");
      }

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
  }, []);

  const ubicarme = () => {
    const map = mapa.current;
    if (!map || !("geolocation" in navigator)) {
      setAvisoUbic("Tu navegador no permite ubicarte.");
      return;
    }
    setAvisoUbic("Buscando tu ubicación…");
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
          const r = (await res.json()) as { semaforo?: string; score?: number };
          marcadorUsuario.current.setPopup(
            new maplibregl.Popup().setHTML(
              `<strong>Tú estás aquí</strong><br/>Semáforo: ${r.semaforo ?? "?"} (${r.score ?? "?"} / 100)`
            )
          ).togglePopup();
        } catch {
          setAvisoUbic("Te ubicamos, pero no llegó tu semáforo.");
        }
      },
      () => setAvisoUbic("Activa el GPS y permite el acceso."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border-2 border-cocoa shadow-pop dark:border-crema/25 dark:shadow-pop-noche">
        <div ref={contenedor} className="h-[440px] w-full md:h-[520px]" aria-label="Monitoreo de El Niño en el Pacífico" />
        <button
          onClick={ubicarme}
          className="absolute bottom-4 right-3 rounded-2xl border-2 border-cocoa bg-sol px-4 py-2 text-sm font-extrabold text-cocoa shadow-pop-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          📍 Ubicarme
        </button>
        {avisoUbic && (
          <p className="absolute bottom-4 left-3 max-w-[60%] rounded-xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
            {avisoUbic}
          </p>
        )}
      </div>
      {error && <p className="font-bold text-coral">{error}</p>}

      {datos && (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl border-2 border-cocoa bg-white p-5 shadow-pop md:col-span-2 dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="font-display text-5xl leading-none">
                {datos.oni > 0 ? "+" : ""}
                {datos.oni.toFixed(1)}°C
              </p>
              <span
                className="rounded-full border-2 border-cocoa px-3 py-1 text-sm font-extrabold text-white"
                style={{ backgroundColor: FASE_COLOR[datos.fase] }}
              >
                {datos.fase}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-cocoa/60 dark:text-crema/60">
              ONI · {datos.periodo} · anomalía Niño 3.4
            </p>
            <Evolucion historial={datos.historial} />
            <div className="mt-3 grid grid-cols-2 gap-1 text-sm font-bold">
              {(Object.entries({ "1+2": datos.regiones.n12, 3: datos.regiones.n3, 4: datos.regiones.n4, "3.4": datos.regiones.n34 }) as [string, number][]).map(
                ([n, v]) => (
                  <p key={n}>
                    <span className="mr-1 inline-block h-3 w-3 rounded-sm align-baseline" style={{ backgroundColor: colorRegion(v) }} />
                    Niño {n}: {fmt(v)}
                  </p>
                )
              )}
            </div>
            <p className="mt-2 text-xs font-semibold text-cocoa/55 dark:text-crema/55">
              Regiones: ERSSTv5 mensual · {datos.regiones.mes} · NOAA
            </p>
          </div>

          <figure className="overflow-hidden rounded-3xl border-2 border-cocoa bg-white shadow-pop md:col-span-3 dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
            <div className="grid sm:grid-cols-2">
              <div className="p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.senamhi.gob.pe/usr/mnt/fenomeno_nino/ENSO_WEB/oni_web.png"
                  alt="Evolución del índice ONI"
                  loading="lazy"
                  className="h-auto w-full rounded-xl"
                />
                <p className="mt-1 text-xs font-bold text-cocoa/60 dark:text-crema/60">Evolución del ONI</p>
              </div>
              <div className="p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.senamhi.gob.pe/usr/mnt/fenomeno_nino/ENSO_WEB/icen_web.png"
                  alt="Índice costero El Niño (ICEN)"
                  loading="lazy"
                  className="h-auto w-full rounded-xl"
                />
                <p className="mt-1 text-xs font-bold text-cocoa/60 dark:text-crema/60">ICEN costa peruana</p>
              </div>
            </div>
            <figcaption className="border-t-2 border-cocoa/10 px-4 py-2 text-xs font-bold text-cocoa/60 dark:text-crema/60">
              Gráficos: SENAMHI · senamhi.gob.pe
            </figcaption>
          </figure>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-extrabold">
        <span className="mr-1">Anomalía:</span>
        {[
          ["≤ −0.5° fría", "#2f6fb5"],
          ["±0.5° neutral", "#d9c9a8"],
          ["≥ +0.5° cálida", "#ef7d26"],
          ["≥ +1.5° muy cálida", "#b3261e"],
        ].map(([t, c]) => (
          <span key={t} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-cocoa/40" style={{ backgroundColor: c }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Evolucion({ historial }: { historial: { periodo: string; valor: number }[] }) {
  const W = 220;
  const H = 56;
  const vals = historial.map((h) => h.valor);
  const min = Math.min(-0.5, ...vals);
  const max = Math.max(0.5, ...vals);
  const x = (i: number) => (i / Math.max(vals.length - 1, 1)) * (W - 8) + 4;
  const y = (v: number) => H - 6 - ((v - min) / (max - min)) * (H - 12);
  const y0 = y(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-14 w-full" role="img" aria-label="Evolución del ONI, últimos 12 trimestres">
      <line x1="0" y1={y0} x2={W} y2={y0} stroke="#3d2b1f" strokeOpacity="0.3" strokeDasharray="4 3" />
      <line x1="0" y1={y(0.5)} x2={W} y2={y(0.5)} stroke="#ff5833" strokeOpacity="0.5" strokeDasharray="4 3" />
      <polyline
        points={vals.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        stroke="#3d2b1f"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {vals.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === vals.length - 1 ? 4 : 2} fill="#ff5833" stroke="#fff" strokeWidth="1" />
      ))}
    </svg>
  );
}
