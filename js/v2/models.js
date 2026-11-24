// Prop models, built in code from simple shapes and merged to one draw call each.
// Every function returns a Builder with the prop standing on y = 0.
// R = atlas rectangles from mat.js. Colours are plain hex; surfaces come from the atlas (wood, metal, ribs).
import * as THREE from '../../vendor/three.module.min.js';
import { Builder } from './geo.js';

const CHROME = 0xdfe5ea, DARK = 0x1b1f26, RUBBER = 0x15171b;
const PI = Math.PI;

// Hard-shell suitcase. Front (stickers) faces +z.
export function suitcase(R, o = {}) {
  const { w = 0.5, h = 0.72, d = 0.28, color = 0xd9342b, stickers = [0, 3], handle = false, wheels = true, guards = true } = o;
  const b = new Builder();
  const y0 = wheels ? 0.06 : 0;
  b.pbr(0.38, 0.05).tint(o.tint ? 1 : 0).rbox(w, h, d, 0.055, color, 0, y0 + h / 2, 0, 0, 0, 0, R.ribs).tint(0);
  // corner guards and side bumpers
  b.pbr(0.6, 0);
  if (guards) for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.sph(0.052, 0x2b3038, sx * (w / 2 - 0.04), y0 + h / 2 + sy * (h / 2 - 0.04), 0, 7, 5, 1, 1, (d / 2 + 0.012) / 0.052);
  b.box(w * 0.5, 0.02, d + 0.02, DARK, 0, y0 + h * 0.5, 0);
  // top handle and side handle
  b.pbr(0.5, 0).tube([[-0.09, y0 + h - 0.005, 0], [-0.09, y0 + h + 0.045, 0], [0.09, y0 + h + 0.045, 0], [0.09, y0 + h - 0.005, 0]], 0.013, DARK, 4);
  b.tube([[w / 2 - 0.005, y0 + h * 0.62, 0], [w / 2 + 0.04, y0 + h * 0.62, 0], [w / 2 + 0.04, y0 + h * 0.38, 0], [w / 2 - 0.005, y0 + h * 0.38, 0]], 0.012, DARK, 4);
  if (handle) {                                              // telescopic handle pulled out
    b.pbr(0.25, 1);
    b.cyl(0.011, 0.011, 0.5, CHROME, -0.1, y0 + h + 0.25, -d / 2 + 0.04, 6).cyl(0.011, 0.011, 0.5, CHROME, 0.1, y0 + h + 0.25, -d / 2 + 0.04, 6);
    b.pbr(0.6, 0).rbox(0.26, 0.04, 0.04, 0.015, DARK, 0, y0 + h + 0.5, -d / 2 + 0.04);
  }
  if (wheels) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.pbr(0.7, 0).cyl(0.036, 0.036, 0.03, RUBBER, sx * (w / 2 - 0.06), 0.036, sz * (d / 2 - 0.05), 8, 0, PI / 2);
    }
  }
  // stickers on the front, luggage tag on the handle
  b.pbr(0.55, 0);
  const spots = [[-w * 0.2, h * 0.72, 0.085, 0.12], [w * 0.17, h * 0.3, 0.075, -0.2], [w * 0.2, h * 0.76, 0.06, 0.3], [-w * 0.18, h * 0.24, 0.07, 0.1]];
  stickers.forEach((s, i) => {
    const sp = spots[i % spots.length], z = d / 2 + 0.004;
    if (s === 0 || s === 2) b.disc(sp[2], R['st' + s], sp[0], y0 + sp[1], z, 0, 0, sp[3]);
    else b.quad(sp[2] * 2, sp[2] * (s === 1 ? 1.25 : 2), R['st' + s], sp[0], y0 + sp[1], z, 0, 0, sp[3]);
  });
  b.pbr(0.6, 0).box(0.06, 0.1, 0.006, 0xf8fafc, 0.11, y0 + h - 0.03, d / 2 + 0.03, 0, 0.25, 0.2);
  return b;
}

// Soft duffel bag lying along x.
export function duffel(R, color = 0x2f6f4f, len = 0.7, r = 0.17) {
  const b = new Builder();
  b.pbr(0.85, 0).add(new THREE.CapsuleGeometry(r, len - 2 * r, 3, 10), color, 0, r, 0, 0, 0, PI / 2, R.fabric, 1, 1, 1);
  b.pbr(0.6, 0).box(len * 0.55, 0.012, 0.03, DARK, 0, 2 * r + 0.004, 0);
  b.tube([[-0.14, 2 * r - 0.02, 0.05], [-0.1, 2 * r + 0.12, 0], [0.1, 2 * r + 0.12, 0], [0.14, 2 * r - 0.02, 0.05]], 0.014, DARK, 5);
  for (const sx of [-1, 1]) b.box(0.03, 2 * r * 0.92, 2 * r * 0.92, DARK, sx * (len / 2 - 0.08), r, 0);
  return b;
}

