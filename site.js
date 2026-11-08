// Translation Chain site: one screen of weeks. A day appears once it has passed (Rhode Island time).
// To give a day its rock, add it to DAYS in data.js.
import * as THREE from "three";
import { makeRock } from "./rock.js";

const DAYS = window.DAYS, FIRST = window.FIRST_DAY;
const byDate = new Map(DAYS.map(d => [d.date, d]));
const weeks = document.getElementById("weeks");

/* the word rock, in other languages */
const WORDS = ["rock", "roche", "Fels", "piedra", "pietra", "pedra", "камень", "岩", "石", "바위", "صخرة", "סלע", "चट्टान", "βράχος", "kivi", "kaya", "skała", "klippe", "rots", "batu", "đá", "pōhaku", "steinn", "taş", "kő", "skála"];
document.getElementById("track").innerHTML = [...WORDS, ...WORDS, ...WORDS, ...WORDS].map(w => `<span>${w}</span>`).join("");

/* dates: every day from FIRST up to yesterday, 35 days at most (Oct 25 to Nov 28). ?today=2026-12-01 previews a later date. */
const todayRI = () => new URLSearchParams(location.search).get("today")
  || new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
function passedDays() {
  const out = [], last = new Date(FIRST + "T12:00:00Z");
  last.setUTCDate(last.getUTCDate() + 35);
  const end = new Date(Math.min(new Date(todayRI() + "T12:00:00Z"), last));
  for (let d = new Date(FIRST + "T12:00:00Z"); d < end; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}

/* one small renderer: its canvas moves into whichever key is showing a rock */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
camera.position.set(0, 5, 25); camera.lookAt(0, -.2, 0);
const rocks = new Map();
function rockFor(day) {
  if (!rocks.has(day.date)) {
    const r = makeRock(day);
    r.mesh = r.rockMesh();
    if (!scene.children.length) r.lights(scene);
    rocks.set(day.date, r);
  }
  return rocks.get(day.date);
}
const clearMeshes = () => scene.children.filter(c => c.isMesh).forEach(m => scene.remove(m));
let spinning = null, raf = 0;
function loop(t) {
  if (!spinning) { raf = 0; return; }
  spinning.mesh.rotation.y = t * .00035;
  renderer.render(scene, camera);
  raf = requestAnimationFrame(loop);
}
function showRock(key, day) {
  const r = rockFor(day);
  clearMeshes(); scene.add(r.mesh); r.setState(r.mesh, { P: r.P0, C: r.C0 });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.setSize(key.clientWidth, key.clientHeight, false);
  key.prepend(renderer.domElement); key.classList.add("on");
  spinning = r; if (!raf) raf = requestAnimationFrame(loop);
}
function hideRock(key) {
  key.classList.remove("on"); spinning = null;
  if (renderer.domElement.parentNode === key) renderer.domElement.remove();
}
function still(r, st, rotY) {   // a picture of the rock, on nothing
  const w = 360, h = 300, m = r.rockMesh();
  r.setState(m, st); m.rotation.y = rotY;
  clearMeshes(); scene.add(m);
  camera.aspect = w / h; camera.zoom = 1.45; camera.updateProjectionMatrix();
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  camera.aspect = 1; camera.zoom = 1; camera.updateProjectionMatrix();
  scene.remove(m); m.geometry.dispose();
  return url;
}

/* keys */
function addKey(iso, fresh) {
  const [, m, d] = iso.split("-"), day = byDate.get(iso);
  const b = document.createElement("button");
  b.type = "button"; b.className = "key" + (fresh ? " new" : "");
  b.innerHTML = `<span>${m}.${d}</span>`;
  b.setAttribute("aria-label", day ? `Open ${iso}` : `${iso}, no data`);
  if (day && day.rock) {
    b.addEventListener("mouseenter", () => showRock(b, day));
    b.addEventListener("mouseleave", () => hideRock(b));
    b.addEventListener("focus", () => showRock(b, day));
    b.addEventListener("blur", () => hideRock(b));
  }
  // the key goes down, comes back up, then the pop-up opens
  b.addEventListener("click", () => {
    b.classList.add("down");
    setTimeout(() => b.classList.remove("down"), 110);
    if (day) setTimeout(() => openDay(day, b), 210);
  });
  weeks.appendChild(b);
}
let shown = 0;
function sync(animate) {
  const all = passedDays();
  for (const iso of all.slice(shown)) addKey(iso, animate);
  shown = all.length;
  const n = DAYS.filter(d => d.rock && all.includes(d.date)).length;
  document.getElementById("count").textContent = `${shown} day${shown === 1 ? "" : "s"} · ${n} rock${n === 1 ? "" : "s"}`;
  layout();
}
// sizes the keys so every row always fits, and lifts the block a little with each day
function layout() {
  const rows = Math.max(1, Math.ceil(shown / 7)), top = 66, bottom = innerHeight - 40, H = bottom - top;
  const left = document.getElementById("folders").getBoundingClientRect().right + 12;
  const rightW = innerWidth - document.getElementById("right").getBoundingClientRect().left + 12;
  const g = Math.max(8, Math.min(20, innerWidth / 50));
  const s = Math.floor(Math.min(86, (innerWidth - left - rightW - 6 * g) / 7, (H - (rows - 1) * g - 6) / rows));
  const root = document.documentElement.style;
  root.setProperty("--s", s + "px"); root.setProperty("--g", g + "px");
  const step = s + g, height = rows * step - g, mid = (top + bottom) / 2;
  const y = Math.max(top, Math.min(mid - (shown / 7) * step / 2, bottom - height - 6));
  root.setProperty("--y", y + "px");
  const w = 7 * s + 6 * g;
  weeks.style.left = Math.min(Math.max(innerWidth / 2, left + w / 2), innerWidth - rightW - w / 2) + "px";   // centred, unless the folders need the room
}

/* the pop-up: no boxes, no headings. Seven pieces in order, wandering across a 3 × 3 grid. */
function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ h >>> 15, 1 | h) + 0x6D2B79F5 | 0; return ((h ^ h >>> 14) >>> 0) / 4294967296; }; }
function wander(rand, n, G) {   // a path of n neighbouring cells, none visited twice, each date its own
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const walk = path => {
    if (path.length === n) return path;
    const [c, r] = path[path.length - 1];
    for (const [dc, dr] of shuffle([...dirs])) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= G || nr < 0 || nr >= G || path.some(p => p[0] === nc && p[1] === nr)) continue;
      const got = walk([...path, [nc, nr]]);
      if (got) return got;
    }
    return null;
  };
  const line = shuffle([...Array(G).keys()]);
  for (const c of line) for (const r of line) { const got = walk([[c, r]]); if (got) return got; }
}
function mini(v) {
  const rk = v.rk || [];
  const W = 200, H = 100, all = v.fc.concat(rk.filter(x => x !== null));
  let lo = Math.min(...all), hi = Math.max(...all); const pad = (hi - lo) * .1 || 1; lo -= pad; hi += pad;
  const X = i => W * i / (v.fc.length - 1), Y = y => H * (1 - (y - lo) / (hi - lo));
  const line = a => a.map((y, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(y).toFixed(1)}`).join("");
  const runs = []; let run = null;                  // stretches of the day that have readings
  rk.forEach((y, i) => { if (y === null) run = null; else { if (!run) runs.push(run = []); run.push(i); } });
  const pts = idx => idx.map(i => `${X(i).toFixed(1)} ${Y(rk[i]).toFixed(1)}`);
  const back = idx => [...idx].reverse().map(i => `L${X(i).toFixed(1)} ${Y(v.fc[i]).toFixed(1)}`).join("");
  const areas = runs.map(idx => `<path d="M${pts(idx).join("L")}${back(idx)}Z" fill="#000" opacity=".16"/>`).join("");
  const lines = runs.map(idx => `<path d="M${pts(idx).join("L")}" fill="none" stroke="#000" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${v.name}: rock against the forecast">
    ${areas}<path d="${line(v.fc)}" fill="none" stroke="#444" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>${lines}</svg>`;
}
function greyBloom(day) {   // thread colours become four greys
  const G = ["#050505", "#2e2e2e", "#4e4e4e", "#6e6e6e"];
  let s = day.bloomBare.replaceAll("#8f866f", "#333333");
  day.vars.forEach((v, k) => { s = s.replaceAll(v.col, G[k]); });
  return s;
}
let placed = [];
function buildFlow(day, r) {
  const [y, m, d] = day.date.split("-");
  const bars = day.beats.map(b => `<i style="${b.level ? `background:${["", "#8a8a8a", "#464646", "#0a0a0a"][b.level]}` : ""}"></i>`).join("");
  const rot = Math.PI / 2 - 2 * Math.PI * 6.5 / 24;
  const before = r && still(r, { P: r.P0, C: r.C0 }, rot), after = r && still(r, r.finalSt, rot);
  const bloom = greyBloom(day);
  const pieces = [
    r && `<img src="${before}" alt="The rock before">`,
    `<div class="minis">${day.vars.map(mini).join("")}</div>`,
    bloom.replace('viewBox="0 0 560 560"', 'viewBox="105 105 350 350"').replace("<svg ", '<svg role="img" aria-label="Embroidery pattern" '),
    `<div class="bars" role="img" aria-label="The 96 beats of the score">${bars}</div>`,
    r && `<img src="${after}" alt="The rock after">`,
    r && `<canvas id="petalsC" width="420" height="420" role="img" aria-label="Petals"></canvas>`,
    r && `<canvas id="finalC" width="520" height="520" role="img" aria-label="The printed and embroidered piece"></canvas>`,
  ].filter(Boolean);
  const G = r ? 3 : pieces.length > 1 ? 2 : 1, rand = seeded(day.date), path = wander(rand, pieces.length, G);
  placed = path.map(([c, row]) => {     // percent of the flow area
    const w = (66 + rand() * 21) / G, h = (66 + rand() * 21) / G;
    const cx = (c + .5) * 100 / G + (rand() - .5) * 4, cy = (row + .5) * 100 / G + (rand() - .5) * 4;
    return { l: cx - w / 2, t: cy - h / 2, w, h };
  });
  document.getElementById("sub").innerHTML = `<h3 class="when" id="subDate">${m}.${d}.${y}</h3>
    <button class="close" id="close" type="button" aria-label="Close">×</button>
    <div class="flow" id="flow"><svg class="links" id="links" aria-hidden="true"></svg>
      ${pieces.map((p, i) => `<div class="item" style="left:${placed[i].l}%;top:${placed[i].t}%;width:${placed[i].w}%;height:${placed[i].h}%">${p}</div>`).join("")}
    </div>`;
  document.getElementById("close").addEventListener("click", closeDay);
  if (!r) return;
  const grey = (S, blur) => { const c = document.createElement("canvas"); c.width = c.height = S; r.drawPetals(c.getContext("2d"), S, false);
    const o = document.createElement("canvas"); o.width = o.height = S; const x = o.getContext("2d"); x.filter = `grayscale(1) contrast(1.1)${blur ? " blur(.7px)" : ""}`; x.drawImage(c, 0, 0); return o; };
  document.getElementById("petalsC").getContext("2d").drawImage(grey(420), 0, 0);
  const fc = document.getElementById("finalC").getContext("2d");
  fc.globalAlpha = .7; fc.drawImage(grey(520, true), 0, 0); fc.globalAlpha = 1;
  const img = new Image();
  img.onload = () => fc.drawImage(img, 0, 0, 520, 520);
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(bloom);
}
// one thin arrow from each piece to the next, stopping at the edge of each
function drawLinks() {
  const flow = document.getElementById("flow"), svg = document.getElementById("links");
  if (!flow) return;
  const f = flow.getBoundingClientRect();
  const R = placed.map(p => ({ cx: (p.l + p.w / 2) * f.width / 100, cy: (p.t + p.h / 2) * f.height / 100, hw: p.w * f.width / 200, hh: p.h * f.height / 200 }));
  const exit = (b, dx, dy) => { const k = Math.min(b.hw / (Math.abs(dx) || 1e-6), b.hh / (Math.abs(dy) || 1e-6)); return [b.cx + dx * k, b.cy + dy * k]; };
  let out = "";
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i], b = R[i + 1], dx = b.cx - a.cx, dy = b.cy - a.cy;
    const [x1, y1] = exit(a, dx, dy), [x2, y2] = exit(b, -dx, -dy);
    out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="1" marker-end="url(#arr)"/>`;
  }
  svg.setAttribute("viewBox", `0 0 ${f.width} ${f.height}`);
  svg.innerHTML = `<defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#000" stroke-width="1.4"/></marker></defs>${out}`;
}

