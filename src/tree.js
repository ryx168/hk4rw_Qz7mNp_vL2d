import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './util.js';

function blossomTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.translate(64, 64);
  for (let i = 0; i < 5; i++) {
    g.save(); g.rotate((i / 5) * Math.PI * 2);
    const grad = g.createRadialGradient(0, -30, 4, 0, -30, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.75, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(0, -30, 22, 32, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// A recursive cherry tree: merged dark branches, plus billboard blossom
// clusters at every twig tip. Backlit clusters glow gold toward the sun.
export function makeTree(uniforms, seed = 3) {
  const rnd = mulberry32(seed);
  const geos = [];
  const tips = [];
  const up = new THREE.Vector3(0, 1, 0);
  function branch(pos, dir, len, rad, depth) {
    const end = pos.clone().addScaledVector(dir, len);
    const g = new THREE.CylinderGeometry(rad * 0.62, rad, len, 7, 1);
    g.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    g.applyQuaternion(q); g.translate(pos.x, pos.y, pos.z);
    geos.push(g);
    if (depth >= 7) { tips.push(end); return; }
    const kids = depth < 2 ? 3 : (rnd() < 0.6 ? 2 : 3);
    for (let i = 0; i < kids; i++) {
      const spread = depth < 2 ? 0.40 + rnd() * 0.35 : 0.55 + rnd() * 0.55;
      const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      const nd = dir.clone().applyAxisAngle(axis, spread).normalize();
      nd.y += depth < 2 ? 0.45 : (depth < 4 ? 0.15 : 0.05);
      nd.x += 0.008 * depth;
      nd.normalize();
      const start = depth < 2 ? end : pos.clone().addScaledVector(dir, len * (0.55 + rnd() * 0.45));
      branch(start, nd, len * (0.66 + rnd() * 0.14), rad * 0.62, depth + 1);
    }
    if (depth >= 4) tips.push(end);
  }
  branch(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0.06, 1, -0.03).normalize(), 2.4, 0.21, 0);
  const trunk = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ color: 0x0b0710, roughness: 0.9 }));

  const per = 14;
  const N = tips.length * per;
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry().copy(base);
  geo.instanceCount = N;
  const off = new Float32Array(N * 3), sc = new Float32Array(N), sd = new Float32Array(N);
  let i = 0;
  for (const t of tips) {
    for (let k = 0; k < per; k++) {
      const r = Math.pow(rnd(), 0.6) * 0.45;
      const a = rnd() * 6.283, b = Math.acos(2 * rnd() - 1);
      off.set([t.x + r * Math.sin(b) * Math.cos(a), t.y + r * Math.cos(b) * 0.8 + 0.1, t.z + r * Math.sin(b) * Math.sin(a)], i * 3);
      sc[i] = 0.12 + rnd() * 0.14; sd[i] = rnd(); i++;
    }
  }
  geo.setAttribute('offset', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('scale', new THREE.InstancedBufferAttribute(sc, 1));
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(sd, 1));
  const mat = new THREE.ShaderMaterial({
    fog: false, alphaTest: 0.5,
    uniforms: { uTime: uniforms.uTime, uSun: uniforms.uSun, uGust: uniforms.uGust, uGustPos: uniforms.uGustPos, uGustT: uniforms.uGustT, uMap: { value: blossomTexture() } },
    vertexShader: /* glsl */`
      attribute vec3 offset; attribute float scale, seed;
      uniform float uTime, uGust, uGustT; uniform vec3 uGustPos;
      varying vec2 vUv; varying float vSeed; varying vec3 vWorld;
      void main(){
        vUv = uv; vSeed = seed;
        vec3 c = offset;
        float env = (1.0 - exp(-uGustT * 5.0)) * exp(-uGustT * 0.9);
        float d = length((modelMatrix * vec4(c, 1.0)).xz - uGustPos.xz);
        float g = uGust * env * exp(-d * d / 16.0);
        c += vec3(sin(uTime * 1.4 + seed * 7.0), sin(uTime * 1.9 + seed * 3.0), cos(uTime * 1.1 + seed * 5.0)) * (0.025 + g * 0.25);
        vec4 w = modelMatrix * vec4(c, 1.0); vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        float a = seed * 6.28 + sin(uTime * 0.8 + seed * 9.0) * 0.25;
        vec2 p = position.xy * scale;
        mv.xy += vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uSun;
      varying vec2 vUv; varying float vSeed; varying vec3 vWorld;
      void main(){
        float a = texture2D(uMap, vUv).a; if (a < 0.5) discard;
        vec3 vd = normalize(vWorld - cameraPosition);
        float back = pow(max(dot(vd, uSun), 0.0), 4.0);
        vec3 base = mix(vec3(0.93, 0.50, 0.64), vec3(1.0, 0.80, 0.86), vSeed);
        float shade = 0.55 + 0.40 * fract(vSeed * 13.7);
        vec3 col = base * shade;
        col = mix(col, vec3(1.0, 0.85, 0.60), back * 0.75);
        float rim = smoothstep(0.32, 0.5, length(vUv - 0.5));
        col *= 1.0 - rim * 0.18;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const blossoms = new THREE.Mesh(geo, mat);
  blossoms.frustumCulled = false;
  const group = new THREE.Group();
  group.add(trunk, blossoms);
  return group;
}
