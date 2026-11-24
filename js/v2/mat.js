// Look of the world: one texture atlas (signs, neon, screens, stickers, wood/metal surfaces),
// one shared PBR material for every prop, the glossy terrazzo floor with a real reflection,
// and the light-probe (environment) that makes metal and gloss catch highlights.
// All textures are painted in code at load time, so there are no downloads.
import * as THREE from '../../vendor/three.module.min.js';
import { ATLAS } from './geo.js';
import { mulberry32 } from '../config.js';

const FONT = 'system-ui, "Segoe UI", "Arial Hebrew", Arial, sans-serif';

// CC0 photo textures (assets/tex, see assets/CREDITS.md). Missing files fall back to the painted versions.
export const TEX_FILES = ['floor_color', 'oak', 'woodwall', 'marble', 'metal', 'plaster', 'fabric'];
export function loadImages(base = 'assets/tex/') {
  return Promise.all(TEX_FILES.map((n) => new Promise((res) => {
    const im = new Image();
    im.onload = () => res([n, im]); im.onerror = () => res([n, null]);
    im.src = base + n + '.jpg';
  }))).then((list) => Object.fromEntries(list));
}

// ---------- atlas ----------
export function createAtlas(renderer, imgs = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = ATLAS;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, ATLAS, ATLAS);
  const rects = {};
  let sx = 0, sy = 0, shelf = 0;
  const PAD = 6;
  // shelf packer: draw(ctx, w, h) paints at the origin
  function slot(name, w, h, draw) {
    if (sx + w + PAD > ATLAS) { sx = 0; sy += shelf + PAD; shelf = 0; }
    if (sy + h > ATLAS) throw new Error('atlas full at ' + name);
    x.save(); x.translate(sx, sy); x.beginPath(); x.rect(0, 0, w, h); x.clip();
    draw(x, w, h);
    x.restore();
    rects[name] = [(sx + 1) / ATLAS, 1 - (sy + h - 1) / ATLAS, (sx + w - 1) / ATLAS, 1 - (sy + 1) / ATLAS];
    sx += w + PAD; shelf = Math.max(shelf, h);
  }
  const rnd = mulberry32(77);
  const text = (ctx, str, px, cx, cy, color, weight = 800, align = 'center') => {
    ctx.font = `${weight} ${px}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    ctx.fillText(str, cx, cy);
  };
  const neon = (ctx, str, px, cx, cy, color, core = '#ffffff') => {
    ctx.font = `800 ${px}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color; ctx.shadowBlur = px * 0.35; ctx.fillStyle = color;
    ctx.fillText(str, cx, cy); ctx.fillText(str, cx, cy);
    ctx.shadowBlur = px * 0.08; ctx.fillStyle = core; ctx.globalAlpha = 0.85;
    ctx.fillText(str, cx, cy);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  };
  const neonFrame = (ctx, w, h, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.shadowColor = color; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.roundRect(12, 12, w - 24, h - 24, 14); ctx.stroke(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowBlur = 0; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
  };

  slot('white', 16, 16, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); });

  // flight board: generic cities, no airlines, neutral statuses only
  slot('board', 640, 352, (g, w, h) => {
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f5b301'; g.fillRect(0, 0, w, 54);
    text(g, 'יציאות', 34, w - 80, 29, '#0b1220');
    text(g, 'DEPARTURES', 28, 130, 29, '#0b1220');
    const rows = [['18:05', 'לונדון', 'London', 'A3', 'עולים למטוס', '#4ade80'], ['18:20', 'פריז', 'Paris', 'A7', 'בזמן', '#e2e8f0'], ['18:40', 'ניו יורק', 'New York', 'B2', 'בזמן', '#e2e8f0'],
      ['18:55', 'רומא', 'Rome', 'A1', 'לשער', '#fbbf24'], ['19:10', 'אתונה', 'Athens', 'B5', 'בזמן', '#e2e8f0'], ['19:30', 'טוקיו', 'Tokyo', 'A9', 'בזמן', '#e2e8f0'], ['19:45', 'ברלין', 'Berlin', 'B1', 'בזמן', '#e2e8f0']];
    rows.forEach((r, i) => {
      const y = 78 + i * 39;
      if (i % 2 === 0) { g.fillStyle = '#131c2e'; g.fillRect(0, y - 19, w, 38); }
      text(g, r[0], 25, 54, y, '#fbbf24', 700);
      text(g, r[2], 23, 124, y, '#f8fafc', 600, 'left');
      text(g, r[1], 24, w - 150, y, '#f8fafc', 600, 'right');
      text(g, r[3], 25, w - 100, y, '#7dd3fc', 800);
      text(g, r[4], 19, w - 14, y, r[5], 700, 'right');
    });
  });

  slot('neon_checkin', 512, 192, (g, w, h) => { g.fillStyle = '#120a06'; g.fillRect(0, 0, w, h); neonFrame(g, w, h, '#ffb347'); neon(g, 'צ׳ק-אין', 88, w / 2, 78, '#ff9a3c', '#fff3d6'); neon(g, 'CHECK-IN', 36, w / 2, 148, '#ffd08a'); });
  slot('neon_dep', 512, 192, (g, w, h) => { g.fillStyle = '#04101a'; g.fillRect(0, 0, w, h); neonFrame(g, w, h, '#38e8ff'); neon(g, 'יציאות', 88, w / 2, 78, '#38e8ff', '#e8fdff'); neon(g, 'DEPARTURES', 34, w / 2, 148, '#9ef3ff'); });
  slot('neon_info', 320, 160, (g, w, h) => { g.fillStyle = '#141002'; g.fillRect(0, 0, w, h); neonFrame(g, w, h, '#ffe04a'); neon(g, 'מידע', 84, w / 2, 84, '#ffe04a', '#fffbe0'); });
  slot('neon_cafe', 320, 160, (g, w, h) => { g.fillStyle = '#160410'; g.fillRect(0, 0, w, h); neonFrame(g, w, h, '#ff5fb7'); neon(g, 'קפה', 92, w / 2, 84, '#ff5fb7', '#ffe6f4'); });
  slot('neon_gates', 512, 128, (g, w, h) => { g.fillStyle = '#06140c'; g.fillRect(0, 0, w, h); neon(g, 'שערים A1-A9  ←', 60, w / 2, 66, '#5dff9d', '#eafff2'); });

  for (let i = 1; i <= 3; i++) slot('ctr' + i, 160, 128, (g, w, h) => {
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb347'; g.fillRect(0, h - 14, w, 14);
    text(g, '0' + i, 84, w / 2, 58, '#fff6e0');
  });

  slot('screen_kiosk', 192, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0e7490'); gr.addColorStop(1, '#155e75'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    text(g, 'צ׳ק-אין עצמי', 26, w / 2, 34, '#ecfeff');
    g.fillStyle = '#ecfeff'; g.beginPath(); g.roundRect(28, 64, w - 56, 62, 12); g.fill(); text(g, 'התחל', 30, w / 2, 96, '#0e7490');
    g.fillStyle = '#67e8f9'; g.beginPath(); g.roundRect(28, 142, 60, 60, 10); g.fill(); g.beginPath(); g.roundRect(104, 142, 60, 60, 10); g.fill();
    g.fillStyle = '#a5f3fc'; g.fillRect(28, 220, w - 56, 8); g.fillRect(28, 236, w - 100, 8);
  });
  slot('screen_desk', 192, 128, (g, w, h) => {
    g.fillStyle = '#0f172a'; g.fillRect(0, 0, w, h); g.fillStyle = '#38bdf8'; g.fillRect(0, 0, w, 22);
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#94a3b8' : '#e2e8f0'; g.fillRect(12, 34 + i * 18, 60 + ((i * 37) % 90), 8); }
    g.fillStyle = '#4ade80'; g.fillRect(w - 50, 96, 38, 20);
  });
  slot('n2', 128, 128, (g, w, h) => {
    g.fillStyle = '#031a24'; g.fillRect(0, 0, w, h);
    neon(g, 'N', 84, 52, 62, '#5eeaff', '#ffffff'); neon(g, '2', 44, 98, 88, '#5eeaff', '#ffffff');
  });
  slot('hazard', 128, 32, (g, w, h) => {
    g.fillStyle = '#facc15'; g.fillRect(0, 0, w, h); g.fillStyle = '#111827';
    for (let i = -2; i < 10; i++) { g.beginPath(); g.moveTo(i * 32, h); g.lineTo(i * 32 + 16, h); g.lineTo(i * 32 + 48, 0); g.lineTo(i * 32 + 32, 0); g.fill(); }
  });
  slot('windows', 256, 24, (g, w, h) => {
    g.fillStyle = '#f1f5f9'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 5 === 2 ? '#fde68a' : '#1e293b'; g.beginPath(); g.roundRect(4 + i * 16, 6, 8, 12, 3); g.fill(); }
  });
  slot('bldg', 256, 96, (g, w, h) => {
    g.fillStyle = '#1a2233'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) for (let j = 0; j < 5; j++) { const v = rnd(); g.fillStyle = v < 0.45 ? '#ffd58a' : v < 0.6 ? '#bfe9ff' : '#273349'; g.fillRect(6 + i * 12.4, 8 + j * 17, 8, 10); }
  });

  // photo surfaces (painted stand-ins when a file is missing)
  const photo = (name, img, size, fallback, post) => slot(name, size, size, (g, w, h) => {
    if (img) g.drawImage(img, 0, 0, w, h); else { g.fillStyle = fallback; g.fillRect(0, 0, w, h); }
    if (post) post(g, w, h);
  });
  photo('oak', imgs.oak, 256, '#c08a52');
  photo('darkwood', imgs.woodwall, 256, '#3a2416');
  photo('marble', imgs.marble, 256, '#d9c9a6');
  photo('plate', imgs.metal, 256, '#5b5a48');
  photo('plaster', imgs.plaster, 256, '#b9b4ad', (g, w, h) => {
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#f0d9b8'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,30,10,0.22)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,24,12,0.55)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
  });
  photo('gingham', imgs.fabric, 128, '#c8423c');
  photo('steelpanel', imgs.plaster, 256, '#8d99a6', (g, w, h) => {          // cool brushed panel for the security zone
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#9fb4c8'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(255,255,255,${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * w - 30, rnd() * h, 30 + rnd() * 90, 1); }
    g.fillStyle = 'rgba(10,20,30,0.6)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
    g.fillStyle = '#d5dde5'; for (const [bx, by] of [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]]) { g.beginPath(); g.arc(bx, by, 3.5, 0, 7); g.fill(); }
  });

  // more signs
  slot('neon_security', 512, 192, (g, w, h) => { g.fillStyle = '#030c18'; g.fillRect(0, 0, w, h); neonFrame(g, w, h, '#4da3ff'); neon(g, 'בידוק ביטחוני', 70, w / 2, 78, '#4da3ff', '#eaf4ff'); neon(g, 'SECURITY', 36, w / 2, 148, '#9cc9ff'); });
  slot('neon_duty', 512, 192, (g, w, h) => { g.fillStyle = '#16040f'; g.fillRect(0, 0, w, h); neonFrame(g, w, h, '#ff4fd8'); neon(g, 'דיוטי פרי', 84, w / 2, 78, '#ff4fd8', '#ffe9fb'); neon(g, 'DUTY FREE', 36, w / 2, 148, '#ffd76a', '#fff7dc'); });
  slot('neon_gatesbig', 512, 192, (g, w, h) => { g.fillStyle = '#04140b'; g.fillRect(0, 0, w, h); neonFrame(g, w, h, '#5dff9d'); neon(g, 'שערי עלייה', 80, w / 2, 78, '#5dff9d', '#eafff2'); neon(g, 'GATES', 36, w / 2, 148, '#b7ffd4'); });
  slot('neon_shop1', 320, 128, (g, w, h) => { g.fillStyle = '#140a02'; g.fillRect(0, 0, w, h); neon(g, 'בשמים', 78, w / 2, 66, '#ffd76a', '#fff7dc'); });
  slot('neon_shop2', 320, 128, (g, w, h) => { g.fillStyle = '#04121a'; g.fillRect(0, 0, w, h); neon(g, 'שוקולד', 74, w / 2, 66, '#38e8ff', '#e8fdff'); });
  slot('neon_shop3', 320, 128, (g, w, h) => { g.fillStyle = '#160410'; g.fillRect(0, 0, w, h); neon(g, 'מתנות', 78, w / 2, 66, '#ff5fb7', '#ffe6f4'); });
  ['A1', 'A2', 'A3', 'A4'].forEach((t, i) => slot('gate' + (i + 1), 192, 192, (g, w, h) => {
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h); g.fillStyle = '#f5b301'; g.fillRect(0, 0, w, 44);
    text(g, 'שער · GATE', 24, w / 2, 23, '#0d1117'); text(g, t, 104, w / 2, 118, '#fff6e0');
  }));
  slot('hang_gates', 384, 192, (g, w, h) => {                               // the sign you slide under
    g.fillStyle = '#10233f'; g.fillRect(0, 0, w, h); g.fillStyle = '#f5b301'; g.fillRect(0, h - 26, w, 26);
    text(g, '↑', 110, 62, 84, '#ffffff'); text(g, 'שערים', 62, 250, 58, '#ffffff'); text(g, 'Gates A-B', 34, 250, 122, '#bcd7ff', 700);
  });
  slot('info_i', 192, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0f766e'); gr.addColorStop(1, '#134e4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ecfeff'; g.beginPath(); g.arc(w / 2, 80, 54, 0, 7); g.fill(); text(g, 'i', 92, w / 2, 86, '#0f766e');
    text(g, 'מודיעין', 34, w / 2, 176, '#ecfeff'); text(g, 'INFO', 28, w / 2, 220, '#99f6e4', 700);
  });
  slot('wet', 128, 160, (g, w, h) => {
    g.fillStyle = '#facc15'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#111827'; g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w - 16, 96); g.lineTo(16, 96); g.fill();
    g.fillStyle = '#facc15'; g.beginPath(); g.moveTo(w / 2, 34); g.lineTo(w - 34, 86); g.lineTo(34, 86); g.fill();
    text(g, '!', 44, w / 2, 68, '#111827'); text(g, 'רצפה רטובה', 19, w / 2, 126, '#111827');
  });
  slot('screen_xray', 192, 128, (g, w, h) => {
    g.fillStyle = '#04121c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f59e0b'; g.beginPath(); g.roundRect(34, 40, 124, 62, 12); g.fill(); g.fillStyle = '#04121c'; g.beginPath(); g.roundRect(70, 26, 52, 22, 8); g.fill(); g.strokeStyle = '#f59e0b'; g.lineWidth = 6; g.beginPath(); g.roundRect(70, 26, 52, 22, 8); g.stroke();
    g.fillStyle = '#22d3ee'; g.fillRect(52, 54, 34, 20); g.fillStyle = '#4ade80'; g.beginPath(); g.arc(120, 72, 14, 0, 7); g.fill(); g.fillStyle = '#38bdf8'; g.fillRect(96, 84, 40, 8);
  });
  slot('poster1', 192, 256, (g, w, h) => {                                  // perfume bottle, no brand
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3a0f3d'); gr.addColorStop(1, '#a1287a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd76a'; g.beginPath(); g.roundRect(60, 96, 72, 110, 10); g.fill(); g.fillRect(84, 66, 24, 30); g.fillStyle = '#fff2c4'; g.fillRect(78, 50, 36, 18);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(70, 106, 10, 90);
  });
  slot('poster2', 192, 256, (g, w, h) => {                                  // sunglasses
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0b3550'); gr.addColorStop(1, '#19a3b8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0b1220'; g.beginPath(); g.ellipse(62, 128, 40, 32, 0, 0, 7); g.ellipse(132, 128, 40, 32, 0, 0, 7); g.fill(); g.fillRect(90, 116, 16, 8);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(50, 118, 12, 7, -0.5, 0, 7); g.ellipse(120, 118, 12, 7, -0.5, 0, 7); g.fill();
    g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(150, 46, 22, 0, 7); g.fill();
  });
  slot('bottles', 256, 128, (g, w, h) => {                                  // lit shelf of bottles
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff3d6'); gr.addColorStop(1, '#f2c98a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const colsB = ['#7c2d12', '#be123c', '#0e7490', '#a16207', '#4d7c0f', '#6d28d9', '#b45309'];
    for (let r = 0; r < 2; r++) {
      g.fillStyle = '#8a5a2e'; g.fillRect(0, r * 64 + 58, w, 6);
      for (let i = 0; i < 14; i++) {
        const bx = 5 + i * 18, bh = 30 + rnd() * 18, c = colsB[(rnd() * colsB.length) | 0];
        g.fillStyle = c; g.beginPath(); g.roundRect(bx, r * 64 + 58 - bh, 12, bh, 3); g.fill(); g.fillRect(bx + 4, r * 64 + 50 - bh, 4, 9);
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(bx + 2, r * 64 + 60 - bh, 2.5, bh - 6);
        g.fillStyle = '#fff7e6'; g.fillRect(bx + 1, r * 64 + 58 - bh * 0.55, 10, 7);
      }
    }
  });

  // luggage stickers
  const stick = [
    (g, w, h) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, 28, 0, 7); g.fill(); g.fillStyle = '#ef4444'; g.beginPath(); g.arc(w / 2 - 9, h / 2 - 6, 11, 0, 7); g.arc(w / 2 + 9, h / 2 - 6, 11, 0, 7); g.fill(); g.beginPath(); g.moveTo(w / 2 - 19, h / 2 - 1); g.lineTo(w / 2 + 19, h / 2 - 1); g.lineTo(w / 2, h / 2 + 21); g.fill(); },
    (g, w, h) => { g.fillStyle = '#fde047'; g.fillRect(4, 14, w - 8, h - 28); g.strokeStyle = '#b91c1c'; g.lineWidth = 3; g.strokeRect(6, 16, w - 12, h - 32); text(g, 'שביר', 20, w / 2, h / 2 + 1, '#b91c1c'); },
    (g, w, h) => { g.fillStyle = '#0ea5e9'; g.beginPath(); g.arc(w / 2, h / 2, 28, 0, 7); g.fill(); g.strokeStyle = '#e0f2fe'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(w / 2, h / 2, 12, 27, 0, 0, 7); g.moveTo(5, h / 2); g.lineTo(w - 5, h / 2); g.moveTo(w / 2 - 24, h / 2 - 13); g.lineTo(w / 2 + 24, h / 2 - 13); g.moveTo(w / 2 - 24, h / 2 + 13); g.lineTo(w / 2 + 24, h / 2 + 13); g.stroke(); },
    (g, w, h) => { g.fillStyle = '#f97316'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 12 : 29; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } g.fill(); },
    (g, w, h) => { g.fillStyle = '#f8fafc'; g.beginPath(); g.roundRect(3, 12, w - 6, h - 24, 8); g.fill(); for (let i = 0; i < 3; i++) { g.fillStyle = ['#ef4444', '#facc15', '#22c55e'][i]; g.fillRect(8, 19 + i * 10, w - 16, 7); } },
    (g, w, h) => { g.fillStyle = '#a78bfa'; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 12); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(12, 36); g.lineTo(52, 20); g.lineTo(40, 34); g.lineTo(52, 44); g.lineTo(34, 40); g.lineTo(26, 50); g.lineTo(26, 38); g.fill(); }
  ];
  const stickBg = ['#ffffff', '#fde047', '#0ea5e9', '#1e3a8a', '#f8fafc', '#a78bfa'];
  stick.forEach((fn, i) => slot('st' + i, 64, 64, (g, w, h) => { g.fillStyle = stickBg[i]; g.fillRect(0, 0, w, h); fn(g, w, h); }));

  // surfaces
  slot('slats', 256, 256, (g, w, h) => {            // dark warm wood slats with shadow gaps
    for (let i = 0; i < 8; i++) {
      const b = 0.8 + rnd() * 0.35;
      const gr = g.createLinearGradient(i * 32, 0, i * 32 + 32, 0);
      gr.addColorStop(0, '#1a0e07'); gr.addColorStop(0.12, `rgb(${150 * b | 0},${92 * b | 0},${52 * b | 0})`); gr.addColorStop(0.75, `rgb(${122 * b | 0},${72 * b | 0},${40 * b | 0})`); gr.addColorStop(1, '#1a0e07');
      g.fillStyle = gr; g.fillRect(i * 32, 0, 32, h);
      g.strokeStyle = 'rgba(40,20,8,0.35)'; g.lineWidth = 1;
      for (let k = 0; k < 5; k++) { const gx = i * 32 + 6 + rnd() * 20; g.beginPath(); g.moveTo(gx, 0); g.bezierCurveTo(gx + 3, h * 0.3, gx - 3, h * 0.6, gx + 1, h); g.stroke(); }
    }
  });
  slot('planks', 256, 256, (g, w, h) => {           // light oak planks
    for (let j = 0; j < 4; j++) {
      const b = 0.88 + rnd() * 0.2;
      g.fillStyle = `rgb(${214 * b | 0},${170 * b | 0},${118 * b | 0})`; g.fillRect(0, j * 64, w, 64);
      g.strokeStyle = 'rgba(120,72,30,0.28)'; g.lineWidth = 1;
      for (let k = 0; k < 9; k++) { const gy = j * 64 + 4 + rnd() * 56; g.beginPath(); g.moveTo(0, gy); g.bezierCurveTo(w * 0.3, gy + 4, w * 0.6, gy - 4, w, gy + 1); g.stroke(); }
      g.fillStyle = 'rgba(40,20,8,0.55)'; g.fillRect(0, j * 64, w, 2);
      g.fillRect((j * 97 + 40) % w, j * 64, 2, 64);
    }
  });
  slot('metal', 256, 256, (g, w, h) => {            // brushed steel
    g.fillStyle = '#b9c0c8'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) { const v = 150 + rnd() * 90 | 0; g.fillStyle = `rgba(${v},${v + 4},${v + 10},0.35)`; g.fillRect(rnd() * w - 30, rnd() * h, 30 + rnd() * 90, 1); }
  });
  slot('ribs', 256, 256, (g, w, h) => {             // hard-shell suitcase ribs
    g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const gr = g.createLinearGradient(i * 32, 0, i * 32 + 32, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0.34)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.22)'); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)');
      g.fillStyle = gr; g.fillRect(i * 32, 0, 32, h);
    }
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, h / 2 - 3, w, 6);            // zipper line
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, h / 2 + 3, w, 2);
    for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(rnd() * w, rnd() * h, 14 + rnd() * 30, 1.5); }   // scuffs
  });
  slot('fabric', 128, 128, (g, w, h) => {           // woven fabric (soft bags, seats)
    g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 4) for (let j = 0; j < h; j += 4) { g.fillStyle = (i + j) % 8 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)'; g.fillRect(i, j, 3, 3); }
  });
  slot('panel', 256, 256, (g, w, h) => {            // warm plaster wall panel with seams and a little grime
    g.fillStyle = '#d8c3a5'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(${90 + rnd() * 60 | 0},${60 + rnd() * 40 | 0},${30 + rnd() * 30 | 0},0.05)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 26, 0, 7); g.fill(); }
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,30,10,0.28)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,24,12,0.6)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
  });
  slot('goods', 256, 128, (g, w, h) => {            // shelf full of small goods (cups, boxes, bottles)
    g.fillStyle = '#2a1a10'; g.fillRect(0, 0, w, h);
    const colsG = ['#f97316', '#facc15', '#22d3ee', '#f43f5e', '#a3e635', '#f8fafc', '#c084fc', '#fb923c'];
    for (let r = 0; r < 2; r++) {
      g.fillStyle = '#5b3a22'; g.fillRect(0, r * 64 + 58, w, 6);
      for (let i = 0; i < 13; i++) {
        const bw = 12 + rnd() * 6, bh = 22 + rnd() * 26, bx = 4 + i * 19.4;
        g.fillStyle = colsG[(rnd() * colsG.length) | 0]; g.beginPath(); g.roundRect(bx, r * 64 + 58 - bh, bw, bh, 3); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(bx + 2, r * 64 + 60 - bh, 3, bh - 4);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(bx, r * 64 + 58 - bh * 0.45, bw, 5);
      }
    }
  });

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return { texture: t, rects, canvas: c };
}

