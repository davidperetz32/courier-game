// Merges many simple shapes into one geometry, so every prop is a single draw call.
// Besides position/normal/uv/colour every vertex carries the values the shared world material
// (mat.js) reads:
//   aPbr = (roughness, metalness, emissive strength)
//   aFx  = (tint: how much the per-instance colour applies, swing pivot height, swing amplitude)
// UVs point into the texture atlas; plain coloured shapes all point at its white corner.
import * as THREE from '../../vendor/three.module.min.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color(), _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

export const ATLAS = 2048;
export const WHITE_UV = [6 / ATLAS, 1 - 6 / ATLAS];   // inside the white square of the atlas (see mat.js)

export class Builder {
  constructor() {
    this.p = []; this.n = []; this.c = []; this.uv = []; this.pbrA = []; this.fxA = [];
    this._r = 0.75; this._m = 0; this._e = 0; this._t = 0; this._py = 0; this._amp = 0;
  }

  // material state for the shapes that follow
  pbr(rough, metal = 0, emissive = 0) { this._r = rough; this._m = metal; this._e = emissive; return this; }
  tint(t) { this._t = t; return this; }
  swing(pivotY, amp) { this._py = pivotY; this._amp = amp; return this; }

  // rect = [u0, v0, u1, v1] in the atlas, or null for a plain coloured shape
  add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, rect = null, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    const pa = g.attributes.position.array, na = g.attributes.normal.array, ua = g.attributes.uv.array;
    _c.set(color);
    for (let i = 0; i < pa.length; i += 3) {
      this.p.push(pa[i], pa[i + 1], pa[i + 2]);
      this.n.push(na[i], na[i + 1], na[i + 2]);
      this.c.push(_c.r, _c.g, _c.b);
      this.pbrA.push(this._r, this._m, this._e);
      this.fxA.push(this._t, this._py, this._amp);
    }
    if (rect) for (let i = 0; i < ua.length; i += 2) this.uv.push(rect[0] + (rect[2] - rect[0]) * ua[i], rect[1] + (rect[3] - rect[1]) * ua[i + 1]);
    else for (let i = 0; i < ua.length; i += 2) this.uv.push(WHITE_UV[0], WHITE_UV[1]);
    if (g !== geo) g.dispose();
    geo.dispose();
    return this;
  }

  // x, y, z = centre of the box. rect = atlas picture put on every face.
  box(w, h, d, color, x, y, z, ry = 0, rx = 0, rz = 0, rect = null) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz, rect); }

  // box with chamfered, smooth-shaded edges (r = edge radius)
  rbox(w, h, d, r, color, x, y, z, ry = 0, rx = 0, rz = 0, rect = null) {
    const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const hx = w / 2, hy = h / 2, hz = d / 2;
    r = Math.min(r, hx * 0.98, hy * 0.98, hz * 0.98);
    const snap = (v, half) => (Math.abs(Math.abs(v) - half) < 1e-6 ? v : Math.sign(v) * (half - r));   // inner grid lines go to the start of the chamfer
    for (let i = 0; i < pos.count; i++) {
      const x0 = snap(pos.getX(i), hx), y0 = snap(pos.getY(i), hy), z0 = snap(pos.getZ(i), hz);
      const ix = Math.max(-hx + r, Math.min(hx - r, x0)), iy = Math.max(-hy + r, Math.min(hy - r, y0)), iz = Math.max(-hz + r, Math.min(hz - r, z0));
      _p.set(x0 - ix, y0 - iy, z0 - iz);
      if (_p.lengthSq() > 1e-10) {
        _p.normalize();
        pos.setXYZ(i, ix + _p.x * r, iy + _p.y * r, iz + _p.z * r);
        nor.setXYZ(i, _p.x, _p.y, _p.z);
      } else pos.setXYZ(i, x0, y0, z0);
    }
    return this.add(g, color, x, y, z, rx, ry, rz, rect);
  }

  cyl(rTop, rBot, h, color, x, y, z, seg = 12, rx = 0, rz = 0, ry = 0, rect = null) { return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), color, x, y, z, rx, ry, rz, rect); }
  sph(r, color, x, y, z, ws = 10, hs = 8, sx = 1, sy = 1, sz = 1) { return this.add(new THREE.SphereGeometry(r, ws, hs), color, x, y, z, 0, 0, 0, null, sx, sy, sz); }
  // capsule along y: len = length of the straight part
  cap(r, len, color, x, y, z, rx = 0, rz = 0, seg = 8) { return this.add(new THREE.CapsuleGeometry(r, len, 3, seg), color, x, y, z, rx, 0, rz); }
  cone(r, h, color, x, y, z, seg = 10) { return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y, z); }
  torus(R, r, color, x, y, z, rx = 0, seg = 16) { return this.add(new THREE.TorusGeometry(R, r, 6, seg), color, x, y, z, rx, 0, 0); }
  // flat picture from the atlas; faces +z before rotation
  quad(w, h, rect, x, y, z, rx = 0, ry = 0, rz = 0, color = 0xffffff) { return this.add(new THREE.PlaneGeometry(w, h), color, x, y, z, rx, ry, rz, rect); }
  // round picture from the atlas (the circle cut out of the square tile); faces +z before rotation
  disc(r, rect, x, y, z, rx = 0, ry = 0, rz = 0, color = 0xffffff, seg = 14) { return this.add(new THREE.CircleGeometry(r, seg), color, x, y, z, rx, ry, rz, rect); }
  // copies another builder in, turned around y and moved
  merge(o, x = 0, y = 0, z = 0, ry = 0, sc = 1) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (let i = 0; i < o.p.length; i += 3) {
      const px = o.p[i] * sc, py = o.p[i + 1] * sc, pz = o.p[i + 2] * sc;
      this.p.push(px * cs + pz * sn + x, py + y, -px * sn + pz * cs + z);
      const nx = o.n[i], nz = o.n[i + 2];
      this.n.push(nx * cs + nz * sn, o.n[i + 1], -nx * sn + nz * cs);
      this.fxA.push(o.fxA[i], o.fxA[i + 1] * sc + y, o.fxA[i + 2]);
    }
    for (const v of o.c) this.c.push(v);
    for (const v of o.uv) this.uv.push(v);
    for (const v of o.pbrA) this.pbrA.push(v);
    return this;
  }
  // tube through points [[x,y,z], ...]
  tube(pts, r, color, seg = 6) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const len = _d.length();
      _d.multiplyScalar(1 / len);
      const q = new THREE.Quaternion().setFromUnitVectors(_up, _d);
      const e = new THREE.Euler().setFromQuaternion(q);
      this.add(new THREE.CylinderGeometry(r, r, len, seg, 1, true), color, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, e.x, e.y, e.z);
      if (i > 0) this.sph(r * 1.02, color, a[0], a[1], a[2], seg, 4);
    }
    return this;
  }

  get triangles() { return this.p.length / 9; }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aPbr', new THREE.Float32BufferAttribute(this.pbrA, 3));
    g.setAttribute('aFx', new THREE.Float32BufferAttribute(this.fxA, 3));
    g.computeBoundingSphere();
    return g;
  }
}
