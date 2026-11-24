// Game glue: state, rules, collisions, camera, HUD and the main loop.
import { LANES, PLAYER, SPEED_MIN, SPEED_MAX, speedAt, tankSeconds, zoneIndexAt, mulberry32, lerp } from './config.js';
import { createGenerator } from './patterns.js';
import { createGfx } from './v2/gfx.js';
import { createWorld } from './v2/world.js';
import { createEntities, createCrowd as createSimpleCrowd } from './v2/entities.js';
import { createCrowd } from './v2/crowd.js';
import { createFx } from './v2/fx.js';
import { createCourier } from './courier.js';
import { createInput } from './input.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const BEST_KEY = 'runner-best-v1', COINS_KEY = 'runner-coins-v1';
const store = {
  get(k) { try { return parseInt(localStorage.getItem(k), 10) || 0; } catch (e) { return 0; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* private mode */ } }
};

// ---------- renderer, scene, world (the look lives in js/v2) ----------
const gfx = await createGfx(canvas);
const { scene, camera } = gfx;
const crowd = createCrowd(gfx, createSimpleCrowd(gfx));
const world = createWorld(gfx, crowd);
const ents = createEntities(gfx, crowd);
const fx = createFx(gfx);
const courier = createCourier();
window.__cs = 'loading';                              // which courier is shown: loading | model | placeholder (visible with ?fps=1)
courier.ready.then((s) => { window.__cs = s; });
scene.add(courier.root);

let baseFov = 70;
function resize() {
  gfx.resize();
  baseFov = camera.aspect < 0.8 ? 70 : camera.aspect < 1.3 ? 62 : 52;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
resize();

// ---------- state ----------
const g = {
  state: 'start',            // start | playing | dying | over
  time: 0, dist: 0, idle: 0, speed: 0, speedMul: 1,
  lane: 1, prevLane: 1, px: 0, py: 0, vy: 0, air: false, slideT: 0, slideQueued: false,
  nitro: 100, coins: 0, best: store.get(BEST_KEY),
  stumbleT: 0, shake: 0, camX: 0, dieT: 0, cause: '', zone: 0, lean: 0, fovKick: 0, speedK: 0,
  autopilot: false, seed: 0
};
const pose = { speed: 0, y: 0, air: false, slide: 0, lean: 0, dead: 0, nitro: 1, stumble: 0 };
let gen = null;
let rows = [];

// ---------- HUD ----------
const hud = $('hud'), hudDist = $('hud-dist'), hudCoins = $('hud-coins'), gaugeFill = $('gauge-fill'), gauge = $('gauge'), toast = $('toast');
let shownDist = -1, shownCoins = -1, shownNitro = -1, toastT = 0, lowShown = false;

function showToast(text, cls) {
  toast.textContent = text;
  toast.className = 'show' + (cls ? ' ' + cls : '');
  toastT = 1.9;
}
function updateHud(dt) {
  const d = Math.floor(g.dist);
  if (d !== shownDist) { shownDist = d; hudDist.textContent = d + ' מ׳'; }
  if (g.coins !== shownCoins) { shownCoins = g.coins; hudCoins.textContent = g.coins; }
  const n = Math.max(0, Math.round(g.nitro));
  if (n !== shownNitro) {
    shownNitro = n;
    gaugeFill.style.transform = `scaleX(${n / 100})`;
    const low = n < 28;
    if (low !== lowShown) { lowShown = low; gauge.classList.toggle('low', low); }
  }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) toast.className = ''; }
}

// ---------- game flow ----------
function startGame(seed) {
  g.seed = seed || (Math.random() * 1e9) | 0;
  gen = createGenerator(mulberry32(g.seed));
  rows = [];
  ents.clear();
  world.reset(0);
  courier.reset();
  Object.assign(g, {
    state: 'playing', dist: 0, speedMul: 1, lane: 1, prevLane: 1, px: 0, py: 0, vy: 0, air: false,
    slideT: 0, slideQueued: false, nitro: 100, coins: 0, stumbleT: 0, shake: 0, camX: 0, dieT: 0, cause: '', zone: 0, lean: 0
  });
  shownDist = shownCoins = shownNitro = -1;
  $('start').classList.add('hidden');
  $('over').classList.add('hidden');
  hud.classList.remove('hidden');
  showToast(world.zoneName(0));
}

function die(cause) {
  if (g.state !== 'playing') return;
  g.state = 'dying'; g.cause = cause; g.dieT = 0;
  if (cause === 'crash') g.shake = 0.6;
}

