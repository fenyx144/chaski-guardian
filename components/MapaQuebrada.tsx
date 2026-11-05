"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Semaforo } from "@/lib/risk";
import type { Reporte } from "@/lib/store";
import { useIdioma } from "@/lib/i18n";

// Quebrada realista: foto satelital Esri + relieve 3D (DEM AWS) con niebla,
// ríos reales de OpenStreetMap, el cauce de TU quebrada resaltado con el
// color del semáforo, flujo de agua animado y zona de cercanía (600 m).
// Todo sin llaves de API.

const DEM_TILES = ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"];
const SATELITE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const REFERENCIA =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}";
const OVERPASS =
  "https://overpass-api.de/api/interpreter?data=" +
  encodeURIComponent(
    '[out:json][timeout:25];(way["waterway"~"river|stream|drain"](-16.52,-71.68,-16.24,-71.32););out geom;'
  );

const COLOR_SEMAFORO: Record<Semaforo, string> = {
  verde: "#2f9e44",
  amarillo: "#f5a623",
  rojo: "#e03131",
};

interface WayGeom {
  geometry?: { lat: number; lon: number }[];
  tags?: { name?: string; waterway?: string; intermittent?: string };
}
type Feature = {
  type: "Feature";
  // seca = "si" cuando OSM lo marca intermitente: torrentera que solo lleva agua con lluvia.
  properties: { nombre: string; tipo: string; seca: string };
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

/** Ancho visual del agua según caudal estimado y semáforo (solo ilustrativo). */
function anchoAgua(caudal: number | null | undefined, semaforo: Semaforo): number {
  const base = caudal != null ? Math.min(9, 3 + caudal * 0.6) : 4;
  return semaforo === "rojo" ? base + 2.5 : semaforo === "amarillo" ? base + 1.2 : base;
}

const VACIO: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** Reportes de vecinos como puntos, coloreados por su semáforo. */
function puntos(reportes: Reporte[] = []): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: reportes.map((r) => ({
      type: "Feature" as const,
      properties: { tipo: r.tipo, descripcion: r.descripcion, score: r.score, semaforo: r.semaforo },
      geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] as [number, number] },
    })),
  };
}

function circulo(lon: number, lat: number, radioM: number): GeoJSON.Feature {
  const pts: [number, number][] = [];
  const dLat = radioM / 111320;
  const dLon = radioM / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [pts] },
  };
}

/** El tramo de río/quebrada más cercano al punto = el cauce de la quebrada. */
function cauceCercano(features: Feature[], lon: number, lat: number): Feature | null {
  let mejor: Feature | null = null;
  let mejorD = Infinity;
  for (const f of features) {
    for (const [x, y] of f.geometry.coordinates) {
      const d = (x - lon) ** 2 + (y - lat) ** 2;
      if (d < mejorD) {
        mejorD = d;
        mejor = f;
      }
    }
  }
  return mejor;
}