// Airport baggage trolley loaded with luggage. 1.6 m wide, 2.3 m long; the push handle is at +z (the side the runner sees).
export function cart(R) {
  const b = new Builder();
  const T = 0.022;
  b.pbr(0.22, 1);
  // base frame loop and cross bars
  b.tube([[-0.7, 0.3, 1.0], [-0.7, 0.3, -0.95], [-0.55, 0.3, -1.1], [0.55, 0.3, -1.1], [0.7, 0.3, -0.95], [0.7, 0.3, 1.0]], T, CHROME, 6);
  for (const z of [-0.6, 0, 0.6]) b.cyl(T * 0.8, T * 0.8, 1.4, CHROME, 0, 0.3, z, 6, 0, PI / 2);
  // handle frame, push bar, small basket
  for (const sx of [-1, 1]) b.tube([[sx * 0.7, 0.3, 1.0], [sx * 0.7, 1.02, 1.08], [sx * 0.62, 1.12, 1.16]], T, CHROME, 6);
  b.cyl(T, T, 1.24, CHROME, 0, 1.12, 1.16, 6, 0, PI / 2);
  b.pbr(0.55, 0).cyl(0.034, 0.034, 0.9, 0xf97316, 0, 1.12, 1.16, 8, 0, PI / 2);                 // rubber grip
  b.pbr(0.3, 1);
  b.tube([[-0.5, 0.92, 1.06], [-0.5, 0.92, 0.74], [0.5, 0.92, 0.74], [0.5, 0.92, 1.06]], 0.014, CHROME, 5);
  for (let i = -2; i <= 2; i++) b.cyl(0.008, 0.008, 0.2, CHROME, i * 0.2, 0.82, 0.74, 3);
  b.cyl(0.012, 0.012, 1.0, CHROME, 0, 0.72, 0.74, 5, 0, PI / 2);
  // deck
  b.pbr(0.65, 0.2).box(1.36, 0.03, 2.0, 0x2b3038, 0, 0.31, -0.05);
  b.pbr(0.5, 0).box(1.44, 0.07, 0.07, 0xf2b705, 0, 0.3, -1.12, 0, 0, 0, R.hazard);            // front bumper
  // wheels: two fixed at the back, a caster in front
  for (const sx of [-1, 1]) {
    b.pbr(0.75, 0).cyl(0.13, 0.13, 0.06, RUBBER, sx * 0.6, 0.13, 0.8, 12, 0, PI / 2);
    b.pbr(0.3, 1).cyl(0.06, 0.06, 0.07, CHROME, sx * 0.6, 0.13, 0.8, 8, 0, PI / 2).box(0.03, 0.2, 0.05, CHROME, sx * 0.66, 0.22, 0.8);
  }
  b.pbr(0.75, 0).cyl(0.09, 0.09, 0.05, RUBBER, 0, 0.09, -0.9, 10, 0, PI / 2);
  b.pbr(0.3, 1).box(0.09, 0.2, 0.04, CHROME, 0, 0.2, -0.86);
  // luggage: big cases flat on the deck, uprights behind, soft bag and a box on top
  const lay = (sc, x, y, z, ry) => {            // a suitcase lying on its back
    const t = new Builder(); t.merge(sc); const o = new Builder();
    for (let i = 0; i < t.p.length; i += 3) {     // rotate -90 deg around x: (x, y, z) -> (x, z, -y)
      o.p.push(t.p[i], t.p[i + 2], -t.p[i + 1]); o.n.push(t.n[i], t.n[i + 2], -t.n[i + 1]);
    }
    o.c = t.c; o.uv = t.uv; o.pbrA = t.pbrA; o.fxA = t.fxA;
    b.merge(o, x, y, z, ry);
  };
  lay(suitcase(R, { w: 0.62, h: 0.86, d: 0.32, color: 0x1f5fbf, stickers: [1, 2, 4], wheels: false, guards: false }), -0.34, 0.49, 0.2, 0.06);
  lay(suitcase(R, { w: 0.58, h: 0.8, d: 0.3, color: 0xd9342b, stickers: [0, 5], wheels: false, guards: false }), 0.36, 0.48, 0.22, -0.05);
  lay(suitcase(R, { w: 0.52, h: 0.72, d: 0.26, color: 0xf2b705, stickers: [3, 4, 0], wheels: false, guards: false }), -0.05, 0.79, 0.12, 0.35);
  b.merge(suitcase(R, { w: 0.5, h: 0.7, d: 0.3, color: 0x6d3fc4, stickers: [2, 1] }), -0.38, 0.33, -0.82, 0.05);
  b.merge(suitcase(R, { w: 0.44, h: 0.62, d: 0.26, color: 0x19a37a, stickers: [5, 3] }), 0.2, 0.33, -0.84, -0.1);
  b.merge(duffel(R, 0x8a4b2a, 0.74, 0.17), 0.3, 1.04, 0.02, 0.5);
  b.pbr(0.9, 0).rbox(0.36, 0.26, 0.3, 0.02, 0xb98a5e, -0.3, 1.18, 0.05, 0.3);                 // cardboard box with tape
  b.box(0.37, 0.262, 0.06, 0xd9c7a3, -0.3, 1.18, 0.05, 0.3);
  return b;
}

