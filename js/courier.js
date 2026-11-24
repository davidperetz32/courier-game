// The courier: the animated character from Blender (assets/courier.glb).
//
// The rest of the game only uses what createCourier() returns:
//   root             THREE.Group, feet at y = 0, facing -z (away from the camera)
//   update(dt, pose) pose = { speed, y, air, slide (0..1), lean (-1..1), dead (-1 fell back .. 1 fell forward),
//                             nitro (0..1), stumble (0..1), idle (start screen), vy (vertical speed, optional) }
//   burst()          extra vapour puff (refill)
//   reset()
//   ready            promise, resolves to 'model' or 'placeholder' when it is known which one is shown
//
// Animation: every clip is an action in one mixer and all of them are blended by weight each frame.
// The weights follow the game state at once (about 0.06 s of smoothing), so nothing waits for a clip to end.
// One-shot clips (jump start, landing, roll, fall, lean, stumble) are scrubbed by hand from game timers.
// If the model cannot be loaded the stage-1 placeholder is shown instead, so the game always starts.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { createPlaceholder } from './courier-placeholder.js';

const MODEL_URL = 'assets/courier.glb';
const SCALE = 1.0;                  // 1.87 m to the cap standing, about 1.75 m in the run pose; the hit box is 1.7 m
const PUFFS = 14;
const FADE = 0.06;                  // seconds for a weight to catch up with its target
const SLIDE_FROM = 0.1, SLIDE_TO = 0.62, SLIDE_TIME = 0.7;     // part of the roll clip used for a slide
const LAND_TIME = 0.2, LEAN_TIME = 0.26;