function showOver() {
  g.state = 'over';
  const d = Math.floor(g.dist);
  const record = d > g.best;
  if (record) { g.best = d; store.set(BEST_KEY, d); }
  store.set(COINS_KEY, store.get(COINS_KEY) + g.coins);
  $('over-title').textContent = g.cause === 'empty' ? 'נגמר החנקן' : 'התנגשות';
  $('over-score').textContent = d + ' מ׳';
  $('over-coins').textContent = 'מטבעות: ' + g.coins;
  $('over-record').classList.toggle('hidden', !record);
  $('over-best').textContent = 'שיא: ' + g.best + ' מ׳';
  hud.classList.add('hidden');
  $('over').classList.remove('hidden');
}

function act(a) {
  if (a === 'confirm') { if (g.state === 'start' || g.state === 'over') startGame(); return; }
  if (g.state !== 'playing') return;
  if (a === 'left' || a === 'right') {
    const to = g.lane + (a === 'left' ? -1 : 1);
    if (to < 0 || to > 2) { g.lean = a === 'left' ? -0.6 : 0.6; return; }
    g.prevLane = g.lane; g.lane = to;
  } else if (a === 'up') {
    if (!g.air) { g.air = true; g.vy = PLAYER.jumpV; g.slideT = 0; g.slideQueued = false; }
  } else if (a === 'down') {
    if (g.air) { g.vy = -22; g.slideQueued = true; } else g.slideT = PLAYER.slideTime;
  }
}

function stumble(bounce) {
  g.nitro -= 10;
  g.speedMul = 0.62;
  g.stumbleT = 0.5;
  g.shake = 0.3;
  if (bounce) { const back = g.prevLane; g.prevLane = g.lane; g.lane = back; }
}

function spawnRow(r) {
  rows.push(r);
  for (let l = 0; l < 3; l++) {
    const t = r.cells[l];
    if (t && t !== 'walk') ents.spawnObstacle(t, LANES[l], r.s);
  }
  if (r.walk) {
    const a = LANES[r.walk.a], b = LANES[r.walk.b];
    ents.spawnObstacle('passenger', lerp(a, b, r.walk.phase), r.s, a, b, r.walk.dir * r.walk.speed);
  }
  if (r.station) ents.spawnStation(LANES[r.safe], r.s);
  for (let i = 0; i < r.coins.length; i++) { const c = r.coins[i]; ents.spawnCoin(LANES[c.lane], c.s, c.y); }
}

// Test pilot: follows the guaranteed safe lane. Used only by the automatic checks (window.__game).
function pilot() {
  let i = 0;
  while (i < rows.length && rows[i].s + 1.5 <= g.dist) i++;
  const r = rows[i];
  if (!r) return;
  if (g.lane !== r.safe) act(r.safe < g.lane ? 'left' : 'right');
  const rel = r.s - g.dist;
  if (r.safeKind === 'low' && !g.air && rel > 0 && rel - 0.45 < g.speed * 0.16) act('up');
  if (r.safeKind === 'high' && g.slideT < 0.3 && rel > -0.5 && rel - 0.2 < g.speed * 0.12) act('down');
}

