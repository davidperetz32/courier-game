// Obstacles, walking people, coins and refill stations in the new look.
// Pooled data + instanced drawing: one draw call per model. Same interface as the stage-1 module.
import * as THREE from '../../vendor/three.module.min.js';
import { Builder } from './geo.js';
import * as M from './models.js';
import * as M2 from './models2.js';
import { OB } from '../patterns.js';

const CAP = 24, COIN_CAP = 180, OB_POOL = 110, PI = Math.PI;
const SHIRTS = [0xf4f1ea, 0xd9342b, 0x19a37a, 0xf2b705, 0x7c5cc4, 0x1d6f9c, 0xf97316, 0xe87aa8].map((c) => new THREE.Color(c));

// Everybody who walks: passengers crossing the lanes (obstacles) and people strolling along the sides.
// Call begin() at the start of a frame, add() for each person, end() when done.
export function createCrowd(gfx) {
  const { scene, R, walkMat } = gfx;
  const builders = [
    M.person(R, { extra: 'roller', pants: 0x2b3a55, hair: 0x2a1a10, style: 'side', bag: 0xd9342b }),
    M.person(R, { extra: 'backpack', pants: 0x5a4632, skin: 0xb9794e, hair: 0x15100c, style: 'curly', beard: true, bag: 0x1d6f9c, wide: 1.12 }),
    M.person(R, { extra: 'tote', pants: 0x20242b, skin: 0xf2c9a8, hair: 0xb5651d, style: 'long', bag: 0xf2b705, skirt: true, wide: 0.92, scale: 0.95 }),
    M.person(R, { extra: 'backpack', pants: 0x1f5fbf, skin: 0xe9b48c, hair: 0x4a2f1a, style: 'cap', bag: 0xf97316, scale: 0.68, wide: 1.05, swing: 0.5 }),
    M.person(R, { extra: 'roller', pants: 0x3b3b3b, skin: 0x8d5a3b, hair: 0x0f0b08, style: 'bun', glasses: true, bag: 0x19a37a, wide: 0.96 }),
    M.person(R, { extra: 'tote', pants: 0x6b5b45, skin: 0xf0c7a2, hair: 0xc9c9c9, style: 'bald', beard: true, glasses: true, bag: 0x6d3fc4, wide: 1.15 }),
    M.person(R, { extra: 'backpack', pants: 0x2a3d2e, skin: 0xd9a47a, hair: 0x7a3b12, style: 'pony', bag: 0xe87aa8, scale: 0.9, wide: 0.9 }),
    M.person(R, { extra: 'roller', pants: 0x1b1f26, skin: 0xe2b08a, hair: 0x2a1a10, style: 'beanie', bag: 0x0e7490 })
  ];
  const meshes = builders.map((b) => {
    const geo = b.build();
    const phase = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 2), 2);
    phase.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPhase', phase);
    const im = new THREE.InstancedMesh(geo, walkMat, CAP);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.count = 0;
    for (let i = 0; i < CAP; i++) im.setColorAt(i, SHIRTS[0]);
    scene.add(im);
    return { im, phase };
  });
  const dummy = new THREE.Object3D();
  function begin() { for (const m of meshes) m.im.count = 0; }
  function add(variant, x, z, ry, seed, tint, freq = 6.5) {
    const m = meshes[variant % meshes.length], im = m.im;
    if (im.count >= CAP) return;
    dummy.position.set(x, 0, z); dummy.rotation.set(0, ry, 0); dummy.updateMatrix();
    m.phase.array[im.count * 2] = seed; m.phase.array[im.count * 2 + 1] = freq;
    im.setColorAt(im.count, SHIRTS[tint % SHIRTS.length]);
    im.setMatrixAt(im.count++, dummy.matrix);
  }
  function end() { for (const m of meshes) { m.im.instanceMatrix.needsUpdate = true; m.im.instanceColor.needsUpdate = true; m.phase.needsUpdate = true; } }
  return { begin, add, end, variants: meshes.length };
}

