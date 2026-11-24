// More prop models: the obstacles of the game (sized to the hit boxes in patterns.js) and the
// decoration of the security, duty free and gates zones. Same rules as models.js.
import * as THREE from '../../vendor/three.module.min.js';
import { Builder } from './geo.js';
import { suitcase, duffel, person } from './models.js';

const CHROME = 0xdfe5ea, DARK = 0x1b1f26, RUBBER = 0x15171b, STEEL = 0x2a2420;
const PI = Math.PI;

// turns a builder so that what stood up along y lies back along -z (front faces up)
function laid(src) {
  const o = new Builder();
  for (let i = 0; i < src.p.length; i += 3) { o.p.push(src.p[i], src.p[i + 2], -src.p[i + 1]); o.n.push(src.n[i], src.n[i + 2], -src.n[i + 1]); }
  o.c = src.c; o.uv = src.uv; o.pbrA = src.pbrA; o.fxA = src.fxA;
  return o;
}

// ---------- obstacles (the runner sees the +z side) ----------

// Information totem: blocks the lane. 1.5 wide, 3 m tall.
export function totem(R) {
  const b = new Builder();
  b.pbr(0.35, 0.6).rbox(1.5, 2.9, 0.8, 0.08, 0x1f2a30, 0, 1.5, 0).rbox(1.64, 0.14, 0.94, 0.04, 0x11181c, 0, 0.07, 0).rbox(1.6, 0.1, 0.9, 0.04, 0x11181c, 0, 2.98, 0);
  b.pbr(0.3, 0, 1.9).quad(1.2, 1.6, R.info_i, 0, 2.0, 0.405).quad(1.2, 1.6, R.info_i, 0, 2.0, -0.405, 0, PI, 0);
  b.pbr(0.3, 0, 1.5).quad(1.2, 0.8, R.screen_desk, 0, 0.72, 0.405);
  b.pbr(0.5, 0, 4).box(1.52, 0.04, 0.82, 0x2dd4bf, 0, 1.16, 0).box(0.04, 2.7, 0.04, 0x2dd4bf, -0.74, 1.55, 0.4).box(0.04, 2.7, 0.04, 0x2dd4bf, 0.74, 1.55, 0.4);
  return b;
}

// Low red and white barrier with warning lamps: jump over. 1.9 wide, 0.72 high.
export function barrier(R) {
  const b = new Builder();
  for (let k = 0; k < 6; k++) b.pbr(0.45, 0, k % 2 ? 0.15 : 0).rbox(0.32, 0.34, 0.09, 0.02, k % 2 ? 0xf8fafc : 0xd9342b, -0.8 + k * 0.32, 0.5, 0);
  b.pbr(0.5, 0.3).box(1.92, 0.05, 0.07, 0x3b4048, 0, 0.3, 0);
  for (const x of [-0.9, 0.9]) {
    b.pbr(0.6, 0.3).rbox(0.1, 0.7, 0.12, 0.03, 0x3b4048, x, 0.35, 0).rbox(0.14, 0.06, 0.6, 0.02, 0x23272e, x, 0.03, 0);
    b.pbr(0.4, 0, 7).sph(0.06, 0xffb347, x, 0.74, 0, 8, 5);
  }
  return b;
}

// Pile of luggage on the floor: jump over. 1.7 wide, 0.75 high.
export function pile(R) {
  const b = new Builder();
  b.merge(laid(suitcase(R, { w: 0.62, h: 0.8, d: 0.34, color: 0x1f5fbf, stickers: [0, 4, 1], wheels: false, guards: false })), -0.42, 0.17, 0.4, 0.18);
  b.merge(laid(suitcase(R, { w: 0.56, h: 0.74, d: 0.3, color: 0xd9342b, stickers: [2, 3], wheels: false, guards: false })), 0.44, 0.15, 0.36, -0.12);
  b.merge(laid(suitcase(R, { w: 0.5, h: 0.66, d: 0.24, color: 0xf2b705, stickers: [5, 0], wheels: false, guards: false })), -0.05, 0.47, 0.3, 0.5);
  b.merge(duffel(R, 0x2f6f4f, 0.6, 0.14), 0.5, 0.31, -0.02, 0.9);
  return b;
}

