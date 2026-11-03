import test from "node:test";
import assert from "node:assert/strict";
import { calcularRiesgo } from "../lib/risk.ts";

// Pruebas básicas del cálculo del semáforo (node --test, sin dependencias).

test("sin lluvia y poca pendiente => verde, puntaje bajo", () => {
  const r = calcularRiesgo({ lluvia24h: 0, lluvia48h: 0, pendiente: 5 });
  assert.equal(r.semaforo, "verde");
  assert.ok(r.score >= 0 && r.score < 35);
});

test("lluvia moderada => amarillo", () => {
  const r = calcularRiesgo({ lluvia24h: 8, lluvia48h: 10, pendiente: 8 });
  assert.equal(r.semaforo, "amarillo");
  assert.ok(r.score >= 35 && r.score < 65);
});

test("lluvia fuerte => rojo", () => {
  const r = calcularRiesgo({ lluvia24h: 25, lluvia48h: 30, pendiente: 15 });
  assert.equal(r.semaforo, "rojo");
  assert.ok(r.score >= 65 && r.score <= 100);
});

test("el puntaje nunca sale de 0-100", () => {
  const alto = calcularRiesgo({ lluvia24h: 500, lluvia48h: 500, pendiente: 45 });
  assert.equal(alto.score, 100);
  const bajo = calcularRiesgo({ lluvia24h: -5, lluvia48h: -5, pendiente: -3 });
  assert.equal(bajo.score, 0);
  assert.equal(bajo.semaforo, "verde");
});

test("a igual lluvia, más pendiente da más puntaje", () => {
  const suave = calcularRiesgo({ lluvia24h: 10, lluvia48h: 10, pendiente: 5 });
  const empinada = calcularRiesgo({ lluvia24h: 10, lluvia48h: 10, pendiente: 20 });
  assert.ok(empinada.score > suave.score);
});

test("la explicación está en español y aclara que es estimación", () => {
  const r = calcularRiesgo({ lluvia24h: 10, lluvia48h: 10, pendiente: 10 });
  assert.match(r.explicacion, /estimación/i);
});