// ---------- the shared prop material ----------
// vertex colour x atlas, per-vertex roughness / metalness / emissive, per-instance tint on marked parts,
// and (swing = true) a walk cycle: marked limbs swing around their pivot, per-instance phase.
export const worldUniforms = { uTime: { value: 0 } };

export function createPropMaterial(atlas, { swing = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: atlas.texture, vertexColors: true, roughness: 1, metalness: 1 });
  m.shadowSide = THREE.DoubleSide;
  m.customProgramCacheKey = () => 'world-prop-' + (swing ? 'swing' : 'static');
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = worldUniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aPbr; attribute vec3 aFx; varying vec3 vPbr;
        ${swing ? 'attribute vec2 iPhase; uniform float uTime;' : ''}`)
      .replace('#include <color_vertex>', `
        vColor = vec3(1.0);
        #ifdef USE_COLOR
          vColor *= color;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vColor.xyz *= mix(vec3(1.0), instanceColor.xyz, aFx.x);
        #endif
        vPbr = aPbr;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${swing ? `
        float wPh = uTime * iPhase.y + iPhase.x;
        float wA = aFx.z * sin(wPh);
        float wC = cos(wA), wS = sin(wA);
        vec2 wR = vec2(transformed.y - aFx.y, transformed.z);
        transformed.y = aFx.y + wC * wR.x - wS * wR.y;
        transformed.z = wS * wR.x + wC * wR.y;
        transformed.y += abs(cos(wPh)) * 0.035;` : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPbr;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor *= vPbr.x;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= vPbr.y;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vPbr.z;');
  };
  return m;
}

