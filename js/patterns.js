// Obstacle pattern generator. Pure module (no three.js) so it can be tested in node.
//
// The track is a list of rows. Every row has one "safe" lane that is guaranteed passable:
// it is empty, or holds an obstacle that one action (jump or slide) clears.
// Guarantees, checked by tools/test-patterns.mjs:
//   1. the safe lane of a row is reachable in time from the safe lane of the row before it
//   2. walking passengers never enter the safe lane of their row
//   3. refill stations sit in the safe lane, and the time between them is shorter than a full tank
//   4. two rows that both need an action on the safe lane are far enough apart to do both
import { difficulty, speedAt, tankSeconds, lerp, PLAYER } from './config.js';

// kind: block = must change lane, low = jump over, high = slide under
export const OB = {
  cart:      { kind: 'block', hw: 0.8,  hl: 1.15, y0: 0,    y1: 1.9 },
  tall:      { kind: 'block', hw: 0.8,  hl: 0.5,  y0: 0,    y1: 3.0 },
  barrier:   { kind: 'low',   hw: 0.95, hl: 0.3,  y0: 0,    y1: 0.72 },
  pile:      { kind: 'low',   hw: 0.85, hl: 0.45, y0: 0,    y1: 0.75 },
  sign:      { kind: 'high',  hw: 0.95, hl: 0.2,  y0: 1.25, y1: 2.4 },
  bar:       { kind: 'high',  hw: 0.95, hl: 0.2,  y0: 1.15, y1: 1.7 },
  passenger: { kind: 'block', hw: 0.32, hl: 0.32, y0: 0,    y1: 1.75 },
  traveler:  { kind: 'block', hw: 0.6,  hl: 0.45, y0: 0,    y1: 1.8 },   // standing passenger with a big trolley bag
  cone:      { kind: 'low',   hw: 0.85, hl: 0.3,  y0: 0,    y1: 0.7 },   // wet floor sign and cones
  rope:      { kind: 'low',   hw: 0.95, hl: 0.2,  y0: 0,    y1: 0.75 }   // queue posts with a belt
};

export const MAX_HL = 1.15;           // longest obstacle half length
export const SHIFT_TIME = 0.16;       // time budget for moving one lane
export const REACT_TIME = 0.12;       // extra margin on top of the lane move
export const ACTION_GAP = 0.72;       // min seconds between two rows that both need jump/slide

const BLOCKS = ['cart', 'cart', 'cart', 'tall', 'tall', 'traveler', 'traveler', 'barrier', 'pile', 'cone', 'rope', 'sign', 'bar'];
const WALLS = ['cart', 'tall', 'traveler'];                      // only passable by changing lane
const EASY = ['cart', 'pile', 'barrier', 'traveler', 'cone'];
const LOWS = ['barrier', 'pile', 'cone', 'rope'];
const HIGHS = ['sign', 'bar'];
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// Time the player has to change lanes between two rows that are `gap` metres apart.
export function switchWindow(gap, v) {
  return (gap - 2 * MAX_HL - 2 * PLAYER.hd) / v;
}

