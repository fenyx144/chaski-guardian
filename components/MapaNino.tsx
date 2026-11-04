"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// El Niño en vivo: Sudamérica con nubes satelitales reales (RainViewer,
// cobertura global infrarroja) animadas + índice ONI oficial (NOAA) + botón
// Ubicarme que centra el mapa en el vecino y le muestra su semáforo.

interface Frame {
  time: number;
  path: string;
}

interface NinoData {
  oni: number;
  periodo: string;
  fase: "El Niño" | "La Niña" | "Neutral";
}

const FASE_COLOR: Record<NinoData["fase"], string> = {
  "El Niño": "#ff5833",
  "La Niña": "#4494f7",
  Neutral: "#b98a1d",
};

const AREQUIPA: [number, number] = [-71.54, -16.4];

export default function MapaNino() {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const datos = useRef<{ host: string; frames: Frame[] }>({ host: "", frames: [] });
  const [total, setTotal] = useState(0);
  const [indice, setIndice] = useState(0);
  const [hora, setHora] = useState("");
  const [reproduciendo, setReproduciendo] = useState(true);
  const [oni, setOni] = useState<NinoData | null>(null);
  const [errorOni, setErrorOni] = useState("");
  const [avisoUbic, setAvisoUbic] = useState("");
  const marcadorUsuario = useRef<maplibregl.Marker | null>(null);

  // Crea el mapa una sola vez.
  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [-60, -15],
      zoom: 2.6,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.dragRotate.disable();
    mapa.current = map;

    map.on("load", async () => {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const json = (await res.json()) as {
          host: string;
          satellite?: { infrared?: Frame[] };
        };
        const frames = (json.satellite?.infrared ?? []).slice(-8);
        if (frames.length === 0) return;
        datos.current = { host: json.host, frames };
        setTotal(frames.length);
        setIndice(frames.length - 1);
        map.addSource("nubes", {
          type: "raster",
          tiles: [urlFrame(json.host, frames[frames.length - 1])],
          tileSize: 256,
          attribution: "Nubes: RainViewer · Mapa: © OpenStreetMap · © CARTO",
        });
        map.addLayer({ id: "nubes", type: "raster", source: "nubes", paint: { "raster-opacity": 0.85 } });
      } catch {
        /* sin nubes en vivo: el mapa base sigue visible */
      }

      // Arequipa siempre marcada.
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#ff5833;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)";
      new maplibregl.Marker({ element: el })
        .setLngLat(AREQUIPA)
        .setPopup(new maplibregl.Popup().setHTML("<strong>Arequipa</strong><br/>Tus quebradas están aquí. Mira tu semáforo abajo."))
        .addTo(map);
    });

    // Índice ONI oficial.
    fetch("/api/nino")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: NinoData) => setOni(d))
      .catch(() => setErrorOni("Índice no disponible por ahora."));

    return () => {
      map.remove();
      mapa.current = null;
    };
  }, []);

  // Reproduce los últimos fotogramas como animación.
  useEffect(() => {
    if (!reproduciendo || total === 0) return;
    const id = setInterval(() => setIndice((i) => (i + 1) % total), 1200);
    return () => clearInterval(id);
  }, [reproduciendo, total]);

  // Muestra el fotograma actual.
  useEffect(() => {
    const { host, frames } = datos.current;
    const map = mapa.current;
    if (!map || frames.length === 0) return;
    const f = frames[indice % frames.length];
    const src = map.getSource("nubes") as unknown as
      | { setTiles?: (t: string[]) => void }
      | undefined;
    try {
      src?.setTiles?.([urlFrame(host, f)]);
    } catch {
      /* ignora fotogramas fallidos */
    }
    setHora(
      new Date(f.time * 1000).toLocaleString("es-PE", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [indice]);

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
          const r = (await res.json()) as { semaforo?: string; score?: number; explicacion?: string };
          marcadorUsuario.current.setPopup(
            new maplibregl.Popup().setHTML(
              `<strong>Tú estás aquí</strong><br/>Semáforo: ${r.semaforo ?? "?"} (${r.score ?? "?"} / 100)<br/>${(r.explicacion ?? "").slice(0, 160)}`
            )
          ).togglePopup();
        } catch {
          setAvisoUbic("Te ubicamos, pero no pudimos traer tu semáforo.");
        }
      },
      () => setAvisoUbic("No pudimos ubicarte: activa el GPS y permite el acceso."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border-2 border-cocoa shadow-pop dark:border-crema/25 dark:shadow-pop-noche">
        <div ref={contenedor} className="h-[440px] w-full md:h-[520px]" aria-label="Mapa en vivo del avance de El Niño sobre Sudamérica" />

        {/* Controles sobre el mapa */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <button
            onClick={() => setReproduciendo((v) => !v)}
            className="rounded-xl border-2 border-white/40 bg-black/60 px-3 py-1.5 text-sm font-extrabold text-white backdrop-blur hover:bg-black/80"
            aria-label={reproduciendo ? "Pausar animación" : "Reproducir animación"}
          >
            {reproduciendo ? "⏸ Pausar" : "▶ Ver avance"}
          </button>
          {hora && (
            <span className="rounded-xl bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
              Nubes: {hora}
            </span>
          )}
        </div>
        <button
          onClick={ubicarme}
          className="absolute bottom-4 right-3 rounded-2xl border-2 border-cocoa bg-sol px-4 py-2 text-sm font-extrabold text-cocoa shadow-pop-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          📍 Ubicarme
        </button>
        {avisoUbic && (
          <p className="absolute bottom-4 left-3 max-w-[60%] rounded-xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
            {avisoUbic}
          </p>
        )}
      </div>

      {/* Índice ONI + leyenda */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
          <p className="text-sm font-extrabold uppercase tracking-wide text-cocoa/60 dark:text-crema/60">
            Estado oficial · NOAA
          </p>
          {oni ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <p className="font-display text-5xl leading-none">
                {oni.oni > 0 ? "+" : ""}
                {oni.oni.toFixed(1)}°C
              </p>
              <span
                className="rounded-full border-2 border-cocoa px-3 py-1 text-sm font-extrabold text-white dark:border-crema/60"
                style={{ backgroundColor: FASE_COLOR[oni.fase] }}
              >
                {oni.fase}
              </span>
            </div>
          ) : (
            <p className="mt-2 font-bold">{errorOni || "Cargando índice…"}</p>
          )}
          {oni && (
            <p className="mt-2 text-sm font-semibold text-cocoa/65 dark:text-crema/65">
              Trimestre {oni.periodo} · anomalía en la región Niño 3.4. El Niño se
              declara desde +0.5 °C.
            </p>
          )}
        </div>
        <div className="rounded-3xl border-2 border-cocoa bg-white p-5 shadow-pop dark:border-crema/25 dark:bg-carboncito dark:shadow-pop-noche">
          <p className="text-sm font-extrabold uppercase tracking-wide text-cocoa/60 dark:text-crema/60">
            Cómo leer el mapa
          </p>
          <ul className="mt-2 space-y-1 text-sm font-semibold">
            <li>☁️ Manchas claras = cobertura nubosa ahora mismo (satélite infrarrojo).</li>
            <li>▶ Dale a “Ver avance” para animar las últimas horas.</li>
            <li>📍 “Ubicarme” te lleva a tu zona y te da tu semáforo.</li>
          </ul>
          <p className="mt-2 text-xs font-semibold text-cocoa/55 dark:text-crema/55">
            Nubes: RainViewer (tiempo real) · Mapa base: CARTO/OSM · Índice: NOAA CPC.
          </p>
        </div>
      </div>
    </div>
  );
}

function urlFrame(host: string, f: Frame): string {
  return `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`;
}