// Hanging direction sign: slide under. Bottom edge at 1.25 m.
export function hangSign(R) {
  const b = new Builder();
  b.pbr(0.4, 0.5).rbox(1.9, 1.08, 0.16, 0.04, 0x0b1730, 0, 1.82, 0);
  b.pbr(0.3, 0, 1.9).quad(1.8, 0.98, R.hang_gates, 0, 1.82, 0.085).quad(1.8, 0.98, R.hang_gates, 0, 1.82, -0.085, 0, PI, 0);
  b.pbr(0.5, 0, 4.5).box(1.9, 0.045, 0.18, 0xffb347, 0, 1.262, 0);
  for (const x of [-0.8, 0.8]) b.pbr(0.3, 0.9).cyl(0.02, 0.02, 6.6, CHROME, x, 5.66, 0, 5);
  return b;
}

// Yellow and black bar on two posts: slide under. Bar between 1.15 and 1.7 m.
export function hazardBar(R) {
  const b = new Builder();
  b.pbr(0.5, 0).rbox(1.86, 0.5, 0.12, 0.03, 0xffffff, 0, 1.43, 0, 0, 0, 0, R.hazard);
  for (const x of [-0.95, 0.95]) {
    b.pbr(0.3, 0.9).cyl(0.06, 0.06, 1.75, 0x8d99a6, x, 0.875, 0, 10).cyl(0.2, 0.24, 0.08, 0x3b4048, x, 0.04, 0, 12);
    b.pbr(0.4, 0, 7).sph(0.07, 0xffb347, x, 1.8, 0, 8, 5);
  }
  return b;
}

// Passenger standing with a big case, checking the phone: blocks the lane.
export function traveler(R) {
  const b = new Builder();
  b.merge(person(R, { extra: 'none', swing: 0, pants: 0x3b4252, skin: 0xd9a47a, hair: 0x2a1a10, style: 'side', glasses: true }), -0.24, 0, 0, PI);
  b.merge(suitcase(R, { w: 0.52, h: 0.78, d: 0.3, color: 0x7c3aed, stickers: [1, 2, 0], handle: true }), 0.3, 0, 0.05, 0.1);
  b.pbr(0.3, 0.3, 0.9).rbox(0.07, 0.13, 0.012, 0.01, 0x9fd8ff, -0.2, 1.22, 0.3, 0, -0.5);
  return b;
}

// Wet floor sign with two cones: jump over. 1.7 wide, 0.7 high.
export function cones(R) {
  const b = new Builder();
  for (const s of [-1, 1]) { b.pbr(0.5, 0).box(0.5, 0.68, 0.03, 0xfacc15, 0, 0.33, s * 0.13, 0, s * 0.18, 0); b.quad(0.44, 0.55, R.wet, 0, 0.34, s * 0.152, s * 0.18 + (s < 0 ? 0 : 0), s < 0 ? PI : 0, 0); }
  b.pbr(0.5, 0).box(0.5, 0.03, 0.08, 0x23272e, 0, 0.675, 0);
  for (const x of [-0.62, 0.62]) {
    b.pbr(0.6, 0).rbox(0.36, 0.04, 0.36, 0.02, 0xea580c, x, 0.02, 0).cyl(0.035, 0.15, 0.56, 0xf97316, x, 0.32, 0, 12);
    b.pbr(0.5, 0, 0.5).cyl(0.085, 0.108, 0.1, 0xf8fafc, x, 0.36, 0, 12);
  }
  return b;
}

