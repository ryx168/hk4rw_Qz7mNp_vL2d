// Scene presets. One engine, several films: every colour, light and title the
// shaders and the page use comes from here. Pick one with ?scene=<id>.
//
// `dusk` is the original Cherry Blossoms film and must stay byte-identical to
// it; the others are variations on the same set, choreography and camera.

const BASE = {
  title: { zh: '樱', en: 'Cherry Blossoms', small: 'Vite · Three.js · no 3D software', color: '#f4e6d2', shadow: 'rgba(0,0,0,.6)' },
  exposure: 0.9,
  bloom: 0.28,
  sunEl: [0.13, 0.035],                       // elevation at t=0 and t=57 s
  fog: { color: 0xe9a05a, near: 40, far: 900 },
  light: { color: 0xffb061, intensity: 3.2 },
  hemi: { sky: 0x5a3a66, ground: 0x0a0608, intensity: 0.35 },
  sky: {
    hor: [1.00, 0.70, 0.32], low: [0.93, 0.45, 0.30], mid: [0.55, 0.28, 0.42], up: [0.22, 0.14, 0.34], top: [0.07, 0.06, 0.16],
    horGlow: [1.0, 0.72, 0.42], horGlowAmt: 0.22,
    disk: [1.0, 0.92, 0.70], diskAmt: 2.4, diskEdge: [0.99880, 0.99935],
    glow: [1.0, 0.80, 0.50], glowAmt: 0.45, glowPow: 70.0,
    cloud: [1.0, 0.86, 0.62], cloudAmt: 0.35,
    stars: 0.0,
  },
  mountains: { base: [0.07, 0.04, 0.10], ramp: [0.30, 0.20, 0.28] },
  mist: { color: [1.0, 0.80, 0.55], alpha: 1.0 },
  lake: { skyMul: 0.80, tint: [0.10, 0.06, 0.12], tintAmt: 0.30, streak: [1.0, 0.84, 0.52], streakAmt: 2.6, shimmer: [0.9, 0.7, 0.5] },
  ground: 0x120b16,
  grass: { base: [0.05, 0.03, 0.06], tip: [0.95, 0.62, 0.30], tipAmt: 0.9 },
  trunk: 0x0b0710,
  birds: 0x120a14,
  blossom: { a: [0.93, 0.50, 0.64], b: [1.0, 0.80, 0.86], back: [1.0, 0.85, 0.60], backAmt: 0.75, perTip: 14 },
  petals: { shape: 'petal', a: [0.96, 0.72, 0.80], b: [1.0, 0.90, 0.93], back: [1.0, 0.86, 0.62], backAmt: 0.7, alt: [0, 0, 0], altFrac: 0.0, fall: 1.0, size: 1.0 },
};

// shallow-merge one level deep: override only what a scene changes
function scene(over) {
  const out = { ...BASE };
  for (const [k, v] of Object.entries(over)) out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...BASE[k], ...v } : v;
  return out;
}

