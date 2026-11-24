// Merges many simple shapes into one geometry with vertex colours,
// so every prop is a single draw call.
import * as THREE from '../vendor/three.module.min.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();

export class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; }

  add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s);
    g.applyMatrix4(_m);
    const pa = g.attributes.position.array, na = g.attributes.normal.array, ua = g.attributes.uv.array;
    _c.set(color);
    for (let i = 0; i < pa.length; i += 3) {
      this.p.push(pa[i], pa[i + 1], pa[i + 2]);
      this.n.push(na[i], na[i + 1], na[i + 2]);
      this.c.push(_c.r, _c.g, _c.b);
    }
    for (let i = 0; i < ua.length; i++) this.uv.push(ua[i]);
    if (g !== geo) g.dispose();
    geo.dispose();
    return this;
  }

  // x, y, z = centre of the box
  box(w, h, d, color, x, y, z, ry = 0) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, 0, ry, 0); }
  cyl(rTop, rBot, h, color, x, y, z, seg = 12, rx = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), color, x, y, z, rx, 0, rz); }
  sph(r, color, x, y, z, ws = 10, hs = 8) { return this.add(new THREE.SphereGeometry(r, ws, hs), color, x, y, z); }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}
