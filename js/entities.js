// Obstacles, coins and refill stations: pooled data + instanced drawing (one draw call per type).
import * as THREE from '../vendor/three.module.min.js';
import { Builder } from './geo.js';
import { OB } from './patterns.js';

const CAP = 28, COIN_CAP = 180, OB_POOL = 110;
const SUIT = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0x0ea5e9];
const TINTS = [0xfca5a5, 0x93c5fd, 0x86efac, 0xfde68a, 0xd8b4fe, 0xfdba74, 0xf9a8d4];

function geometries() {
  const g = {};
  let b;

  b = new Builder();                                   // baggage cart (must change lane)
  b.box(1.5, 0.14, 2.2, 0x64748b, 0, 0.36, 0);
  for (const x of [-0.6, 0.6]) for (const z of [-0.8, 0.8]) b.cyl(0.16, 0.16, 0.12, 0x1e293b, x, 0.16, z, 10, 0, Math.PI / 2);
  b.box(0.08, 0.9, 0.08, 0x94a3b8, -0.7, 0.85, 1.06).box(0.08, 0.9, 0.08, 0x94a3b8, 0.7, 0.85, 1.06).box(1.5, 0.08, 0.08, 0x94a3b8, 0, 1.3, 1.06);
  b.box(1.3, 0.5, 0.9, SUIT[0], 0, 0.68, -0.5).box(1.2, 0.45, 0.8, SUIT[1], 0.02, 0.66, 0.45);
  b.box(1.1, 0.45, 0.85, SUIT[3], -0.05, 1.15, -0.4).box(0.9, 0.4, 0.7, SUIT[2], 0.1, 1.1, 0.4).box(0.8, 0.35, 0.6, SUIT[4], 0, 1.55, -0.2);
  g.cart = b.build();

  b = new Builder();                                   // tall info kiosk (blocks the lane)
  b.box(1.5, 3.0, 0.9, 0x0f766e, 0, 1.5, 0).box(1.6, 0.14, 1.0, 0x134e4a, 0, 3.05, 0).box(1.6, 0.2, 1.0, 0x134e4a, 0, 0.1, 0);
  b.box(1.2, 1.3, 0.04, 0xa5f3fc, 0, 1.95, 0.46).box(1.0, 0.1, 0.05, 0x0e7490, 0, 2.3, 0.47).box(0.7, 0.1, 0.05, 0x0e7490, -0.15, 2.05, 0.47).box(0.9, 0.1, 0.05, 0x0e7490, -0.05, 1.8, 0.47);
  b.box(1.2, 0.5, 0.04, 0xfacc15, 0, 0.85, 0.46);
  g.tall = b.build();

  b = new Builder();                                   // low barrier (jump)
  for (let k = 0; k < 6; k++) b.box(0.32, 0.4, 0.1, k % 2 ? 0xf8fafc : 0xef4444, -0.8 + k * 0.32, 0.5, 0);
  b.box(0.1, 0.72, 0.5, 0x475569, -0.9, 0.36, 0).box(0.1, 0.72, 0.5, 0x475569, 0.9, 0.36, 0);
  g.barrier = b.build();

  b = new Builder();                                   // suitcase pile (jump)
  b.box(0.8, 0.45, 0.6, SUIT[1], -0.42, 0.225, 0.05).box(0.75, 0.4, 0.55, SUIT[0], 0.42, 0.2, -0.05).box(0.7, 0.3, 0.5, SUIT[3], -0.1, 0.6, 0);
  b.box(0.3, 0.05, 0.08, 0x1e293b, -0.42, 0.47, 0.05).box(0.3, 0.05, 0.08, 0x1e293b, -0.1, 0.77, 0);
  g.pile = b.build();

  b = new Builder();                                   // hanging sign (slide)
  b.box(1.9, 1.1, 0.14, 0x1d4ed8, 0, 1.82, 0).box(1.7, 0.12, 0.16, 0xfacc15, 0, 1.38, 0);
  b.box(0.9, 0.16, 0.16, 0xf8fafc, -0.3, 2.05, 0).box(0.5, 0.16, 0.16, 0xf8fafc, -0.5, 1.75, 0).box(0.3, 0.4, 0.16, 0xf8fafc, 0.6, 1.9, 0);
  b.box(0.05, 5.7, 0.05, 0x94a3b8, -0.8, 5.2, 0).box(0.05, 5.7, 0.05, 0x94a3b8, 0.8, 5.2, 0);
  g.sign = b.build();

  b = new Builder();                                   // belt barrier bar (slide)
  for (let k = 0; k < 6; k++) b.box(0.3, 0.42, 0.12, k % 2 ? 0x1e293b : 0xfacc15, -0.75 + k * 0.3, 1.42, 0);
  b.cyl(0.07, 0.07, 1.75, 0x64748b, -0.95, 0.875, 0).cyl(0.07, 0.07, 1.75, 0x64748b, 0.95, 0.875, 0);
  b.cyl(0.2, 0.22, 0.08, 0x334155, -0.95, 0.04, 0).cyl(0.2, 0.22, 0.08, 0x334155, 0.95, 0.04, 0);
  g.bar = b.build();

  b = new Builder();                                   // passenger with a trolley bag, walking towards +x
  b.cyl(0.2, 0.24, 0.8, 0xffffff, 0, 1.05, 0).sph(0.19, 0xfde4cf, 0, 1.62, 0);
  b.box(0.14, 0.66, 0.16, 0x475569, 0.02, 0.33, -0.1).box(0.14, 0.66, 0.16, 0x475569, -0.02, 0.33, 0.1);
  b.box(0.22, 0.5, 0.34, 0x64748b, -0.42, 0.3, 0).box(0.04, 0.5, 0.04, 0x94a3b8, -0.36, 0.75, 0);
  g.passenger = b.build();

  b = new Builder();                                   // standing traveller with a big trolley bag (must change lane)
  b.cyl(0.22, 0.26, 0.85, 0x2563eb, -0.22, 1.1, 0).sph(0.2, 0xfde4cf, -0.22, 1.68, 0);
  b.box(0.16, 0.7, 0.18, 0x334155, -0.3, 0.35, 0).box(0.16, 0.7, 0.18, 0x334155, -0.14, 0.35, 0);
  b.box(0.5, 0.8, 0.34, SUIT[0], 0.3, 0.45, 0.05).box(0.04, 0.5, 0.04, 0x94a3b8, 0.18, 1.1, -0.08).box(0.04, 0.5, 0.04, 0x94a3b8, 0.42, 1.1, -0.08).box(0.3, 0.05, 0.05, 0x1e293b, 0.3, 1.36, -0.08);
  g.traveler = b.build();

  b = new Builder();                                   // wet floor sign and cones (jump)
  b.box(0.5, 0.68, 0.05, 0xfacc15, 0, 0.34, 0.12, 0).box(0.5, 0.68, 0.05, 0xfacc15, 0, 0.34, -0.12, 0).box(0.3, 0.3, 0.06, 0x1e293b, 0, 0.42, 0.13);
  for (const x of [-0.62, 0.62]) b.cyl(0.03, 0.15, 0.55, 0xf97316, x, 0.3, 0).box(0.34, 0.04, 0.34, 0xf97316, x, 0.02, 0).cyl(0.085, 0.105, 0.1, 0xf8fafc, x, 0.36, 0);
  g.cone = b.build();

  b = new Builder();                                   // queue posts with a belt (jump)
  for (const x of [-0.9, 0.9]) b.cyl(0.035, 0.035, 0.72, 0xcbd5e1, x, 0.38, 0).cyl(0.17, 0.19, 0.05, 0x64748b, x, 0.025, 0);
  b.box(1.8, 0.07, 0.03, 0xdc2626, 0, 0.68, 0);
  g.rope = b.build();

  return g;
}

