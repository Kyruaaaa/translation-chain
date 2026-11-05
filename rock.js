// The stand-in rock, the rulebook's tool marks and the petal unfolding.
import * as THREE from "three";
export function makeRock(DATA) {
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const HASH = new Float32Array(4096); { const r = rng(4); for (let i = 0; i < 4096; i++) HASH[i] = r(); }
function hash3(x, y, z) { return HASH[((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 4095]; }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0,0,0), c(1,0,0), u), l(c(0,1,0), c(1,1,0), u), v), l(l(c(0,0,1), c(1,0,1), u), l(c(0,1,1), c(1,1,1), u), v), w) * 2 - 1;
}
function fbm(x, y, z, o = 4) { let a = 0, f = 1, amp = .5; for (let i = 0; i < o; i++) { a += amp * vnoise(x * f, y * f, z * f); f *= 2.03; amp *= .5; } return a; }

const WS = 240, HS = 160, PER = WS / 24;
const sphere = new THREE.SphereGeometry(1, WS, HS);
const NV = sphere.attributes.position.count;
const P0 = new Float32Array(NV * 3), C0 = new Float32Array(NV * 3), N0 = new Float32Array(NV * 3), UV = new Float32Array(NV * 2);
{
  const sp = sphere.attributes.position.array;
  for (let i = 0; i < NV; i++) {
    const ix = i % (WS + 1), iy = Math.floor(i / (WS + 1));
    UV[i * 2] = ix / WS; UV[i * 2 + 1] = iy / HS;
    const x = sp[i * 3], y = sp[i * 3 + 1], z = sp[i * 3 + 2];
    let r = 5 * (1 + .2 * fbm(x * .9 + 3.1, y * .9 + 1.7, z * .9 + .4) + .05 * fbm(x * 2.6, y * 2.6, z * 2.6, 3));
    let px = x * r * 1.12, py = y * r * .7, pz = z * r * .86;
    if (py < -2.4) py = -2.4 - (-2.4 - py) * .12;           // flat base resting on the seat
    P0.set([px, py, pz], i * 3);
    // granite: grey ground, darker mica flecks, pinkish feldspar, a little milky quartz
    const big = fbm(px * .35, py * .35, pz * .35, 2), fine = vnoise(px * 9, py * 9, pz * 9), f2 = vnoise(px * 6 + 9, py * 6, pz * 6);
    let c = [.50 + .05 * big, .48 + .04 * big, .45 + .03 * big];
    if (fine > .45) c = [.18, .17, .17];
    else if (f2 > .5) c = [.66, .52, .47];
    else if (fine < -.6) c = [.80, .79, .76];
    C0.set(c, i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P0.slice(), 3));
  g.setIndex(sphere.index); g.computeVertexNormals();
  N0.set(g.attributes.normal.array);
}
const FRESH = [.86, .84, .80];

// a point on the face of slice `sl` at height v (0 top .. 1 bottom), with the face's frame
function frame(sl, v, P) {
  const ix = Math.round((sl + .5) * PER) % WS, iy = Math.round(v * HS), i = iy * (WS + 1) + ix;
  const c = new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
  const n = new THREE.Vector3(N0[i * 3], N0[i * 3 + 1] * .35, N0[i * 3 + 2]).normalize();
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const right = new THREE.Vector3().crossVectors(up, n).normalize();
  return { c, n, up, right, uc: (sl + .5) / 24 };
}
// visit vertices near a face: cb(i, s, t, w) in cm, s right, t up, w out
function near(F, uSpan, cb, P) {
  for (let i = 0; i < NV; i++) {
    let du = Math.abs(UV[i * 2] - F.uc); du = Math.min(du, 1 - du);
    if (du > uSpan) continue;
    if (N0[i * 3] * F.n.x + N0[i * 3 + 1] * F.n.y + N0[i * 3 + 2] * F.n.z < 0.05) continue;
    const dx = P[i * 3] - F.c.x, dy = P[i * 3 + 1] - F.c.y, dz = P[i * 3 + 2] - F.c.z;
    const w = dx * F.n.x + dy * F.n.y + dz * F.n.z;
    if (w < -.9) continue;                      // only the skin of the face, never stone deeper behind it
    cb(i, dx * F.right.x + dy * F.right.y + dz * F.right.z, dx * F.up.x + dy * F.up.y + dz * F.up.z, w);
  }
}
const mix = (C, i, c, t) => { for (let j = 0; j < 3; j++) C[i * 3 + j] += (c[j] - C[i * 3 + j]) * t; };
const push = (P, i, d) => { for (let j = 0; j < 3; j++) P[i * 3 + j] -= N0[i * 3 + j] * d; };
const alongN = (P, F, i, d) => { P[i * 3] -= F.n.x * d; P[i * 3 + 1] -= F.n.y * d; P[i * 3 + 2] -= F.n.z * d; };
// rulebook edge case: a patch bigger than the face shrinks to the largest square that fits in the slice (~1.3 cm wide)
const SLICE = .65;
const FORCE_K = [0, 1, 1.6, 2.4];