// Head with a stylised face (front = -z) and one of several hair styles.
function head(b, { skin, hair, style, beard, glasses, capColor }) {
  const Y = 1.65, dark = new THREE.Color(skin).multiplyScalar(0.86).getHex(), lip = new THREE.Color(skin).lerp(new THREE.Color(0x9c2f2f), 0.55).getHex();
  b.pbr(0.7, 0).cyl(0.055, 0.06, 0.1, skin, 0, 1.5, 0, 8);
  b.sph(0.155, skin, 0, Y, 0, 12, 9, 0.96, 1.06, 1);
  for (const s of [-1, 1]) {
    b.pbr(0.7, 0).sph(0.034, dark, s * 0.15, Y - 0.01, 0.012, 6, 4, 0.55, 1, 0.8);                    // ears
    b.pbr(0.25, 0).sph(0.035, 0xffffff, s * 0.058, Y + 0.016, -0.127, 8, 6, 1, 1.15, 0.5);            // eye white
    b.sph(0.02, 0x2a1a12, s * 0.056, Y + 0.012, -0.145, 6, 5, 1, 1, 0.45);                           // pupil
    b.pbr(0.9, 0).box(0.064, 0.015, 0.02, hair, s * 0.058, Y + 0.074, -0.138, 0, 0, s * -0.14);      // brow
    b.pbr(0.8, 0).sph(0.03, lip, s * 0.092, Y - 0.045, -0.118, 6, 4, 1, 0.7, 0.35);                  // cheek
  }
  b.pbr(0.7, 0).sph(0.027, dark, 0, Y - 0.022, -0.156, 6, 5, 0.9, 1.15, 1);                          // nose
  b.pbr(0.6, 0).box(0.07, 0.016, 0.02, lip, 0, Y - 0.078, -0.14).box(0.02, 0.014, 0.02, lip, -0.04, Y - 0.07, -0.137, 0, 0, -0.5).box(0.02, 0.014, 0.02, lip, 0.04, Y - 0.07, -0.137, 0, 0, 0.5);   // smile
  const capGeo = (r, cut) => new THREE.SphereGeometry(r, 12, 6, 0, PI * 2, 0, PI * cut);
  b.pbr(0.9, 0);
  if (style === 'short' || style === 'side' || style === 'long' || style === 'bun' || style === 'pony') b.add(capGeo(0.166, 0.55), hair, 0, Y + 0.02, 0.014, -0.2, 0, 0);
  if (style === 'side') b.sph(0.09, hair, 0.07, Y + 0.105, -0.085, 8, 5, 1.3, 0.5, 0.9);
  if (style === 'long') { b.sph(0.13, hair, 0, Y - 0.1, 0.1, 10, 7, 1.2, 1.7, 0.75); for (const s of [-1, 1]) b.sph(0.06, hair, s * 0.13, Y - 0.08, 0.0, 6, 5, 0.7, 2.0, 1); }
  if (style === 'bun') b.sph(0.075, hair, 0, Y + 0.17, 0.07, 8, 6);
  if (style === 'pony') { b.sph(0.05, hair, 0, Y + 0.06, 0.16, 6, 4); b.cap(0.04, 0.2, hair, 0, Y - 0.08, 0.2, -0.35, 0, 6); }
  if (style === 'curly') for (let i = 0; i < 9; i++) { const a = i * 0.7, r = i < 6 ? 0.115 : 0.05; b.sph(0.078, hair, Math.cos(a) * r, Y + (i < 6 ? 0.075 : 0.15), 0.02 + Math.sin(a) * r, 6, 4); }
  if (style === 'cap') { b.pbr(0.8, 0).add(capGeo(0.17, 0.5), capColor, 0, Y + 0.035, 0.005, -0.08, 0, 0).cyl(0.12, 0.12, 0.016, capColor, 0, Y + 0.05, -0.19, 10, 0.12); b.pbr(0.9, 0).sph(0.1, hair, 0, Y - 0.05, 0.085, 8, 5, 1.25, 0.8, 0.7); }
  if (style === 'beanie') { b.pbr(0.95, 0).add(capGeo(0.172, 0.5), capColor, 0, Y + 0.04, 0.01, -0.1, 0, 0).cyl(0.172, 0.172, 0.05, capColor, 0, Y + 0.05, 0.01, 12, -0.1).sph(0.04, 0xf8fafc, 0, Y + 0.215, 0.03, 6, 4); }
  if (beard) b.pbr(0.95, 0).sph(0.115, hair, 0, Y - 0.085, -0.045, 10, 6, 1.02, 0.75, 0.95);
  if (glasses) { b.pbr(0.3, 0.5); for (const s of [-1, 1]) b.torus(0.04, 0.007, 0x15171b, s * 0.058, Y + 0.014, -0.15, 0, 10); b.box(0.03, 0.008, 0.008, 0x15171b, 0, Y + 0.018, -0.152); }
}