function updatePlaying(dt) {
  if (g.autopilot) pilot();

  g.speedMul += (1 - g.speedMul) * Math.min(1, dt * 1.8);
  g.speed = speedAt(g.dist) * g.speedMul;
  const step = g.speed * dt;
  g.dist += step;

  g.nitro -= (100 / tankSeconds(g.dist)) * dt;
  if (g.nitro <= 0) { g.nitro = 0; die('empty'); return; }

  // sideways and vertical movement
  const tx = LANES[g.lane];
  g.px += (tx - g.px) * (1 - Math.exp(-PLAYER.laneRate * dt));
  if (g.air) {
    g.vy -= PLAYER.gravity * dt;
    g.py += g.vy * dt;
    if (g.py <= 0) { g.py = 0; g.vy = 0; g.air = false; if (g.slideQueued) { g.slideT = PLAYER.slideTime; g.slideQueued = false; } }
  }
  if (g.slideT > 0) g.slideT -= dt;
  if (g.stumbleT > 0) g.stumbleT -= dt;
  const h = g.slideT > 0 && !g.air ? PLAYER.slideH : PLAYER.standH;

  while (gen.s < g.dist + 178) spawnRow(gen.next());      // beyond the fog (165 m), so obstacles never appear in view
  while (rows.length > 3 && rows[1].s < g.dist - 6) rows.shift();

  // obstacles
  const obs = ents.obstacles;
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (!o.active) continue;
    const def = o.def;
    if (o.vx) {
      o.x += o.vx * dt;
      if (o.x > o.maxX) { o.x = o.maxX; o.vx = -o.vx; } else if (o.x < o.minX) { o.x = o.minX; o.vx = -o.vx; }
    }
    const near = o.s - def.hl - g.dist, far = o.s + def.hl - g.dist;
    if (far < -9) { o.active = false; continue; }
    if (near < PLAYER.hd && far > -PLAYER.hd && Math.abs(g.px - o.x) < def.hw + PLAYER.hw && g.py < def.y1 && g.py + h > def.y0) {
      if (g.time < o.hitT) continue;
      // the obstacle front reached us just now = head-on; otherwise we moved into its side or top
      if (near > PLAYER.hd - step - 0.3) { die('crash'); return; }
      o.hitT = g.time + 0.6;
      stumble(Math.abs(g.px - tx) > 0.12);
      if (g.nitro <= 0) { g.nitro = 0; die('empty'); return; }
    }
  }

  // coins
  const coins = ents.coins;
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    if (!c.active) continue;
    const rel = c.s - g.dist;
    if (rel < -7) { c.active = false; continue; }
    if (rel < 0.8 && rel > -0.8 && Math.abs(g.px - c.x) < 0.8 && Math.abs(g.py + 0.9 - c.y) < 1.05) { c.active = false; g.coins++; fx.burst(c.x, c.y, c.s, 5); }
  }

  // refill stations
  const sts = ents.stations;
  for (let i = 0; i < sts.length; i++) {
    const st = sts[i];
    if (!st.active) continue;
    const rel = st.s - g.dist;
    if (rel < -9) { st.active = false; continue; }
    if (rel < 1 && rel > -1 && Math.abs(g.px - st.x) < 0.95) {
      st.active = false; g.nitro = 100; courier.burst(); fx.burst(st.x, 1.2, st.s, 22, [0.9, 2.0, 2.6]); g.fovKick = 1; showToast('מילוי חנקן', 'fill');
    }
  }

  const z = zoneIndexAt(g.dist);
  if (z !== g.zone) { g.zone = z; showToast(world.zoneName(z)); }
}

function update(dt) {
  g.time += dt;
  let visualDist = g.dist;
  if (g.state === 'playing') {
    updatePlaying(dt);
    visualDist = g.dist;
  } else if (g.state === 'dying') {
    g.dieT += dt;
    if (g.cause === 'empty') { g.speed *= Math.exp(-dt * 4); g.dist += g.speed * dt; }
    else { g.speed = 0; g.dist -= dt * 3.2 * Math.max(0, 1 - g.dieT * 3); }      // knocked back a little
    if (g.air) { g.vy -= PLAYER.gravity * dt; g.py = Math.max(0, g.py + g.vy * dt); }
    visualDist = g.dist;
    if (g.dieT > 1.0) showOver();
  } else if (g.state === 'start') {
    g.idle += dt * 5;
    g.speed = 5;
    visualDist = g.idle;
  }

  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt);
  g.lean += (((LANES[g.lane] - g.px) / 2) - g.lean) * Math.min(1, dt * 14);
  g.camX += (g.px - g.camX) * (1 - Math.exp(-dt * 5));    // camera lags a touch behind, so the lane change reads on screen

  pose.speed = g.speed; pose.y = g.py; pose.air = g.air; pose.vy = g.vy; pose.idle = g.state === 'start';
  const slideTarget = g.slideT > 0 && !g.air ? 1 : 0;
  pose.slide += (slideTarget - pose.slide) * Math.min(1, dt * 22);
  pose.lean = g.lean;
  pose.dead = g.state === 'dying' || g.state === 'over' ? Math.min(1, g.dieT * 3) * (g.cause === 'crash' ? -1 : 1) : 0;
  pose.nitro = g.nitro / 100;
  pose.stumble = Math.max(0, g.stumbleT * 2);
  courier.root.position.x = g.px;
  courier.update(dt, pose);

  crowd.begin();
  world.update(visualDist, dt, g.time);
  ents.sync(g.state === 'start' ? -1000 : g.dist, g.time);
  crowd.end();

  // sense of speed: wider view, camera a little further back, speed lines, a slight tremble
  const playing = g.state === 'playing';
  const speedK = playing ? Math.max(0, Math.min(1, (g.speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN))) : 0;
  g.speedK += (speedK - g.speedK) * Math.min(1, dt * 3);
  if (g.fovKick > 0) g.fovKick = Math.max(0, g.fovKick - dt * 2.2);
  fx.update(dt, g.time, visualDist, playing ? g.speed : 0, g.speedK, ents.stations, camera);
  const fov = baseFov + (playing ? 2.5 : 0) + 8 * g.speedK + 4 * g.fovKick * g.fovKick;
  if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const sh = g.shake * 0.5, tr = playing ? 0.008 + 0.022 * g.speedK : 0;
  const tx2 = Math.sin(g.time * 31) * 0.6 + Math.sin(g.time * 47.3) * 0.4, ty2 = Math.sin(g.time * 37.7) * 0.6 + Math.sin(g.time * 53.1) * 0.4;
  camera.position.set(g.camX * 0.6 + (Math.random() - 0.5) * sh + tx2 * tr, 4.6 + (Math.random() - 0.5) * sh + ty2 * tr, 7.6 + 0.5 * g.speedK);
  camera.lookAt(g.camX * 0.8, 1.3, -9);

  if (g.state === 'playing' || g.state === 'dying') updateHud(dt);
}

