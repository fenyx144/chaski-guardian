"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Mascota from "@/components/Mascota";

interface NinoData {
  oni: number;
  fase: "El Niño" | "La Niña" | "Neutral";
  regiones: { n12: number; n3: number; n4: number; n34: number };
}

const AREQUIPA: [number, number] = [-71.54, -16.4];

function colorAgua(a: number): string {
  if (a >= 0.5) return "#ff5833";
  if (a <= -0.5) return "#1f6fb5";
  return "#e8dcc3";
}

function palabraAgua(a: number): string {
  if (a >= 0.5) return "agua caliente";
  if (a <= -0.5) return "agua fría";
  return "agua normal";
}

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
        const zonas: [string, number, number[][][]][] = [
          ["1+2", d.regiones.n12, [[[-90, 0], [-80, 0], [-80, -10], [-90, -10], [-90, 0]]]],
          ["3", d.regiones.n3, [[[-150, 5], [-90, 5], [-90, -5], [-150, -5], [-150, 5]]]],
          ["3.4", d.regiones.n34, [[[-170, 5], [-120, 5], [-120, -5], [-170, -5], [-170, 5]]]],
          ["4a", d.regiones.n4, [[[160, 5], [180, 5], [180, -5], [160, -5], [160, 5]]]],
          ["4b", d.regiones.n4, [[[-180, 5], [-150, 5], [-150, -5], [-180, -5], [-180, 5]]]],
        ];
        map.addSource("mar", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: zonas.map(([, v, coords]) => ({
              type: "Feature",
              properties: {
                palabra: palabraAgua(v),
                color: colorAgua(v),
                frase:
                  v >= 0.5
                    ? "Aquí el agua está caliente."
                    : v <= -0.5
                    ? "Aquí el agua está fría."
                    : "Aquí el agua está normal.",
              },
              geometry: { type: "Polygon", coordinates: coords },
            })),
          } as unknown as GeoJSON.FeatureCollection,
        });
        map.addLayer({
          id: "mar-fill",
          type: "fill",
          source: "mar",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.6 },
        });
        map.addLayer({
          id: "mar-line",
          type: "line",
          source: "mar",
          paint: { "line-color": "#3d2b1f", "line-width": 1.5 },
        });
        map.addLayer({
          id: "mar-label",
          type: "symbol",
          source: "mar",
          layout: {
            "text-field": ["get", "palabra"],
            "text-size": 12,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#241a13", "text-halo-color": "#ffffff", "text-halo-width": 2 },
        });
        map.on("click", "mar-fill", (e) => {
          const f = e.features?.[0];
          const frase = (f?.properties as { frase?: string } | undefined)?.frase;
          if (frase) new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<strong>${frase}</strong>`).addTo(map);
        });
      } catch {
        /* el mapa base sigue visible */
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
        <div ref={contenedor} className="h-[400px] w-full md:h-[480px]" aria-label="Mapa del estado del mar" />
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-extrabold">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm border border-cocoa/40 bg-[#ff5833]" />
          Agua caliente
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm border border-cocoa/40 bg-[#1f6fb5]" />
          Agua fría
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm border border-cocoa/40 bg-[#e8dcc3]" />
          Agua normal
        </span>
        <span className="ml-auto text-xs font-bold text-cocoa/55 dark:text-crema/55">
          Toca el mar para saber cómo está · Datos: NOAA
        </span>
      </div>
    </div>
  );
}