// A person. Faces -z; limbs are marked to swing (walk cycle in the material). Shirt takes the instance tint.
export function person(R, o = {}) {
  const { scale = 1, wide = 1, skin = 0xe9b48c, pants = 0x2b3a55, hair = 0x3a2416, shoe = 0x20242b, shirt = 0xffffff, extra = 'roller', hat = false, skirt = false, bag = 0xd9342b, swing = 0.42, style = hat ? 'cap' : 'short', beard = false, glasses = false } = o;
  const b = new Builder();
  const hip = 0.88;
  // legs with shoes
  for (const s of [-1, 1]) {
    b.swing(hip, s * swing).pbr(0.8, 0);
    b.cap(0.078 * wide, 0.62, pants, s * 0.1 * wide, 0.47, 0, 0, 0, 6);
    b.pbr(0.55, 0).rbox(0.11, 0.09, 0.27, 0.03, shoe, s * 0.1 * wide, 0.05, -0.05);
    b.pbr(0.6, 0).box(0.112, 0.025, 0.272, 0xf1f5f9, s * 0.1 * wide, 0.012, -0.05);
  }
  b.swing(0, 0);
  // torso: hips, shirt (tinted), collar
  b.pbr(0.8, 0).rbox(0.36 * wide, 0.2, 0.23, 0.07, pants, 0, 0.9, 0);
  if (skirt) b.pbr(0.8, 0).tint(1).cyl(0.2 * wide, 0.3 * wide, 0.42, shirt, 0, 0.74, 0, 10).tint(0);
  b.pbr(0.85, 0).tint(1).rbox(0.42 * wide, 0.56, 0.26, 0.1, shirt, 0, 1.2, 0).tint(0);
  b.pbr(0.6, 0).box(0.34 * wide, 0.035, 0.24, DARK, 0, 0.99, 0);                               // belt
  // arms: sleeve (tinted) and hand
  for (const s of [-1, 1]) {
    const still = extra === 'roller' && s === 1;                                             // the arm that pulls the bag stays back
    b.swing(1.4, still ? 0 : -s * swing * 0.8);
    b.pbr(0.85, 0).tint(1).cap(0.058, 0.3, shirt, s * 0.27 * wide, 1.24, still ? 0.05 : 0, still ? 0.35 : 0, s * 0.08, 6).tint(0);
    b.pbr(0.7, 0).cap(0.047, 0.22, skin, s * 0.29 * wide, 0.95, still ? 0.17 : 0, still ? 0.35 : 0, s * 0.05, 6);
  }
  b.swing(0, 0);
  head(b, { skin, hair, style: skirt && style === 'short' ? 'long' : style, beard, glasses, capColor: bag });
  // what they carry
  if (extra === 'roller') {
    b.merge(suitcase(R, { w: 0.36, h: 0.54, d: 0.22, color: bag, stickers: [2], handle: false, guards: false }), 0.3 * wide, 0, 0.5, 0.15);
    b.pbr(0.25, 1).tube([[0.3 * wide, 0.6, 0.45], [0.3 * wide, 0.86, 0.26]], 0.011, CHROME, 5);
  } else if (extra === 'backpack') {
    b.pbr(0.85, 0).rbox(0.32, 0.44, 0.2, 0.08, bag, 0, 1.2, 0.2, 0, 0, 0, R.fabric).rbox(0.24, 0.18, 0.08, 0.04, bag, 0, 1.1, 0.31);
    for (const s of [-1, 1]) b.box(0.05, 0.42, 0.03, DARK, s * 0.13, 1.24, -0.125);
  } else if (extra === 'tote') {
    b.swing(1.4, swing * 0.8).pbr(0.85, 0).rbox(0.07, 0.3, 0.34, 0.03, bag, -0.36 * wide, 0.72, 0, 0, 0, 0, R.fabric).swing(0, 0);
  }
  if (scale !== 1) { const s = new Builder(); s.merge(b, 0, 0, 0, 0, scale); return s; }
  return b;
}

