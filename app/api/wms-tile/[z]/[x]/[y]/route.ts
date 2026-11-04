// Teselas del mapa de anomalía: convierte XYZ (Web Mercator) a la caja
// EPSG:4326 que acepta el WMS de NOAA y devuelve su PNG ya renderizado.

export async function GET(
  req: Request,
  ctx: { params: { z: string; x: string; y: string } }
) {
  const z = Number(ctx.params.z);
  const x = Number(ctx.params.x);
  const y = Number(ctx.params.y);
  if (![z, x, y].every((n) => Number.isInteger(n) && n >= 0) || z > 12) {
    return new Response("tesela inválida", { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const t = searchParams.get("t") ?? "";
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : "2026-01-01";

  const n = 2 ** z;
  const lonMin = (x / n) * 360 - 180;
  const lonMax = ((x + 1) / n) * 360 - 180;
  const latDe = (yy: number) =>
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * yy) / n))) * 180) / Math.PI;
  const latMax = latDe(y);
  const latMin = latDe(y + 1);

  const url =
    "https://coastwatch.pfeg.noaa.gov/erddap/wms/NOAA_DHW/request" +
    "?service=WMS&version=1.3.0&request=GetMap" +
    "&layers=NOAA_DHW:CRW_SSTANOMALY" +
    `&bbox=${latMin},${lonMin},${latMax},${lonMax}` +
    "&width=512&height=512&crs=EPSG:4326&format=image/png&transparent=true" +
    `&time=${fecha}T12:00:00.000Z`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`WMS ${res.status}`);
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=86400, max-age=3600",
      },
    });
  } catch {
    return new Response("sin tesela", { status: 502 });
  }
}