export function createCourier() {
  const root = new THREE.Group();
  const holder = new THREE.Group();                 // lean and roll of the whole body
  root.add(holder);

  let model = null, mixer = null, fallback = null, dewar = null;
  const act = {};                                   // clip name -> action
  const w = {};                                     // clip name -> current weight
  const NAMES = ['Run', 'Idle', 'Jump_Start', 'Jump_Air', 'Jump_Land', 'Slide', 'Fall', 'Stumble', 'Lean_L', 'Lean_R'];
  const st = { airT: 0, landT: 1, wasAir: false, slideT: 0, wasSlide: false, deadT: 0, leanT: 1, leanDir: 0, stumbleT: 0, first: true };

  // vapour: small white puffs that rise from the tank and drift back
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 1), puffMat, PUFFS);
  puffs.frustumCulled = false; puffs.visible = false;
  root.add(puffs);
  const pf = [];
  for (let i = 0; i < PUFFS; i++) pf.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 1 });
  const dummy = new THREE.Object3D(), tank = new THREE.Vector3(0, 1.45, 0.3), tmp = new THREE.Vector3();
  let emit = 0, next = 0;
  function spawnPuff(power) {
    const p = pf[next]; next = (next + 1) % PUFFS;
    p.max = 0.55 + Math.random() * 0.35; p.life = p.max;
    p.x = tank.x + (Math.random() - 0.5) * 0.1; p.y = tank.y; p.z = tank.z;
    p.vx = (Math.random() - 0.5) * 0.5 * power; p.vy = 0.5 + Math.random() * 0.5 * power; p.vz = 1.6 + Math.random() * 1.0;
    p.size = (0.32 + Math.random() * 0.3) * power;
  }
  function updatePuffs(dt, pose) {
    if (Math.abs(pose.dead) < 0.5 && !pose.idle) {
      emit += dt * (4 + 7 * pose.nitro);
      while (emit > 1) { emit -= 1; spawnPuff(1); }
    } else if (pose.idle) { emit += dt * 3; while (emit > 1) { emit -= 1; spawnPuff(0.7); } }
    for (let i = 0; i < PUFFS; i++) {
      const p = pf[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt * (pose.idle ? 0.15 : 1);
        const k = Math.max(0, p.life / p.max);
        dummy.position.set(p.x, p.y, p.z); dummy.scale.setScalar(p.size * Math.sin(k * Math.PI) * 1.05 + 0.01);
      } else { dummy.position.set(0, -10, 0); dummy.scale.setScalar(0.001); }
      dummy.updateMatrix();
      puffs.setMatrixAt(i, dummy.matrix);
    }
    puffs.instanceMatrix.needsUpdate = true;
  }

  // ---------- loading ----------
  const ready = new GLTFLoader().loadAsync(MODEL_URL).then((gltf) => {
    model = gltf.scene;
    model.rotation.y = Math.PI;                    // the model looks along +z, the game runs towards -z
    model.scale.setScalar(SCALE);
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;      // skinned: the rest-pose bounds are not where he is
        const m = o.material;
        if (m && m.isMeshStandardMaterial) { m.envMapIntensity = 1.15; if (m.transparent) { o.castShadow = false; m.depthWrite = false; } }
      }
      if (o.name === 'dewar') dewar = o;
    });
    mixer = new THREE.AnimationMixer(model);
    for (const name of NAMES) {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (!clip) throw new Error('courier clip missing: ' + name);
      const a = mixer.clipAction(clip);
      a.setEffectiveWeight(0); a.play();
      if (name !== 'Run' && name !== 'Idle' && name !== 'Jump_Air') a.paused = true;     // scrubbed by hand
      act[name] = a; w[name] = 0;
    }
    holder.add(model);
    puffs.visible = true;
    return 'model';
  }).catch((err) => {
    console.warn('courier model not loaded, using the placeholder:', err && err.message ? err.message : err);
    if (model) holder.remove(model);
    model = null; mixer = null;
    fallback = createPlaceholder();
    root.add(fallback.root);
    puffs.visible = false;
    return 'placeholder';
  });

  const scrub = (name, t01) => { const a = act[name]; a.time = a.getClip().duration * Math.min(0.999, Math.max(0, t01)); };

  function update(dt, pose) {
    root.position.y = pose.y;
    if (fallback) { fallback.root.position.y = 0; fallback.update(dt, Object.assign({}, pose, { y: 0 })); return; }
    if (!mixer) return;

    // ---- timers from the game state ----
    const dead = pose.dead !== 0, sliding = pose.slide > 0.5 && !pose.air;
    if (pose.air) { st.airT = st.wasAir ? st.airT + dt : 0; st.landT = 1; }
    else if (st.wasAir) st.landT = 0; else st.landT += dt;
    st.wasAir = pose.air;
    if (sliding) st.slideT = st.wasSlide ? st.slideT + dt : 0;
    st.wasSlide = sliding;
    st.deadT = dead ? st.deadT + dt : 0;
    const dir = pose.lean > 0.12 ? 1 : pose.lean < -0.12 ? -1 : 0;
    if (dir !== 0 && dir !== st.leanDir) { st.leanT = 0; act.Run.time = 0; }       // a lane change starts: lean from the top of the stride
    else st.leanT += dt;
    st.leanDir = dir !== 0 ? dir : (st.leanT > LEAN_TIME ? 0 : st.leanDir);
    st.stumbleT = pose.stumble > 0 ? st.stumbleT + dt : 0;

    // ---- target weights ----
    const t = { Run: 0, Idle: 0, Jump_Start: 0, Jump_Air: 0, Jump_Land: 0, Slide: 0, Fall: 0, Stumble: 0, Lean_L: 0, Lean_R: 0 };
    if (dead) t.Fall = 1;
    else if (pose.idle) t.Idle = 1;
    else if (pose.air) { const k = Math.max(0, 1 - st.airT / 0.13); t.Jump_Start = k; t.Jump_Air = 1 - k; }
    else if (pose.slide > 0.02) { t.Slide = Math.min(1, pose.slide * 1.25); t.Run = 1 - t.Slide; }
    else {
      const land = st.landT < LAND_TIME ? 1 - st.landT / LAND_TIME : 0;
      const lean = st.leanDir !== 0 && st.leanT < LEAN_TIME ? Math.min(1, Math.abs(pose.lean) * 2.2 + 0.35) * (1 - Math.pow(st.leanT / LEAN_TIME, 3)) : 0;
      const stum = Math.min(0.7, pose.stumble * 0.9);
      t.Jump_Land = land * 0.85;
      if (st.leanDir > 0) t.Lean_R = lean * (1 - land); else if (st.leanDir < 0) t.Lean_L = lean * (1 - land);
      t.Stumble = stum * (1 - land);
      t.Run = Math.max(0, 1 - t.Jump_Land - t.Lean_L - t.Lean_R - t.Stumble);
    }
    const k = st.first ? 1 : 1 - Math.exp(-dt / FADE);
    st.first = false;
    let sum = 0;
    for (const n of NAMES) { w[n] += (t[n] - w[n]) * k; if (w[n] < 0.002) w[n] = 0; sum += w[n]; }
    for (const n of NAMES) act[n].setEffectiveWeight(sum > 0 ? w[n] / sum : 0);

    // ---- clip times ----
    act.Run.timeScale = 0.82 + pose.speed / 40;                                   // 1.18 at the start, 1.47 at top speed
    scrub('Jump_Start', 0.14 + 0.16 * Math.min(1, st.airT / 0.13));
    scrub('Jump_Land', 0.1 + 0.5 * Math.min(1, st.landT / (LAND_TIME * 1.6)));
    scrub('Slide', SLIDE_FROM + (SLIDE_TO - SLIDE_FROM) * Math.min(1, st.slideT / SLIDE_TIME));
    scrub('Fall', Math.min(1, st.deadT * 1.25) * 0.72);
    scrub('Stumble', (st.stumbleT * 2.2) % 1);
    const lt = Math.min(1, st.leanT / LEAN_TIME) * 0.4;                            // the lean lives in the first 40 % of its clip
    scrub('Lean_L', lt); scrub('Lean_R', lt);
    if (w.Lean_L > 0 || w.Lean_R > 0) act.Run.time = act.Lean_L.time;             // keep the legs of both in step
    mixer.update(dt);

    // whole-body roll into the lane change: instant, on top of the clips
    holder.rotation.z = -pose.lean * 0.22;
    holder.rotation.y = -pose.lean * 0.3;

    // vapour from the top of the tank
    if (dewar) {
      dewar.getWorldPosition(tmp);
      tank.set(tmp.x - root.position.x, tmp.y - root.position.y + 0.24 * SCALE, tmp.z - root.position.z + 0.1);
    }
    updatePuffs(dt, pose);
  }

  function burst() {
    if (fallback) { fallback.burst(); return; }
    for (let i = 0; i < PUFFS; i++) spawnPuff(1.8);
  }
  function reset() {
    if (fallback) fallback.reset();
    for (const p of pf) p.life = 0;
    emit = 0;
    Object.assign(st, { airT: 0, landT: 1, wasAir: false, slideT: 0, wasSlide: false, deadT: 0, leanT: 1, leanDir: 0, stumbleT: 0, first: true });
    if (mixer) act.Run.time = 0;
  }

  return { root, update, burst, reset, ready };
}
