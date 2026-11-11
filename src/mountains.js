import * as THREE from 'three';
import { makeNoise1D, GLSL_NOISE } from './util.js';

// Layered paper-cut ridges. MeshBasicMaterial honours scene.fog, so the farther
// layers melt into the horizon colour on their own (aerial perspective for free).
export function makeMountains() {
  const g = new THREE.Group();
  const layers = 6;
  for (let i = 0; i < layers; i++) {
    const noise = makeNoise1D(101 + i * 7);
    const z = -(80 + i * 95);
    const W = 900 + i * 260, H = 18 + i * 14, base = -3;
    const pts = [];
    const steps = 420;
    for (let s = 0; s <= steps; s++) {
      const x = -W / 2 + (W * s) / steps;
      const u = s / steps;
      let y = noise(u * (7 + i * 2) + i * 3.3, 5);
      y = Math.pow(y, 1.4) * H * (0.6 + 0.4 * noise(u * 2.3 + 11, 2));
      // ridge gets a few sharp peaks, like cut paper
      y += Math.max(0, noise(u * 23 + 5, 3) - 0.62) * H * 1.6;
      pts.push(new THREE.Vector2(x, base + y));
    }
    pts.push(new THREE.Vector2(W / 2, -80), new THREE.Vector2(-W / 2, -80));
    const shape = new THREE.Shape(pts);
    const t = i / (layers - 1);
    const col = new THREE.Color().setRGB(0.07 + 0.30 * t, 0.04 + 0.20 * t, 0.10 + 0.28 * t);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: col, fog: true }));
    mesh.position.z = z;
    mesh.renderOrder = -10 + i;
    g.add(mesh);
  }
  return g;
}

// Soft golden mist bands between the ridges.
export function makeMist(uniforms) {
  const g = new THREE.Group();
  const defs = [[-70, 1.5, 9, 0.30], [-150, 3, 16, 0.28], [-260, 5, 26, 0.25], [-400, 9, 40, 0.22]];
  for (const [z, y, h, a] of defs) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      uniforms: { uTime: uniforms.uTime, uAlpha: { value: a }, uSeed: { value: Math.abs(z) * 0.01 } },
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uAlpha, uSeed; varying vec2 vUv; ${GLSL_NOISE}
        void main(){
          float v = 1.0 - abs(vUv.y - 0.5) * 2.0; v = v * v;
          float n = fbm(vec2(vUv.x * 7.0 + uTime * 0.012 + uSeed, vUv.y * 2.0 + uSeed));
          n = smoothstep(0.30, 0.75, n);
          float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
          gl_FragColor = vec4(vec3(1.0, 0.80, 0.55), v * n * uAlpha * edge);
        }`
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1800, h), mat);
    m.position.set(0, y, z + 10);
    m.renderOrder = 5;
    g.add(m);
  }
  return g;
}
