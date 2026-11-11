import * as THREE from 'three';
import { mulberry32, makeNoise1D } from './util.js';

const n1 = makeNoise1D(77), n2 = makeNoise1D(78);
// One height function shared by the mesh, the grass, the tree and the puppet.
export function groundHeight(x, z) {
  const r2 = x * x + z * z;
  let h = 0.6 + 1.4 * Math.exp(-r2 / 40);
  h += 0.18 * (n1(x * 0.15 + 3, 3) - 0.5) + 0.12 * (n2(z * 0.2 + 9, 3) - 0.5);
  if (z < -12) h -= (-z - 12) * 0.25;                 // slopes down into the lake
  if (z > 10) h += (z - 10) * 0.05;                    // slight lip toward the viewer
  return h;
}

export function makeGround() {
  const size = 220, seg = 220;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, groundHeight(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x120b16, roughness: 0.95, metalness: 0 });
  return new THREE.Mesh(geo, mat);
}

// Instanced grass blades on the mound; black silhouettes with sun-kissed tips.
export function makeGrass(uniforms) {
  const N = 6000;
  const rnd = mulberry32(5);
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.Float32BufferAttribute([-0.018, 0, 0, 0.018, 0, 0, 0, 1, 0], 3));
  base.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  base.setIndex([0, 1, 2]);
  const geo = new THREE.InstancedBufferGeometry().copy(base);
  geo.instanceCount = N;
  const off = new Float32Array(N * 3), sc = new Float32Array(N), ph = new Float32Array(N), yaw = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 11;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    off.set([x, groundHeight(x, z) - 0.02, z], i * 3);
    sc[i] = 0.18 + rnd() * 0.42; ph[i] = rnd() * 6.283; yaw[i] = rnd() * 6.283;
  }
  geo.setAttribute('offset', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('scale', new THREE.InstancedBufferAttribute(sc, 1));
  geo.setAttribute('phase', new THREE.InstancedBufferAttribute(ph, 1));
  geo.setAttribute('yaw', new THREE.InstancedBufferAttribute(yaw, 1));
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: uniforms.uTime, uSun: uniforms.uSun, uGust: uniforms.uGust, uGustPos: uniforms.uGustPos },
    vertexShader: /* glsl */`
      attribute vec3 offset; attribute float scale, phase, yaw;
      uniform float uTime, uGust; uniform vec3 uGustPos;
      varying float vT; varying vec3 vWorld;
      void main(){
        vT = uv.y;
        vec3 p = position * vec3(1.0, scale, 1.0);
        float c = cos(yaw), s = sin(yaw);
        p.xz = vec2(p.x * c - p.z * s, p.x * s + p.z * c);
        float d = length(offset.xz - uGustPos.xz);
        float gust = uGust * exp(-d * d / 12.0);
        float sway = sin(uTime * 1.7 + phase + offset.x * 0.4) * 0.22 + gust * 0.9;
        p.x += sway * vT * vT * scale;
        p.z += sin(uTime * 1.1 + phase) * 0.06 * vT * vT;
        vec3 w = offset + p; vWorld = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun; varying float vT; varying vec3 vWorld;
      void main(){
        vec3 vd = normalize(vWorld - cameraPosition);
        float back = pow(max(dot(vd, uSun), 0.0), 8.0);
        vec3 col = mix(vec3(0.05, 0.03, 0.06), vec3(0.95, 0.62, 0.30), back * vT * 0.9);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}