/* folders of markdown rules */
const FOLDERS = {
  Data: ["land-acknowledgment", "placement", "sensors", "database", "data-rules"],
  Reconstruction: ["reconstruction-rules"],
  Extrapolation: ["shape-rules"],
  Tactility: ["choreography-rules", "sewing-patterns"],
  Gesture: ["scanning-rules"],
  Module: ["petal-rules"],
  Final: ["combination-rules"],
  Means: ["the-chain", "manifesto"],
};
const foldersEl = document.getElementById("folders"), rightEl = document.getElementById("right"), filesEl = document.getElementById("files");
function closeFiles() { filesEl.classList.remove("show"); document.querySelectorAll(".folder").forEach(f => f.setAttribute("aria-expanded", "false")); }
for (const [name, files] of Object.entries(FOLDERS)) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "folder"; b.setAttribute("aria-expanded", "false");
  b.innerHTML = `<i></i><b>${name}</b>`;
  b.addEventListener("click", e => {
    e.stopPropagation();
    const wasOpen = b.getAttribute("aria-expanded") === "true";
    closeFiles();
    if (wasOpen) return;
    filesEl.innerHTML = files.map(f => `<button type="button" data-f="${f}">${f}.md</button>`).join("");
    filesEl.querySelectorAll("button").forEach(x => x.addEventListener("click", () => openDoc(name, x.dataset.f, b)));
    filesEl.classList.add("show");
    filesEl.classList.toggle("onright", name === "Means");
    const y = b.getBoundingClientRect().top;
    filesEl.style.top = Math.min(y, innerHeight - filesEl.offsetHeight - 12) + "px";
    b.setAttribute("aria-expanded", "true");
  });
  (name === "Means" ? rightEl : foldersEl).appendChild(b);
}
document.addEventListener("click", closeFiles);
async function openDoc(folder, file, from) {
  opener = from; closeFiles();
  let html;
  try {
    const res = await fetch(`docs/${folder}/${file}.md`);
    if (!res.ok) throw new Error();
    html = marked.parse(await res.text());
  } catch { html = `<p>This file couldn't be loaded.</p>`; }
  sub.innerHTML = `<button class="close" id="close" type="button" aria-label="Close">×</button><div class="doc">${html}</div>`;
  document.getElementById("close").addEventListener("click", closeDay);
  shade.classList.add("show"); sub.focus({ preventScroll: true });
}

const shade = document.getElementById("shade"), sub = document.getElementById("sub");
let opener = null;
function openDay(day, from) {
  opener = from; hideRock(from);
  buildFlow(day, day.rock ? rockFor(day) : null);
  shade.classList.add("show"); sub.focus({ preventScroll: true });
  requestAnimationFrame(drawLinks);
}
function closeDay() {
  shade.classList.remove("show"); sub.innerHTML = "";
  if (opener) opener.focus({ preventScroll: true });
}
shade.addEventListener("mousedown", e => { if (e.target === shade) closeDay(); });
addEventListener("keydown", e => { if (e.key === "Escape" && shade.classList.contains("show")) closeDay(); });
addEventListener("resize", () => { layout(); if (shade.classList.contains("show")) drawLinks(); });

sync(false);
setTimeout(() => weeks.classList.add("ready"), 100);
setInterval(() => sync(true), 60000);   // a new day appears on its own at midnight, Rhode Island time
