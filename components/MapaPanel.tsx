"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Reporte } from "@/lib/store";
import { SEMAFORO_META } from "@/lib/risk";
import { ZONAS_PROHIBIDAS } from "@/lib/zonas";

// Mapa del coordinador: reportes coloreados por semáforo + zonas prohibidas.

const CENTRO_AREQUIPA: [number, number] = [-71.54, -16.395];

export default function MapaPanel({ reportes }: { reportes: Reporte[] }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: CENTRO_AREQUIPA,
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapa.current = map;

    map.on("load", () => {
      // Zonas prohibidas (polígonos del archivo data/zonas-prohibidas.json).
      map.addSource("prohibidas", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: ZONAS_PROHIBIDAS.map((z) => ({
            type: "Feature",
            properties: { nombre: z.nombre },
            geometry: { type: "Polygon", coordinates: [[...z.poligono, z.poligono[0]]] },
          })),
        },
      });
      map.addLayer({
        id: "prohibidas-fill",
        type: "fill",
        source: "prohibidas",
        paint: { "fill-color": "#e03131", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: "prohibidas-line",
        type: "line",
        source: "prohibidas",
        paint: { "line-color": "#e03131", "line-width": 2 },
      });

      // Reportes: círculos coloreados por semáforo.
      map.addSource("reportes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "reportes-circulo",
        type: "circle",
        source: "reportes",
        paint: {
          "circle-radius": 10,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-color": [
            "match",
            ["get", "semaforo"],
            "rojo",
            SEMAFORO_META.rojo.color,
            "amarillo",
            SEMAFORO_META.amarillo.color,
            SEMAFORO_META.verde.color,
          ],
        },
      });

      map.on("click", "reportes-circulo", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as { tipo?: string; descripcion?: string; score?: number };
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `<strong>${p.tipo ?? "reporte"}</strong> · ${p.score ?? 0}/100<br/>${(
              p.descripcion ?? ""
            ).slice(0, 140)}`
          )
          .addTo(map);
      });
      map.on("mouseenter", "reportes-circulo", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "reportes-circulo", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapa.current = null;
    };
  }, []);

  // Actualiza los puntos cuando cambian los reportes.
  useEffect(() => {
    const map = mapa.current;
    if (!map) return;
    const actualizar = () => {
      const src = map.getSource("reportes") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData({
        type: "FeatureCollection",
        features: reportes.map((r) => ({
          type: "Feature",
          properties: { tipo: r.tipo, descripcion: r.descripcion, score: r.score, semaforo: r.semaforo },
          geometry: { type: "Point", coordinates: [r.lon, r.lat] },
        })),
      });
    };
    if (map.loaded()) actualizar();
    else map.once("load", actualizar);
  }, [reportes]);

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-cocoa shadow-pop dark:border-crema/25 dark:shadow-pop-noche">
      <div ref={contenedor} className="h-[420px] w-full" aria-label="Mapa de reportes de Arequipa" />
      <div className="flex flex-wrap gap-3 border-t-2 border-cocoa/15 bg-white px-4 py-2 text-xs font-bold text-cocoa/70 dark:border-white/10 dark:bg-carboncito dark:text-crema/75">
        <span>🟢 Bajo</span>
        <span>🟡 Moderado</span>
        <span>🔴 Alto</span>
        <span>🟥 Zona prohibida</span>
      </div>
    </div>
  );
}