export const SCENES = {
  dusk: scene({}),

  // 月 Moonlight: the same duel under a full moon; silver lake, pale blossoms, stars.
  moon: scene({
    title: { zh: '月', en: 'Moonlight', color: '#e4ebf7', shadow: 'rgba(0,0,10,.7)' },
    exposure: 1.05, bloom: 0.5, sunEl: [0.17, 0.125],
    fog: { color: 0x2b3652, near: 40, far: 900 },
    light: { color: 0xa9bcff, intensity: 1.7 },
    hemi: { sky: 0x2c3c6e, ground: 0x05060c, intensity: 0.45 },
    sky: {
      hor: [0.30, 0.36, 0.52], low: [0.17, 0.22, 0.38], mid: [0.08, 0.11, 0.25], up: [0.03, 0.05, 0.13], top: [0.01, 0.015, 0.05],
      horGlow: [0.55, 0.65, 0.90], horGlowAmt: 0.18,
      disk: [0.96, 0.97, 1.0], diskAmt: 2.0, diskEdge: [0.99860, 0.99885],
      glow: [0.70, 0.80, 1.0], glowAmt: 0.35, glowPow: 120.0,
      cloud: [0.55, 0.62, 0.80], cloudAmt: 0.30,
      stars: 1.0,
    },
    mountains: { base: [0.015, 0.02, 0.045], ramp: [0.12, 0.16, 0.26] },
    mist: { color: [0.62, 0.72, 0.90], alpha: 0.7 },
    lake: { skyMul: 0.85, tint: [0.02, 0.03, 0.07], tintAmt: 0.35, streak: [0.82, 0.88, 1.0], streakAmt: 2.2, shimmer: [0.5, 0.6, 0.85] },
    ground: 0x06070d,
    grass: { base: [0.02, 0.025, 0.04], tip: [0.55, 0.66, 0.90], tipAmt: 0.8 },
    trunk: 0x05060b, birds: 0x05060c,
    blossom: { a: [0.70, 0.72, 0.88], b: [0.93, 0.94, 1.0], back: [0.85, 0.92, 1.0], backAmt: 0.7 },
    petals: { a: [0.76, 0.78, 0.92], b: [0.95, 0.96, 1.0], back: [0.88, 0.93, 1.0], backAmt: 0.7 },
  }),

  // 梅 Winter Plum: ink-wash on paper. Overcast, snow instead of petals, red plum on a sparse tree.
  snow: scene({
    title: { zh: '梅', en: 'Winter Plum', color: '#1c1b20', shadow: 'rgba(255,255,255,.55)' },
    exposure: 0.95, bloom: 0.12, sunEl: [0.11, 0.07],
    fog: { color: 0xd7d6d3, near: 30, far: 700 },
    light: { color: 0xf3f1ee, intensity: 1.3 },
    hemi: { sky: 0xd4d8e0, ground: 0x5a5a62, intensity: 0.9 },
    sky: {
      hor: [0.86, 0.85, 0.83], low: [0.78, 0.78, 0.78], mid: [0.64, 0.65, 0.68], up: [0.47, 0.49, 0.54], top: [0.33, 0.35, 0.41],
      horGlow: [1.0, 0.98, 0.94], horGlowAmt: 0.10,
      disk: [1.0, 0.99, 0.95], diskAmt: 0.35, diskEdge: [0.99800, 0.99930],
      glow: [1.0, 0.98, 0.92], glowAmt: 0.25, glowPow: 30.0,
      cloud: [0.96, 0.96, 0.97], cloudAmt: 0.45,
    },
    mountains: { base: [0.10, 0.10, 0.115], ramp: [0.55, 0.55, 0.56] },
    mist: { color: [1.0, 1.0, 1.0], alpha: 1.6 },
    lake: { skyMul: 0.70, tint: [0.20, 0.21, 0.23], tintAmt: 0.45, streak: [1.0, 1.0, 0.98], streakAmt: 0.5, shimmer: [0.9, 0.9, 0.92] },
    ground: 0xc9c9ce,
    grass: { base: [0.07, 0.07, 0.08], tip: [0.30, 0.30, 0.32], tipAmt: 0.6 },
    trunk: 0x121115, birds: 0x18171b,
    blossom: { a: [0.62, 0.05, 0.12], b: [0.88, 0.22, 0.28], back: [1.0, 0.55, 0.55], backAmt: 0.35, perTip: 7 },
    petals: { shape: 'flake', a: [0.95, 0.95, 0.97], b: [1.0, 1.0, 1.0], back: [1.0, 1.0, 1.0], backAmt: 0.2, alt: [0.80, 0.14, 0.20], altFrac: 0.10, fall: 0.6, size: 1.7 },
  }),

  // 晨 First Light: the sun comes UP through river mist; cool blue hills, peach-white blossoms.
  dawn: scene({
    title: { zh: '晨', en: 'First Light', color: '#fff4ea', shadow: 'rgba(40,30,50,.55)' },
    exposure: 0.9, bloom: 0.34, sunEl: [0.015, 0.11],
    fog: { color: 0xe3a58a, near: 30, far: 780 },
    light: { color: 0xffd2b0, intensity: 2.6 },
    hemi: { sky: 0x8a96b8, ground: 0x14121a, intensity: 0.5 },
    sky: {
      hor: [1.00, 0.68, 0.46], low: [0.94, 0.60, 0.54], mid: [0.62, 0.55, 0.68], up: [0.30, 0.38, 0.58], top: [0.12, 0.17, 0.33],
      horGlow: [1.0, 0.85, 0.70], horGlowAmt: 0.25,
      disk: [1.0, 0.96, 0.86], diskAmt: 2.2,
      glow: [1.0, 0.86, 0.70], glowAmt: 0.5,
      cloud: [1.0, 0.88, 0.80], cloudAmt: 0.40,
    },
    mountains: { base: [0.07, 0.08, 0.14], ramp: [0.38, 0.34, 0.40] },
    mist: { color: [1.0, 0.86, 0.74], alpha: 1.2 },
    lake: { skyMul: 0.85, tint: [0.12, 0.12, 0.18], tintAmt: 0.30, streak: [1.0, 0.90, 0.75], streakAmt: 2.4, shimmer: [0.95, 0.85, 0.75] },
    ground: 0x15121b,
    grass: { base: [0.05, 0.045, 0.07], tip: [0.98, 0.80, 0.66], tipAmt: 0.9 },
    trunk: 0x0d0b12, birds: 0x15121b,
    blossom: { a: [0.97, 0.78, 0.76], b: [1.0, 0.95, 0.93], back: [1.0, 0.90, 0.78], backAmt: 0.7 },
    petals: { a: [0.98, 0.84, 0.82], b: [1.0, 0.96, 0.94], back: [1.0, 0.92, 0.80], backAmt: 0.7 },
  }),
};

export const SCENE_IDS = Object.keys(SCENES);
const asked = new URLSearchParams(globalThis.location ? location.search : '').get('scene');
export const SCENE_ID = SCENES[asked] ? asked : 'dusk';
export const S = SCENES[SCENE_ID];

// GLSL literals. toFixed(5) keeps every existing value exact.
export const v3 = (c) => `vec3(${c.map((x) => (+x).toFixed(5)).join(', ')})`;
export const f1 = (x) => (+x).toFixed(5);
