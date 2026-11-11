import * as THREE from 'three';
import { makeSky } from './sky.js';
import { makeMountains, makeMist } from './mountains.js';
import { makeLake } from './lake.js';
import { makeGround, makeGrass, groundHeight } from './ground.js';
import { makeTree } from './tree.js';
import { makePetals } from './petals.js';
import { makeBirds } from './birds.js';
import { makePuppet } from './puppet.js';
import { makePost } from './post.js';
import { smooth, clamp, lerp } from './util.js';

const DURATION = 57, FPS = 30;
const RENDER_MODE = new URLSearchParams(location.search).has('render');

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: RENDER_MODE });
renderer.setPixelRatio(RENDER_MODE ? 1 : Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe9a05a, 40, 900);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 3200);

const U = {
  uTime: { value: 0 }, uSun: { value: new THREE.Vector3(0.28, 0.1, -1).normalize() },
  uCenter: { value: new THREE.Vector3() }, uGust: { value: 0 }, uGustPos: { value: new THREE.Vector3() }, uGustT: { value: 0 },
};

scene.add(makeSky(U));
scene.add(makeMountains());
scene.add(makeMist(U));
scene.add(makeLake(U, scene.fog));
scene.add(makeGround());
scene.add(makeGrass(U));

const tree = makeTree(U);
tree.position.set(0, groundHeight(0, 0) - 0.1, 0);
scene.add(tree);

const puppet = makePuppet();
const P = new THREE.Vector3(1.7, groundHeight(1.7, 0.7), 0.7);
puppet.root.position.copy(P);
scene.add(puppet.root);
U.uCenter.value.set(P.x, P.y + 5, P.z);
U.uGustPos.value.set(P.x, P.y + 1.2, P.z);

scene.add(makePetals(U));
const birds = makeBirds(); scene.add(birds);

const sun = new THREE.DirectionalLight(0xffb061, 3.2);
sun.target.position.set(0, 1, 0);
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x5a3a66, 0x0a0608, 0.35));

const post = makePost(renderer, scene, camera);

// ---------- timeline ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SHOTS = [
  { t0: 0,  t1: 9,  fov: 40, a: [V(-16, 4.8, 28), V(2, 4.5, -60)],  b: [V(-11, 4.2, 23), V(2, 4.2, -60)] },
  { t0: 9,  t1: 18, fov: 40, a: [V(12, 2.6, 13), V(0.6, 4.2, 0)],   b: [V(6.5, 2.8, 8.5), V(1.0, 3.8, 0.3)] },
  { t0: 18, t1: 28, fov: 36, a: [V(2.6, 2.9, 7.2), V(1.7, 3.0, 0.7)], b: [V(2.4, 2.75, 5.4), V(1.7, 2.9, 0.7)] },
  { t0: 28, t1: 37, fov: 34, a: [V(5.0, 2.7, 4.6), V(1.7, 2.9, 0.7)], b: [V(0.4, 2.8, 4.9), V(1.7, 2.9, 0.7)] },
  { t0: 37, t1: 44, fov: 36, a: [V(-2.6, 3.3, 5.2), V(1.7, 2.8, 0.7)], b: [V(4.0, 2.5, 5.4), V(1.7, 2.8, 0.7)] },
  { t0: 44, t1: 50, fov: 52, a: [V(3.4, 2.45, 2.6), V(0.4, 6.0, -3.5)],  b: [V(2.9, 2.6, 1.9), V(0.2, 6.5, -4.0)] },
  { t0: 50, t1: 57.5, fov: 40, a: [V(6, 3.2, 11), V(0, 3.6, -12)],   b: [V(16, 5.5, 32), V(0, 4, -20)] },
];
const GUSTS = [[35.2, 0.45], [36.4, 1.0], [41.6, 0.8]];
const DIPS = [9, 50];

const _p = new THREE.Vector3(), _l = new THREE.Vector3();
function setCamera(t) {
  let s = SHOTS[SHOTS.length - 1];
  for (const sh of SHOTS) if (t >= sh.t0 && t < sh.t1) { s = sh; break; }
  const u = smooth((t - s.t0) / (s.t1 - s.t0));
  _p.lerpVectors(s.a[0], s.b[0], u); _l.lerpVectors(s.a[1], s.b[1], u);
  camera.position.copy(_p); camera.lookAt(_l);
  if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
}
const ramp = (t, a, b) => smooth((t - a) / (b - a));
const window_ = (t, a, b, c, d) => ramp(t, a, b) * (1 - ramp(t, c, d));

const $title = document.getElementById('title'), $credit = document.getElementById('credit'), $prog = document.getElementById('progress');

function update(t) {
  U.uTime.value = t;
  // the sun sinks a little over the film
  const el = lerp(0.13, 0.035, t / DURATION);
  U.uSun.value.set(0.28, el, -1).normalize();
  sun.position.copy(U.uSun.value).multiplyScalar(200);
  // gust state: most recent gust that has started
  let g = null; for (const x of GUSTS) if (t >= x[0]) g = x;
  U.uGust.value = g ? g[1] : 0; U.uGustT.value = g ? t - g[0] : 0;
  const gustNow = g ? g[1] * (1 - Math.exp(-(t - g[0]) * 5)) * Math.exp(-(t - g[0]) * 0.75) : 0;
  puppet.update(t, gustNow);
  birds.userData.update(t);
  setCamera(t);
  // fades: in, out, and two quick dips at hard cuts
  let fade = ramp(t, 0, 1.8) * (1 - ramp(t, 55.3, 57));
  for (const d of DIPS) fade *= clamp(Math.abs(t - d) / 0.28, 0, 1);
  post.film.uniforms.uFade.value = fade;
  post.film.uniforms.uTime.value = t;
  $title.style.opacity = window_(t, 2.0, 3.6, 6.2, 7.8);
  $credit.style.opacity = window_(t, 52.4, 54.0, 56.4, 57.2);
  $prog.style.width = (clamp(t / DURATION, 0, 1) * 100) + '%';
}

function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  post.composer.setSize(innerWidth, innerHeight);
  post.bloom.setSize(innerWidth, innerHeight);
  post.film.uniforms.uAspect.value = innerWidth / innerHeight;
}
addEventListener('resize', resize); resize();

// ---------- playback ----------
if (RENDER_MODE) {
  // Frame-exact: the renderer script seeks to t and screenshots the page.
  document.getElementById('hint').style.display = 'none';
  // The very first composer render comes out black (shader compile + texture
  // upload happen inside it), so warm up on real frames before exposing seek.
  for (let i = 0; i < 3; i++) { update(3 + i); post.composer.render(); }
  window.__film = { duration: DURATION, fps: FPS, isReady: true, seek(t) { update(t); post.composer.render(); return t; } };
} else {
  let start = performance.now(), paused = false, pausedAt = 0;
  const loop = () => {
    requestAnimationFrame(loop);
    if (paused) return;
    const t = ((performance.now() - start) / 1000) % DURATION;
    update(t); post.composer.render();
  };
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); paused = !paused; if (paused) pausedAt = performance.now(); else start += performance.now() - pausedAt; }
    if (e.key === 'r' || e.key === 'R') { start = performance.now(); paused = false; }
  });
  // warm the shaders on a black frame so the first second is not a stutter
  update(0); post.composer.render();
  requestAnimationFrame(loop);
}
