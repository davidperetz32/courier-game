// The stage-1 placeholder courier. Kept as the fallback when assets/courier.glb cannot be loaded.
// Same interface as js/courier.js.
import * as THREE from '../vendor/three.module.min.js';

const PUFFS = 14;

export function createPlaceholder() {
  const root = new THREE.Group();
  const pivot = new THREE.Group();          // everything that squashes and leans
  root.add(pivot);

  const mat = (color, extra) => new THREE.MeshLambertMaterial(Object.assign({ color }, extra));
  const jacket = mat(0xf97316), pants = mat(0x1e3a5f), skin = mat(0xf2c7a0), capM = mat(0x1d4ed8);
  const steel = mat(0xdfe6ee), band = mat(0x38bdf8, { emissive: 0x0b6fa8 }), dark = mat(0x1e293b);

  const mesh = (geo, m, parent, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };

  // torso and head
  const torso = mesh(new THREE.CapsuleGeometry(0.27, 0.42, 4, 12), jacket, pivot, 0, 1.08, 0);
  const head = mesh(new THREE.SphereGeometry(0.21, 16, 12), skin, pivot, 0, 1.66, 0);
  mesh(new THREE.SphereGeometry(0.225, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM, head, 0, 0.03, 0);
  mesh(new THREE.BoxGeometry(0.3, 0.04, 0.2), capM, head, 0, 0.06, -0.22);

  // limbs hang from pivots so they can swing
  const limb = (m, x, y, len, r) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    pivot.add(g);
    mesh(new THREE.CapsuleGeometry(r, len, 3, 8), m, g, 0, -len / 2 - r * 0.5, 0);
    return g;
  };
  const legL = limb(pants, -0.13, 0.74, 0.46, 0.105), legR = limb(pants, 0.13, 0.74, 0.46, 0.105);
  const armL = limb(jacket, -0.36, 1.36, 0.36, 0.085), armR = limb(jacket, 0.36, 1.36, 0.36, 0.085);

  // liquid nitrogen flask on the back (+z is the back, the side the camera sees)
  const flask = new THREE.Group();
  flask.position.set(0, 1.08, 0.36);
  pivot.add(flask);
  mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.52, 14), steel, flask, 0, 0, 0);
  mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.1, 14), band, flask, 0, 0.02, 0);
  mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.1, 12), steel, flask, 0, 0.31, 0);
  mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 12), dark, flask, 0, 0.39, 0);

  // vapour: small white puffs that rise from the flask and drift back
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78, depthWrite: false });
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 1), puffMat, PUFFS);
  puffs.frustumCulled = false;
  root.add(puffs);
  const pf = [];
  for (let i = 0; i < PUFFS; i++) pf.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 1 });
  const dummy = new THREE.Object3D();
  let emit = 0, phase = 0, next = 0;

  function spawnPuff(power) {
    const p = pf[next]; next = (next + 1) % PUFFS;
    p.max = 0.55 + Math.random() * 0.35; p.life = p.max;
    p.x = flask.position.x + (Math.random() - 0.5) * 0.12;
    p.y = pivot.scale.y * 1.52; p.z = 0.4;
    p.vx = (Math.random() - 0.5) * 0.5 * power; p.vy = 0.5 + Math.random() * 0.5 * power; p.vz = 1.6 + Math.random() * 1.0;
    p.size = (0.7 + Math.random() * 0.6) * power;
  }

  function update(dt, pose) {
    root.position.y = pose.y;
    phase += dt * (4 + pose.speed * 0.75);
    const sw = Math.sin(phase);
    const run = pose.air ? 0 : 1 - pose.slide;

    // run cycle, tuck in the air, tuck in a slide
    legL.rotation.x = sw * 0.95 * run + (pose.air ? 0.9 : 0) + pose.slide * 1.3;
    legR.rotation.x = -sw * 0.95 * run + (pose.air ? -0.5 : 0) + pose.slide * 1.3;
    armL.rotation.x = -sw * 0.8 * run + (pose.air ? 2.4 : 0);
    armR.rotation.x = sw * 0.8 * run + (pose.air ? 2.4 : 0);
    armL.rotation.z = pose.air ? -0.3 : 0; armR.rotation.z = pose.air ? 0.3 : 0;

    const bob = Math.abs(Math.cos(phase)) * 0.07 * run;
    pivot.position.y = bob;
    pivot.scale.y = 1 - pose.slide * 0.52;
    pivot.scale.x = pivot.scale.z = 1 + pose.slide * 0.15;
    pivot.rotation.x = -0.12 * run - pose.slide * 0.25 - pose.dead * 1.45 + pose.stumble * 0.35;
    pivot.rotation.z = -pose.lean * 0.3 + pose.stumble * Math.sin(phase * 2) * 0.15;
    pivot.rotation.y = -pose.lean * 0.25;
    torso.rotation.y = sw * 0.12 * run;

    // vapour
    if (Math.abs(pose.dead) < 0.5) {
      emit += dt * (6 + 12 * pose.nitro);
      while (emit > 1) { emit -= 1; spawnPuff(1); }
    }
    for (let i = 0; i < PUFFS; i++) {
      const p = pf[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const k = Math.max(0, p.life / p.max);
        const s = p.size * Math.sin(k * Math.PI) * 1.05 + 0.01;
        dummy.position.set(p.x, p.y, p.z); dummy.scale.setScalar(s);
      } else {
        dummy.position.set(0, -10, 0); dummy.scale.setScalar(0.001);
      }
      dummy.updateMatrix();
      puffs.setMatrixAt(i, dummy.matrix);
    }
    puffs.instanceMatrix.needsUpdate = true;
  }

  function burst() { for (let i = 0; i < PUFFS; i++) spawnPuff(1.8); }
  function reset() { for (const p of pf) p.life = 0; phase = 0; emit = 0; }

  return { root, update, burst, reset };
}
