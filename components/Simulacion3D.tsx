"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Semaforo } from "@/lib/risk";

// Terreno de quebrada con partículas de agua. La intensidad sigue el semáforo.
// Todo el modelo se genera en código (sin assets externos).

const NIVEL: Record<Semaforo, { agua: number; lluvia: number; velocidad: number }> = {
  verde: { agua: 400, lluvia: 0, velocidad: 6 },
  amarillo: { agua: 1200, lluvia: 800, velocidad: 12 },
  rojo: { agua: 2600, lluvia: 2200, velocidad: 22 },
};

function alturaTerreno(x: number, z: number): number {
  // Valle en V a lo largo del eje x=0 (el cauce), laderas con ruido suave.
  const cauce = Math.min(Math.abs(x) * 0.55, 6);
  const ruido =
    Math.sin(x * 0.35) * Math.cos(z * 0.3) * 1.1 + Math.sin(x * 0.9 + z * 0.5) * 0.4;
  const pendiente = -z * 0.12; // el agua baja hacia +z (primer plano)
  return cauce + ruido + pendiente;
}

export default function Simulacion3D({ semaforo }: { semaforo: Semaforo }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const nivelRef = useRef(NIVEL[semaforo]);
  nivelRef.current = NIVEL[semaforo];

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;

    const ancho = el.clientWidth || 800;
    const alto = 440;
    const reducirMov = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(ancho, alto);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#141c2b");
    scene.fog = new THREE.Fog("#141c2b", 60, 140);

    const camera = new THREE.PerspectiveCamera(50, ancho / alto, 0.1, 300);
    camera.position.set(0, 26, 46);
    camera.lookAt(0, 0, -4);

    scene.add(new THREE.HemisphereLight("#bcd3ff", "#3a3226", 0.9));
    const sol = new THREE.DirectionalLight("#ffe6b0", 1.4);
    sol.position.set(30, 40, 20);
    sol.castShadow = true;
    scene.add(sol);

    // --- Terreno ---
    const geo = new THREE.PlaneGeometry(80, 90, 72, 80);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colores = new Float32Array(pos.count * 3);
    const cCauce = new THREE.Color("#5a5f6b");
    const cLadera = new THREE.Color("#4a6b3a");
    const cAlta = new THREE.Color("#7a6a4a");
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = alturaTerreno(x, z);
      pos.setY(i, h);
      const t = Math.min(Math.abs(x) / 18, 1);
      tmp.copy(cCauce).lerp(t < 0.5 ? cLadera : cAlta, Math.min(t * 1.4, 1));
      colores[i * 3] = tmp.r;
      colores[i * 3 + 1] = tmp.g;
      colores[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colores, 3));
    geo.computeVertexNormals();
    const terreno = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })
    );
    terreno.receiveShadow = true;
    scene.add(terreno);

    // --- Casas en el recorrido ---
    const casas = new THREE.Group();
    const matPared = new THREE.MeshStandardMaterial({ color: "#c9b48a", roughness: 0.9 });
    const matTecho = new THREE.MeshStandardMaterial({ color: "#8a4a2a", roughness: 0.9 });
    const sitios: [number, number][] = [
      [-10, -18], [11, -12], [-12, 2], [12, 8], [-10, 20], [10, 26],
    ];
    for (const [x, z] of sitios) {
      const casa = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 3.4), matPared);
      base.position.y = 1.3;
      base.castShadow = true;
      const techo = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.8, 4), matTecho);
      techo.position.y = 3.5;
      techo.rotation.y = Math.PI / 4;
      techo.castShadow = true;
      casa.add(base, techo);
      casa.position.set(x, alturaTerreno(x, z) - 0.2, z);
      casas.add(casa);
    }
    scene.add(casas);

    // --- Refugio en lo alto ---
    const refugio = new THREE.Group();
    const rBase = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3, 4),
      new THREE.MeshStandardMaterial({ color: "#1d5c2e", roughness: 0.9 })
    );
    rBase.position.y = 1.5;
    rBase.castShadow = true;
    const rTecho = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 2, 4),
      new THREE.MeshStandardMaterial({ color: "#e8a94e", roughness: 0.9 })
    );
    rTecho.position.y = 4;
    rTecho.rotation.y = Math.PI / 4;
    refugio.add(rBase, rTecho);
    refugio.position.set(22, alturaTerreno(22, -30), -30);
    scene.add(refugio);

    // --- Partículas de agua que bajan por el cauce ---
    const MAX_AGUA = 2600;
    const aguaGeo = new THREE.BufferGeometry();
    const aguaPos = new Float32Array(MAX_AGUA * 3);
    const aguaVel = new Float32Array(MAX_AGUA);
    const reiniciarGota = (i: number, aleatorio = false) => {
      const x = (Math.random() - 0.5) * 7;
      const z = aleatorio ? 40 - Math.random() * 85 : -42 - Math.random() * 4;
      aguaPos[i * 3] = x;
      aguaPos[i * 3 + 1] = alturaTerreno(x, z) + 0.4 + Math.random() * 0.6;
      aguaPos[i * 3 + 2] = z;
      aguaVel[i] = 0.7 + Math.random() * 0.6;
    };
    for (let i = 0; i < MAX_AGUA; i++) reiniciarGota(i, true);
    aguaGeo.setAttribute("position", new THREE.BufferAttribute(aguaPos, 3));
    const agua = new THREE.Points(
      aguaGeo,
      new THREE.PointsMaterial({
        color: "#6fc3e8",
        size: 0.55,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    agua.frustumCulled = false;
    scene.add(agua);

    // --- Lluvia ---
    const MAX_LLUVIA = 2200;
    const lluviaGeo = new THREE.BufferGeometry();
    const lluviaPos = new Float32Array(MAX_LLUVIA * 3);
    for (let i = 0; i < MAX_LLUVIA; i++) {
      lluviaPos[i * 3] = (Math.random() - 0.5) * 80;
      lluviaPos[i * 3 + 1] = Math.random() * 35;
      lluviaPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    lluviaGeo.setAttribute("position", new THREE.BufferAttribute(lluviaPos, 3));
    const lluvia = new THREE.Points(
      lluviaGeo,
      new THREE.PointsMaterial({
        color: "#9fd0f0",
        size: 0.35,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })
    );
    lluvia.frustumCulled = false;
    scene.add(lluvia);

    let vivo = true;
    let t = 0;
    const reloj = new THREE.Clock();

    const tick = () => {
      if (!vivo) return;
      requestAnimationFrame(tick);
      const dt = Math.min(reloj.getDelta(), 0.05);
      t += dt;
      const nivel = nivelRef.current;

      if (!reducirMov) {
        // Agua: avanza hacia +z y recicla.
        const n = nivel.agua;
        aguaGeo.setDrawRange(0, n);
        for (let i = 0; i < n; i++) {
          aguaPos[i * 3 + 2] += dt * nivel.velocidad * aguaVel[i];
          const x = aguaPos[i * 3];
          const z = aguaPos[i * 3 + 2];
          if (z > 42) {
            reiniciarGota(i);
          } else {
            aguaPos[i * 3 + 1] = alturaTerreno(x, z) + 0.4;
          }
        }
        aguaGeo.attributes.position.needsUpdate = true;

        // Lluvia: cae y recicla.
        const m = nivel.lluvia;
        lluviaGeo.setDrawRange(0, m);
        for (let i = 0; i < m; i++) {
          lluviaPos[i * 3 + 1] -= dt * 28;
          if (lluviaPos[i * 3 + 1] < -4) lluviaPos[i * 3 + 1] = 34;
        }
        lluviaGeo.attributes.position.needsUpdate = true;

        // Cámara: deriva suave.
        camera.position.x = Math.sin(t * 0.12) * 6;
        camera.lookAt(0, 0, -4);
      } else {
        aguaGeo.setDrawRange(0, nivel.agua);
        lluviaGeo.setDrawRange(0, 0);
      }

      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      const w = el.clientWidth || 800;
      renderer.setSize(w, alto);
      camera.aspect = w / alto;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      vivo = false;
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
    };
  }, []);

  return (
    <div
      ref={contenedor}
      className="overflow-hidden rounded-xl border border-white/10 [&>canvas]:block [&>canvas]:w-full"
    />
  );
}