// Two queue posts with a belt across the lane: jump over.
export function rope(R) {
  const b = new Builder();
  for (const x of [-0.9, 0.9]) b.pbr(0.25, 1).cyl(0.03, 0.03, 0.7, CHROME, x, 0.38, 0, 8).cyl(0.17, 0.19, 0.04, 0x8d99a6, x, 0.02, 0, 14).cyl(0.045, 0.045, 0.09, 0x2b3038, x, 0.72, 0, 8);
  b.pbr(0.8, 0).box(1.8, 0.07, 0.012, 0xb5121b, 0, 0.69, 0);
  return b;
}

// ---------- security zone decoration (left side, facing +x) ----------

// X-ray machine with roller conveyor, trays and a walk-through arch.
export function scanner(R) {
  const b = new Builder();
  b.pbr(0.4, 0.6).box(0.95, 0.5, 4.4, 0x9aa7b4, 0, 0.45, 0, 0, 0, 0, R.steelpanel);                       // conveyor body
  b.pbr(0.3, 0.9); for (let i = 0; i < 16; i++) b.cyl(0.04, 0.04, 0.8, CHROME, 0, 0.74, -2.0 + i * 0.27, 6, 0, PI / 2);
  b.pbr(0.45, 0.5).rbox(1.2, 1.1, 1.5, 0.08, 0x2f3a45, 0, 1.3, 0.2, 0, 0, 0, R.steelpanel);              // x-ray tunnel
  b.pbr(0.9, 0).box(0.8, 0.5, 0.03, 0x15171b, 0, 1.0, -0.56).box(0.8, 0.5, 0.03, 0x15171b, 0, 1.0, 0.96);
  b.pbr(0.5, 0, 4).box(1.22, 0.04, 1.52, 0x4da3ff, 0, 1.88, 0.2);
  b.pbr(0.3, 0, 1.8).quad(0.6, 0.4, R.screen_xray, 0.62, 1.5, 0.2, 0, PI / 2, 0);
  for (const z of [-1.5, 1.7]) { b.pbr(0.5, 0.1).rbox(0.6, 0.1, 0.44, 0.03, 0x64748b, 0, 0.83, z); b.pbr(0.6, 0).rbox(0.3, 0.14, 0.24, 0.03, z < 0 ? 0xd9342b : 0x1f5fbf, 0, 0.94, z); }
  // walk-through arch on the lane side
  for (const z of [-0.5, 0.5]) b.pbr(0.4, 0.5).rbox(0.5, 2.2, 0.16, 0.05, 0xe6ebf0, 1.25, 1.1, z + 2.9);
  b.rbox(0.5, 0.2, 1.16, 0.05, 0xe6ebf0, 1.25, 2.3, 2.9);
  b.pbr(0.5, 0, 4).box(0.04, 2.0, 0.04, 0x4ade80, 1.51, 1.1, 2.4).box(0.04, 2.0, 0.04, 0x4ade80, 1.51, 1.1, 3.4).box(0.3, 0.08, 0.5, 0x4da3ff, 1.36, 2.3, 2.9);
  return b;
}

// Table with stacked trays and a glass partition behind.
export function trayTable(R) {
  const b = new Builder();
  b.pbr(0.3, 0.9).box(0.8, 0.05, 1.8, 0xcfd6dd, 0, 0.85, 0, 0, 0, 0, R.metal);
  for (const z of [-0.8, 0.8]) for (const x of [-0.34, 0.34]) b.cyl(0.025, 0.025, 0.84, CHROME, x, 0.42, z, 6);
  for (let i = 0; i < 6; i++) b.pbr(0.55, 0.1).rbox(0.56, 0.06, 0.42, 0.02, i % 2 ? 0x64748b : 0x7b8794, 0.02 * (i % 3), 0.91 + i * 0.062, -0.5);
  b.pbr(0.55, 0.1).rbox(0.56, 0.06, 0.42, 0.02, 0x64748b, 0, 0.91, 0.35);
  b.pbr(0.7, 0).rbox(0.24, 0.1, 0.3, 0.03, 0x3b2416, 0, 0.99, 0.35).cyl(0.035, 0.035, 0.14, 0x38bdf8, 0.16, 0.99, 0.48, 8);
  // glass partition with a lit top rail
  b.pbr(0.3, 0.9).cyl(0.03, 0.03, 2.0, CHROME, -0.75, 1.0, -1.2, 6).cyl(0.03, 0.03, 2.0, CHROME, -0.75, 1.0, 1.2, 6);
  b.pbr(0.08, 0.3, 0.25).box(0.02, 1.5, 2.36, 0x9fd8ff, -0.75, 1.15, 0);
  b.pbr(0.5, 0, 4).box(0.04, 0.04, 2.4, 0x4da3ff, -0.75, 2.0, 0);
  return b;
}