// Liquid nitrogen refill station: a steel dewar on a lit base. The light beam and vapour are separate (fx).
export function station(R) {
  const b = new Builder();
  b.pbr(0.5, 0.6).cyl(0.62, 0.68, 0.1, 0x23272e, 0, 0.05, 0, 24);
  b.pbr(0.4, 0, 5).cyl(0.64, 0.64, 0.03, 0x39d9ff, 0, 0.1, 0, 24);                              // glowing base ring
  b.pbr(0.5, 0.6).cyl(0.5, 0.56, 0.08, 0x2f343c, 0, 0.14, 0, 20);
  b.pbr(0.2, 1).cyl(0.36, 0.36, 0.95, 0xf0f4f8, 0, 0.66, 0, 20, 0, 0, 0, R.metal);              // tank
  b.add(new THREE.SphereGeometry(0.36, 20, 8, 0, PI * 2, 0, PI / 2), 0xf0f4f8, 0, 1.13, 0, 0, 0, 0, null, 1, 0.55, 1);
  b.pbr(0.4, 0, 4).cyl(0.368, 0.368, 0.05, 0x39d9ff, 0, 0.42, 0, 20).cyl(0.368, 0.368, 0.05, 0x39d9ff, 0, 0.98, 0, 20);
  b.pbr(0.25, 1).cyl(0.13, 0.17, 0.14, 0xc8d0d8, 0, 1.38, 0, 12).cyl(0.16, 0.16, 0.05, 0x8d99a6, 0, 1.47, 0, 12);
  b.pbr(0.9, 0, 0.5).sph(0.12, 0xeaffff, 0, 1.52, 0, 10, 6, 1, 0.6, 1);                         // frost cap
  // gauge, valve wheel and a coiled hose
  b.pbr(0.3, 1).cyl(0.08, 0.08, 0.04, CHROME, 0.2, 1.3, 0.2, 12, PI / 2, 0, 0.78);
  b.pbr(0.5, 0, 1.2).cyl(0.066, 0.066, 0.045, 0xf8fafc, 0.2, 1.3, 0.2, 12, PI / 2, 0, 0.78);
  b.pbr(0.5, 0.3).torus(0.07, 0.014, 0xd9342b, -0.22, 1.33, 0.18, PI / 2.6, 12);
  b.pbr(0.6, 0.2);
  for (let i = 0; i < 4; i++) b.torus(0.385, 0.022, 0x20242b, 0, 0.56 + i * 0.05, 0, PI / 2, 18);
  b.pbr(0.3, 1).tube([[0.38, 0.72, 0.05], [0.5, 0.86, 0.12], [0.46, 1.08, 0.2], [0.34, 1.2, 0.22]], 0.02, CHROME, 6);
  // label facing the runner
  b.pbr(0.5, 0.4).rbox(0.36, 0.36, 0.05, 0.02, 0x0c1a22, 0, 0.72, 0.35);
  b.pbr(0.4, 0, 2.6).quad(0.32, 0.32, R.n2, 0, 0.72, 0.378);
  return b;
}

// ---------- decoration (built for the left side of the hall, facing +x) ----------

// Check-in desk with baggage belt, screen, number lightbox and small things on the counter. n = counter number 1..3.
export function checkinDesk(R, n = 1) {
  const b = new Builder();
  // counter: slatted wood front, stone top, lit kick strip
  b.pbr(0.6, 0).box(0.85, 1.02, 1.9, 0xffffff, 0, 0.56, 0, 0, 0, 0, R.slats);
  b.pbr(0.25, 0).rbox(1.0, 0.06, 2.05, 0.02, 0xf2ece2, 0.03, 1.1, 0);
  b.pbr(0.5, 0, 4).box(0.03, 0.05, 1.86, 0xffb347, 0.44, 0.07, 0);
  b.pbr(0.5, 0, 2.5).box(0.02, 0.03, 1.9, 0xffd08a, 0.5, 1.05, 0);
  // screen, keyboard, label printer, pen cup, sign holder
  b.pbr(0.4, 0.3).box(0.05, 0.36, 0.5, DARK, -0.12, 1.4, -0.45, 0.25).cyl(0.02, 0.02, 0.14, DARK, -0.14, 1.2, -0.45, 6).cyl(0.1, 0.1, 0.015, DARK, -0.14, 1.14, -0.45, 10);
  b.pbr(0.3, 0, 1.6).quad(0.46, 0.31, R.screen_desk, -0.15, 1.4, -0.44, 0, -PI / 2 + 0.25, 0);
  b.pbr(0.6, 0).box(0.14, 0.02, 0.36, 0x2a2f37, 0.06, 1.14, -0.45).rbox(0.2, 0.14, 0.22, 0.03, 0xe5e7eb, 0.0, 1.2, 0.3).box(0.04, 0.01, 0.16, 0xf8fafc, 0.1, 1.2, 0.3);
  b.cyl(0.04, 0.035, 0.1, 0x0ea5e9, 0.25, 1.18, 0.62, 8).cyl(0.006, 0.006, 0.14, 0xf59e0b, 0.25, 1.26, 0.62, 4, 0.2).cyl(0.006, 0.006, 0.14, 0xef4444, 0.26, 1.26, 0.6, 4, -0.2);
  b.pbr(0.3, 0.2).box(0.02, 0.2, 0.15, 0xf8fafc, 0.36, 1.23, -0.75, 0, 0, 0.2);
  // number lightbox on two posts
  b.pbr(0.3, 1).cyl(0.025, 0.025, 1.6, CHROME, -0.3, 1.9, -0.85, 6).cyl(0.025, 0.025, 1.6, CHROME, -0.3, 1.9, 0.85, 6);
  b.pbr(0.5, 0.2).rbox(0.14, 0.62, 1.9, 0.03, DARK, -0.3, 2.9, 0);
  b.pbr(0.4, 0, 2.4).quad(0.7, 0.56, R['ctr' + n], -0.225, 2.9, 0.5, 0, PI / 2, 0);
  b.pbr(0.4, 0, 2.2).quad(1.0, 0.5, R.neon_gates, -0.225, 2.9, -0.4, 0, PI / 2, 0);
  // baggage belt with scale and a suitcase waiting on it
  b.pbr(0.4, 0.8).box(0.9, 0.34, 1.0, 0x8d99a6, 0.02, 0.17, 1.5, 0, 0, 0, R.metal);
  b.pbr(0.85, 0).box(0.74, 0.03, 0.96, 0x17191d, 0.02, 0.355, 1.5);
  b.pbr(0.5, 0, 3).box(0.04, 0.03, 0.9, 0x4ade80, 0.45, 0.3, 1.5);
  b.merge(suitcase(R, { w: 0.46, h: 0.66, d: 0.26, color: 0x19a37a, stickers: [1, 0], handle: true }), 0.02, 0.37, 1.5, PI / 2 + 0.2);
  // chair behind the desk
  b.pbr(0.8, 0).rbox(0.42, 0.08, 0.42, 0.03, 0x2b3038, -0.85, 0.55, 0.1).rbox(0.07, 0.5, 0.4, 0.03, 0x2b3038, -1.05, 0.84, 0.1);
  b.pbr(0.3, 1).cyl(0.025, 0.025, 0.5, CHROME, -0.85, 0.27, 0.1, 6).cyl(0.2, 0.22, 0.03, CHROME, -0.85, 0.02, 0.1, 10);
  return b;
}

