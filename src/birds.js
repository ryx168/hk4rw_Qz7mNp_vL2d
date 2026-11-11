import * as THREE from 'three';
import { mulberry32 } from './util.js';

// A loose V of silhouette birds crossing the sky on cue.
export function makeBirds() {
  const g = new THREE.Group();
  const rnd = mulberry32(21);
  const mat = new THREE.MeshBasicMaterial({ color: 0x120a14, side: THREE.DoubleSide, fog: true });
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.9, 0.18, 0, 0.55, -0.08, 0], 3));
  wing.setIndex([0, 1, 2]);
  const birds = [];
  const layout = [[0, 0], [-1.6, -0.5], [1.6, -0.5], [-3.2, -1.0], [3.2, -1.0], [-4.8, -1.6], [4.9, -1.5]];
  for (const [dx, dz] of layout) {
    const b = new THREE.Group();
    const L = new THREE.Mesh(wing, mat), R = new THREE.Mesh(wing, mat);
    R.scale.x = -1;
    b.add(L, R);
    b.userData = { dx, dz, phase: rnd() * 6.28, L, R, bob: rnd() };
    b.scale.setScalar(0.55);
    g.add(b); birds.push(b);
  }
  g.visible = false;
  // passes: [start time, duration, from, to]
  const passes = [[9.5, 13, new THREE.Vector3(-48, 9, -55), new THREE.Vector3(40, 13, -40)],
                  [50.5, 9, new THREE.Vector3(30, 7, -60), new THREE.Vector3(-30, 10.5, -48)]];
  g.userData.update = (t) => {
    let active = null, u = 0;
    for (const p of passes) if (t >= p[0] && t <= p[0] + p[1]) { active = p; u = (t - p[0]) / p[1]; }
    g.visible = !!active;
    if (!active) return;
    const pos = active[2].clone().lerp(active[3], u);
    const dir = Math.sign(active[3].x - active[2].x);
    for (const b of birds) {
      const d = b.userData;
      b.position.set(pos.x + d.dx * dir, pos.y + d.dz * 0.6 + Math.sin(t * 0.9 + d.phase) * 0.3, pos.z + d.dz * 1.4);
      const f = Math.sin(t * 7.5 + d.phase) * 0.7;
      d.L.rotation.y = -f * 0.0; d.L.rotation.z = f * 0.9; d.R.rotation.z = -f * 0.9;
      b.rotation.y = dir > 0 ? 0 : Math.PI;
    }
  };
  return g;
}