// ---------- duty free decoration ----------

// Shop front: lit shelves full of goods, counter, awning, neon name. v = 0..2.
export function shopUnit(R, v = 0) {
  const b = new Builder();
  const neon = [R.neon_shop1, R.neon_shop2, R.neon_shop3][v], glow = [0xffd76a, 0x38e8ff, 0xff5fb7][v], shelf = v === 1 ? R.goods : R.bottles, poster = v === 2 ? R.poster2 : R.poster1;
  b.pbr(0.5, 0.1).box(0.2, 3.3, 4.4, 0x1a1210, -0.7, 1.65, 0, 0, 0, 0, R.darkwood);
  for (let r = 0; r < 3; r++) b.pbr(0.4, 0, 1.25).quad(3.0, 0.78, shelf, -0.59, 0.75 + r * 0.82, -0.55, 0, PI / 2, 0);
  b.pbr(0.4, 0, 1.6).quad(0.95, 1.27, poster, -0.59, 1.9, 1.6, 0, PI / 2, 0);
  b.pbr(0.5, 0, 4.5).box(0.04, 0.04, 4.3, glow, -0.57, 3.2, 0).box(0.04, 0.04, 4.3, glow, -0.57, 0.3, 0);
  // counter with marble top and display boxes
  b.pbr(0.55, 0).box(0.7, 0.9, 2.4, 0xffffff, 0.15, 0.45, -0.6, 0, 0, 0, R.darkwood);
  b.pbr(0.18, 0).rbox(0.82, 0.06, 2.55, 0.02, 0xffffff, 0.15, 0.93, -0.6, 0, 0, 0, R.marble);
  b.pbr(0.5, 0, 4).box(0.03, 0.04, 2.36, glow, 0.51, 0.06, -0.6);
  const colsG = [0xffd76a, 0xf43f5e, 0x22d3ee, 0xa78bfa, 0xf97316, 0x34d399];
  for (let i = 0; i < 7; i++) b.pbr(0.3, i % 3 === 0 ? 0.6 : 0, i % 2 ? 0.35 : 0).rbox(0.14 + (i % 3) * 0.03, 0.16 + (i % 4) * 0.07, 0.14, 0.03, colsG[(i + v) % 6], 0.12 + (i % 2) * 0.16, 1.05 + (i % 4) * 0.035, -1.6 + i * 0.33);
  // sign board and striped awning
  b.pbr(0.5, 0.2).rbox(0.14, 0.95, 2.5, 0.04, 0x0f0b0a, -0.5, 3.75, 0);
  b.pbr(0.4, 0, 3.4).quad(2.3, 0.9, neon, -0.42, 3.75, 0, 0, PI / 2, 0);
  for (let i = 0; i < 8; i++) b.pbr(0.85, 0).box(0.9, 0.03, 0.55, i % 2 ? 0xf2e6d0 : [0x8a5a1f, 0x0e7490, 0xbe185d][v], 0.0, 3.12, -1.925 + i * 0.55, 0, 0, -0.38);
  return b;
}