export function createGenerator(rng = Math.random, startS = 30) {
  const st = { s: startS, safe: 1, prevAction: false, forceShift: false, tStation: 0, nextStation: 8, index: 0 };

  function next() {
    const d = difficulty(st.s);
    const v = speedAt(st.s);
    let gapT = lerp(0.9, 0.5, d) * (0.9 + rng() * 0.4);
    if (st.prevAction) gapT = Math.max(gapT, ACTION_GAP);
    const gap = Math.max(gapT * v, 9);
    const prevS = st.s;
    const s = prevS + gap;
    const realT = gap / v;
    const win = switchWindow(gap, v);

    let maxShift = 2;
    while (maxShift > 0 && win < maxShift * SHIFT_TIME + REACT_TIME) maxShift--;

    const row = { index: st.index, s, gap, gapT: realT, safe: st.safe, safeKind: 'none', combo: false, cells: [null, null, null], walk: null, station: false, coins: [] };
    let forceShift = false;

    // refill station due?
    st.tStation += realT;
    if (st.tStation >= st.nextStation) {
      row.station = true;
      st.tStation = 0;
      st.nextStation = lerp(9, 11, d) * (0.9 + rng() * 0.3);
    }

    const pWalk = s > 60 ? lerp(0.12, 0.18, d) : 0;
    const walkLanes = [0, 2].filter((l) => Math.abs(l - st.safe) <= maxShift);
    if (rng() < pWalk && walkLanes.length) {
      // a passenger crossing two lanes; the third lane is the safe one
      row.safe = pick(rng, walkLanes);
      const a = row.safe === 0 ? 1 : 0;
      row.cells[a] = 'walk';
      row.cells[a + 1] = 'walk';
      row.walk = { a, b: a + 1, phase: rng(), dir: rng() < 0.5 ? -1 : 1, speed: lerp(0.7, 1.3, d) };
    } else {
      let shift = Math.round((rng() * 2 - 1) * maxShift);
      if (st.forceShift && maxShift > 0 && shift === 0) shift = rng() < 0.5 ? -1 : 1;     // second half of a combo: act, then switch
      row.safe = st.safe + shift;
      if (row.safe < 0 || row.safe > 2) row.safe = st.safe - shift;
      row.safe = Math.min(2, Math.max(0, row.safe));
      const early = st.index < 2;
      // combo: a full-width wall with one jump/slide gap, and the row after it forces a lane change
      const combo = !early && !row.station && rng() < lerp(0.2, 0.42, d);
      const pBlock = early ? 0 : lerp(0.72, 0.96, d);
      let blocked = 0;
      for (let l = 0; l < 3; l++) {
        if (l === row.safe) continue;
        if (combo) { row.cells[l] = pick(rng, WALLS); blocked++; }
        else if (rng() < pBlock) { row.cells[l] = pick(rng, BLOCKS); blocked++; }
      }
      if (!blocked) {
        const others = [0, 1, 2].filter((l) => l !== row.safe);
        row.cells[pick(rng, others)] = early ? pick(rng, EASY) : pick(rng, BLOCKS);
      }
      const pAct = early ? 0 : lerp(0.28, 0.55, d);
      if (!row.station && (combo || rng() < pAct)) {
        const high = rng() < 0.45;
        row.cells[row.safe] = pick(rng, high ? HIGHS : LOWS);
        row.safeKind = high ? 'high' : 'low';
      }
      row.combo = combo;
      forceShift = combo;
    }

    // coins along the safe lane, leading into the row
    if (rng() < 0.7) {
      const n = 4 + Math.floor(rng() * 3);
      const step = 1.6;
      const end = row.station ? s - 2.4 : s + (row.safeKind === 'none' ? step : 0);
      const reach = v * 0.26;
      for (let i = 0; i < n; i++) {
        const cs = end - i * step;
        if (cs < prevS + MAX_HL + 1.2) break;
        const dz = Math.abs(cs - s);
        let y = 0.9;
        if (row.safeKind === 'low' && dz < reach) y = 0.9 + 1.15 * (1 - (dz / reach) * (dz / reach));
        if (row.safeKind === 'high' && dz < 2.2) y = 0.45;
        row.coins.push({ lane: row.safe, s: cs, y });
      }
    }

    st.s = s;
    st.safe = row.safe;
    st.prevAction = row.safeKind !== 'none';
    st.forceShift = forceShift;
    st.index++;
    return row;
  }

  return { next, get s() { return st.s; } };
}

// Checks one row against the guarantees. Returns a list of problems (empty = fine).
export function checkRow(row, prev) {
  const bad = [];
  const cell = row.cells[row.safe];
  if (cell) {
    if (cell === 'walk' || OB[cell].kind === 'block') bad.push('safe lane blocked');
    if (row.station) bad.push('station on an obstacle');
  }
  if (row.walk && (row.walk.a === row.safe || row.walk.b === row.safe)) bad.push('passenger in safe lane');
  if (prev) {
    const v = speedAt(prev.s);
    const shift = Math.abs(row.safe - prev.safe);
    if (shift && switchWindow(row.s - prev.s, v) < shift * SHIFT_TIME + REACT_TIME) bad.push('safe lane not reachable');
    if (prev.safeKind !== 'none' && row.safeKind !== 'none' && (row.s - prev.s) / v < ACTION_GAP - 1e-9) bad.push('two actions too close');
  }
  for (const c of row.coins) {
    if (prev && c.s < prev.s + MAX_HL + 1.2 - 1e-9) bad.push('coin inside previous row');
    if (c.lane !== row.safe) bad.push('coin off the safe lane');
  }
  return bad;
}

export { tankSeconds };