export function createEntities(scene, propMat) {
  const geos = geometries();
  const meshes = {};
  for (const type of Object.keys(geos)) {
    const im = new THREE.InstancedMesh(geos[type], propMat, CAP);
    im.castShadow = true; im.frustumCulled = false; im.count = 0;
    scene.add(im);
    meshes[type] = im;
  }
  const white = new THREE.Color(1, 1, 1);
  for (let i = 0; i < CAP; i++) meshes.passenger.setColorAt(i, white);

  const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16).rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshLambertMaterial({ color: 0xffc928, emissive: 0x8a5a00 });
  const coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, COIN_CAP);
  coinMesh.frustumCulled = false; coinMesh.count = 0;
  scene.add(coinMesh);

  // refill stations: a glowing tank with a light beam, at most two alive
  const tankMat = new THREE.MeshLambertMaterial({ color: 0x9be7ff, emissive: 0x18b6e6, emissiveIntensity: 1 });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const stationObjs = [];
  for (let i = 0; i < 3; i++) {
    const grp = new THREE.Group();
    const add = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; grp.add(o); return o; };
    add(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 20), baseMat, 0.06);
    add(new THREE.CylinderGeometry(0.34, 0.34, 1.0, 16), tankMat, 0.7).castShadow = true;
    add(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), tankMat, 1.2);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 10), baseMat, 1.6);
    add(new THREE.CylinderGeometry(0.75, 0.75, 6, 20, 1, true), beamMat, 3);
    const ring = add(new THREE.TorusGeometry(0.75, 0.05, 8, 28), ringMat, 0.2);
    ring.rotation.x = Math.PI / 2;
    grp.userData.ring = ring;
    grp.visible = false;
    scene.add(grp);
    stationObjs.push(grp);
  }

  const obstacles = [], coins = [], stations = [];
  for (let i = 0; i < OB_POOL; i++) obstacles.push({ active: false, type: 'cart', def: OB.cart, x: 0, s: 0, hitT: 0, vx: 0, minX: 0, maxX: 0, tint: 0, seed: 0 });
  for (let i = 0; i < COIN_CAP; i++) coins.push({ active: false, x: 0, s: 0, y: 0 });
  for (let i = 0; i < 3; i++) stations.push({ active: false, x: 0, s: 0 });

  const tints = TINTS.map((c) => new THREE.Color(c));
  let oi = 0, ci = 0;

  function spawnObstacle(type, x, s, minX = 0, maxX = 0, vx = 0) {
    for (let k = 0; k < OB_POOL; k++) {
      const o = obstacles[oi]; oi = (oi + 1) % OB_POOL;
      if (o.active) continue;
      o.active = true; o.type = type; o.def = OB[type]; o.x = x; o.s = s; o.hitT = 0;
      o.minX = minX; o.maxX = maxX; o.vx = vx; o.seed = Math.random() * 6.28; o.tint = Math.floor(Math.random() * tints.length);
      return o;
    }
    return null;
  }
  function spawnCoin(x, s, y) {
    for (let k = 0; k < COIN_CAP; k++) {
      const c = coins[ci]; ci = (ci + 1) % COIN_CAP;
      if (c.active) continue;
      c.active = true; c.x = x; c.s = s; c.y = y;
      return c;
    }
    return null;
  }
  function spawnStation(x, s) {
    const st = stations.find((o) => !o.active);
    if (!st) return null;
    st.active = true; st.x = x; st.s = s;
    return st;
  }
  function clear() {
    for (const o of obstacles) o.active = false;
    for (const c of coins) c.active = false;
    for (const s of stations) s.active = false;
  }

  const dummy = new THREE.Object3D();
  const types = Object.keys(meshes);

  // Writes the instance matrices for everything that is alive. Called once per rendered frame.
  function sync(dist, time) {
    for (let i = 0; i < types.length; i++) meshes[types[i]].count = 0;
    for (let i = 0; i < OB_POOL; i++) {
      const o = obstacles[i];
      if (!o.active) continue;
      const im = meshes[o.type];
      if (im.count >= CAP) continue;
      dummy.position.set(o.x, 0, dist - o.s);
      dummy.rotation.set(0, 0, 0);
      if (o.type === 'passenger') {
        dummy.rotation.y = o.vx < 0 ? Math.PI : 0;
        dummy.position.y = Math.abs(Math.sin(time * 7 + o.seed)) * 0.05;
        im.setColorAt(im.count, tints[o.tint]);
      }
      dummy.updateMatrix();
      im.setMatrixAt(im.count++, dummy.matrix);
    }
    for (let i = 0; i < types.length; i++) meshes[types[i]].instanceMatrix.needsUpdate = true;
    meshes.passenger.instanceColor.needsUpdate = true;

    coinMesh.count = 0;
    for (let i = 0; i < COIN_CAP; i++) {
      const c = coins[i];
      if (!c.active) continue;
      dummy.position.set(c.x, c.y, dist - c.s);
      dummy.rotation.set(0, time * 4 + c.s * 0.4, 0);
      dummy.updateMatrix();
      coinMesh.setMatrixAt(coinMesh.count++, dummy.matrix);
    }
    coinMesh.instanceMatrix.needsUpdate = true;

    tankMat.emissiveIntensity = 0.75 + Math.sin(time * 6) * 0.3;
    for (let i = 0; i < 3; i++) {
      const st = stations[i], grp = stationObjs[i];
      grp.visible = st.active;
      if (!st.active) continue;
      grp.position.set(st.x, 0, dist - st.s);
      const k = 1 + Math.sin(time * 5) * 0.12;
      grp.userData.ring.scale.set(k, k, 1);
    }
  }

  return { obstacles, coins, stations, spawnObstacle, spawnCoin, spawnStation, clear, sync };
}