export function createEntities(gfx, crowd) {
  const { scene, R, propMat, soft } = gfx;
  const builders = {
    cart: M.cart(R), tall: M2.totem(R), barrier: M2.barrier(R), pile: M2.pile(R), sign: M2.hangSign(R),
    bar: M2.hazardBar(R), traveler: M2.traveler(R), cone: M2.cones(R), rope: M2.rope(R)
  };
  const meshes = {};
  for (const type of Object.keys(builders)) {
    const im = new THREE.InstancedMesh(builders[type].build(), propMat, CAP);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.count = 0;
    scene.add(im);
    meshes[type] = im;
  }
  for (let i = 0; i < CAP; i++) meshes.traveler.setColorAt(i, SHIRTS[i % SHIRTS.length]);

  // coins
  const cb = new Builder();
  cb.pbr(0.25, 1, 0.3).cyl(0.3, 0.3, 0.05, 0xffb81f, 0, 0, 0, 18, PI / 2).torus(0.285, 0.03, 0xffd75a, 0, 0, 0, 0, 18).pbr(0.3, 1, 0.9).cyl(0.17, 0.17, 0.07, 0xffe07a, 0, 0, 0, 5, PI / 2);
  const coinMesh = new THREE.InstancedMesh(cb.build(), propMat, COIN_CAP);
  coinMesh.frustumCulled = false; coinMesh.count = 0; coinMesh.castShadow = false;
  scene.add(coinMesh);

  // refill stations: dewar model, light beam and a glow on the floor (at most three alive)
  const stationMesh = new THREE.InstancedMesh(M.station(R).build(), propMat, 3);
  stationMesh.castShadow = true; stationMesh.receiveShadow = true; stationMesh.frustumCulled = false; stationMesh.count = 0;
  scene.add(stationMesh);
  const bc = document.createElement('canvas'); bc.width = 8; bc.height = 64;
  { const g = bc.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 64); }
  const beamMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), color: new THREE.Color(0x39d9ff).multiplyScalar(0.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const poolMat = new THREE.MeshBasicMaterial({ map: soft, color: new THREE.Color(0x39d9ff).multiplyScalar(0.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 6.5, 20, 1, true), poolGeo = new THREE.PlaneGeometry(5, 5).rotateX(-PI / 2);
  const stationFx = [];
  for (let i = 0; i < 3; i++) {
    const grp = new THREE.Group();
    const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.y = 3.35; beam.layers.set(1);
    const pool = new THREE.Mesh(poolGeo, poolMat); pool.position.y = 0.03; pool.layers.set(1);
    grp.add(beam, pool); grp.visible = false; scene.add(grp);
    stationFx.push(grp);
  }

  const obstacles = [], coins = [], stations = [];
  for (let i = 0; i < OB_POOL; i++) obstacles.push({ active: false, type: 'cart', def: OB.cart, x: 0, s: 0, hitT: 0, vx: 0, minX: 0, maxX: 0, tint: 0, seed: 0 });
  for (let i = 0; i < COIN_CAP; i++) coins.push({ active: false, x: 0, s: 0, y: 0 });
  for (let i = 0; i < 3; i++) stations.push({ active: false, x: 0, s: 0 });
  let oi = 0, ci = 0;

  function spawnObstacle(type, x, s, minX = 0, maxX = 0, vx = 0) {
    for (let k = 0; k < OB_POOL; k++) {
      const o = obstacles[oi]; oi = (oi + 1) % OB_POOL;
      if (o.active) continue;
      o.active = true; o.type = type; o.def = OB[type]; o.x = x; o.s = s; o.hitT = 0;
      o.minX = minX; o.maxX = maxX; o.vx = vx; o.seed = Math.random() * 6.28; o.tint = Math.floor(Math.random() * 64);
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
      if (o.type === 'passenger') {
        crowd.add(o.tint, o.x, dist - o.s, o.vx < 0 ? PI / 2 : -PI / 2, o.seed, o.tint >> 3, 5 + Math.abs(o.vx) * 2.2);
        continue;
      }
      const im = meshes[o.type];
      if (im.count >= CAP) continue;
      dummy.position.set(o.x, 0, dist - o.s);
      dummy.rotation.set(0, o.type === 'cart' || o.type === 'pile' ? (o.seed - 3.14) * 0.03 : 0, 0);
      dummy.updateMatrix();
      im.setMatrixAt(im.count++, dummy.matrix);
    }
    for (let i = 0; i < types.length; i++) meshes[types[i]].instanceMatrix.needsUpdate = true;

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

    stationMesh.count = 0;
    dummy.rotation.set(0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const st = stations[i], grp = stationFx[i];
      grp.visible = st.active;
      if (!st.active) continue;
      dummy.position.set(st.x, 0, dist - st.s); dummy.updateMatrix();
      stationMesh.setMatrixAt(stationMesh.count++, dummy.matrix);
      grp.position.set(st.x, 0, dist - st.s);
      const k = 1 + Math.sin(time * 5) * 0.1;
      grp.children[1].scale.set(k, 1, k);
    }
    stationMesh.instanceMatrix.needsUpdate = true;
  }

  return { obstacles, coins, stations, spawnObstacle, spawnCoin, spawnStation, clear, sync };
}
