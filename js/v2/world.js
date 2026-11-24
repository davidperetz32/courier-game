// The airport hall in the new look. Four zones, each with its own wall cladding, signs, props and haze:
// check-in, security, duty free, gates. The shell is one 24 m segment drawn 7 times and slid by
// (distance % 24); the left wall has one variant per zone. Props, people and aircraft are pooled.
import * as THREE from '../../vendor/three.module.min.js';
import { Builder } from './geo.js';
import * as M from './models.js';
import * as M2 from './models2.js';
import { zoneIndexAt, ZONE_LEN } from '../config.js';

const SEG = 24, NSEG = 9, W = 7, H = 9, PI = Math.PI;      // 9 segments: the far end (168..192 m) is always beyond the fog (165 m)
const AHEAD = 186;                                         // props and people are created this far ahead, beyond the fog
const STEEL = 0x2a2420, BRASS = 0xc9a25a;

export const ZONES = [
  { name: 'צ׳ק-אין',       haze: 0x8f7058, floor: 0xffffff, led: 0xffb163 },
  { name: 'בידוק ביטחוני',  haze: 0x66788a, floor: 0xd4e2f2, led: 0x4da3ff },
  { name: 'דיוטי פרי',      haze: 0x8a5a70, floor: 0xffe0ea, led: 0xff4fd8 },
  { name: 'שערי העלייה',    haze: 0x94804e, floor: 0xfff2d2, led: 0x5dff9d }
];

