import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GLSL_NOISE } from './util.js';

// Bloom for the sun, then a "film" pass: paper fibre, grain, vignette, fade.
export function makePost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFade: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uTime, uFade, uAspect; varying vec2 vUv;
      ${GLSL_NOISE}
      void main(){
        vec3 col = texture2D(tDiffuse, vUv).rgb;
        float fibre = fbm(vUv * vec2(260.0 * uAspect, 60.0)) - 0.5;
        float grain = hash21(vUv * 1000.0 + fract(uTime * 7.1) * 100.0) - 0.5;
        col *= 1.0 + fibre * 0.07;
        col += grain * 0.045;
        vec2 q = (vUv - 0.5) * vec2(1.25, 1.0);
        float v = smoothstep(1.05, 0.30, length(q));
        col *= mix(0.45, 1.0, v);
        // lift the blacks a touch toward warm ink
        col = mix(vec3(0.03, 0.015, 0.03), col, 0.98);
        col *= uFade;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  composer.addPass(film);
  return { composer, bloom, film };
}
