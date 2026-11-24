// Shared tuning values. Pure module (no three.js), also used by the node test of the generator.
export const LANES = [-2, 0, 2];
export const ZONE_LEN = 500;

export const PLAYER = {
  hw: 0.3,          // half width
  hd: 0.3,          // half depth
  standH: 1.7,
  slideH: 0.75,
  jumpV: 8.5,
  gravity: 30,
  slideTime: 0.7,
  laneRate: 26      // how fast the courier slides sideways to the target lane (was 14; owner felt a delay)
};

export const lerp = (a, b, t) => a + (b - a) * t;

// 0 at the start, creeps towards 1 (about 0.25 at 500 m, 0.67 at 2 km, 0.9 at 4 km).
export function difficulty(s) {
  return 1 - Math.exp(-Math.max(0, s) / 1800);
}

// Running speed in m/s at distance s: 14.5 at the start, about 17 at 500 m, 22 at 2 km, 26 at the limit.
export const SPEED_MIN = 14.5, SPEED_MAX = 26;
export function speedAt(s) {
  return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * difficulty(s);
}

// Seconds a full tank lasts at distance s.
export function tankSeconds(s) {
  return lerp(24, 16, difficulty(s));
}

export function zoneIndexAt(s) {
  return Math.floor(Math.max(0, s) / ZONE_LEN) % 4;
}

// Small seeded random generator, so a run can be replayed in tests.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