function trails(b, F) {
  const r = rng(b.h * 4 + 1), n = [1, 2, 4][b.level - 1], len = [1.8, 2.6, 3.6][b.level - 1] * (b.up ? 1 : .8);
  const out = [];
  for (let j = 0; j < n; j++) {
    const s0 = (j - (n - 1) / 2) * .28, ph = r() * 6, amp = .1 + r() * .14, L = len * (.75 + r() * .4), pts = [];
    for (let t = 0; t <= L; t += .08) pts.push([s0 + amp * Math.sin(t * 1.6 + ph) + .1 * vnoise(t * 2, j, b.h), -t]);
    out.push(pts);
  }
  return out;
}
function distPoly(s, t, pts) { let m = 1e9; for (const p of pts) { const d = (p[0] - s) ** 2 + (p[1] - t) ** 2; if (d < m) m = d; } return Math.sqrt(m); }

function apply(b, P, C, wetOnly) {
  const L = b.level; if (!L) return;
  const fk = FORCE_K[L];
  if (b.k === 0) {
    const F = frame(b.h, .26, P), tr = trails(b, F);
    near(F, .06, (i, s, t, w) => {
      if (t > .3 || t < -4.2 || Math.abs(s) > 2) return;
      let d = 1e9; for (const p of tr) d = Math.min(d, distPoly(s, t, p));
      if (wetOnly) { if (d < .35) mix(C, i, [.22, .21, .2], .55 * (1 - d / .35)); return; }
      if (d < .07) { push(P, i, .03 * fk * (1 - d / .07)); mix(C, i, FRESH, .5); }
    }, P);
  } else if (wetOnly) return;
  else if (b.k === 1) {
    const a = Math.min([2, 3, 4][L - 1] / 2, SLICE), cut = [.04, .08, .15][L - 1], F = frame(b.h, .5, P);
    near(F, .07, (i, s, t, w) => {
      if (Math.abs(s) > a || Math.abs(t) > a) return;
      const edge = Math.min(1, (a - Math.max(Math.abs(s), Math.abs(t))) / .25);
      const target = -cut;
      if (w > target) alongN(P, F, i, (w - target) * edge);
      if (b.up) { mix(C, i, FRESH, .25 * edge); const st = 1 - .07 * Math.sin(t * 55); for (let j = 0; j < 3; j++) C[i * 3 + j] *= st; }
      else { mix(C, i, [.45, .44, .42], .2 * edge); for (let j = 0; j < 3; j++) C[i * 3 + j] *= 1 - .08 * edge; }
    }, P);
  } else if (b.k === 2) {
    const F = frame(b.h, .72, P), r = rng(b.h * 4 + 3);
    if (b.up) {
      const n = [5, 10, 20][L - 1], rad = Math.min([.5, .75, 1][L - 1], SLICE - .1), taps = [];
      for (let j = 0; j < n; j++) { const a = r() * 6.283, d = Math.sqrt(r()) * rad; taps.push([Math.cos(a) * d, Math.sin(a) * d]); }
      near(F, .06, (i, s, t) => {
        if (Math.abs(s) > rad + .2 || Math.abs(t) > rad + .2) return;
        for (const [ts, tt] of taps) { const d = Math.hypot(s - ts, t - tt); if (d < .14) { push(P, i, .05 * fk * (1 - d / .14)); mix(C, i, [.9, .89, .86], .65); } }
      }, P);
    } else {
      const a = Math.min([1, 1.5, 2][L - 1] / 2, SLICE), d0 = .06 * L;
      near(F, .06, (i, s, t, w) => {
        if (Math.abs(s) > a || Math.abs(t) > a) return;
        const cutW = -d0 - Math.max(0, a - t) * .18;
        if (w > cutW) { alongN(P, F, i, w - cutW); mix(C, i, FRESH, .7); }
      }, P);
    }
  } else {
    const sl = b.up ? b.h : (b.h + 12) % 24, F = frame(sl, .25, P);
    b.breaks.forEach((brk, j) => {
      if (!brk) return;
      const r = rng(b.h * 10 + j), cs = (j - (b.breaks.length - 1) / 2) * .5, rs = .45 + r() * .2, rt = .4 + r() * .15;
      near(F, .08, (i, s, t) => {
        const q = ((s - cs) / rs) ** 2 + ((t + .05) / rt) ** 2;
        if (q >= 1) return;
        const ripple = 1 + .18 * Math.sin(Math.sqrt(q) * 13);
        push(P, i, .17 * (1 - q) * ripple * (fk / 2.4 + .4));
        mix(C, i, FRESH, .85);
      }, P);
    });
  }
}

function state(nDone, wetBeat) {
  const P = P0.slice(), C = C0.slice();
  for (let n = 0; n < nDone; n++) apply(DATA.beats[n], P, C, false);
  if (wetBeat != null && DATA.beats[wetBeat].k === 0) apply(DATA.beats[wetBeat], P, C, true);
  return { P, C };
}

