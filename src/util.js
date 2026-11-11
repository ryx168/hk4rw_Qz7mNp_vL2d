// Deterministic PRNG + JS-side value noise, so every run of the film is identical.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeNoise1D(seed) {
  const r = mulberry32(seed);
  const table = new Float32Array(1024).map(() => r());
  const lat = (i) => table[((i % 1024) + 1024) % 1024];
  const n = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lat(i) * (1 - u) + lat(i + 1) * u; };
  return (x, oct = 4) => { let s = 0, a = 0.5, fr = 1, norm = 0; for (let o = 0; o < oct; o++) { s += a * n(x * fr); norm += a; a *= 0.5; fr *= 2.1; } return s / norm; };
}
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (t) => { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };

// GLSL noise shared by the sky, lake, mist and film passes.
export const GLSL_NOISE = /* glsl */`
  float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    float a=hash21(i), b=hash21(i+vec2(1,0)), c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
  float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,9.7); a*=0.5; } return s; }
`;

// The sky gradient is one function so the lake can mirror it exactly.
export const GLSL_SKY = /* glsl */`
  vec3 skyColor(vec3 d, vec3 sun){
    float h = d.y;
    vec3 cHor = vec3(1.00, 0.70, 0.32);
    vec3 cLow = vec3(0.93, 0.45, 0.30);
    vec3 cMid = vec3(0.55, 0.28, 0.42);
    vec3 cUp  = vec3(0.22, 0.14, 0.34);
    vec3 cTop = vec3(0.07, 0.06, 0.16);
    float hh = max(h, 0.0);
    vec3 c = mix(cHor, cLow, smoothstep(0.0, 0.08, hh));
    c = mix(c, cMid, smoothstep(0.06, 0.22, hh));
    c = mix(c, cUp,  smoothstep(0.20, 0.45, hh));
    c = mix(c, cTop, smoothstep(0.45, 0.90, hh));
    float sd = max(dot(d, sun), 0.0);
    c += vec3(1.0, 0.72, 0.42) * pow(sd, 6.0) * 0.22 * (1.0 - smoothstep(0.0, 0.45, hh));
    c = mix(c, cHor * 0.92, smoothstep(0.0, -0.12, h));
    return c;
  }
`;