// Self check-in kiosk with a glowing screen.
export function kiosk(R) {
  const b = new Builder();
  b.pbr(0.35, 0.7).rbox(0.36, 1.25, 0.56, 0.05, 0xe8edf2, 0, 0.66, 0, 0, 0, 0, R.metal).rbox(0.5, 0.06, 0.66, 0.02, 0x2b3038, 0, 0.03, 0);
  b.pbr(0.4, 0.2).rbox(0.1, 0.62, 0.58, 0.03, DARK, 0.12, 1.5, 0, 0, 0, -0.3);
  b.pbr(0.25, 0, 2.2).quad(0.5, 0.56, R.screen_kiosk, 0.19, 1.52, 0, 0, PI / 2, 0, 0xffffff);
  b.pbr(0.5, 0, 3).box(0.02, 0.03, 0.4, 0x38e8ff, 0.19, 1.02, 0).box(0.37, 0.02, 0.57, 0xffb347, 0, 0.08, 0);
  b.pbr(0.6, 0).box(0.03, 0.02, 0.24, DARK, 0.185, 0.92, 0).box(0.04, 0.012, 0.2, 0xf8fafc, 0.2, 0.9, 0);          // ticket slot with a boarding pass
  return b;
}

// Queue posts with a retractable belt, n posts along z.
export function queuePosts(R, n = 3, gap = 1.6) {
  const b = new Builder();
  for (let i = 0; i < n; i++) {
    const z = (i - (n - 1) / 2) * gap;
    b.pbr(0.25, 1).cyl(0.03, 0.03, 0.92, CHROME, 0, 0.5, z, 8).cyl(0.17, 0.19, 0.04, 0x8d99a6, 0, 0.02, z, 14).cyl(0.045, 0.045, 0.1, 0x2b3038, 0, 0.99, z, 8);
    if (i < n - 1) b.pbr(0.8, 0).box(0.012, 0.055, gap, 0xb5121b, 0, 0.95, z + gap / 2);
  }
  return b;
}

