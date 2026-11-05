import test from "node:test";
import assert from "node:assert/strict";
import { CUADRILLAS_EJEMPLO, propuestaLocal } from "../lib/cuadrillas.ts";

// Cuadrillas de ejemplo marcadas y propuesta de respaldo sin modelo.

test("hay 3 cuadrillas de ejemplo, todas marcadas como datos de ejemplo", () => {
  assert.equal(CUADRILLAS_EJEMPLO.length, 3);
  assert.ok(CUADRILLAS_EJEMPLO.every((c) => c.ejemplo === true));
  assert.ok(CUADRILLAS_EJEMPLO.every((c) => c.nombre && c.tipo && c.estado));
});

test("la propuesta de respaldo elige cuadrilla disponible y voluntarios útiles", () => {
  const voluntarios = [
    { id: "v1", nombre: "Ana", habilidad: "salud" },
    { id: "v2", nombre: "Luis", habilidad: "rescate" },
    { id: "v3", nombre: "Eva", habilidad: "rescate" },
  ];
  const p = propuestaLocal({ tipo: "desborde" }, voluntarios, CUADRILLAS_EJEMPLO);
  assert.equal(p.cuadrillaSugerida, "Cuadrilla Los Andes");
  assert.deepEqual(p.voluntariosAsignados.map((v) => v.id), ["v2", "v3"]);
  assert.ok(p.equipoNecesario.length > 0);
  assert.match(p.motivo, /respaldo sin modelo/i);
});

test("sin voluntarios con la habilidad, la propuesta no inventa asignados", () => {
  const p = propuestaLocal({ tipo: "desborde" }, [], CUADRILLAS_EJEMPLO);
  assert.deepEqual(p.voluntariosAsignados, []);
});
