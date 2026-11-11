import * as THREE from 'three';
import { smooth, lerp } from './util.js';

// A shadow-puppet swordsman: flat paper-cut parts, extruded a little so the
// sun behind him lights the edges gold. Joints rotate about Z (profile plane),
// the whole figure yaws about Y for the spin. Everything is a function of t.
const DEPTH = 0.08;
const INK = new THREE.MeshStandardMaterial({ color: 0x0a0609, roughness: 0.85, metalness: 0.0 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0x2a2630, roughness: 0.35, metalness: 0.85 });

function part(points, z = 0, mat = INK) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: false });
  geo.translate(0, 0, -DEPTH / 2 + z);
  return new THREE.Mesh(geo, mat);
}
function disc(r, cx, cy, z = 0, mat = INK, seg = 28) {
  const pts = []; for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return part(pts, z, mat);
}
const G = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };

// joint angles per pose; anything missing is 0. +Z rotation swings a hanging limb forward (+X).
const POSES = {
  idle:     { uR: 0.10, fR: 0.12, uL: -0.08, fL: 0.14, tR: 0.06, tL: -0.06, head: -0.03 },
  reach:    { uR: -0.40, fR: 1.25, hR: 0.6, uL: 0.35, fL: 0.2, torso: -0.10, head: -0.12, tR: 0.12, tL: -0.1 },
  drawnLow: { uR: 0.55, fR: 0.25, uL: -0.45, fL: -0.1, torso: -0.05, tR: 0.25, sR: -0.25, tL: -0.2 },
  guard:    { uR: 0.95, fR: 1.40, uL: 0.70, fL: 1.45, torso: -0.08, tR: 0.35, sR: -0.35, tL: -0.3, bob: -0.05 },
  thrust:   { uR: 1.60, fR: 0.00, uL: -0.95, fL: -0.30, torso: -0.28, head: 0.1, tR: 0.85, sR: -0.85, tL: -0.55, sL: 0.1, bob: -0.14 },
  windup:   { uR: -0.60, fR: 1.10, uL: 0.80, fL: 0.6, torso: 0.12, tR: 0.3, sR: -0.3, tL: -0.4, bob: -0.06 },
  sweep:    { uR: 1.35, fR: 0.30, uL: -0.70, fL: -0.2, torso: -0.12, tR: 0.55, sR: -0.55, tL: -0.55, bob: -0.10 },
  raise:    { uR: 2.95, fR: 0.15, uL: -0.55, fL: -0.3, torso: 0.14, head: 0.28, tR: 0.2, sR: -0.1, tL: -0.35, bob: 0.04 },
  cut:      { uR: 0.95, fR: 0.10, uL: -0.60, fL: -0.2, torso: -0.36, head: -0.08, tR: 0.9, sR: -0.9, tL: -0.65, bob: -0.18 },
  still:    { uR: 0.45, fR: 0.05, uL: -0.25, fL: 0.1, torso: -0.12, head: -0.06, tR: 0.4, sR: -0.4, tL: -0.3, bob: -0.06 },
  sheathe:  { uR: -0.35, fR: 1.20, hR: 0.5, uL: 0.30, fL: 0.25, torso: -0.10, head: -0.14, tR: 0.12, tL: -0.1 },
};
// time -> pose keyframes; smooth interpolation between neighbours
const KEYS = [
  [0, 'idle'], [29.0, 'idle'], [30.4, 'reach'], [31.4, 'drawnLow'], [33.0, 'guard'], [35.0, 'thrust'],
  [36.2, 'windup'], [37.6, 'sweep'], [39.6, 'raise'], [41.5, 'cut'], [44.0, 'still'], [46.6, 'sheathe'], [48.2, 'idle'], [60, 'idle'],
];
const SPIN = [36.3, 37.7];           // root yaw 0 -> 2pi
const DRAW_T = 30.95, SHEATHE_T = 47.4;

