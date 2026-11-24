// Background people: real characters on the courier's skeleton (assets/crowd/person-*.glb, clips in crowd-anim.glb).
//
// Per frame the game calls begin(), add(...) once per person, end().
//   - the nearest few (gfx.crowdLimit, lowered by the quality ladder) are skinned and animated
//   - everybody further away is drawn from a light static copy of the same model, baked in three poses
//     (two walk poses that alternate in step with the clip, one standing pose), instanced per pose
//   - while the models load, or if one fails to load, the simple block people from entities.js are used
// Nothing is allocated per frame.
import * as THREE from '../../vendor/three.module.min.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { clone as cloneSkinned } from '../../vendor/SkeletonUtils.js';
import { worldUniforms } from './mat.js';

// h = height factor, w = build, head = head size (the child). The models face +z; the game uses -z as "forward".
const DEFS = [
  { file: 'person-m1', h: 1.0,  w: 1.0,  head: 1 },
  { file: 'person-m2', h: 1.03, w: 1.1,  head: 1 },
  { file: 'person-w1', h: 0.93, w: 0.9,  head: 1 },
  { file: 'person-w2', h: 0.9,  w: 0.92, head: 1 },
  { file: 'person-k1', h: 0.66, w: 1.02, head: 1.24 },
  { file: 'person-o1', h: 0.97, w: 1.05, head: 1 }
];
const CLONES = 4, FAR_CAP = 28, MAX_REQ = 72, SHADOW_NEAREST = 4;
export const WALK = 0, IDLE = 1, TALK = 2;

