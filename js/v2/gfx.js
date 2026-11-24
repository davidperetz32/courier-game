// Rendering set-up shared by the game: renderer, lights, materials, floor reflection, bloom,
// and the automatic quality ladder that keeps the frame rate up on the phone.
//
// URL switches:  ?q=0..5 fixes the quality step (0 = everything on), ?q=auto forgets the saved step,
//                ?fx=0 no bloom pass at all, ?refl=0 no floor reflection, ?dpr=1.5 pixel ratio cap.
import * as THREE from '../../vendor/three.module.min.js';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from '../../vendor/postprocessing.min.js';
import { loadImages, createAtlas, createPropMaterial, createFloorMaterial, createReflection, createEnvironment, softTexture, worldUniforms } from './mat.js';

// Quality steps, best first. Each step keeps what the one before switched off.
//   1 fewer animated people   2 floor reflection off   3 no MSAA, smaller bloom   4 shadows off   5 pixel ratio 1.5   6 pixel ratio 1.25, bloom off
//   crowd = how many background people are skinned and animated (the rest use the static far version)
const STEPS = [
  { refl: true,  msaa: 4, bloom: 6, shadow: true,  dpr: 2,    crowd: 8 },
  { refl: true,  msaa: 4, bloom: 6, shadow: true,  dpr: 2,    crowd: 5 },
  { refl: false, msaa: 4, bloom: 6, shadow: true,  dpr: 2,    crowd: 5 },
  { refl: false, msaa: 0, bloom: 4, shadow: true,  dpr: 2,    crowd: 4 },
  { refl: false, msaa: 0, bloom: 4, shadow: false, dpr: 2,    crowd: 3 },
  { refl: false, msaa: 0, bloom: 4, shadow: false, dpr: 1.5,  crowd: 3 },
  { refl: false, msaa: 0, bloom: 0, shadow: false, dpr: 1.25, crowd: 2 }
];
const Q_KEY = 'runner-quality-v3';

