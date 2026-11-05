import test from "node:test";
import assert from "node:assert/strict";
import { calcularRiesgo } from "../lib/risk.ts";
import { CASOS_FICTICIOS } from "../lib/evaluacion.ts";

// Mini evaluación: 5 casos FICTICIOS etiquetados (datos de ejemplo).
// La regla de oro: si falta lluvia, caudal o distancia, NUNCA es verde:
// el resultado debe decir "insuficiente" (información insuficiente).

test("hay exactamente 5 casos ficticios etiquetados", () => {
  assert.equal(CASOS_FICTICIOS.length, 5);
  assert.ok(CASOS_FICTICIOS.every((c) => c.ficticio === true));
});

for (const caso of CASOS_FICTICIOS) {
  test(`caso ficticio: ${caso.nombre} => ${caso.esperado}`, () => {
    const r = calcularRiesgo(caso.entrada);
    assert.equal(r.semaforo, caso.esperado);
  });
}

test("sin caudal, aunque no llueva, nunca es verde", () => {
  const r = calcularRiesgo({
    lluvia24h: 0,
    lluvia48h: 0,
    pendiente: 5,
    distanciaKm: 1,
    caudalDisponible: false,
  });
  assert.equal(r.semaforo, "insuficiente");
  assert.ok(r.datosFaltantes.includes("caudal"));
  assert.match(r.explicacion, /no confirma que sea seguro/i);
});

test("sin distancia o con lluvia no numérica tampoco es verde", () => {
  const sinDistancia = calcularRiesgo({
    lluvia24h: 0,
    lluvia48h: 0,
    pendiente: 5,
    caudalDisponible: true,
  });
  assert.equal(sinDistancia.semaforo, "insuficiente");

  const sinLluvia = calcularRiesgo({
    lluvia24h: Number.NaN,
    lluvia48h: 0,
    pendiente: 5,
    distanciaKm: 1,
    caudalDisponible: true,
  });
  assert.equal(sinLluvia.semaforo, "insuficiente");
});
