import * as THREE from 'three';
import { GLSL_NOISE, GLSL_SKY } from './util.js';

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
        float disk = smoothstep(0.99880, 0.99935, sd);
        float glow = pow(max(sd, 0.0), 70.0);
        c += vec3(1.0, 0.92, 0.70) * disk * 2.4 + vec3(1.0, 0.80, 0.50) * glow * 0.45;
        float az = atan(d.x, -d.z);
        float band = smoothstep(0.015, 0.06, d.y) * (1.0 - smoothstep(0.10, 0.30, d.y));
        float cl = fbm(vec2(az * 4.0 + uTime * 0.006, d.y * 55.0));
        cl = smoothstep(0.45, 0.75, cl);
        c = mix(c, vec3(1.0, 0.86, 0.62), cl * band * 0.35);
        c += (hash21(gl_FragCoord.xy) - 0.5) * 0.012;   // dither against banding
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 32), mat);
  mesh.frustumCulled = false;
  return mesh;
}
