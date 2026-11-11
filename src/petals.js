import * as THREE from 'three';
import { mulberry32 } from './util.js';

function petalTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 96;
  const g = c.getContext('2d');
  g.translate(32, 48);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(0, -44);
  g.bezierCurveTo(26, -30, 28, 20, 0, 44);
  g.bezierCurveTo(-28, 20, -26, -30, 0, -44);
  g.closePath(); g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(-9, -46); g.lineTo(0, -30); g.lineTo(9, -46); g.closePath(); g.fill();   // the notch
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Falling petals. Everything is a function of (seed, time) in the vertex shader,
// so 3000 petals cost one draw call and the motion is deterministic. The gust
// swirl is a displacement with a rise-then-decay envelope, so the sword swing
// pulls petals into a vortex that breathes back out.
export function makePetals(uniforms) {
  const N = 3000;
  const rnd = mulberry32(99);
  const base = new THREE.PlaneGeometry(0.075, 0.11);
  const geo = new THREE.InstancedBufferGeometry().copy(base);
  geo.instanceCount = N;
  const seed = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) seed[i] = rnd();
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: false, transparent: false, alphaTest: 0.5,
    uniforms: {
      uTime: uniforms.uTime, uSun: uniforms.uSun, uCenter: uniforms.uCenter,
      uGust: uniforms.uGust, uGustPos: uniforms.uGustPos, uGustT: uniforms.uGustT, uMap: { value: petalTexture() }
    },
    vertexShader: /* glsl */`
      attribute vec4 seed;
      uniform float uTime, uGust, uGustT; uniform vec3 uCenter, uGustPos;
      varying vec2 vUv; varying vec3 vWorld; varying float vShade;
      mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      void main(){
        vUv = uv;
        float t = uTime;
        vec3 box = vec3(44.0, 14.0, 44.0);
        float fall = 0.45 + seed.z * 0.55;
        float y = mod(seed.y * box.y - t * fall, box.y);
        float x = seed.x * box.x + t * (0.55 + seed.w * 0.4) + sin(t * (0.6 + seed.z) + seed.w * 6.28) * 0.6;
        float z = seed.w * box.z + t * 0.25 + cos(t * (0.5 + seed.x) + seed.y * 6.28) * 0.5;
        vec3 p = vec3(mod(x, box.x) - box.x * 0.5 + uCenter.x, y + uCenter.y - 1.0, mod(z, box.z) - box.z * 0.5 + uCenter.z);
        // gust vortex
        vec2 d = p.xz - uGustPos.xz; float r = max(length(d), 0.05);
        float env = (1.0 - exp(-uGustT * 5.0)) * exp(-uGustT * 0.75);
        float k = exp(-r * r / 7.0) * uGust * env;
        d = rot(k * 2.4 + seed.x * k) * d + d / r * k * 1.2;
        p.xz = uGustPos.xz + d;
        p.y += k * (1.8 + seed.y * 1.4) + k * sin(t * 6.0 + seed.x * 20.0) * 0.4;
        // tumble
        float a1 = t * (1.5 + seed.x * 2.0) + seed.y * 6.28;
        float a2 = t * (1.1 + seed.z * 1.5) + seed.w * 6.28;
        vec3 v = position;
        v.xy = rot(a1) * v.xy;
        v.xz = rot(a2) * v.xz;
        v *= 0.8 + seed.y * 0.5;
        vShade = 0.72 + 0.28 * sin(a2);
        vec3 w = p + v; vWorld = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uSun;
      varying vec2 vUv; varying vec3 vWorld; varying float vShade;
      void main(){
        float a = texture2D(uMap, vUv).a; if (a < 0.5) discard;
        vec3 vd = normalize(vWorld - cameraPosition);
        float back = pow(max(dot(vd, uSun), 0.0), 5.0);
        vec3 col = mix(vec3(0.96, 0.72, 0.80), vec3(1.0, 0.90, 0.93), vUv.y) * vShade;
        col = mix(col, vec3(1.0, 0.86, 0.62), back * 0.7);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}
