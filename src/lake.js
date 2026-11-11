import * as THREE from 'three';
import { GLSL_NOISE, GLSL_SKY } from './util.js';

// Still water that mirrors the sky function and carries the sun's gold streak
// toward the viewer. Fog is done by hand to match scene.fog.
export function makeLake(uniforms, fog) {
  const mat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uSun: uniforms.uSun, uTime: uniforms.uTime,
      uFogColor: { value: fog.color }, uFogNear: { value: fog.near }, uFogFar: { value: fog.far }
    },
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uFogColor; uniform float uTime, uFogNear, uFogFar; varying vec3 vWorld;
      ${GLSL_NOISE}
      ${GLSL_SKY}
      void main(){
        vec3 toP = vWorld - cameraPosition; float dist = length(toP); vec3 d = toP / dist;
        vec3 r = vec3(d.x, -d.y, d.z);
        vec3 col = skyColor(r, uSun) * 0.80;
        col = mix(col, vec3(0.10, 0.06, 0.12), 0.30);
        float az = atan(d.x, -d.z), sunAz = atan(uSun.x, -uSun.z);
        float da = az - sunAz;
        float streak = exp(-da * da * 160.0);
        float ripple = fbm(vec2(vWorld.x * 0.55 + uTime * 0.35, vWorld.z * 0.12 - uTime * 0.45));
        ripple = 0.35 + 0.65 * smoothstep(0.30, 0.72, ripple);
        float ext = exp(-max(-d.y, 0.0) * 9.0);
        col += vec3(1.0, 0.84, 0.52) * streak * ripple * ext * 2.6;
        // faint ripple shimmer everywhere
        float sh = fbm(vec2(vWorld.x * 0.9 - uTime * 0.2, vWorld.z * 0.3 + uTime * 0.3));
        col += vec3(0.9, 0.7, 0.5) * smoothstep(0.62, 0.8, sh) * 0.06 * ext;
        float f = smoothstep(uFogNear, uFogFar, dist);
        col = mix(col, uFogColor, f);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const geo = new THREE.PlaneGeometry(2400, 1400, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(0, -0.9, -700);
  return m;
}