// Round perfume island with a tall lit centre piece.
export function island(R) {
  const b = new Builder();
  b.pbr(0.5, 0).cyl(0.95, 0.95, 0.85, 0xffffff, 0, 0.43, 0, 18, 0, 0, 0, R.darkwood);
  b.pbr(0.16, 0).cyl(1.05, 1.05, 0.06, 0xffffff, 0, 0.89, 0, 20, 0, 0, 0, R.marble);
  b.pbr(0.5, 0, 4.5).cyl(0.97, 0.97, 0.04, 0xff4fd8, 0, 0.06, 0, 20);
  b.pbr(0.3, 0, 2.6).cyl(0.26, 0.3, 1.5, 0xffe9c2, 0, 1.68, 0, 12);
  b.pbr(0.3, 0.8).cyl(0.34, 0.34, 0.05, 0xd9a441, 0, 2.45, 0, 12);
  const colsG = [0xffd76a, 0xf472b6, 0x67e8f9, 0xc4b5fd, 0xfda4af, 0xfde68a];
  for (let i = 0; i < 12; i++) { const a = i * PI / 6; b.pbr(0.15, 0.2, 0.3).rbox(0.11, 0.2 + (i % 3) * 0.05, 0.11, 0.03, colsG[i % 6], Math.cos(a) * 0.72, 1.03 + (i % 3) * 0.025, Math.sin(a) * 0.72, a); b.pbr(0.3, 1).cyl(0.025, 0.025, 0.05, 0xd9a441, Math.cos(a) * 0.72, 1.16 + (i % 3) * 0.05, Math.sin(a) * 0.72, 6); }
  return b;
}

// Lit advertising pillar (pictures only, no brands).
export function promo(R) {
  const b = new Builder();
  b.pbr(0.4, 0.5).rbox(0.3, 2.3, 1.1, 0.04, 0x15171b, 0, 1.2, 0).rbox(0.5, 0.08, 1.3, 0.03, 0x23272e, 0, 0.04, 0);
  b.pbr(0.3, 0, 1.8).quad(1.0, 1.9, R.poster1, 0.155, 1.3, 0, 0, PI / 2, 0).quad(1.0, 1.9, R.poster2, -0.155, 1.3, 0, 0, -PI / 2, 0);
  b.pbr(0.5, 0, 4).box(0.32, 0.03, 1.12, 0xff4fd8, 0, 2.36, 0);
  return b;
}

// ---------- gates decoration ----------

// Boarding desk with gate number pylon, screen and belt posts. n = 1..4.
export function gateDesk(R, n = 1) {
  const b = new Builder();
  b.pbr(0.55, 0).box(0.7, 1.05, 1.6, 0xffffff, 0, 0.53, 0, 0, 0, 0, R.oak);
  b.pbr(0.2, 0).rbox(0.82, 0.06, 1.75, 0.02, 0xffffff, 0.02, 1.08, 0, 0, 0, 0, R.marble);
  b.pbr(0.5, 0, 4).box(0.03, 0.05, 1.56, 0x5dff9d, 0.36, 0.07, 0);
  b.pbr(0.4, 0.3).box(0.05, 0.34, 0.48, DARK, -0.1, 1.38, 0.3, 0.25).cyl(0.02, 0.02, 0.12, DARK, -0.12, 1.17, 0.3, 6);
  b.pbr(0.3, 0, 1.6).quad(0.44, 0.29, R.screen_desk, -0.128, 1.38, 0.31, 0, -PI / 2 + 0.25, 0);
  b.pbr(0.6, 0).rbox(0.16, 0.2, 0.1, 0.02, 0x2a2f37, 0.2, 1.2, -0.5);
  // pylon with the gate number, lit
  b.pbr(0.4, 0.6).rbox(0.34, 3.4, 0.9, 0.05, 0x15171b, -0.4, 1.7, -1.6);
  b.pbr(0.3, 0, 2.3).quad(0.82, 0.82, R['gate' + n], -0.225, 2.85, -1.6, 0, PI / 2, 0);
  b.pbr(0.3, 0, 2.0).quad(0.8, 0.4, R.neon_gates, -0.225, 2.15, -1.6, 0, PI / 2, 0);
  b.pbr(0.5, 0, 4).box(0.36, 0.04, 0.92, 0x5dff9d, -0.4, 3.42, -1.6);
  // door to the jet bridge behind
  b.pbr(0.4, 0.5).box(0.12, 2.5, 1.9, 0x23272e, -1.5, 1.25, 1.9);
  b.pbr(0.1, 0.3, 0.5).box(0.05, 2.1, 0.75, 0xffd9a0, -1.42, 1.2, 1.48).box(0.05, 2.1, 0.75, 0xffd9a0, -1.42, 1.2, 2.32);
  b.pbr(0.5, 0, 3.5).box(0.06, 0.08, 1.9, 0x5dff9d, -1.42, 2.56, 1.9);
  return b;
}

