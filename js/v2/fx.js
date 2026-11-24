// Small effects: dust in the sun shafts, nitrogen vapour around the stations, coin sparkles, speed lines.
// All particles are one draw call; the speed lines are another.
import * as THREE from '../../vendor/three.module.min.js';

const DUST = 220, VAP = 96, SPARK = 64, NP = DUST + VAP + SPARK, LINES = 34, PI = Math.PI, W = 7;

export function createFx(gfx) {
  const { scene, soft, sunDir } = gfx;
  const pos = new Float32Array(NP * 3), colA = new Float32Array(NP * 4), size = new Float32Array(NP), seed = [];
  for (let i = 0; i < NP; i++) seed.push([Math.random(), Math.random(), Math.random(), Math.random()]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aCol', new THREE.BufferAttribute(colA, 4).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: soft }, uScale: { value: 1 } },
    vertexShader: `attribute vec4 aCol; attribute float aSize; varying vec4 vCol; uniform float uScale;
      void main(){ vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(220.0, aSize * uScale / max(0.5, -mv.z)); }`,
    fragmentShader: `uniform sampler2D tMap; varying vec4 vCol;
      void main(){ float a = texture2D(tMap, gl_PointCoord).a * vCol.a; gl_FragColor = vec4(vCol.rgb * a, 0.0); }`,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; points.layers.set(1);
  scene.add(points);

  const sparks = [];
  for (let i = 0; i < SPARK; i++) sparks.push({ life: 0, max: 1, x: 0, y: 0, s: 0, vx: 0, vy: 0, vs: 0, r: 1, g: 1, b: 1 });
  let si = 0;
  // s = distance along the track
  function burst(x, y, s, n = 8, color = [5, 3.4, 0.9]) {
    for (let k = 0; k < n; k++) {
      const p = sparks[si]; si = (si + 1) % SPARK;
      const a = Math.random() * 6.28, v = 1.5 + Math.random() * 3;
      p.max = 0.3 + Math.random() * 0.3; p.life = p.max; p.x = x; p.y = y; p.s = s;
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v + 1.5; p.vs = (Math.random() - 0.5) * 3;
      p.r = color[0]; p.g = color[1]; p.b = color[2];
    }
  }

  // speed lines: thin streaks around the edge of the view that rush past the camera
  const lg = new THREE.PlaneGeometry(1, 1);
  const lineMat = new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uAlpha; varying vec2 vUv; void main(){ float a = sin(vUv.x * 3.1416) * sin(vUv.y * 3.1416); gl_FragColor = vec4(vec3(1.0, 0.93, 0.8) * a * uAlpha, 0.0); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, side: THREE.DoubleSide
  });
  const lines = new THREE.InstancedMesh(lg, lineMat, LINES);
  lines.frustumCulled = false; lines.layers.set(1); lines.renderOrder = 5;
  scene.add(lines);
  const lineData = [];
  for (let i = 0; i < LINES; i++) lineData.push({ a: Math.random() * 6.28, r: 2.6 + Math.random() * 2.6, z: -Math.random() * 40, len: 2.5 + Math.random() * 4 });
  const dummy = new THREE.Object3D();

  // dist = distance run, speedK = 0 (start speed) .. 1 (top speed), stations = entity list
  function update(dt, time, dist, speed, speedK, stations, camera) {
    mat.uniforms.uScale.value = gfx.pixelHeight * 0.01;
    const k = sunDir.x / sunDir.y;
    let n = 0;
    for (let i = 0; i < DUST; i++, n++) {
      const s = seed[n];
      const y = 0.3 + s[1] * 5.6 + Math.sin(time * 0.3 + s[3] * 20) * 0.15;
      const xMax = W - 0.3, xMin = W - y * k - 0.6;
      pos[n * 3] = xMin + s[0] * (xMax - xMin) * 0.9;
      pos[n * 3 + 1] = y;
      pos[n * 3 + 2] = 6 - (((s[2] * 62 - dist) % 62) + 62) % 62;
      const tw = 0.5 + 0.5 * Math.sin(time * (0.8 + s[3] * 1.5) + s[0] * 40);
      colA[n * 4] = 1.6; colA[n * 4 + 1] = 1.15; colA[n * 4 + 2] = 0.7; colA[n * 4 + 3] = 0.15 + 0.45 * tw;
      size[n] = 1.4 + s[3] * 2.6;
    }
    for (let i = 0; i < VAP; i++, n++) {
      const s = seed[n], st = stations[i % 3];
      if (!st.active) { colA[n * 4 + 3] = 0; size[n] = 0; continue; }
      const life = (time * (0.16 + s[3] * 0.12) + s[0]) % 1, a = s[1] * 6.283, r = 0.5 + life * 2.4;
      pos[n * 3] = st.x + Math.cos(a) * r;
      pos[n * 3 + 1] = 0.12 + life * 0.35 + s[2] * 0.25 * (1 - life) + (s[2] > 0.8 ? life * 1.6 : 0);
      pos[n * 3 + 2] = dist - st.s + Math.sin(a) * r;
      colA[n * 4] = 0.75; colA[n * 4 + 1] = 0.95; colA[n * 4 + 2] = 1.1; colA[n * 4 + 3] = Math.sin(life * PI) * 0.13;
      size[n] = 90 + life * 150;
    }
    for (let i = 0; i < SPARK; i++, n++) {
      const p = sparks[i];
      if (p.life <= 0) { colA[n * 4 + 3] = 0; size[n] = 0; continue; }
      p.life -= dt; p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.s += p.vs * dt;
      const f = Math.max(0, p.life / p.max);
      pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = dist - p.s;
      colA[n * 4] = p.r; colA[n * 4 + 1] = p.g; colA[n * 4 + 2] = p.b; colA[n * 4 + 3] = f;
      size[n] = 3.5 + 5 * f;
    }
    geo.attributes.position.needsUpdate = geo.attributes.aCol.needsUpdate = geo.attributes.aSize.needsUpdate = true;

    lineMat.uniforms.uAlpha.value = Math.max(0, Math.min(1, (speed - 9) / 16)) * (0.05 + 0.2 * speedK);
    const cx = camera.position.x, cy = camera.position.y;
    for (let i = 0; i < LINES; i++) {
      const l = lineData[i];
      l.z += speed * dt * 2.2;
      if (l.z > 9) { l.z = -34 - Math.random() * 10; l.a = Math.random() * 6.28; l.r = 2.6 + Math.random() * 2.6; }
      dummy.position.set(cx + Math.cos(l.a) * l.r * 0.75, cy - 1.2 + Math.sin(l.a) * l.r, l.z);
      dummy.rotation.set(-PI / 2, 0, l.a + PI / 2, 'ZYX');
      dummy.scale.set(0.03, l.len * (0.6 + speedK), 1);
      dummy.updateMatrix();
      lines.setMatrixAt(i, dummy.matrix);
    }
    lines.instanceMatrix.needsUpdate = true;
  }

  return { update, burst };
}