// ---------- terrazzo floor ----------
function floorTextures(renderer, img) {
  const S = 1024, T = 512;                       // 1024 px = 2.4 m, tiles of 1.2 m
  const c = document.createElement('canvas'); c.width = c.height = S;
  const r = document.createElement('canvas'); r.width = r.height = S;
  const g = c.getContext('2d'), q = r.getContext('2d');
  const rnd = mulberry32(5);
  g.fillStyle = '#d8d0c4'; g.fillRect(0, 0, S, S);
  if (img) {                                           // photo terrazzo, lifted to a light stone tone
    g.drawImage(img, 0, 0, S, S);
    g.globalCompositeOperation = 'screen'; g.fillStyle = '#8f8c8a'; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#fff4e6'; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
  }
  q.fillStyle = 'rgb(0,58,0)'; q.fillRect(0, 0, S, S);                       // G = roughness
  const chips = ['#3d2f26', '#8a5a3c', '#f3ead9', '#b98a5e', '#6f6a66', '#e8d2a8', '#a14a2c', '#fffaf0', '#51483f', '#d9a441'];
  const wrap = (fn) => { for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) fn(ox, oy); };
  for (let k = 0; k < (img ? 2600 : 5200); k++) {
    const px = rnd() * S, py = rnd() * S, rad = 1.5 + rnd() * rnd() * 11, rot = rnd() * 3.14, col = chips[(rnd() * chips.length) | 0], n = 4 + (rnd() * 3 | 0);
    const pts = []; for (let i = 0; i < n; i++) { const a = rot + i * 6.283 / n, rr = rad * (0.6 + rnd() * 0.5); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.8]); }
    g.fillStyle = col; g.globalAlpha = 0.9;
    wrap((ox, oy) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(px + ox + p[0], py + oy + p[1]) : g.moveTo(px + ox + p[0], py + oy + p[1]))); g.fill(); });
  }
  g.globalAlpha = 1;
  // soft wear clouds on the roughness
  for (let k = 0; k < 90; k++) {
    const px = rnd() * S, py = rnd() * S, rad = 30 + rnd() * 110, v = rnd() < 0.5 ? 255 : 0;
    const gr = q.createRadialGradient(px, py, 0, px, py, rad); gr.addColorStop(0, `rgba(0,${v},0,0.10)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) { q.save(); q.translate(ox, oy); q.fillStyle = gr; q.fillRect(px - rad, py - rad, rad * 2, rad * 2); q.restore(); }
  }
  // tile joints: brass inlay strips, rougher than the polished stone
  for (let i = 0; i <= S; i += T) {
    g.fillStyle = '#3b2a1a'; g.fillRect(i - 3, 0, 6, S); g.fillRect(0, i - 3, S, 6);
    g.fillStyle = '#c9a25a'; g.fillRect(i - 1.5, 0, 3, S); g.fillRect(0, i - 1.5, S, 3);
    q.fillStyle = 'rgb(0,170,0)'; q.fillRect(i - 3, 0, 6, S); q.fillRect(0, i - 3, S, 6);
  }
  const mk = (cv, srgb) => {
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  };
  return { map: mk(c, true), rough: mk(r, false) };
}

// Floor material. The reflection texture is rendered by createReflection() below.
export function createFloorMaterial(renderer, refl, img) {
  const tex = floorTextures(renderer, img);
  const m = new THREE.MeshStandardMaterial({ map: tex.map, roughnessMap: tex.rough, roughness: 1, metalness: 0, envMapIntensity: 0.6 });
  m.userData.refl = !!refl;                             // switch off (and set needsUpdate) to drop the reflection
  m.customProgramCacheKey = () => 'world-floor-' + (m.userData.refl ? 1 : 0);
  m.onBeforeCompile = (sh) => {
    if (!m.userData.refl) return;
    sh.uniforms.tRefl = refl.uniforms.tRefl; sh.uniforms.uReflMat = refl.uniforms.uReflMat; sh.uniforms.uReflK = refl.uniforms.uReflK; sh.uniforms.uReflPx = refl.uniforms.uReflPx;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uReflMat; varying vec4 vRefl;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 rw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          rw = instanceMatrix * rw;
        #endif
        vRefl = uReflMat * (modelMatrix * rw);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tRefl; uniform float uReflK; uniform vec2 uReflPx; varying vec4 vRefl;')
      .replace('#include <opaque_fragment>', `
        vec2 ruv = vRefl.xy / vRefl.w;
        vec3 rc = texture2D(tRefl, ruv, 0.4 + 5.0 * roughnessFactor).rgb * 0.65 + texture2D(tRefl, ruv, 2.6 + 4.0 * roughnessFactor).rgb * 0.35;
        float rf = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.2);
        float rk = uReflK * mix(0.42, 1.0, rf) * (1.0 - roughnessFactor);
        outgoingLight = outgoingLight * (1.0 - 0.45 * rk) + rc * rk;
        #include <opaque_fragment>`);
  };
  m.userData.repeatPerMetre = 1 / 2.4;
  return m;
}