// ---------- loop ----------
let last = 0, running = true;
// ?fps=1 shows frames per second and the quality step in the corner (for checking smoothness on a device)
const fpsEl = /[?&]fps=1/.test(location.search) ? Object.assign(document.body.appendChild(document.createElement('div')), {
  style: 'position:fixed;left:8px;bottom:8px;z-index:99;background:rgba(0,0,0,.6);color:#fff;font:600 13px/1.3 system-ui;padding:4px 8px;border-radius:8px;direction:ltr;pointer-events:none'
}) : null;
let fpsN = 0, fpsT = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (!running) { last = ts; return; }
  let dt = (ts - last) / 1000;
  last = ts;
  if (!(dt > 0)) return;
  if (fpsEl) {
    fpsN++; fpsT += dt;
    if (fpsT >= 0.5) {
      let q = '?'; try { q = localStorage.getItem('runner-quality-v2') ?? 'auto'; } catch (e) { /* ignore */ }
      fpsEl.textContent = Math.round(fpsN / fpsT) + ' fps · q' + q + ' · ' + window.__cs;
      fpsN = 0; fpsT = 0;
    }
  }
  if (dt > 0.25) dt = 1 / 60;              // coming back from a pause
  gfx.measure(dt);
  update(Math.min(dt, 1 / 30));
  gfx.render(dt, g.time);
}
document.addEventListener('visibilitychange', () => { running = !document.hidden; });

createInput(canvas, act);
$('btn-start').addEventListener('click', () => startGame());
$('btn-again').addEventListener('click', () => startGame());
$('start-best').textContent = g.best ? 'שיא: ' + g.best + ' מ׳' : '';
window.__ready = true;

// Hooks for the automatic checks (stepping the game without waiting for real time).
window.__game = {
  state: g,
  rows: () => rows,
  start: startGame,
  act,
  info: () => gfx.info(),
  dropped: () => world.dropped,
  courier: () => courier.ready,
  crowd: () => crowd.ready,
  crowdStats: () => crowd.stats,
  quality: (l) => gfx.setLevel(l),
  tris() { const out = []; scene.traverse((o) => { if (o.isMesh && o.visible) { const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3, c = o.isInstancedMesh ? o.count : 1; if (c) out.push([Math.round(n * c), Math.round(n), c, o.castShadow ? 'cast' : '', 'L' + o.layers.mask]); } }); return out.sort((a, b) => b[0] - a[0]).slice(0, 28); },
  jump(dist) { g.dist = dist; g.nitro = 100; world.reset(dist); ents.clear(); rows = []; gen = createGenerator(mulberry32(g.seed), dist + 30); },
  step(dt = 1 / 60, n = 1, draw = true) {
    for (let i = 0; i < n; i++) update(dt);
    if (draw) gfx.render(dt, g.time);
    return g.state;
  },
  pause(v) { running = !v; }
};

gfx.compile();
update(1 / 60);
gfx.render(1 / 60, g.time);
requestAnimationFrame((ts) => { last = ts; requestAnimationFrame(frame); });

if ('serviceWorker' in navigator && !/[?&]nosw/.test(location.search)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