// Coffee cart with a neon sign, cups and pastries: small-shop feeling.
export function cafeCart(R) {
  const b = new Builder();
  b.pbr(0.6, 0).box(0.9, 0.95, 1.8, 0xffffff, 0, 0.5, 0, 0, 0, 0, R.slats);
  b.pbr(0.3, 0).rbox(1.02, 0.06, 1.95, 0.02, 0xf2e6d0, 0, 1.0, 0, 0, 0, 0, R.planks);
  b.pbr(0.5, 0, 4).box(0.03, 0.04, 1.76, 0xff5fb7, 0.46, 0.06, 0);
  // back shelf wall with goods, roof with awning stripes
  b.pbr(0.7, 0).box(0.12, 2.5, 1.9, 0xffffff, -0.5, 1.25, 0, 0, 0, 0, R.slats);
  b.pbr(0.5, 0, 0.5).quad(1.7, 0.85, R.goods, -0.435, 1.75, 0, 0, PI / 2, 0);
  b.pbr(0.7, 0).box(1.25, 0.06, 2.1, 0x3b2416, 0.05, 2.52, 0);
  for (let i = 0; i < 6; i++) b.pbr(0.85, 0).box(0.5, 0.03, 0.35, i % 2 ? 0xf2e6d0 : 0xb5121b, 0.72, 2.42, -0.875 + i * 0.35, 0, 0, -0.45);
  b.pbr(0.3, 1).cyl(0.02, 0.02, 1.5, CHROME, 0.45, 1.76, -0.9, 6).cyl(0.02, 0.02, 1.5, CHROME, 0.45, 1.76, 0.9, 6);
  b.pbr(0.4, 0, 3.2).quad(0.9, 0.45, R.neon_cafe, 0.47, 2.2, 0, 0, PI / 2, 0);
  // espresso machine, cup stacks, pastry dome, jar
  b.pbr(0.25, 1).rbox(0.4, 0.38, 0.5, 0.04, 0xcfd6dd, -0.15, 1.22, -0.5, 0, 0, 0, R.metal);
  b.pbr(0.5, 0, 2).box(0.02, 0.05, 0.2, 0xffb347, 0.055, 1.3, -0.5);
  for (let i = 0; i < 4; i++) b.pbr(0.7, 0).cyl(0.045, 0.035, 0.1 + (i % 2) * 0.06, i % 2 ? 0xf8fafc : 0x8a4b2a, 0.22, 1.08 + (i % 2) * 0.03, -0.15 + i * 0.12, 8);
  b.pbr(0.85, 0).sph(0.05, 0xd9a05b, 0.1, 1.08, 0.5, 6, 4).sph(0.05, 0xc98a45, 0.2, 1.08, 0.42, 6, 4).sph(0.05, 0xd9a05b, 0.16, 1.14, 0.47, 6, 4).cyl(0.2, 0.2, 0.02, 0xf8fafc, 0.15, 1.04, 0.46, 12);
  b.pbr(0.5, 0, 0.3).cyl(0.07, 0.07, 0.18, 0xffe9a8, 0.28, 1.12, 0.75, 10);
  // string of bulbs along the roof edge
  for (let i = 0; i < 9; i++) b.pbr(0.4, 0, 7).sph(0.035, 0xffd9a0, 0.66, 2.34 - Math.sin((i / 8) * PI) * 0.1, -0.96 + i * 0.24, 6, 4);
  return b;
}

// Row of waiting seats on a steel beam (faces +x).
export function seats(R, n = 4, color = 0x1d6f9c) {
  const b = new Builder();
  const len = n * 0.58;
  b.pbr(0.3, 1).box(0.08, 0.06, len, CHROME, 0, 0.36, 0, 0, 0, 0, R.metal);
  for (const z of [-len / 2 + 0.2, len / 2 - 0.2]) b.box(0.05, 0.36, 0.05, CHROME, 0, 0.18, z).box(0.5, 0.03, 0.06, CHROME, 0, 0.015, z);
  for (let i = 0; i < n; i++) {
    const z = (i - (n - 1) / 2) * 0.58;
    b.pbr(0.75, 0).rbox(0.48, 0.07, 0.5, 0.03, color, 0.02, 0.45, z, 0, 0, 0, R.fabric).rbox(0.07, 0.52, 0.5, 0.03, color, -0.24, 0.74, z, 0, 0, 0.15, R.fabric);
    b.pbr(0.3, 1).box(0.4, 0.025, 0.035, CHROME, 0.02, 0.62, z + 0.29);
  }
  return b;
}

// Big plant in a concrete pot.
export function plant() {
  const b = new Builder();
  b.pbr(0.9, 0).cyl(0.34, 0.26, 0.6, 0x8b8f94, 0, 0.3, 0, 12).cyl(0.31, 0.31, 0.03, 0x2a1c12, 0, 0.59, 0, 12);
  b.pbr(0.8, 0).cyl(0.03, 0.045, 0.7, 0x5b3a22, 0, 0.9, 0, 6);
  const G = [0x1f7a3a, 0x2f9e4f, 0x176b32, 0x3bb062];
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4, r = 0.18 + (i % 3) * 0.12, y = 1.05 + (i % 4) * 0.22;
    b.pbr(0.55, 0).sph(0.3, G[i % 4], Math.cos(a) * r, y, Math.sin(a) * r, 7, 5, 1, 0.42, 0.62 + (i % 2) * 0.3);
  }
  return b;
}

// Trash and recycling bins.
export function bins(R) {
  const b = new Builder();
  const colsB = [0x2f9e4f, 0x1d6f9c, 0xf2b705];
  colsB.forEach((c, i) => {
    b.pbr(0.3, 0.9).rbox(0.34, 0.8, 0.34, 0.04, 0xcfd6dd, 0, 0.4, (i - 1) * 0.38, 0, 0, 0, R.metal);
    b.pbr(0.6, 0).box(0.35, 0.1, 0.35, c, 0, 0.78, (i - 1) * 0.38).box(0.2, 0.05, 0.02, DARK, 0.13, 0.66, (i - 1) * 0.38, PI / 2);
  });
  return b;
}