// ---------- planar reflection of the floor (y = 0) ----------
// Renders the scene once more from a mirrored camera into a small target. Objects on layer 1 are skipped.
export function createReflection(renderer, scale = 0.5) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true });
  rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter; rt.texture.magFilter = THREE.LinearFilter;
  const vcam = new THREE.PerspectiveCamera();
  vcam.layers.set(0);
  const uniforms = { tRefl: { value: rt.texture }, uReflMat: { value: new THREE.Matrix4() }, uReflK: { value: 0.85 }, uReflPx: { value: new THREE.Vector2() } };
  const rot = new THREE.Matrix4(), look = new THREE.Vector3(), pos = new THREE.Vector3();
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  function setSize(w, h) {
    rt.setSize(Math.max(2, Math.round(w * scale)), Math.max(2, Math.round(h * scale)));
    uniforms.uReflPx.value.set(1 / rt.width, 1 / rt.height);
  }
  function render(scene, camera, hide) {
    camera.updateMatrixWorld();
    pos.setFromMatrixPosition(camera.matrixWorld);
    rot.extractRotation(camera.matrixWorld);
    look.set(0, 0, -1).applyMatrix4(rot).add(pos);
    vcam.position.set(pos.x, -pos.y, pos.z);
    vcam.up.set(0, 1, 0).applyMatrix4(rot); vcam.up.y *= -1;
    vcam.lookAt(look.x, -look.y, look.z);
    vcam.near = camera.near; vcam.far = camera.far;
    vcam.projectionMatrix.copy(camera.projectionMatrix);
    vcam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    vcam.updateMatrixWorld();
    uniforms.uReflMat.value.copy(bias).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
    const auto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    for (const o of hide) o.visible = false;
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, vcam);
    renderer.setRenderTarget(null);
    for (const o of hide) o.visible = true;
    renderer.shadowMap.autoUpdate = auto;
  }
  return { uniforms, setSize, render, target: rt };
}

