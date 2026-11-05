import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Regresión: el botón EN no cambiaba la página principal porque app/page.tsx
// no usaba useIdioma y no pasaba lang a /api/risk (todo quedaba en español).

const i18n = readFileSync(new URL("../lib/i18n.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const mapa = readFileSync(
  new URL("../components/MapaQuebrada.tsx", import.meta.url),
  "utf8"
);

function claves(bloque) {
  return [...bloque.matchAll(/"([\w.]+)":/g)].map((m) => m[1]).sort();
}

test("los diccionarios es, en y qu tienen exactamente las mismas claves", () => {
  const [esBloque, resto] = i18n.split("const en: Record<Clave, string> =");
  const [enBloque, quBloque] = resto.split("const qu: Record<Clave, string> =");
  assert.ok(quBloque, "falta el diccionario quechua");
  assert.deepEqual(claves(esBloque), claves(enBloque));
  assert.deepEqual(claves(esBloque), claves(quBloque.split("};")[0]));
});

test("la página principal usa el idioma elegido", () => {
  assert.match(page, /useIdioma\(\)/);
  assert.match(page, /t\("semaforo\.titulo"\)/);
  assert.match(page, /t\("home\.tituloA"\)/);
});

test("la página pide el riesgo en el idioma elegido", () => {
  assert.match(page, /\/api\/risk\?lat=\$\{q\.lat\}&lon=\$\{q\.lon\}&lang=\$\{lang\}/);
});

test("el mapa de la quebrada también se traduce", () => {
  assert.match(mapa, /useIdioma\(\)/);
  assert.match(mapa, /t\("mq\.cargando"\)/);
});