export function createWorld(gfx, crowd) {
  const { scene, R, propMat, floorMat, soft, sunDir } = gfx;
  const dummy = new THREE.Object3D(), m4 = new THREE.Matrix4(), col = new THREE.Color(), target = new THREE.Color();
  const shell = new THREE.Group();
  scene.add(shell);

  function segMesh(geo, mat, { cast = false, receive = true, layer = 0 } = {}) {
    const im = new THREE.InstancedMesh(geo, mat, NSEG);
    for (let i = 0; i < NSEG; i++) im.setMatrixAt(i, m4.makeTranslation(0, 0, SEG - i * SEG));
    im.castShadow = cast; im.receiveShadow = receive; im.frustumCulled = false; im.layers.set(layer);
    shell.add(im);
    return im;
  }

  // ---------- shell parts shared by all zones ----------
  {
    const b = new Builder(), d = new Builder();    // b = structure (casts the window shadows), d = small details
    // right: glazing to the apron. Stone plinth, steel mullions, transom, upper wall.
    b.pbr(0.55, 0.1).box(0.5, 0.7, SEG, 0x4a4039, W + 0.1, 0.35, -SEG / 2);
    for (let z = -1.5; z > -SEG; z -= 3) b.pbr(0.9, 0).box(0.5, 2.8, 3, 0xffffff, W + 0.1, 7.6, z, 0, 0, 0, R.plaster);
    b.pbr(0.4, 0.8).box(0.22, 0.14, SEG, STEEL, W, 3.6, -SEG / 2).box(0.3, 0.16, SEG, STEEL, W, 6.2, -SEG / 2).box(0.34, 0.08, SEG, STEEL, W - 0.1, 0.74, -SEG / 2);
    for (let z = 0; z > -SEG; z -= 3) b.box(z % 12 === 0 ? 0.5 : 0.16, 5.5, z % 12 === 0 ? 0.5 : 0.22, STEEL, W, 3.45, z);
    d.pbr(0.5, 0, 2.4).box(0.04, 0.04, SEG, 0xffc98a, W - 0.2, 6.08, -SEG / 2);
    // ceiling: wood slats, steel beams with LED lines, rails
    for (let z = -1.5; z > -SEG; z -= 3) for (let x = -5.25; x < W; x += 3.5) b.pbr(0.7, 0).box(3.5, 0.2, 3, 0x9a8672, x, H + 0.1, z, 0, 0, 0, R.slats);
    for (let z = -3; z > -SEG; z -= 6) {
      b.pbr(0.45, 0.7).box(2 * W, 0.5, 0.36, STEEL, 0, H - 0.3, z);
      d.pbr(0.5, 0, 1.7).box(2 * W - 1, 0.04, 0.08, 0xffd9a0, 0, H - 0.57, z);
      for (const x of [-5, -1.7, 1.7, 5]) {                      // pendant lamps
        const y = 6.5 + (x * x > 9 ? 0.5 : 0);
        d.pbr(0.4, 0.8).cyl(0.012, 0.012, H - 0.55 - y, STEEL, x, (H - 0.55 + y) / 2, z, 3);
        d.pbr(0.35, 0.9).cyl(0.06, 0.34, 0.26, 0x7a5a2e, x, y + 0.02, z, 10, 0, 0, 0, R.metal);
        d.pbr(0.4, 0, 9).sph(0.12, 0xffd08a, x, y - 0.13, z, 8, 5);
      }
    }
    for (const x of [-3.5, 3.5]) b.pbr(0.45, 0.7).box(0.2, 0.3, SEG, STEEL, x, H - 0.2, -SEG / 2);
    for (const z of [-9, -21]) {                                   // strings of small bulbs across the hall
      const pts = [];
      for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([-W + 0.3 + t * (2 * W - 0.6), 7.7 - Math.sin(t * PI) * 1.0 - t * 0.5, z + Math.sin(t * PI) * 0.6]); }
      d.pbr(0.8, 0).tube(pts, 0.012, 0x16120f, 3);
      pts.forEach((p, i) => { if (i > 0 && i < 14) d.pbr(0.4, 0, 8).sph(0.055, i % 3 === 1 ? 0xffb163 : 0xffe2b0, p[0], p[1] - 0.07, p[2], 6, 4); });
    }
    for (const x of [-1, 1]) d.pbr(0.28, 1).box(0.05, 0.006, SEG, BRASS, x, 0.003, -SEG / 2);   // brass lane inlays
    segMesh(b.build(), propMat, { cast: true });
    segMesh(d.build(), propMat, { layer: 2 }).count = 7;          // lamps and bulbs only out to 120 m; beyond that the haze has them
  }

  // floor, tinted per segment by its zone
  const floorGeo = new THREE.PlaneGeometry(2 * W, SEG).rotateX(-PI / 2).translate(0, 0, -SEG / 2);
  { const uv = floorGeo.attributes.uv, k = floorMat.userData.repeatPerMetre; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * W * k, uv.getY(i) * SEG * k); }
  const floor = segMesh(floorGeo, floorMat);
  for (let i = 0; i < NSEG; i++) floor.setColorAt(i, col.set(0xffffff));
  gfx.hideInRefl.push(floor);

  // warm light pools under the pendants
  const glowMat = new THREE.MeshBasicMaterial({ map: soft, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  {
    const b = new Builder(), F = [0, 0, 1, 1];
    for (let z = -3; z > -SEG; z -= 6) for (const x of [-5, -1.7, 1.7, 5]) b.quad(4.6, 4.6, F, x, 0.02, z, -PI / 2, 0, 0, new THREE.Color(0xffb163).multiplyScalar(0.14));
    segMesh(b.build(), glowMat, { receive: false, layer: 1 });
  }

  // sun shafts: a few thin sheets of light per window pane, following the sun direction down to the floor
  {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d'), img = g.createImageData(64, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 64; x++) {
      const u = x / 63, v = y / 127, a = Math.pow(Math.sin(u * PI), 1.4) * (1 - v * 0.75) * Math.min(1, v * 8);
      const i = (y * 64 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.flipY = false;
    const pos = [], uv = [], k = sunDir.x / sunDir.y, kz = sunDir.z / sunDir.y, yT = 6.1, yB = 0.8;
    for (let pane = 0; pane < SEG / 3; pane++) for (const f of [0.2, 0.5, 0.8]) {
      const z = -pane * 3 - 0.2 - f * 2.6;
      const A = [W, yT, z], B = [W, yB, z], C = [W - yB * k, 0, z - yB * kz], D = [W - yT * k, 0, z - yT * kz];
      pos.push(...A, ...B, ...C, ...A, ...C, ...D);
      uv.push(1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const mat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: tex }, uColor: { value: new THREE.Color(0xffc890).multiplyScalar(0.1) } },
      vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        vec4 mv = modelViewMatrix * p; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D tMap; uniform vec3 uColor; varying vec2 vUv; varying float vD;
        void main(){ float a = texture2D(tMap, vUv).a * smoothstep(75.0, 20.0, vD) * smoothstep(0.5, 4.0, vD); gl_FragColor = vec4(uColor * a, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    segMesh(geo, mat, { receive: false, layer: 1 });
  }

  // far end of the hall melts into the haze
  {
    const mat = new THREE.MeshBasicMaterial({ fog: false }); mat.color = gfx.haze;
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(2 * W + 1, H + 1), mat);
    cap.position.set(0, H / 2, -167); scene.add(cap);
  }

  // ---------- left wall, one look per zone ----------
  function wallGeometry(zi) {
    const b = new Builder(), X = -W - 0.15, led = ZONES[zi].led;
    const lower = [R.slats, R.steelpanel, R.darkwood, R.oak][zi], upper = [R.plaster, R.steelpanel, R.darkwood, R.plaster][zi];
    const lowCol = [0xffffff, 0xffffff, 0xd8c7ba, 0xf2e2c8][zi], upCol = [0xffffff, 0xd2deea, 0x6a5560, 0xfff4e0][zi];
    for (let z = -1; z > -SEG; z -= 2) b.pbr(zi === 1 ? 0.35 : 0.62, zi === 1 ? 0.6 : 0).box(0.3, 3.5, 2, lowCol, X, 1.75, z, 0, 0, 0, lower);
    for (let z = -1.5; z > -SEG; z -= 3) b.pbr(zi === 2 ? 0.3 : 0.9, zi === 1 ? 0.4 : 0).box(0.3, 5.6, 3, upCol, X, 6.3, z, 0, 0, 0, upper);
    b.pbr(0.5, 0.4).box(0.5, 0.16, SEG, STEEL, -W + 0.1, 3.58, -SEG / 2);
    b.pbr(0.5, 0, 3.4).box(0.05, 0.05, SEG, led, -W + 0.34, 3.48, -SEG / 2);
    b.pbr(0.6, 0, 2.2).box(0.04, 0.05, SEG, led, -W + 0.03, 0.06, -SEG / 2);
    for (let z = -3; z > -SEG; z -= 6) {
      b.pbr(0.45, 0.7).box(0.45, H, 0.45, STEEL, -W + 0.05, H / 2, z);
      b.pbr(0.5, 0, 3.2).box(0.03, 5, 0.06, zi === 0 ? 0xffd9a0 : led, -W + 0.29, 6.2, z);
    }
    // the zone name in neon, and something of its own between the pilasters
    const sign = [R.neon_checkin, R.neon_security, R.neon_duty, R.neon_gatesbig][zi];
    b.pbr(0.5, 0.3).rbox(0.1, 1.35, 3.5, 0.04, 0x120a06, -W + 0.2, 5.0, -12);
    b.pbr(0.4, 0, 3.4).quad(3.4, 1.27, sign, -W + 0.26, 5.0, -12, 0, PI / 2, 0);
    if (zi === 0) for (const z of [-6, -18]) b.pbr(0.4, 0, 3.2).quad(1.5, 0.75, R.neon_info, -W + 0.26, 5.0, z, 0, PI / 2, 0);
    if (zi === 1) for (const z of [-6, -18]) { b.pbr(0.4, 0.5).rbox(0.08, 1.2, 1.9, 0.03, 0x0b1730, -W + 0.2, 5.0, z); b.pbr(0.3, 0, 1.8).quad(1.8, 1.1, R.screen_xray, -W + 0.25, 5.0, z, 0, PI / 2, 0); }
    if (zi === 2) [-4.5, -19.5].forEach((z, i) => { b.pbr(0.3, 0, 1.7).quad(1.5, 2.0, i ? R.poster2 : R.poster1, -W + 0.21, 5.3, z, 0, PI / 2, 0); b.pbr(0.5, 0, 4).box(0.04, 2.1, 0.04, 0xffd76a, -W + 0.22, 5.3, z - 0.8).box(0.04, 2.1, 0.04, 0xffd76a, -W + 0.22, 5.3, z + 0.8); });
    if (zi === 3) [-6, -18].forEach((z, i) => { b.pbr(0.4, 0.5).rbox(0.1, 1.5, 1.5, 0.04, 0x0d1117, -W + 0.2, 5.0, z); b.pbr(0.3, 0, 2.2).quad(1.4, 1.4, R['gate' + (i + 1)], -W + 0.26, 5.0, z, 0, PI / 2, 0); });
    return b.build();
  }
  const walls = ZONES.map((z, i) => { const im = segMesh(wallGeometry(i), propMat); im.count = 0; return im; });
  let segBase = null;
  function layoutSegments(dist) {
    const base = Math.floor(dist / SEG);
    if (base === segBase) return;
    segBase = base;
    for (const w of walls) w.count = 0;
    for (let i = 0; i < NSEG; i++) {
      const s0 = (base - 1 + i) * SEG, zi = zoneIndexAt(s0 + SEG / 2), w = walls[zi];
      w.setMatrixAt(w.count++, m4.makeTranslation(0, 0, SEG - i * SEG));
      floor.setColorAt(i, col.set(ZONES[zi].floor));
    }
    for (const w of walls) w.instanceMatrix.needsUpdate = true;
    floor.instanceColor.needsUpdate = true;
  }

  // ---------- props ----------
  const types = {};
  const dropped = { pool: 0, instances: 0, byType: {} };     // debug: things skipped because a list was full (must stay 0)
  function type(name, builder, cap, { cast = false, tints = false } = {}) {
    const im = new THREE.InstancedMesh(builder.build(), propMat, cap);
    im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false; im.count = 0; im.layers.set(2);
    if (tints) for (let i = 0; i < cap; i++) im.setColorAt(i, col.set(0xffffff));
    scene.add(im);
    types[name] = { im, cap, tints };
  }
  [1, 2, 3].forEach((n) => type('desk' + n, M.checkinDesk(R, n), 12));
  type('kiosk', M.kiosk(R), 30); type('posts', M.queuePosts(R, 3, 1.5), 40); type('cafe', M.cafeCart(R), 12);
  type('seats', M.seats(R, 4), 80); type('plant', M.plant(), 60); type('bins', M.bins(R), 24); type('lamp', M2.lamp(), 40);
  type('case', M.suitcase(R, { color: 0xffffff, tint: true, stickers: [4, 2, 1], handle: true }), 48, { tints: true });
  type('scanner', M2.scanner(R), 30); type('trays', M2.trayTable(R), 24);
  [0, 1, 2].forEach((v) => type('shop' + v, M2.shopUnit(R, v), 14));
  type('island', M2.island(R), 20); type('promo', M2.promo(R), 24);
  [1, 2, 3, 4].forEach((n) => type('gate' + n, M2.gateDesk(R, n), 8)); type('charge', M2.chargeBar(R), 24);
  // hanging things and the zone portals
  {
    const hang = (rect, w, h, frame, led) => {
      const b = new Builder();
      b.pbr(0.4, 0.7).rbox(w + 0.3, h + 0.3, 0.24, 0.06, frame, 0, 6.75, 0);
      b.pbr(0.3, 0, 2.0).quad(w, h, rect, 0, 6.75, 0.13);
      b.pbr(0.5, 0, 2.0).box(w + 0.3, 0.05, 0.26, led, 0, 6.75 - h / 2 - 0.17, 0);
      for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) b.pbr(0.4, 0.8).cyl(0.03, 0.03, H - 6.75 - h / 2, STEEL, x, (H + 6.75 + h / 2) / 2, 0, 6);
      return b;
    };
    type('ov0', hang(R.board, 4.7, 2.6, 0x16120f, 0xffb347), 5, { cast: false });
    type('ov1', hang(R.neon_security, 4.3, 1.6, 0x030c18, 0x4da3ff), 5, { cast: false });
    type('ov2', hang(R.neon_duty, 4.3, 1.6, 0x16040f, 0xff4fd8), 5, { cast: false });
    type('ov3', hang(R.neon_dep, 4.3, 1.6, 0x04101a, 0x38e8ff), 5, { cast: false });
    ZONES.forEach((z, i) => {
      const b = new Builder(), sign = [R.neon_checkin, R.neon_security, R.neon_duty, R.neon_gatesbig][i];
      for (const x of [-W + 0.5, W - 0.5]) { b.pbr(0.4, 0.7).rbox(0.5, 8.0, 0.5, 0.06, STEEL, x, 4.0, 0); b.pbr(0.5, 0, 3.6).box(0.05, 7.6, 0.05, z.led, x + (x < 0 ? 0.27 : -0.27), 4.0, 0.2); }
      b.pbr(0.4, 0.7).rbox(2 * W - 0.5, 0.6, 0.5, 0.06, STEEL, 0, 8.1, 0);
      b.pbr(0.5, 0, 3.6).box(2 * W - 1.4, 0.05, 0.05, z.led, 0, 7.78, 0.2);
      b.pbr(0.5, 0.3).rbox(5.3, 2.0, 0.18, 0.05, 0x0c0908, 0, 6.6, 0);
      b.pbr(0.4, 0, 3.4).quad(5.1, 1.9, sign, 0, 6.6, 0.1);
      type('portal' + i, b, 3, { cast: false });
    });
  }
  const decor = [];
  for (let i = 0; i < 420; i++) decor.push({ active: false, type: '', s: 0, x: 0, ry: 0, tint: 0 });
  const TINTS = [0x1f5fbf, 0xf2b705, 0x6d3fc4, 0xd9342b, 0x19a37a, 0xf97316].map((c) => new THREE.Color(c));
  function put(name, s, x, ry = 0) {
    const d = decor.find((o) => !o.active);
    if (!d) { dropped.pool++; return; }
    d.active = true; d.type = name; d.s = s; d.x = x; d.ry = ry; d.tint = (Math.random() * TINTS.length) | 0;
  }
  let nextBlock = 0, blockIndex = 0;
  const rnd = Math.random;
  function block(s) {
    const zi = zoneIndexAt(s + 3), k = blockIndex++;
    // the portal of a zone stands on the segment border where wall and floor change (see layoutSegments)
    const zs = Math.floor((s + 6) / ZONE_LEN) * ZONE_LEN, seam = Math.ceil((zs - SEG / 2) / SEG) * SEG;
    const portalHere = seam >= s && seam < s + 6 && seam >= 0;
    if (portalHere) put('portal' + zoneIndexAt(seam + SEG / 2), seam, 0);
    else if (k % 8 === 4) put('ov' + zi, s + 3, 0);
    // left: what the zone is about
    const L = -5.3;
    if (zi === 0) {
      const m = k % 5;
      if (m < 3) { put('desk' + (m + 1), s + 2.2, L); put('posts', s + 2.6, -3.75); wait(s + 2.0, -4.35, PI / 2, 0.6); if (rnd() < 0.5) wait(s + 3.3, -4.3, PI / 2 + 0.5, 0.1); }
      else if (m === 3) { put('kiosk', s + 1.6, -4.2); put('kiosk', s + 2.8, -4.2); put('plant', s + 4.6, -6.1); }
      else { put(rnd() < 0.6 ? 'cafe' : 'bins', s + 3, rnd() < 0.6 ? -5.6 : -4.2); put('plant', s + 5.2, -6.1); }
    } else if (zi === 1) {
      const m = k % 3;
      if (m === 1) { put('trays', s + 3, -5.2); put('plant', s + 0.6, -6.1); put('posts', s + 3, -3.75); wait(s + 2.6, -4.45, PI / 2, 0.2); }
      else put('scanner', s + 3.4, -5.3);
    } else if (zi === 2) {
      const m = k % 4;
      if (m === 2) { put('island', s + 3, -4.9); put('promo', s + 0.4, -6.0); put('lamp', s + 5.4, -6.2); }
      else { put('shop' + (m === 3 ? 2 : m), s + 3, -5.95); wait(s + 2.2 + rnd() * 1.6, -4.75, PI / 2, 0.45); }
    } else {
      const m = k % 4;
      if (m === 0 || m === 2) { put('gate' + (1 + ((k >> 1) % 4)), s + 2.6, -5.0); wait(s + 2.6, -4.1, PI / 2, 0.7); if (rnd() < 0.6) wait(s + 3.7, -4.0, PI / 2 + 0.6, 0.1); }
      else if (m === 1) { put('seats', s + 1.6, -5.6); put('seats', s + 4.4, -5.6); put('charge', s + 3, -4.3); }
      else { put('seats', s + 2, -5.6); put('plant', s + 4.2, -6.1); put('lamp', s + 5.4, -6.2); }
    }
    // right: waiting area along the windows
    const r = rnd();
    if (r < 0.42) { put('seats', s + 1.6, 5.7, PI); if (rnd() < 0.7) put('seats', s + 4.5, 5.7, PI); if (rnd() < 0.5) put('case', s + 3.1, 4.8, -1.2 - rnd()); }
    else if (r < 0.58) { put('plant', s + 2, 6.1, rnd() * 3); put('lamp', s + 4.4, 6.2); wait(s + 3.2, 5.6, -PI / 2, 0.0); }
    else if (r < 0.68) put('bins', s + 3, 4.3, PI);
    else if (r < 0.8) { put('case', s + 2, 4.7, -1.5); put('case', s + 2.8, 5.1, -0.8); put('plant', s + 5, 6.1); }
    else if (zi === 0) put('kiosk', s + 3, 4.3, PI);
    else if (zi === 1) put('trays', s + 3, 5.4, PI);
    else if (zi === 2) put(rnd() < 0.5 ? 'island' : 'promo', s + 3, 5.2, PI);
    else put('charge', s + 3, 5.2, PI);
  }

  // people standing at desks, counters and windows (idle or talking)
  const waiters = [];
  for (let i = 0; i < 56; i++) waiters.push({ active: false, s: 0, x: 0, ry: 0, variant: 0, seed: 0, mode: 1 });
  function wait(s, x, ry, talk = 0.35) {
    const p = waiters.find((o) => !o.active);
    if (!p) { dropped.pool++; return; }
    p.active = true; p.s = s; p.x = x; p.ry = ry; p.variant = (rnd() * 24) | 0; p.seed = rnd() * 6.28; p.mode = rnd() < talk ? 2 : 1;
  }

  // people strolling along both sides (never in the lanes)
  const strollers = [];
  for (let i = 0; i < 12; i++) strollers.push({ s: -1e9, x: 0, dir: 1, v: 1.2, variant: 0, seed: 0, tint: 0 });
  function respawn(p, dist, anywhere) {
    p.s = dist + (anywhere ? 8 + rnd() * 170 : AHEAD - 6 + rnd() * 20);
    p.x = (rnd() < 0.5 ? -1 : 1) * (3.38 + rnd() * 0.22);
    p.dir = rnd() < 0.5 ? -1 : 1; p.v = 1.0 + rnd() * 0.6;
    p.variant = (rnd() * crowd.variants) | 0; p.seed = rnd() * 6.28; p.tint = (rnd() * 8) | 0;
  }

  // ---------- outside the windows: the apron at sunset ----------
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#27407a'); gr.addColorStop(0.42, '#7d6fa8'); gr.addColorStop(0.68, '#f29a6b'); gr.addColorStop(0.86, '#ffd08a'); gr.addColorStop(1, '#ffe9bf');
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
    let a = 9; const r2 = () => (a = (a * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 26; k++) {
      const cx = r2() * 1024, cy = 60 + r2() * 130, w = 50 + r2() * 120;
      for (let j = 0; j < 7; j++) { g.fillStyle = j < 4 ? 'rgba(255,170,120,0.22)' : 'rgba(110,80,130,0.2)'; g.beginPath(); g.ellipse(cx + (r2() - 0.5) * w, cy + (j < 4 ? 6 : -2) + (r2() - 0.5) * 8, w * (0.3 + r2() * 0.3), 7 + r2() * 7, 0, 0, 7); g.fill(); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(760, 90), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.5, 1.5, 1.5), fog: false }));
    sky.position.set(150, 36, -220); sky.rotation.y = -PI / 2; scene.add(sky);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(7, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 5.2, 3.0), fog: false }));
    disc.position.set(148, 13, -118); disc.rotation.y = -PI / 2; scene.add(disc);
    // things that stay put: the apron itself, far terminal with lit windows, control tower
    const b = new Builder();
    b.pbr(0.92, 0).box(150, 0.1, 640, 0x3d3a3c, W + 75.4, -0.07, -200);
    b.box(0.3, 0.02, 640, 0xe9e9e9, 11, 0.0, -200).box(0.3, 0.02, 640, 0xe9e9e9, 23, 0.0, -200);
    b.pbr(0.8, 0, 1.3).box(4, 9, 60, 0xffffff, 118, 4.5, -60, 0, 0, 0, R.bldg).box(4, 7, 46, 0xffffff, 122, 3.5, -150, 0, 0, 0, R.bldg);
    b.pbr(0.8, 0).cyl(1.6, 2.2, 26, 0x4a4652, 104, 13, -112, 10).cyl(4, 2.4, 3, 0x2a2733, 104, 27.5, -112, 10);
    b.pbr(0.4, 0, 2.5).cyl(3.7, 3.4, 1.4, 0xbfe9ff, 104, 28, -112, 10);
    b.pbr(0.5, 0, 9).sph(0.5, 0xff4d4d, 104, 30.6, -112, 6, 4);
    const far = new THREE.Mesh(b.build(), propMat); far.frustumCulled = false; far.receiveShadow = false; far.layers.set(2); scene.add(far);
  }
  // road markings and lights that slide past (48 m pattern)
  const apron = new THREE.Group(); scene.add(apron);
  {
    const b = new Builder();
    for (let z = 0; z > -48; z -= 9.6) b.pbr(0.7, 0).box(0.3, 0.02, 5, 0xe0b23a, 17, 0.0, z - 2.5);
    for (let z = 0; z > -48; z -= 12) b.pbr(0.5, 0, 9).sph(0.12, 0x4d8dff, 24.5, 0.1, z, 6, 4);
    for (let z = 0; z > -48; z -= 16) b.pbr(0.5, 0, 9).sph(0.14, 0xffc45a, 70, 0.1, z, 6, 4);
    const im = new THREE.InstancedMesh(b.build(), propMat, 10);     // road marks and lights out to about 400 m
    for (let i = 0; i < 10; i++) im.setMatrixAt(i, m4.makeTranslation(0, 0, 48 - i * 48));
    im.frustumCulled = false; im.layers.set(2); apron.add(im);
  }
  type('airliner', M.airliner(R), 9, { cast: false, tints: true });
  type('bridge', M2.jetBridge(R), 8, { cast: false });
  type('tug', M.tugTrain(R), 10, { cast: false });
  type('mast', M2.mast(), 9, { cast: false });
  const TAILS = [0x12a594, 0xd9342b, 0x1f5fbf, 0xf2b705, 0x7c3aed].map((c) => new THREE.Color(c));
  const planes = [], tugs = [];
  let nextPlane = 0, planeIndex = 0, flyT = 4;
  function spawnOutside(dist) {
    while (nextPlane < dist + 330) {
      planes.push({ s: nextPlane + 30, tint: planeIndex % TAILS.length, ry: (planeIndex % 3 - 1) * 0.08 });
      tugs.push({ s: nextPlane + 5 + rnd() * 20, x: planeIndex % 2 ? 14 : 20, v: planeIndex % 2 ? -7 : 5 });
      planeIndex++; nextPlane += 78;
    }
  }

  function setInstance(t, x, y, z, ry = 0, rx = 0, tintColor = null) {
    const im = t.im;
    if (im.count >= t.cap) { dropped.instances++; return; }
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, 0, 'YXZ'); dummy.updateMatrix();
    if (tintColor) im.setColorAt(im.count, tintColor);
    im.setMatrixAt(im.count++, dummy.matrix);
  }

  function reset(dist = 0) {
    for (const d of decor) d.active = false;
    nextBlock = Math.floor((dist - 12) / 6) * 6; blockIndex = 0;
    planes.length = 0; tugs.length = 0; nextPlane = dist - 40; planeIndex = 0;
    for (const p of strollers) respawn(p, dist, true);
    for (const p of waiters) p.active = false;
    segBase = null;
    gfx.haze.set(ZONES[zoneIndexAt(dist)].haze);
  }

  function update(dist, dt, time) {
    shell.position.z = dist % SEG;
    apron.position.z = dist % 48;
    layoutSegments(dist);
    gfx.haze.lerp(target.set(ZONES[zoneIndexAt(dist + 30)].haze), 1 - Math.exp(-dt * 1.2));

    while (nextBlock < dist + AHEAD) { block(nextBlock); nextBlock += 6; }
    spawnOutside(dist);
    for (const k in types) types[k].im.count = 0;
    for (let i = 0; i < decor.length; i++) {
      const d = decor[i];
      if (!d.active) continue;
      if (d.s < dist - 14) { d.active = false; continue; }
      const t = types[d.type];
      setInstance(t, d.x, 0, dist - d.s, d.ry, 0, t.tints ? TINTS[d.tint] : null);
    }
    // aircraft at their gates, tugs driving, one aircraft climbing out in the distance
    while (planes.length && planes[0].s < dist - 60) planes.shift();
    for (const p of planes) {
      setInstance(types.airliner, 37, 0, dist - p.s, p.ry, 0, TAILS[p.tint]);
      setInstance(types.bridge, W, 0, dist - p.s);
      setInstance(types.mast, 27, 0, dist - p.s + 30);
    }
    while (tugs.length && tugs[0].s < dist - 60) tugs.shift();
    for (const t of tugs) { t.s += t.v * dt; setInstance(types.tug, t.x, 0, dist - t.s, t.v > 0 ? 0 : PI); }
    flyT += dt;
    const ft = (flyT % 22) / 22;
    setInstance(types.airliner, 84, 1 + Math.max(0, ft - 0.2) * 95, 80 - ft * 560, -PI / 2, Math.min(0.22, Math.max(0, ft - 0.2) * 3), TAILS[2]);
    for (const k in types) { const t = types[k]; t.im.instanceMatrix.needsUpdate = true; if (t.tints && t.im.instanceColor) t.im.instanceColor.needsUpdate = true; }

    for (const p of waiters) {
      if (!p.active) continue;
      if (p.s < dist - 12) { p.active = false; continue; }
      crowd.add(p.variant, p.x, dist - p.s, p.ry, p.seed, 0, 6.5, p.mode);
    }
    for (const p of strollers) {
      p.s += p.dir * p.v * dt;
      if (p.s < dist - 10 || p.s > dist + AHEAD + 20) respawn(p, dist, false);
      crowd.add(p.variant, p.x, dist - p.s, p.dir > 0 ? 0 : PI, p.seed, p.tint, 4.8 + p.v * 1.6);
    }
  }

  reset(0);
  return { update, reset, zoneName: (i) => ZONES[i].name, dropped };
}