function rockMesh() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P0.slice(), 3));
  g.setAttribute("color", new THREE.BufferAttribute(C0.slice(), 3));
  g.setIndex(sphere.index); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0 }));
}
function setState(mesh, st) {
  mesh.geometry.attributes.position.array.set(st.P); mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.attributes.color.array.set(st.C); mesh.geometry.attributes.color.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}
function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x6b5a3a, .75));
  const d3 = new THREE.DirectionalLight(0xffffff, .5); d3.position.set(0, -10, 2); scene.add(d3);
  const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(6, 10, 9); scene.add(d);
  const d2 = new THREE.DirectionalLight(0xffeedd, .45); d2.position.set(-8, 3, -6); scene.add(d2);
}

const finalSt = state(96, null);
// A browser sketch of Peel Flower's rule on the stand-in rock: core, 7 uneven cuts from the open edge
// that wander like cracks, and petals pushed open from a neck. The real flower comes from Blender.
function drawPetals(ctx, S) {
  const { P, C } = finalSt, cx = S / 2, cy = S / 2;
  const r = rng(17), CUTS = 7, RIM = Math.round(HS * .84);
  const idx = (ix, iy) => iy * (WS + 1) + (((ix % WS) + WS) % WS);
  const dist = (a, b) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  // distance down from the top, and the length of each ring, averaged round the rock
  const Lr = [0], ring = [];
  for (let iy = 0; iy <= HS; iy++) {
    let c = 0; for (let ix = 0; ix < WS; ix++) c += dist(idx(ix, iy), idx(ix + 1, iy));
    ring.push(c);
    if (iy) { let m = 0; for (let ix = 0; ix < WS; ix += 12) m += dist(idx(ix, iy - 1), idx(ix, iy)); Lr.push(Lr[iy - 1] + m / (WS / 12)); }
  }
  const size = Math.sqrt(ring.reduce((s, c, i) => s + c * (i ? Lr[i] - Lr[i - 1] : 0), 0));
  const CORE = .23 * size, PUSH = .18 * size, NECK = .2 * size;
  let iyCore = 0; while (Lr[iyCore] < CORE) iyCore++;
  const start = r() * WS, base = [], push = [];
  for (let k = 0; k <= CUTS; k++) base.push(start + WS * (k + (r() * .6 - .3)) / CUTS);
  base[CUTS] = base[0] + WS;
  for (let k = 0; k < CUTS; k++) push.push(PUSH * (.6 + r() * .8));
  const cut = (k, iy) => base[k] + WS * .05 * vnoise(k % CUTS * 3.1 + .5, iy * .045, 2.2) * smooth((iy - iyCore) / 30);
  const k = (S * .47) / (Lr[RIM] + PUSH * 1.4);
  const paint = (i, q) => {
    const r0 = Math.hypot(P0[i * 3], P0[i * 3 + 1], P0[i * 3 + 2]), r1 = Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    const dent = Math.min(.35, Math.max(0, (r0 - r1) * 2.2));
    ctx.fillStyle = `rgb(${[0, 1, 2].map(c => Math.round(255 * Math.min(1, C[i * 3 + c] * (1 - dent * .6))))})`;
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .6;
    ctx.beginPath(); ctx.moveTo(...q[0]); for (let n = 1; n < 4; n++) ctx.lineTo(...q[n]); ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  // the core: flattened round its centre
  const polar = (ix, iy) => { const a = 2 * Math.PI * ix / WS; return [cx + Math.cos(a) * Lr[iy] * k, cy + Math.sin(a) * Lr[iy] * k]; };
  for (let iy = 0; iy < iyCore; iy++) for (let ix = 0; ix < WS; ix++)
    paint(idx(ix, iy), [polar(ix, iy), polar(ix + 1, iy), polar(ix + 1, iy + 1), polar(ix, iy + 1)]);
  // the petals
  const atCore = 2 * Math.PI * CORE / ring[iyCore];
  for (let p = 0; p < CUTS; p++) {
    const mid = (base[p] + base[p + 1]) / 2, th = 2 * Math.PI * mid / WS, ca = Math.cos(th), sa = Math.sin(th);
    const pt = (ix, iy) => {
      const t = (Lr[iy] - CORE) / NECK, wide = 1 + (atCore - 1) * (1 - smooth(t));
      const x = (ix - mid) * ring[iy] / WS * wide * k, y = (Lr[iy] + push[p] * smooth(t)) * k;
      return [cx + ca * y - sa * x, cy + sa * y + ca * x];
    };
    for (let iy = iyCore - 1; iy < RIM; iy++) {
      const a = cut(p, iy), b = cut(p + 1, iy), half = (b - a) / 2;
      for (let ix = Math.ceil(a); ix < Math.floor(b); ix++) {
        const f = (ix + .5 - (a + b) / 2) / half;
        if (iy > RIM - 16 * f * f) continue;            // rounded petal ends
        paint(idx(ix, iy), [pt(ix, iy), pt(ix + 1, iy), pt(ix + 1, iy + 1), pt(ix, iy + 1)]);
      }
    }
  }
}
return { P0, C0, finalSt, state, rockMesh, setState, lights, drawPetals };
}