export function makePuppet() {
  const root = new THREE.Group();
  const hips = G(0, 0.97, 0); root.add(hips);

  // robe hangs from the hips, in front of the legs
  const robe = part([[-0.17, 0.03], [0.17, 0.03], [0.33, -0.93], [0.22, -0.97], [0.06, -0.92], [-0.09, -0.97], [-0.25, -0.94], [-0.35, -0.88]], 0.09);
  hips.add(robe);
  const sash = part([[-0.19, 0.08], [0.19, 0.08], [0.19, -0.02], [-0.19, -0.02]], 0.1);
  hips.add(sash);

  const torso = G(0, 0, 0); hips.add(torso);
  torso.add(part([[-0.16, 0.0], [0.16, 0.0], [0.23, 0.50], [0.20, 0.56], [-0.20, 0.56], [-0.21, 0.48]], 0.0));
  const head = G(0, 0.56, 0.02); torso.add(head);
  head.add(part([[-0.05, 0.0], [0.05, 0.0], [0.045, 0.10], [-0.045, 0.10]], 0));        // neck
  head.add(disc(0.145, 0.01, 0.23, 0));                                                   // head
  head.add(part([[0.12, 0.25], [0.19, 0.21], [0.13, 0.17]], 0.0));                        // nose
  head.add(disc(0.055, -0.03, 0.40, 0));                                                  // topknot
  head.add(part([[-0.06, 0.34], [0.0, 0.37], [-0.09, 0.30]], 0));                          // hair sweep
  const ribbons = [];
  for (let r = 0; r < 2; r++) {
    const parent = G(-0.07, 0.40, r ? -0.03 : 0.03); head.add(parent);
    const segs = [];
    for (let i = 0; i < 7; i++) {
      const s = G(0, -0.11, 0);
      s.add(part([[-0.016, 0.0], [0.016, 0.0], [0.014, -0.12], [-0.014, -0.12]], 0));
      (i ? segs[i - 1] : parent).add(s); segs.push(s);
    }
    ribbons.push({ parent, segs, phase: r * 1.3 });
  }

  const mkArm = (z, side) => {
    const sh = G(side * 0.03, 0.50, z); torso.add(sh);
    sh.add(part([[-0.07, 0.03], [0.07, 0.03], [0.17, -0.40], [-0.15, -0.40]], 0));        // wide sleeve
    const fa = G(0, -0.40, 0); sh.add(fa);
    fa.add(part([[-0.05, 0.02], [0.05, 0.02], [0.045, -0.36], [-0.045, -0.36]], 0));
    const hand = G(0, -0.37, 0); fa.add(hand);
    hand.add(disc(0.05, 0, -0.02, 0));
    return { sh, fa, hand };
  };
  const armR = mkArm(0.15, 1), armL = mkArm(-0.15, -1);

  // sword in the right hand (hidden until drawn), blade runs along -Y past the hand
  const sword = G(0, -0.02, 0.06); armR.hand.add(sword);
  sword.add(part([[-0.016, 0.14], [0.016, 0.14], [0.016, -0.06], [-0.016, -0.06]], 0));   // grip
  sword.add(disc(0.03, 0, 0.15, 0));                                                     // pommel
  sword.add(part([[-0.075, -0.06], [0.075, -0.06], [0.075, -0.095], [-0.075, -0.095]], 0)); // guard
  sword.add(part([[-0.024, -0.095], [0.024, -0.095], [0.02, -0.92], [0.0, -1.02], [-0.02, -0.92]], 0, STEEL));
  sword.visible = false;

  // scabbard on the far hip, pointing back and down, with the hilt showing
  const scab = G(-0.12, -0.04, -0.12); hips.add(scab); scab.rotation.z = -0.55;
  scab.add(part([[-0.03, 0.0], [0.03, 0.0], [0.028, -0.92], [0.0, -0.96], [-0.028, -0.92]], 0));
  const hilt = G(0, 0, 0); scab.add(hilt);
  hilt.add(part([[-0.016, 0.22], [0.016, 0.22], [0.016, 0.0], [-0.016, 0.0]], 0));
  hilt.add(disc(0.03, 0, 0.23, 0));
  hilt.add(part([[-0.075, 0.035], [0.075, 0.035], [0.075, 0.0], [-0.075, 0.0]], 0));

  const mkLeg = (z, side) => {
    const th = G(side * 0.05, 0.0, z); hips.add(th);
    th.add(part([[-0.07, 0.02], [0.07, 0.02], [0.06, -0.45], [-0.06, -0.45]], 0));
    const sh = G(0, -0.45, 0); th.add(sh);
    sh.add(part([[-0.055, 0.0], [0.055, 0.0], [0.05, -0.45], [-0.05, -0.45]], 0));
    sh.add(part([[-0.06, -0.45], [0.06, -0.45], [0.17, -0.47], [0.18, -0.52], [-0.07, -0.52]], 0));   // shoe
    return { th, sh };
  };
  const legR = mkLeg(0.03, 1), legL = mkLeg(-0.03, -1);

  function poseAt(t) {
    let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
    const [t0, a] = KEYS[i], [t1, b] = KEYS[i + 1];
    const u = smooth((t - t0) / (t1 - t0));
    const A = POSES[a], B = POSES[b], out = {};
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) out[k] = lerp(A[k] || 0, B[k] || 0, u);
    return out;
  }

  function update(t, gust = 0) {
    const p = poseAt(t);
    const br = Math.sin(t * 1.3) * 0.012;                 // breathing
    hips.position.y = 0.97 + (p.bob || 0) + Math.sin(t * 1.3) * 0.004;
    torso.rotation.z = (p.torso || 0) + br;
    head.rotation.z = (p.head || 0) - br * 1.5;
    armR.sh.rotation.z = p.uR || 0; armR.fa.rotation.z = p.fR || 0; armR.hand.rotation.z = p.hR || 0;
    armL.sh.rotation.z = p.uL || 0; armL.fa.rotation.z = p.fL || 0;
    legR.th.rotation.z = p.tR || 0; legR.sh.rotation.z = p.sR || 0;
    legL.th.rotation.z = p.tL || 0; legL.sh.rotation.z = p.sL || 0;
    robe.rotation.z = Math.sin(t * 1.1) * 0.02 - gust * 0.06;
    const drawn = t >= DRAW_T && t < SHEATHE_T;
    sword.visible = drawn; hilt.visible = !drawn;
    let yaw = 0;
    if (t > SPIN[0]) yaw = smooth((t - SPIN[0]) / (SPIN[1] - SPIN[0])) * Math.PI * 2;
    root.rotation.y = yaw;
    for (const r of ribbons) {
      for (let i = 0; i < r.segs.length; i++) {
        const s = r.segs[i];
        const wave = Math.sin(t * 3.2 - i * 0.75 + r.phase) * (0.16 + gust * 0.25);
        s.rotation.z = (i === 0 ? -1.25 : -0.06) + wave + (i === 0 ? -gust * 0.4 : 0);
      }
    }
  }
  return { root, update, DRAW_T, SHEATHE_T };
}
