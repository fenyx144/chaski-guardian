import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// TAREA simulacro: la palabra de usuario es "simulacro"/"drill" (no
// "simulación"/"simulation") y el simulacro de la portada es SOLO local:
// pide demo=rojo, no llama a /api/simulacion ni guarda reportes.

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf-8");

test("api/risk usa SIMULACRO en los textos de demo y de panel", () => {
  const s = leer("app/api/risk/route.ts");
  assert.match(s, /SIMULACRO/);
  assert.doesNotMatch(s, /SIMULACIÓN|SIMULATION/);
});

test("api/simulacion usa el prefijo SIMULACRO en respaldo y en el prompt", () => {
  const s = leer("app/api/simulacion/route.ts");
  const veces = s.split("⚠️ SIMULACRO · Chaski Guardian:").length - 1;
  assert.ok(veces >= 2, `prefijo SIMULACRO esperado >=2 veces, hay ${veces}`);
  assert.doesNotMatch(s, /SIMULACIÓN|simulación|SIMULATION/);
});

test("la portada pide demo=rojo y NO llama a /api/simulacion", () => {
  const s = leer("app/page.tsx");
  assert.match(s, /demo=rojo/);
  assert.match(s, /simulacro\.boton/);
  assert.doesNotMatch(s, /\/api\/simulacion/);
});

test("el chat acepta la prop simulacro, usa demo=rojo y no envia alerta real", () => {
  const s = leer("components/ChatWidget.tsx");
  assert.match(s, /simulacro/);
  assert.match(s, /demo=rojo/);
  assert.match(s, /Simulacro: no se envió ninguna alerta real\./);
});

test("el panel practica la alerta sin decir simulacro de crecida", () => {
  const s = leer("app/panel/page.tsx");
  assert.match(s, /Practicar alerta a los vecinos/);
  assert.match(s, /Detener práctica/);
  assert.match(
    s,
    /Simulacro del coordinador: Muse redacta la alerta y tú decides si se envía\. No es una alerta real\./
  );
  assert.doesNotMatch(s, /simulacro de crecida/i);
  assert.doesNotMatch(s, /Detener simulación/);
});