// Charging table with stools and glowing sockets.
export function chargeBar(R) {
  const b = new Builder();
  b.pbr(0.3, 0).rbox(0.6, 0.07, 2.4, 0.02, 0xffffff, 0, 1.05, 0, 0, 0, 0, R.oak);
  for (const z of [-1.0, 1.0]) b.pbr(0.3, 1).cyl(0.035, 0.035, 1.02, CHROME, 0, 0.51, z, 6).cyl(0.22, 0.24, 0.03, 0x8d99a6, 0, 0.015, z, 12);
  for (let i = 0; i < 3; i++) {
    const z = -0.75 + i * 0.75;
    b.pbr(0.5, 0, 3).box(0.1, 0.03, 0.1, 0x5dff9d, -0.12, 1.1, z);
    b.pbr(0.7, 0).cyl(0.17, 0.17, 0.06, 0x1d6f9c, 0.55, 0.72, z, 12);
    b.pbr(0.3, 1).cyl(0.025, 0.025, 0.7, CHROME, 0.55, 0.35, z, 6).cyl(0.16, 0.18, 0.025, 0x8d99a6, 0.55, 0.012, z, 10);
  }
  b.pbr(0.4, 0.3, 0.7).rbox(0.2, 0.012, 0.3, 0.005, 0xbfe9ff, 0.05, 1.1, 0.35, 0.3);
  b.pbr(0.7, 0).cyl(0.04, 0.035, 0.11, 0xf8fafc, 0.1, 1.14, -0.4, 8);
  return b;
}

// Floor lamp with a warm globe.
export function lamp() {
  const b = new Builder();
  b.pbr(0.4, 0.8).cyl(0.2, 0.24, 0.04, STEEL, 0, 0.02, 0, 12).cyl(0.02, 0.02, 2.2, STEEL, 0, 1.12, 0, 6);
  b.pbr(0.4, 0, 8).sph(0.17, 0xffd9a0, 0, 2.32, 0, 10, 7);
  return b;
}

// ---------- outside ----------

// Jet bridge from the terminal wall (x = 0) out to the aircraft door (+x).
export function jetBridge(R) {
  const b = new Builder();
  b.pbr(0.5, 0.5).box(13, 2.7, 2.7, 0xc9ccd1, 6.9, 4.4, 0, 0, 0, 0, R.metal).cyl(0.3, 0.3, 3.1, 0x4b5563, 10.5, 1.55, 0, 8).rbox(3.2, 3.1, 3.2, 0.2, 0x8d99a6, 14.2, 4.4, 0);
  b.pbr(0.3, 0, 1.6).box(11.5, 0.6, 2.72, 0xffe2b0, 6.9, 4.7, 0);
  b.pbr(0.8, 0).cyl(0.5, 0.5, 0.4, RUBBER, 10.5, 0.5, 0.6, 10, PI / 2).cyl(0.5, 0.5, 0.4, RUBBER, 10.5, 0.5, -0.6, 10, PI / 2);
  return b;
}

// Apron light mast.
export function mast() {
  const b = new Builder();
  b.pbr(0.5, 0.6).cyl(0.18, 0.26, 16, 0x4b5563, 0, 8, 0, 6).box(0.5, 0.4, 3.2, 0x4b5563, 0, 16, 0);
  b.pbr(0.5, 0, 10).box(0.3, 0.14, 2.8, 0xfff0cf, -0.1, 15.75, 0);
  return b;
}