export function createCrowd(gfx, simple) {
  const { scene } = gfx;
  const req = [];
  for (let i = 0; i < MAX_REQ; i++) req.push({ variant: 0, x: 0, z: 0, ry: 0, seed: 0, tint: 0, freq: 6.5, mode: 0, key: 0 });
  const order = new Int16Array(MAX_REQ);
  let n = 0, people = null;                         // people = per variant { def, actors[], far[3], used }
  const dummy = new THREE.Object3D();

  const loader = new GLTFLoader();
  const ready = Promise.all([loader.loadAsync('assets/crowd/crowd-anim.glb')].concat(DEFS.map((d) => loader.loadAsync('assets/crowd/' + d.file + '.glb')))).then((list) => {
    const anim = list[0];
    const clips = {};
    for (const name of ['Walk', 'Idle', 'Talk']) {
      const c = THREE.AnimationClip.findByName(anim.animations, name);
      if (!c) throw new Error('crowd clip missing: ' + name);
      c.tracks = c.tracks.filter((t) => !/\.scale$/.test(t.name));          // sizes are set per variant, not by the clips
      clips[name] = c;
    }
    const built = DEFS.map((def, vi) => {
      const src = list[vi + 1].scene;
      let nearName = null, farName = null;
      src.traverse((o) => { if (o.isSkinnedMesh) { if (/_far/.test(o.name)) farName = o.name; else nearName = o.name; } });
      if (!nearName || !farName) throw new Error('crowd model without both meshes: ' + def.file);
      const make = (keep) => {
        const g = cloneSkinned(src);
        let mesh = null; const drop = [];
        g.traverse((o) => { if (o.isSkinnedMesh) { if (o.name === keep) mesh = o; else drop.push(o); } });
        for (const o of drop) o.parent.remove(o);
        const head = g.getObjectByName('Head');
        if (head && def.head !== 1) head.scale.setScalar(def.head);
        const mixer = new THREE.AnimationMixer(g);
        const acts = [clips.Walk, clips.Idle, clips.Talk].map((c) => { const a = mixer.clipAction(c); a.play(); a.paused = true; a.setEffectiveWeight(0); return a; });
        return { g, mesh, mixer, acts };
      };
      // far version: bake three poses of the light mesh into plain geometry
      const tmp = make(farName);
      const far = [[WALK, 0.15], [WALK, 0.65], [IDLE, 0.0]].map(([mode, t01]) => {
        tmp.acts.forEach((a, i) => { a.setEffectiveWeight(i === mode ? 1 : 0); a.time = a.getClip().duration * t01; });
        tmp.mixer.update(0);
        tmp.g.updateMatrixWorld(true);
        tmp.mesh.skeleton.update();
        const sg = tmp.mesh.geometry, pos = sg.attributes.position, out = new Float32Array(pos.count * 3), v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) { tmp.mesh.getVertexPosition(i, v); v.applyMatrix4(tmp.mesh.matrixWorld); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(out, 3));
        geo.setAttribute('uv', sg.attributes.uv);
        geo.setIndex(sg.index);
        geo.computeVertexNormals();
        const im = new THREE.InstancedMesh(geo, tmp.mesh.material, FAR_CAP);
        im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.count = 0; im.layers.set(2);
        scene.add(im);
        return im;
      });
      const actors = [];
      for (let k = 0; k < CLONES; k++) {
        const a = make(nearName);
        a.mesh.frustumCulled = false; a.mesh.castShadow = true; a.mesh.receiveShadow = true; a.mesh.layers.set(2);
        a.g.visible = false;
        scene.add(a.g);
        actors.push(a);
      }
      tmp.mesh.material.envMapIntensity = 0.9;
      return { def, actors, far, used: 0 };
    });
    people = built;
    return 'models';
  }).catch((err) => {
    console.warn('crowd models not loaded, using the simple people:', err && err.message ? err.message : err);
    people = null;
    return 'simple';
  });

  function begin() { n = 0; simple.begin(); }

  // variant: any integer (spread over the models), ry: 0 = walking away from the camera, mode: WALK / IDLE / TALK
  function add(variant, x, z, ry, seed, tint, freq = 6.5, mode = WALK) {
    if (!people) { simple.add(variant, x, z, ry, seed, tint, freq); return; }
    if (n >= MAX_REQ) return;
    const r = req[n];
    r.variant = variant; r.x = x; r.z = z; r.ry = ry; r.seed = seed; r.freq = freq; r.mode = mode; r.key = Math.abs(z - 2);
    order[n] = n; n++;
  }

  function end() {
    simple.end();
    if (!people) return;
    const time = worldUniforms.uTime.value;
    for (let i = 1; i < n; i++) {                                  // insertion sort, nearest first
      const o = order[i], k = req[o].key; let j = i - 1;
      while (j >= 0 && req[order[j]].key > k) { order[j + 1] = order[j]; j--; }
      order[j + 1] = o;
    }
    for (let v = 0; v < people.length; v++) { const p = people[v]; p.used = 0; p.far[0].count = p.far[1].count = p.far[2].count = 0; }
    let animated = 0;
    const limit = gfx.crowdLimit;
    for (let i = 0; i < n; i++) {
      const r = req[order[i]], p = people[((r.variant % people.length) + people.length) % people.length], d = p.def;
      const sx = d.h * d.w, speed = Math.min(1.5, Math.max(0.7, r.freq / 6.6));
      if (animated < limit && p.used < CLONES && r.z < 12) {
        const a = p.actors[p.used++];
        a.g.visible = true;
        a.g.position.set(r.x, 0, r.z); a.g.rotation.y = r.ry + Math.PI; a.g.scale.set(sx, d.h, sx);
        for (let k = 0; k < 3; k++) a.acts[k].setEffectiveWeight(k === r.mode ? 1 : 0);
        const act = a.acts[r.mode], dur = act.getClip().duration;
        act.time = (time * (r.mode === WALK ? speed : 1) + r.seed * 3) % dur;
        a.mixer.update(0);
        a.mesh.castShadow = animated < SHADOW_NEAREST;
        animated++;
      } else {
        let pose = 2;
        if (r.mode === WALK) { const dur = 1.3333; pose = ((time * speed + r.seed * 3) % dur) / dur < 0.5 ? 0 : 1; }
        const im = p.far[pose];
        if (im.count >= FAR_CAP) continue;
        dummy.position.set(r.x, 0, r.z); dummy.rotation.set(0, r.ry + Math.PI, 0); dummy.scale.set(sx, d.h, sx); dummy.updateMatrix();
        im.setMatrixAt(im.count++, dummy.matrix);
      }
    }
    for (let v = 0; v < people.length; v++) {
      const p = people[v];
      for (let k = p.used; k < CLONES; k++) p.actors[k].g.visible = false;
      for (let k = 0; k < 3; k++) p.far[k].instanceMatrix.needsUpdate = true;
    }
    stats.animated = animated; stats.total = n;
  }

  const stats = { animated: 0, total: 0 };
  return { begin, add, end, ready, stats, variants: 24 };
}