export default function MapaQuebrada({
  lat,
  lon,
  nombre,
  semaforo,
  caudal,
  reportes,
}: {
  lat: number;
  lon: number;
  nombre: string;
  semaforo: Semaforo;
  caudal?: number | null;
  reportes?: Reporte[];
}) {
  const { t } = useIdioma();
  const tRef = useRef(t);
  tRef.current = t;
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const marcador = useRef<maplibregl.Marker | null>(null);
  const featuresRef = useRef<Feature[]>([]);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const propsRef = useRef({ lat, lon, semaforo, reportes });
  propsRef.current = { lat, lon, semaforo, reportes };
  const [es3D, setEs3D] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [sinRios, setSinRios] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const { lat: la, lon: lo, semaforo: sem } = propsRef.current;
    const color = COLOR_SEMAFORO[sem];
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          satelite: {
            type: "raster",
            tiles: [SATELITE],
            tileSize: 256,
            maxzoom: 18,
            attribution: "Foto satelital: Esri World Imagery",
          },
          referencia: {
            type: "raster",
            tiles: [REFERENCIA],
            tileSize: 256,
            maxzoom: 18,
          },
          dem: {
            type: "raster-dem",
            tiles: DEM_TILES,
            encoding: "terrarium",
            tileSize: 256,
            maxzoom: 15,
            attribution: "Relieve: Terrain Tiles (AWS/Mapzen)",
          },
        },
        layers: [
          { id: "fondo", type: "background", paint: { "background-color": "#101a12" } },
          {
            id: "satelite",
            type: "raster",
            source: "satelite",
            paint: { "raster-saturation": -0.12, "raster-contrast": 0.08 },
          },
          {
            id: "sombreado",
            type: "hillshade",
            source: "dem",
            paint: {
              "hillshade-exaggeration": 0.45,
              "hillshade-shadow-color": "#1c1410",
              "hillshade-highlight-color": "#ffffff",
              "hillshade-accent-color": "#6b543a",
            },
          },
          { id: "referencia", type: "raster", source: "referencia" },
        ],
      },
      center: [lo, la],
      zoom: 13.4,
      pitch: 64,
      bearing: -18,
      maxPitch: 85,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    mapa.current = map;

    map.on("load", async () => {
      map.setTerrain({ source: "dem", exaggeration: 1.5 });

      // Zona de cercanía (600 m): vivir dentro es estar expuesto al cauce.
      map.addSource("zona", { type: "geojson", data: circulo(lo, la, 600) });
      map.addLayer({
        id: "zona-relleno",
        type: "fill",
        source: "zona",
        paint: { "fill-color": color, "fill-opacity": 0.13 },
      });
      map.addLayer({
        id: "zona-borde",
        type: "line",
        source: "zona",
        paint: {
          "line-color": color,
          "line-width": 2,
          "line-opacity": 0.75,
          "line-dasharray": [5, 3],
        },
      });

      try {
        const res = await fetch(OVERPASS, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { elements?: WayGeom[] };
        const features: Feature[] = (data.elements ?? [])
          .filter((w) => (w.geometry?.length ?? 0) > 1)
          .map((w) => ({
            type: "Feature" as const,
            properties: {
              nombre: w.tags?.name ?? "",
              tipo: w.tags?.waterway ?? "",
              seca: w.tags?.intermittent === "yes" ? "si" : "no",
            },
            geometry: {
              type: "LineString" as const,
              coordinates: (w.geometry ?? []).map((p) => [p.lon, p.lat] as [number, number]),
            },
          }));
        featuresRef.current = features;
        if (features.length === 0) setSinRios(true);

        map.addSource("rios", {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });
        map.addLayer({
          id: "rios-cauce",
          type: "line",
          source: "rios",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#0b3d5c", "line-width": 4.6, "line-opacity": 0.55 },
        });
        map.addLayer({
          id: "rios",
          type: "line",
          source: "rios",
          filter: ["!=", ["get", "seca"], "si"],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#4fc3f7", "line-width": 3, "line-opacity": 0.95 },
        });
        // Agua corriendo en TODOS los ríos con agua (guiones blancos en movimiento).
        map.addLayer({
          id: "rios-flujo",
          type: "line",
          source: "rios",
          filter: ["!=", ["get", "seca"], "si"],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": 1.4,
            "line-opacity": 0.85,
            "line-dasharray": [0, 4, 3],
          },
        });
        // Torrenteras: cauces secos (intermitentes en OSM) en arena entrecortado.
        // Se ven secos, pero con lluvia en la parte alta bajan como huaico.
        map.addLayer({
          id: "torrenteras",
          type: "line",
          source: "rios",
          filter: ["==", ["get", "seca"], "si"],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#e8b06a",
            "line-width": 2.6,
            "line-opacity": 0.95,
            "line-dasharray": [7, 4],
          },
        });

        const cauce = cauceCercano(features, lo, la);
        map.addSource("cauce", {
          type: "geojson",
          data: cauce
            ? { type: "FeatureCollection", features: [cauce] }
            : VACIO,
        });
        map.addLayer({
          id: "cauce-halo",
          type: "line",
          source: "cauce",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": color,
            "line-width": 13,
            "line-opacity": 0.4,
            "line-blur": 5,
          },
        });
        map.addLayer({
          id: "cauce-agua",
          type: "line",
          source: "cauce",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#29b6f6", "line-width": 4.6, "line-opacity": 0.98 },
        });
        map.addLayer({
          id: "cauce-flujo",
          type: "line",
          source: "cauce",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": 2,
            "line-opacity": 0.9,
            "line-dasharray": [0, 4, 3],
          },
        });
        // Reportes de vecinos sobre el mismo mapa, por color de semáforo.
        map.addSource("reportes", { type: "geojson", data: puntos(propsRef.current.reportes) });
        map.addLayer({
          id: "reportes-puntos",
          type: "circle",
          source: "reportes",
          paint: {
            "circle-radius": 9,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-color": [
              "match",
              ["get", "semaforo"],
              "rojo", "#e03131",
              "amarillo", "#f5a623",
              "#2f9e44",
            ],
          },
        });
        map.on("click", "reportes-puntos", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as { tipo?: string; descripcion?: string; score?: number };
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${p.tipo ?? "reporte"}</strong> · ${p.score ?? 0}/100<br/>${(p.descripcion ?? "").slice(0, 140)}`)
            .addTo(map);
        });
        map.on("mouseenter", "reportes-puntos", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "reportes-puntos", () => (map.getCanvas().style.cursor = ""));

        // El agua "corre": se cicla el patrón de guiones.
        const pasos: [number, number, number][] = [
          [0, 4, 3],
          [1, 4, 2],
          [2, 4, 1],
          [3, 4, 0],
        ];
        let i = 0;
        animRef.current = setInterval(() => {
          const paso = pasos[i++ % pasos.length];
          if (map.getLayer("cauce-flujo"))
            map.setPaintProperty("cauce-flujo", "line-dasharray", paso);
          if (map.getLayer("rios-flujo"))
            map.setPaintProperty("rios-flujo", "line-dasharray", paso);
        }, 140);
        // Tocar un río/torrentera muestra su nombre y si es cauce seco.
        map.on("click", ["rios", "torrenteras", "cauce-agua"], (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as { nombre?: string; tipo?: string; seca?: string };
          const esSeca = p.seca === "si";
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `<strong>${p.nombre || tRef.current("mq.sinNombre")}</strong><br/>` +
                (esSeca
                  ? tRef.current("mq.popupSeca")
                  : tRef.current("mq.popupAgua") + " " + (p.tipo ?? ""))
            )
            .addTo(map);
        });
        for (const capa of ["rios", "torrenteras", "cauce-agua"]) {
          map.on("mouseenter", capa, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", capa, () => (map.getCanvas().style.cursor = ""));
        }
      } catch {
        setSinRios(true);
      } finally {
        setCargando(false);
        setListo(true);
      }

      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:9999px;background:#ff5833;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.6)";
      marcador.current = new maplibregl.Marker({ element: el })
        .setLngLat([lo, la])
        .setPopup(new maplibregl.Popup().setHTML(`<strong>${nombre}</strong>`))
        .addTo(map);
    });

    return () => {
      if (animRef.current) clearInterval(animRef.current);
      map.remove();
      mapa.current = null;
      setListo(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar de quebrada o de semáforo: vuela, recolorea y recalcula el cauce.
  useEffect(() => {
    const map = mapa.current;
    if (!map || !listo) return;
    const color = COLOR_SEMAFORO[semaforo];
    map.flyTo({ center: [lon, lat], zoom: 13.4, pitch: es3D ? 64 : 0, duration: 1800 });
    marcador.current?.setLngLat([lon, lat]);
    marcador.current?.setPopup(new maplibregl.Popup().setHTML(`<strong>${nombre}</strong>`));
    const zona = map.getSource("zona") as maplibregl.GeoJSONSource | undefined;
    zona?.setData(circulo(lon, lat, 600));
    const cauce = cauceCercano(featuresRef.current, lon, lat);
    const src = map.getSource("cauce") as maplibregl.GeoJSONSource | undefined;
    src?.setData(
      cauce ? { type: "FeatureCollection", features: [cauce] } : VACIO
    );
    for (const capa of ["zona-relleno", "zona-borde", "cauce-halo"]) {
      if (!map.getLayer(capa)) continue;
      const prop = capa === "zona-relleno" ? "fill-color" : "line-color";
      map.setPaintProperty(capa, prop, color);
    }
    // El agua se ve más ancha cuando el caudal/semáforo sube (ilustrativo).
    if (map.getLayer("cauce-agua"))
      map.setPaintProperty("cauce-agua", "line-width", anchoAgua(caudal, semaforo));
    if (map.getLayer("cauce-halo"))
      map.setPaintProperty("cauce-halo", "line-width", anchoAgua(caudal, semaforo) + 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, semaforo, listo, caudal, nombre]);

  // Puntos al día cuando cambian los reportes de esta quebrada.
  useEffect(() => {
    const map = mapa.current;
    if (!map || !listo) return;
    const src = map.getSource("reportes") as maplibregl.GeoJSONSource | undefined;
    src?.setData(puntos(reportes));
  }, [reportes, listo]);

  const alternar3D = () => {
    const map = mapa.current;
    if (!map) return;
    const nuevo = !es3D;
    setEs3D(nuevo);
    if (nuevo) {
      map.setTerrain({ source: "dem", exaggeration: 1.5 });
      map.easeTo({ pitch: 64, bearing: -18, duration: 1200 });
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
    }
  };

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-xl border-2 border-cocoa shadow-pop dark:border-crema/25 dark:shadow-pop-noche">
      <div
        ref={contenedor}
        className="h-full min-h-[420px] w-full"
        aria-label={`Foto satelital y relieve de ${nombre}`}
      />
      <button
        onClick={alternar3D}
        aria-pressed={es3D}
        className={`absolute bottom-3 right-3 rounded-xl border-2 px-3 py-1.5 text-sm font-extrabold backdrop-blur transition-all ${
          es3D
            ? "border-cocoa bg-sol text-cocoa"
            : "border-white/40 bg-black/60 text-white hover:bg-black/80"
        }`}
      >
        {es3D ? "⛰️ 3D" : "🗺️ 2D"}
      </button>
      {cargando && (
        <p className="absolute left-3 top-3 rounded-xl bg-black/65 px-3 py-1.5 text-xs font-extrabold text-white">
          {t("mq.cargando")}
        </p>
      )}
      <div className="absolute bottom-3 left-3 max-w-[78%] rounded-xl bg-black/60 px-3 py-2 text-[11px] font-bold leading-relaxed text-white">
        <p>
          <span
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
            style={{ backgroundColor: COLOR_SEMAFORO[semaforo] }}
          />
          {t("mq.leyenda")} <span className="text-[#e8b06a]">{t("mq.torrenteraSeca")}</span> {t("mq.toca")}<br/>{t("mq.reportes")}
        </p>
        <p className="text-white/75">{t("mq.fuente")}</p>
        {sinRios && !cargando && (
          <p className="text-amber-300">{t("mq.sinRios")}</p>
        )}
      </div>
    </div>
  );
}