// Low-poly airliner, nose towards -x, about 30 m long. Plain white with a coloured tail (takes the instance tint), no markings.
export function airliner(R) {
  const b = new Builder();
  const T = THREE;
  b.pbr(0.35, 0.1).add(new T.CapsuleGeometry(1.9, 24, 6, 14), 0xf4f6f8, 0, 4.2, 0, 0, 0, PI / 2);
  b.pbr(0.3, 0, 0.9).quad(22, 0.55, R.windows, 0, 4.7, 1.86, 0, 0, 0).quad(22, 0.55, R.windows, 0, 4.7, -1.86, 0, PI, 0);
  b.pbr(0.2, 0.3).sph(1.0, 0x16202e, -12.6, 4.75, 0, 8, 6, 1.3, 0.5, 1.25);                    // cockpit glass
  b.pbr(0.4, 0.2).tint(1).box(5.2, 5.6, 0.3, 0xffffff, 11.6, 8.2, 0, 0, 0, -0.55).tint(0);    // tail fin
  b.box(3.4, 0.22, 9, 0xe6eaee, 12, 5.0, 0);                                                   // tail planes
  for (const s of [-1, 1]) {
    b.pbr(0.4, 0.2).box(5.6, 0.34, 14, 0xe6eaee, 1.2 + 2.6, 3.5, s * 8.2, s * -0.36);         // wings, swept back
    b.pbr(0.3, 0.6).cyl(1.0, 0.85, 3.4, 0xcfd6dd, 0.2, 2.5, s * 5.6, 12, 0, PI / 2);          // engines
    b.pbr(0.4, 0.1).cyl(0.72, 0.72, 0.2, 0x16202e, -1.52, 2.5, s * 5.6, 12, 0, PI / 2);
    b.pbr(0.5, 0, 6).sph(0.16, s > 0 ? 0x4dff88 : 0xff4d4d, 5.6, 3.7, s * 15, 6, 4);          // wing-tip lights
    b.pbr(0.7, 0).cyl(0.5, 0.5, 0.4, RUBBER, 2, 0.5, s * 2.6, 10, PI / 2).box(0.2, 2.2, 0.2, CHROME, 2, 1.6, s * 2.6);
  }
  b.pbr(0.7, 0).cyl(0.42, 0.42, 0.4, RUBBER, -9.5, 0.42, 0, 10, PI / 2).box(0.16, 2.0, 0.16, CHROME, -9.5, 1.4, 0);
  b.pbr(0.5, 0, 8).sph(0.2, 0xff5a4d, 0, 6.2, 0, 6, 4);                                        // beacon
  return b;
}

// Baggage tug pulling two loaded dollies (drives along z).
export function tugTrain(R) {
  const b = new Builder();
  b.pbr(0.45, 0.2).rbox(1.5, 0.8, 2.4, 0.12, 0xf2b705, 0, 0.7, 0).rbox(1.3, 0.7, 1.0, 0.08, 0x20242b, 0, 1.4, 0.5);
  b.pbr(0.2, 0.2, 0.6).box(1.1, 0.45, 0.04, 0x9fd8ff, 0, 1.45, -0.02);
  b.pbr(0.5, 0, 7).sph(0.1, 0xffe9a8, -0.5, 0.75, -1.2, 6, 4).sph(0.1, 0xffe9a8, 0.5, 0.75, -1.2, 6, 4).sph(0.1, 0xff8a1f, 0, 1.82, 0.5, 6, 4);
  for (const sx of [-1, 1]) for (const z of [-0.75, 0.75]) b.pbr(0.8, 0).cyl(0.34, 0.34, 0.26, RUBBER, sx * 0.7, 0.34, z, 10, 0, PI / 2);
  for (let k = 0; k < 2; k++) {
    const z0 = 3.4 + k * 3.5;
    b.pbr(0.5, 0.5).box(1.7, 0.14, 2.9, 0x4b5563, 0, 0.6, z0).box(0.08, 0.08, 0.7, 0x4b5563, 0, 0.55, z0 - 1.75);
    for (const sx of [-1, 1]) for (const z of [-1, 1]) b.pbr(0.8, 0).cyl(0.26, 0.26, 0.18, RUBBER, sx * 0.75, 0.26, z0 + z, 8, 0, PI / 2);
    const colsS = [0xd9342b, 0x1f5fbf, 0x19a37a, 0x6d3fc4, 0xf97316, 0x2b3038];
    for (let i = 0; i < 6; i++) b.pbr(0.5, 0).rbox(0.7, 0.42 + (i % 3) * 0.08, 0.8, 0.05, colsS[(i + k * 2) % 6], (i % 2 ? 0.4 : -0.4), 0.9 + (i > 3 ? 0.45 : 0), z0 - 0.9 + ((i >> 1) % 2) * 0.9 + (i > 3 ? 0.4 : 0));
  }
  return b;
}
