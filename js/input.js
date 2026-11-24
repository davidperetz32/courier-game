// Swipes (touch, mouse drag) and keyboard. Calls onAction('left' | 'right' | 'up' | 'down').
// A swipe fires while the finger is still moving, as soon as it passes a small threshold.
export function createInput(el, onAction) {
  const TH = 22;          // px before a swipe counts
  const TH_AGAIN = 34;    // px for a second swipe (another direction) in the same touch
  let sx = 0, sy = 0, id = null, lastDir = null;

  function move(x, y) {
    const dx = x - sx, dy = y - sy;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < (lastDir ? TH_AGAIN : TH)) return;
    const dir = ax > ay ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    sx = x; sy = y;
    if (dir === lastDir) return;      // one long swipe is one action
    lastDir = dir;
    onAction(dir);
  }

  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    id = t.identifier; sx = t.clientX; sy = t.clientY; lastDir = null;
  }, { passive: false });
  el.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === id) move(t.clientX, t.clientY);
    }
  }, { passive: false });
  const end = (e) => { e.preventDefault(); id = null; lastDir = null; };
  el.addEventListener('touchend', end, { passive: false });
  el.addEventListener('touchcancel', end, { passive: false });

  // mouse drag, for desktop testing
  let down = false;
  el.addEventListener('mousedown', (e) => { down = true; sx = e.clientX; sy = e.clientY; lastDir = null; });
  window.addEventListener('mousemove', (e) => { if (down) move(e.clientX, e.clientY); });
  window.addEventListener('mouseup', () => { down = false; lastDir = null; });

  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down'
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') onAction('confirm');
    const a = KEYS[e.code];
    if (a) { e.preventDefault(); if (!e.repeat) onAction(a); }
  });
}