// ---------- light probe: warm lamps above, golden window on the right, dim wood on the left ----------
export function createEnvironment(renderer) {
  const s = new THREE.Scene();
  const add = (w, h, color, k, px, py, pz, rx, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(px, py, pz); m.rotation.set(rx, ry, 0); s.add(m);
  };
  s.add(new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshBasicMaterial({ color: 0x2a1c14, side: THREE.BackSide })));
  add(40, 40, 0x6b4a33, 1, 0, -9.9, 0, -Math.PI / 2, 0);                 // floor bounce
  add(36, 9, 0xffb163, 5, 19.8, 1, 0, 0, -Math.PI / 2);                  // sunset window wall
  add(36, 3, 0x9ec7ff, 1.6, 19.7, 7, 0, 0, -Math.PI / 2);                // sky above it
  for (let i = -2; i <= 2; i++) { add(1.6, 1.6, 0xffd9a0, 14, -5, 9.8, i * 7, Math.PI / 2, 0); add(1.6, 1.6, 0xffd9a0, 14, 5, 9.8, i * 7, Math.PI / 2, 0); }   // pendants
  add(30, 2, 0xff8a3c, 3, -19.8, 2, 0, 0, Math.PI / 2);                  // neon wash on the shop side
  add(6, 3, 0x38e8ff, 2.5, 0, 4, -19.8, 0, 0);                           // a cool sign far ahead
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  s.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}

// small soft round sprite for particles and glow pools
export function softTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}
