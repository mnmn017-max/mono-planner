/* 학생 홈 v2 — 멘토즈 등대 로고 3D (three.js, index.html importmap) */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const K = 0.0098;                 // SVG 1단위 → 3D 크기
const DEPTH = 6, BEV = 1.0;       // 로고 두께
const FRONT = (DEPTH + BEV) * K;  // 앞면 높이
const TXT = 1.6;                  // 글자가 앞면보다 솟은 높이
// 로고 색 (몸체 / 글자: 등대 몸체 위 / 글자: 몸체 밖)
export const COLORS = {   // 반사를 줄인 무광(새틴) 톤 — 글자가 잘 보이도록
  burgundy: { body: 0x6E1818, metal: 0.0,  rough: 0.62, env: 0.15, text: 0xF7EBD6, textMetal: 0.0 },
  gold:     { body: 0xC99A4B, metal: 0.45, rough: 0.55, env: 0.45, text: 0x5E1212, textMetal: 0.0 },
  rose:     { body: 0xD09A88, metal: 0.4,  rough: 0.55, env: 0.45, text: 0x5E1212, textMetal: 0.0 },
  ivory:    { body: 0xEDE2CF, metal: 0.0,  rough: 0.65, env: 0.15, text: 0x7B1D1D, textMetal: 0.0 },
  espresso: { body: 0x2E1E1F, metal: 0.0,  rough: 0.6,  env: 0.15, text: 0xE6C27E, textMetal: 0.0 }
};

let baseGeo = null, textGeo = null;
const SVGS = {};
async function loadSvgs(){
  if (SVGS.body) return;
  const f = n => fetch('/assets/hv2/' + n + '.svg').then(r => { if (!r.ok) throw new Error(n); return r.text(); });
  const [a, b, c] = await Promise.all([f('logo_clean'), f('logo_text_in'), f('logo_text_out')]);
  SVGS.body = a; SVGS.tin = b; SVGS.tout = c;
}
// y축을 뒤집으면(SVG→3D) 면 방향이 거꾸로 되므로 삼각형 순서를 되돌려 앞면·조명을 바로잡음
function fixWinding(g) {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i += 3) {
    for (const a of [p, uv]) { if (!a) continue;
      for (let c = 0; c < a.itemSize; c++) { const t = a.array[(i + 1) * a.itemSize + c]; a.array[(i + 1) * a.itemSize + c] = a.array[(i + 2) * a.itemSize + c]; a.array[(i + 2) * a.itemSize + c] = t; } }
  }
  g.deleteAttribute('normal'); g.computeVertexNormals(); return g;
}
function geos() {
  if (baseGeo) return;
  const data = new SVGLoader().parse(SVGS.body);
  const shapes = [];
  data.paths.forEach(p => SVGLoader.createShapes(p).forEach(s => shapes.push(s)));
  baseGeo = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEV, bevelSize: 0.3, bevelSegments: 3, curveSegments: 48 });
  baseGeo.translate(-100, -100, 0); baseGeo.scale(K, -K, K); baseGeo = fixWinding(baseGeo);
  // MENTORS — Montserrat ExtraBold, 등대 몸체 안쪽 글자 / 바깥 글자를 미리 나눠 둔 윤곽선
  const mk = (svg, depth) => {
    const d = new SVGLoader().parse(svg), sh = [];
    d.paths.forEach(p => SVGLoader.createShapes(p).forEach(s => sh.push(s)));
    let g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.18, bevelSegments: 2, curveSegments: 10 });
    g.translate(-100, -100, 0); g.scale(K, -K, K); return fixWinding(g);
  };
  textGeo = { in: mk(SVGS.tin, DEPTH + BEV + TXT - 0.25), out: mk(SVGS.tout, 2.4) };
}

function half(colors) {
  const g = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: colors.body, metalness: colors.metal, roughness: colors.rough, envMapIntensity: colors.env });
  const txtIn = new THREE.MeshPhysicalMaterial({ color: colors.text, metalness: colors.textMetal, roughness: 0.6, envMapIntensity: 0.15 });
  g.add(new THREE.Mesh(baseGeo, body));
  const tIn = new THREE.Mesh(textGeo.in, txtIn); tIn.position.z = 0.0005;
  const tOut = new THREE.Mesh(textGeo.out, body); tOut.position.z = (DEPTH + BEV + TXT - 2.65) * K;
  g.add(tIn, tOut);
  g.userData.mats = { body, txtIn };
  return g;
}

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const MOTIONS = {
  spin: (g, t) => { g.rotation.y = t * 0.7; g.rotation.x = 0.12; },
  flip: (g, t) => { const c = 5, p = (t % c) / c; g.rotation.y = p < .45 ? 0 : ease((p - .45) / .55) * Math.PI * 2; g.rotation.x = 0.1; },
  tilt: (g, t) => { g.rotation.y = Math.sin(t * 0.8) * 0.55; g.rotation.x = Math.sin(t * 0.55) * 0.28; },
  float: (g, t) => { g.rotation.y = t * 0.45; g.position.y = Math.sin(t * 1.7) * 0.06; g.rotation.z = Math.sin(t * 0.9) * 0.05; },
  still: (g, t) => { g.rotation.set(0.1, -0.3, 0); },
  tiltfloat: (g, t) => { g.rotation.y = Math.sin(t * 0.7) * 0.5; g.rotation.x = Math.sin(t * 0.5) * 0.22; g.position.y = Math.sin(t * 1.5) * 0.05; },
  front: (g, t) => { g.rotation.set(0, 0, 0); }
};

export async function mountCoin(el, mode, colorKey) {
  const t = document.createElement('canvas');
  if (!(t.getContext('webgl2') || t.getContext('webgl'))) throw new Error('WebGL 없음');
  await loadSvgs();
  geos();
  const size = el.clientWidth || 90;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.setSize(size, size);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.95;
  el.appendChild(r.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xFFF1DC, 1.15); key.position.set(1, 2, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xFFF6EA, 0.7); fill.position.set(-3, -1, 3); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xFFF4E8, 0.75));
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50); cam.position.set(0, 0, 4.6);

  const root = new THREE.Group(); scene.add(root);
  const halves = [0, Math.PI].map(rot => { const h = half(COLORS[colorKey] || COLORS.burgundy); h.rotation.y = rot; root.add(h); return h; });
  const state = { mode, setColor(k) {
    const c = COLORS[k]; if (!c) return;
    halves.forEach(h => { const m = h.userData.mats;
      m.body.color.setHex(c.body); m.body.metalness = c.metal; m.body.roughness = c.rough; m.body.envMapIntensity = c.env;
      m.txtIn.color.setHex(c.text); m.txtIn.metalness = c.textMetal; m.txtIn.envMapIntensity = 0.15; });
  } };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  (function loop() {
    const t = (performance.now() - t0) / 1000;
    (reduce ? MOTIONS.still : MOTIONS[state.mode])(root, t);
    if (!el.isConnected || !el.contains(r.domElement)) { r.dispose(); return; }
    if (!document.hidden) r.render(scene, cam);
    requestAnimationFrame(loop);
  })();
  return state;
}