export async function createGfx(canvas) {
  const Q = new URLSearchParams(location.search);
  const FX = Q.get('fx') !== '0', REFL_OK = Q.get('refl') !== '0', DPR_CAP = Q.has('dpr') ? parseFloat(Q.get('dpr')) : 9;
  const imgs = await loadImages();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !FX, powerPreference: 'high-performance', stencil: false, depth: !FX });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  if (!FX) renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const haze = new THREE.Color(0x8f7058);
  scene.fog = new THREE.Fog(haze, 30, 165);
  scene.background = haze;
  const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 520);
  camera.layers.enable(1); camera.layers.enable(2);       // layers 1 and 2 = things the floor reflection skips (effects, small decoration)

  const atlas = createAtlas(renderer, imgs);
  scene.environment = createEnvironment(renderer);
  scene.environmentIntensity = 0.55;
  const propMat = createPropMaterial(atlas);
  const walkMat = createPropMaterial(atlas, { swing: true });
  const refl = REFL_OK ? createReflection(renderer, 0.5) : null;
  const floorMat = createFloorMaterial(renderer, refl, imgs.floor_color);
  const soft = softTexture();

  // low golden sun through the right-hand glazing, warm dim fill
  const hemi = new THREE.HemisphereLight(0xffe6cf, 0x6a5444, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc48c, 4.4);
  const sunDir = new THREE.Vector3(-1, -0.75, -0.22).normalize();     // direction the light travels
  sun.target.position.set(0, 0, -72);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, -34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 1024);                    // long and narrow, like the hall
  Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 13, bottom: -13, near: 2, far: 80 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);

  let composer = null, bloom = null, passFull = null, passLite = null;
  if (FX) {
    composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, camera));
    bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 1.0, luminanceSmoothing: 0.3, intensity: 1.15, radius: 0.72, levels: 6 });
    passFull = new EffectPass(camera, bloom, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), new VignetteEffect({ darkness: 0.5, offset: 0.28 }));
    passLite = new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), new VignetteEffect({ darkness: 0.5, offset: 0.28 }));
    composer.addPass(passFull); composer.addPass(passLite);
    passLite.enabled = false; passLite.renderToScreen = false; passFull.renderToScreen = true;
  }

  // ---------- quality ----------
  let level = 0, locked = false, cur = null;
  const hideInRefl = [];                                 // objects hidden while the reflection is drawn (the floor itself)
  let saved = null;
  try { saved = localStorage.getItem(Q_KEY); } catch (e) { /* private mode */ }
  if (Q.get('q') === 'auto') { saved = null; try { localStorage.removeItem(Q_KEY); } catch (e) { /* ignore */ } }
  else if (Q.has('q')) { level = Math.max(0, Math.min(STEPS.length - 1, parseInt(Q.get('q'), 10) || 0)); locked = true; }
  else if (saved !== null) level = Math.max(0, Math.min(STEPS.length - 1, parseInt(saved, 10) || 0));

  function pixelRatio() { return Math.min(window.devicePixelRatio || 1, STEPS[level].dpr, DPR_CAP); }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight, dpr = pixelRatio();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    if (refl) refl.setSize(w * dpr, h * dpr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    gfx.pixelHeight = h * dpr;
  }
  function applyLevel() {
    const s = STEPS[level], p = cur || {};
    const useRefl = !!refl && s.refl;
    if (floorMat.userData.refl !== useRefl) { floorMat.userData.refl = useRefl; floorMat.needsUpdate = true; }
    if (composer) {
      if (p.msaa !== s.msaa) composer.multisampling = s.msaa;
      if (s.bloom && p.bloom !== s.bloom) bloom.mipmapBlurPass.levels = s.bloom;
      const lite = !s.bloom;
      passFull.enabled = !lite; passLite.enabled = lite; passFull.renderToScreen = !lite; passLite.renderToScreen = lite;
    }
    if (sun.castShadow !== s.shadow) { sun.castShadow = s.shadow; renderer.shadowMap.needsUpdate = true; }
    cur = s;
    gfx.crowdLimit = Q.has('crowd') ? parseInt(Q.get('crowd'), 10) || 0 : s.crowd;
    resize();
  }

  // The ladder: averages the real frame time over short windows and steps down while it is too slow.
  // A phone in low power mode is capped at 30 fps whatever we draw; that is detected and left alone.
  const lad = { n: 0, sum: 0, skip: 50, time: 0, good: 0, before: 0, done: locked };
  function measure(dt) {
    if (lad.done || document.hidden || dt > 1) return;       // a pause or a hidden tab is not a slow frame
    if (lad.skip > 0) { lad.skip--; return; }
    lad.n++; lad.sum += dt; lad.time += dt;
    if (lad.n < 80 && lad.sum < 2) return;
    const fps = lad.n / lad.sum;
    lad.n = 0; lad.sum = 0;
    if (lad.before && fps < lad.before * 1.1 && fps > 26 && fps < 33) {       // stepping down did not help: capped display
      level = Math.max(0, level - 1); applyLevel(); lad.done = true; return;
    }
    if (fps < 57 && fps >= 30 && !lad.bad) { lad.bad = 1; return; }               // one slow window can be a hiccup: look again
    if (fps < 57 && level < STEPS.length - 1) {
      lad.bad = 0;
      lad.before = fps; level++; applyLevel(); lad.skip = fps < 20 ? 6 : 40; lad.good = 0;
      try { localStorage.setItem(Q_KEY, String(level)); } catch (e) { /* private mode */ }
      return;
    }
    lad.before = 0; lad.bad = 0;
    if (fps >= 57) lad.good++;
    if (lad.good >= 5 || lad.time > 40 || level === STEPS.length - 1) {
      lad.done = true;
      try { localStorage.setItem(Q_KEY, String(level)); } catch (e) { /* private mode */ }
    }
  }

  let lastInfo = { calls: 0, triangles: 0 };
  function render(dt, time) {
    worldUniforms.uTime.value = time;
    renderer.info.reset();
    if (refl && cur.refl) refl.render(scene, camera, hideInRefl);
    if (composer) composer.render(dt); else renderer.render(scene, camera);
    lastInfo = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  }

  const gfx = {
    renderer, scene, camera, atlas, R: atlas.rects, propMat, walkMat, floorMat, soft, sun, sunDir, hemi, haze, hideInRefl, pixelHeight: 1, crowdLimit: 8,
    resize, render, measure,
    setLevel(l, lock = true) { level = Math.max(0, Math.min(STEPS.length - 1, l)); if (lock) { locked = true; lad.done = true; } applyLevel(); },
    info: () => ({ ...lastInfo, level, ladderDone: lad.done, dpr: renderer.getPixelRatio(), programs: renderer.info.programs.length, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries }),
    compile: () => renderer.compile(scene, camera)
  };
  applyLevel();
  return gfx;
}
