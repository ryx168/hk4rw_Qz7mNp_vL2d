import * as THREE from 'three';
import { GLSL_NOISE, GLSL_SKY } from './util.js';
import { S, v3, f1 } from './scenes.js';

// Backdrop sphere: molten-gold sunset gradient, a big low sun, thin cloud streaks.
export function makeSky(uniforms) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: uniforms.uSun, uTime: uniforms.uTime },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun; uniform float uTime; varying vec3 vDir;
      ${GLSL_NOISE}
      ${GLSL_SKY}
      void main(){
        vec3 d = normalize(vDir);
        vec3 c = skyColor(d, uSun);
        float sd = dot(d, uSun);
        float disk = smoothstep(${f1(S.sky.diskEdge[0])}, ${f1(S.sky.diskEdge[1])}, sd);
        float glow = pow(max(sd, 0.0), ${f1(S.sky.glowPow)});
        c += ${v3(S.sky.disk)} * disk * ${f1(S.sky.diskAmt)} + ${v3(S.sky.glow)} * glow * ${f1(S.sky.glowAmt)};
        float az = atan(d.x, -d.z);
        float band = smoothstep(0.015, 0.06, d.y) * (1.0 - smoothstep(0.10, 0.30, d.y));
        float cl = fbm(vec2(az * 4.0 + uTime * 0.006, d.y * 55.0));
        cl = smoothstep(0.45, 0.75, cl);
        c = mix(c, ${v3(S.sky.cloud)}, cl * band * ${f1(S.sky.cloudAmt)});${S.sky.stars > 0 ? `
        // stars on an (azimuth, elevation) grid so they stay fixed to the sky, not the screen
        vec2 sg = vec2(az * 260.0, d.y * 260.0);
        float sh = hash21(floor(sg));
        float star = step(0.9965, sh) * smoothstep(0.42, 0.0, length(fract(sg) - 0.5));
        star *= 0.55 + 0.45 * sin(uTime * (1.5 + sh * 3.0) + sh * 40.0);
        c += vec3(0.85, 0.9, 1.0) * star * ${f1(S.sky.stars)} * smoothstep(0.04, 0.25, d.y) * (1.0 - glow);` : ''}
        c += (hash21(gl_FragCoord.xy) - 0.5) * 0.012;   // dither against banding
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 32), mat);
  mesh.frustumCulled = false;
  return mesh;
}
