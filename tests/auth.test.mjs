import test from "node:test";
import assert from "node:assert/strict";
import { rutaProtegida, credencialesValidas, sesionValida, demasiadosIntentosLogin, PANEL_COOKIE } from "../lib/auth.ts";

// Acceso de demostracion al panel: estas rutas exigen la cookie de sesion;
// el resto de la app es publico para vecinos y jueces.

test("el panel y sus APIs sensibles estan protegidos", () => {
  assert.equal(rutaProtegida("/panel", "GET"), true);
  assert.equal(rutaProtegida("/api/cuadrillas", "GET"), true);
  assert.equal(rutaProtegida("/api/cuadrillas", "POST"), true);
  assert.equal(rutaProtegida("/api/cuadrillas", "PATCH"), true);
  assert.equal(rutaProtegida("/api/misiones", "GET"), true);
  assert.equal(rutaProtegida("/api/misiones", "POST"), true);
  assert.equal(rutaProtegida("/api/misiones", "PATCH"), true);
});

test("la practica global exige sesion para mutar, no para mirar", () => {
  assert.equal(rutaProtegida("/api/simulacion", "POST"), true);
  assert.equal(rutaProtegida("/api/simulacion", "PATCH"), true);
  assert.equal(rutaProtegida("/api/simulacion", "DELETE"), true);
  assert.equal(rutaProtegida("/api/simulacion", "GET"), false);
});

test("voluntarios y suscriptores: la lista es protegida, el alta es publica", () => {
  assert.equal(rutaProtegida("/api/voluntarios", "GET"), true);
  assert.equal(rutaProtegida("/api/voluntarios", "POST"), false);
  assert.equal(rutaProtegida("/api/suscriptores", "GET"), true);
  assert.equal(rutaProtegida("/api/suscriptores", "POST"), false);
});

test("el resto es publico (portada, riesgo, reportes, login)", () => {
  assert.equal(rutaProtegida("/", "GET"), false);
  assert.equal(rutaProtegida("/panel-login", "GET"), false);
  assert.equal(rutaProtegida("/api/panel-login", "POST"), false);
  assert.equal(rutaProtegida("/api/panel-logout", "POST"), false);
  assert.equal(rutaProtegida("/api/risk", "GET"), false);
  assert.equal(rutaProtegida("/api/reportes", "GET"), false);
  assert.equal(rutaProtegida("/api/reportes", "POST"), false);
});

test("maximo 5 intentos de login por minuto por IP", () => {
  const ip = "203.0.113.7";
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(demasiadosIntentosLogin(ip, t0 + i), false);
  assert.equal(demasiadosIntentosLogin(ip, t0 + 10), true);
  // Otra IP no se ve afectada y la ventana se reinicia tras un minuto.
  assert.equal(demasiadosIntentosLogin("203.0.113.8", t0 + 10), false);
  assert.equal(demasiadosIntentosLogin(ip, t0 + 61_000), false);
});

test("credenciales de demo por defecto y cookie sin la contrasena", () => {
  assert.equal(credencialesValidas("coordinador", "demo"), true);
  assert.equal(credencialesValidas("coordinador", "otra"), false);
  assert.equal(credencialesValidas("vecino", "demo"), false);
  assert.equal(PANEL_COOKIE, "chaski_panel");
  assert.equal(sesionValida(undefined), false);
  assert.equal(sesionValida(""), false);
  assert.equal(sesionValida("token-inventado"), false);
});
