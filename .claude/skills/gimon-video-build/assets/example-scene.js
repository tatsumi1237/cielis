import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ================= utilities =================
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const ease = k => { k = clamp(k, 0, 1); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const easeOut = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const easeBack = k => { k = clamp(k, 0, 1); const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, srgb = true, rep) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function hash2(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v) * 2 - 1; }
function fbm(x, y, o = 5) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= .5; } return s; }
function noiseCanvas(S, base, amt, seed) { const c = canvas(S, S), g = c.getContext('2d'), r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, S, S); for (let i = 0; i < S * S / 5; i++) { const v = r() > .5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${r() * amt})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); } return c; }
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent && parent.add(m); return m; }

// ================= renderer / post =================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.autoClear = false;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000);

const SCN = {}; // name -> {scene, fx:[], exposure}
function newScene(name, exposure, ao = 0.85, bloomK = 0.1) { const s = new THREE.Scene(); SCN[name] = { scene: s, fx: [], exposure, ao, bloomK }; return SCN[name]; }

// ================= shared: people =================
const SKINS = [0xe3b99c, 0xd9a988, 0xc99475, 0xeac4a8, 0xb98261].map(c => new THREE.Color(c));
const SHIRTS = [0xf2f2ee, 0x1d1f24, 0x2f4f7f, 0xc23b32, 0x8a9aa8, 0xe8c26a, 0x3f6e4a, 0xd9d2c5, 0x6b4b8a, 0xef8a4a, 0x2a2a2a, 0xf5f0e6, 0x5d7fa3, 0xb24a6a].map(c => new THREE.Color(c));
const PANTS = [0x1f2633, 0x2b3346, 0x3b3f46, 0x161616, 0x5b6470, 0xc8bba0, 0x2d4a73].map(c => new THREE.Color(c));

// 群衆用：1つにまとめた人型（部位ごとに aPart を持たせ、歩行はシェーダーで動かす）
function crowdGeometry() {
  const parts = [];
  const add = (geo, part, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) => {
    geo.scale(sx, sy, sz); if (rx) geo.rotateX(rx); geo.translate(x, y, z);
    const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv');
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(part), 1)); parts.push(g);
  };
  add(new THREE.CapsuleGeometry(0.16, 0.3, 3, 10), 0, 0, 1.17, 0, 1.05, 1, 0.68);
  add(new THREE.CapsuleGeometry(0.15, 0.06, 3, 10), 1, 0, 0.93, 0, 1, 1, 0.75);
  add(new THREE.CapsuleGeometry(0.068, 0.7, 3, 8), 2, -0.085, 0.47, 0);
  add(new THREE.CapsuleGeometry(0.068, 0.7, 3, 8), 3, 0.085, 0.47, 0);
  add(new THREE.CapsuleGeometry(0.05, 0.12, 2, 6), 8, -0.085, 0.06, 0.05, 1, 1, 1, Math.PI / 2);
  add(new THREE.CapsuleGeometry(0.05, 0.12, 2, 6), 9, 0.085, 0.06, 0.05, 1, 1, 1, Math.PI / 2);
  add(new THREE.CapsuleGeometry(0.05, 0.46, 3, 8), 4, -0.22, 1.12, 0);
  add(new THREE.CapsuleGeometry(0.05, 0.46, 3, 8), 5, 0.22, 1.12, 0);
  add(new THREE.SphereGeometry(0.047, 8, 6), 10, -0.22, 0.83, 0);
  add(new THREE.SphereGeometry(0.047, 8, 6), 11, 0.22, 0.83, 0);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), 6, 0, 1.45, 0);
  add(new THREE.SphereGeometry(0.105, 14, 10), 6, 0, 1.58, 0, 0.92, 1.08, 1);
  add(new THREE.SphereGeometry(0.112, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), 7, 0, 1.6, -0.01, 0.95, 1.08, 1.05);
  return mergeGeometries(parts);
}
const crowdUniforms = { uTime: { value: 0 } };
function crowdMaterial() {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.5 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = crowdUniforms.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float aPart; attribute vec3 aShirt; attribute vec3 aPants; attribute vec3 aGait;
      uniform float uTime; varying vec3 vCol;
      mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
      float gPh(){return aGait.x+uTime*aGait.y*6.2831;}
      float swingA(){float s=sin(gPh())*0.42*step(0.001,aGait.y);
        if(aPart==2.||aPart==8.)return s; if(aPart==3.||aPart==9.)return -s;
        if(aPart==4.||aPart==10.)return -s*0.8; if(aPart==5.||aPart==11.)return s*0.8; return 0.;}
      float pivotY(){ if(aPart==2.||aPart==3.||aPart==8.||aPart==9.)return 0.88; if(aPart==4.||aPart==5.||aPart==10.||aPart==11.)return 1.4; return 0.;}`)
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = rotX(swingA())*vec3(normal);')
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position); float py=pivotY();
        if(py>0.){transformed.y-=py;transformed=rotX(swingA())*transformed;transformed.y+=py;}
        transformed.y+=abs(sin(gPh()))*0.025*step(0.001,aGait.y);
        vec3 skin=mix(vec3(.62,.38,.26),vec3(.8,.55,.42),fract(aGait.x*3.7));
        vCol = (aPart==0.||aPart==4.||aPart==5.)?aShirt:(aPart<=3.)?aPants:(aPart==6.||aPart>=10.)?skin:(aPart==7.)?vec3(.035,.026,.022):mix(vec3(.04),vec3(.82),step(.55,fract(aGait.x*5.3)));`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCol;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( vCol, opacity );');
  };
  return m;
}
// 寝転ぶ人など、ポーズを付ける1体（部位ごとの関節つき）
function makeFigure(c) {
  const P = (col, r = .8, sh = .6) => new THREE.MeshPhysicalMaterial({ color: col, roughness: r, sheen: sh, sheenRoughness: .6, sheenColor: new THREE.Color(0x8a8a8a), envMapIntensity: .5 });
  const shirt = P(c.shirt), pants = P(c.pants, .85, .8), hair = P(c.hair, .55, .3), shoe = P(c.shoe, .45, .1);
  const skin = new THREE.MeshPhysicalMaterial({ color: c.skin, roughness: .5, sheen: .4, sheenColor: new THREE.Color(0xffb69a), envMapIntensity: .5 });
  const G = p => { const o = new THREE.Group(); p.add(o); return o; };
  const root = new THREE.Group(), pelvis = G(root); pelvis.position.y = 0.92;
  mesh(new THREE.CapsuleGeometry(0.15, 0.08, 8, 20), pants, 0, 0, 0, pelvis).scale.set(1, .8, .72);
  const chest = G(pelvis);
  mesh(new THREE.CapsuleGeometry(0.155, 0.3, 10, 24), shirt, 0, 0.27, 0, chest).scale.set(1.05, 1, .66);
  mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.12, 20), skin, 0, 0.55, 0, chest);
  const head = G(chest); head.position.y = 0.66;
  mesh(new THREE.SphereGeometry(0.105, 40, 30), skin, 0, 0.04, 0, head).scale.set(.9, 1.1, 1);
  mesh(new THREE.SphereGeometry(0.113, 40, 20, 0, Math.PI * 2, 0, Math.PI * .56), hair, 0, 0.06, -0.01, head).scale.set(.95, 1.08, 1.06);
  mesh(new THREE.SphereGeometry(0.017, 12, 8), skin, 0, 0.03, 0.105, head);
  const arm = s => {
    const sh = G(chest); sh.position.set(s * 0.2, 0.47, 0);
    mesh(new THREE.SphereGeometry(0.062, 20, 14), shirt, 0, 0, 0, sh);
    mesh(new THREE.CapsuleGeometry(0.054, 0.12, 8, 16), shirt, 0, -0.1, 0, sh);
    mesh(new THREE.CapsuleGeometry(0.045, 0.12, 8, 16), skin, 0, -0.22, 0, sh);
    const el = G(sh); el.position.y = -0.3;
    mesh(new THREE.CapsuleGeometry(0.042, 0.2, 8, 16), skin, 0, -0.13, 0, el);
    mesh(new THREE.SphereGeometry(0.047, 16, 12), skin, 0, -0.29, 0, el).scale.set(.8, 1.15, .6);
    return { sh, el };
  };
  const leg = s => {
    const hp = G(pelvis); hp.position.set(s * 0.09, -0.04, 0);
    mesh(new THREE.CapsuleGeometry(0.075, 0.32, 8, 18), pants, 0, -0.22, 0, hp);
    const kn = G(hp); kn.position.y = -0.44;
    mesh(new THREE.CapsuleGeometry(0.06, 0.32, 8, 18), pants, 0, -0.2, 0, kn);
    mesh(new RoundedBoxGeometry(0.1, 0.08, 0.25, 3, 0.035), shoe, 0, -0.42, 0.05, kn);
    return { hp, kn };
  };
  return { root, pelvis, chest, head, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
}

// ================= shared: 空・木・形の部品 =================
// 空：青のグラデーション＋雲（カメラに追従する球）。照明用の環境マップと霧も同時に設定する
// mode：0=昼 / 1=夕焼け / 2=夜（星）。間の値は混ぜる。戻り値の skyMat.uniforms.uMode で後から切り替えられる
function addSky(s, sunDir, fogCol, fogD, mode = 0) {
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunDir }, uMode: { value: mode } }, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform vec3 uSun;uniform float uMode;varying vec3 vDir;
      float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
      float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<6;i++){s+=a*vn(p);p*=2.03;a*=.5;}return s;}
      vec3 pal(vec3 a,vec3 b,vec3 c){return uMode<1.?mix(a,b,uMode):mix(b,c,uMode-1.);}
      void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);
        vec3 hor=pal(vec3(.66,.78,.9)*1.25,vec3(1.2,.58,.3),vec3(.035,.05,.09));
        vec3 zen=pal(vec3(.1,.28,.68)*1.15,vec3(.1,.12,.3),vec3(.006,.01,.03));
        vec3 col=mix(hor,zen,pow(h,uMode>.5?.35:.5));
        float day=1.-smoothstep(1.,2.,uMode);
        float sd=max(dot(d,uSun),0.);col+=pal(vec3(1.,.86,.65),vec3(1.4,.7,.35),vec3(0.))*(pow(sd,400.)*8.+pow(sd,8.)*.3)*day;
        if(d.y>0.){vec2 uv=d.xz/(d.y+.12)*1.4;float c=fb(uv*1.3+vec2(4.,1.));c=smoothstep(.48,.78,c);
          float sh=fb(uv*1.3+vec2(4.05,1.08)+uSun.xz*.04);
          vec3 cc=mix(pal(vec3(.78,.8,.86),vec3(.55,.32,.3),vec3(.02,.025,.04)),pal(vec3(1.12,1.08,1.02),vec3(1.3,.72,.45),vec3(.05,.06,.09)),smoothstep(.4,.7,sh))*1.45;
          col=mix(col,cc,c*smoothstep(.0,.12,d.y)*.9);
          float st=step(.9965,hs(floor(d.xz/(d.y+.3)*260.)))*smoothstep(1.4,2.,uMode)*(1.-c);col+=vec3(.9,.95,1.)*st*1.5;}
        else col=hor*.85;
        gl_FragColor=vec4(col,1.);}`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8000, 64, 32), skyMat); dome.frustumCulled = false;
  dome.onBeforeRender = (r, sc, cam) => { dome.position.copy(cam.position); dome.updateMatrixWorld(); }; s.add(dome);
  const env = envFromSky(skyMat); s.environment = env;
  s.fog = new THREE.FogExp2(fogCol, fogD);
  return { skyMat, env };
}
function envFromSky(mat) { const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(8000, 64, 32), mat)); return pmrem.fromScene(es).texture; }
// 太陽（影つき）。center のまわり ±r を影の範囲にする
function addSun(s, dir, color, intensity, center, r, mapSize = 4096) {
  const sun = new THREE.DirectionalLight(color, intensity);
  sun.target.position.copy(center); sun.position.copy(center).add(dir.clone().normalize().multiplyScalar(r * 2.2)); s.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(mapSize, mapSize);
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 5 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; return sun;
}
// 木の葉のかたまり（ゆがませた球を重ねる）
function canopyGeometry(seed, n = 9) {
  const gs = [], rr = rng(seed);
  for (let i = 0; i < n; i++) {
    const g = new THREE.IcosahedronGeometry(0.9 + rr() * .7, 4), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const v = V(p.getX(k), p.getY(k), p.getZ(k)); v.multiplyScalar(1 + .18 * vnoise(v.x * 2.3 + i, v.z * 2.3 - i)); p.setXYZ(k, v.x, v.y, v.z); }
    g.translate((rr() - .5) * 2, (rr() - .3) * 1.4, (rr() - .5) * 2); gs.push(g);
  }
  const m = mergeGeometries(gs); m.computeVertexNormals(); return m;
}
// 結合用：インデックスなし・頂点色つきにそろえる
function colored(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo, c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2)); return g;
}
function plain(geo) { const g = geo.index ? geo.toNonIndexed() : geo; if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; }
const _mx = new THREE.Matrix4();
const placeG = (g, x, y, z, ry = 0) => g.applyMatrix4(_mx.makeRotationY(ry).setPosition(x, y, z));

// =====================================================================
// A: 交差点の群衆（0〜3.3秒）
// =====================================================================
const A = newScene('A', 0.95, 0.85, 0.05);
const CROWD = [];
let crowdMesh, sparkGeo, sparkMat, SURV = 0, sunA, hemiA;
// 交差点を夕暮れにする（「人手」のカット用）。on=false で昼に戻す
function setADusk(on) {
  sunA.color.set(on ? 0xff7f3a : 0xffe2bd); sunA.intensity = on ? 2.4 : 4.2;
  sunA.position.set(on ? -95 : -55, on ? 17 : 70, on ? 58 : 38);
  hemiA.intensity = on ? 0.22 : 0.55; hemiA.color.set(on ? 0x6f7fb0 : 0xcfe0f2); hemiA.groundColor.set(on ? 0x2a2230 : 0x5a4a3a);
  A.scene.background.set(on ? 0x3b4256 : 0x9fb3c6); A.scene.fog.color.set(on ? 0x3b4256 : 0x9fb3c6);
  A.exposure = on ? 0.72 : 0.95;
}
{
  const s = A.scene, r = rng(101);
  s.background = new THREE.Color(0x9fb3c6); s.fog = new THREE.Fog(0x9fb3c6, 120, 420); s.environment = roomEnv;
  hemiA = new THREE.HemisphereLight(0xcfe0f2, 0x5a4a3a, 0.55); s.add(hemiA);
  const sun = sunA = new THREE.DirectionalLight(0xffe2bd, 4.2);
  sun.position.set(-55, 70, 38); sun.target.position.set(0, 0, 0); s.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 220 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
  // 路面
  const asphaltC = noiseCanvas(1024, '#46484b', .09, 1);
  { const g = asphaltC.getContext('2d'); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},0)`; } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(20,20,22,${.05 + r() * .08})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 40 + r() * 120, 20 + r() * 60, r() * 3, 0, 7); g.fill(); } }
  const asphalt = new THREE.MeshStandardMaterial({ map: tex(asphaltC, true, [14, 14]), roughness: .92, envMapIntensity: .3 });
  const ground = mesh(new THREE.PlaneGeometry(400, 400), asphalt, 0, 0, 0, s); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
  // 歩道（4つの角）
  const paverC = canvas(512, 512); { const g = paverC.getContext('2d'); g.fillStyle = '#a9a39a'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 32) for (let x = 0; x < 512; x += 64) { const o = (y / 32) % 2 ? 32 : 0, v = 150 + r() * 30 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.fillRect(x + o + 1, y + 1, 62, 30); } }
  const paver = new THREE.MeshStandardMaterial({ map: tex(paverC, true, [30, 30]), roughness: .85, envMapIntensity: .3 });
  const curb = new THREE.MeshStandardMaterial({ color: 0xc9c5bd, roughness: .7 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const blk = new THREE.Shape(); const a = 11, b = 160, rr = 4;
    blk.moveTo(a + rr, a); blk.lineTo(b, a); blk.lineTo(b, b); blk.lineTo(a, b); blk.lineTo(a, a + rr); blk.quadraticCurveTo(a, a, a + rr, a);
    const g = new THREE.ExtrudeGeometry(blk, { depth: 0.16, bevelEnabled: false, curveSegments: 12 }); g.rotateX(Math.PI / 2); g.translate(0, 0.16, 0); g.scale(sx, 1, sz);
    if (sx * sz < 0) { const ix = g.index; } // 面の向きは DoubleSide で吸収
    const m = mesh(g, [paver, curb], 0, 0, 0, s); m.material = [paver, curb]; paver.side = THREE.DoubleSide; curb.side = THREE.DoubleSide;
  }
  // 白線（横断歩道・停止線・車線）
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: .65, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const stripeG = [];
  const bar = (cx, cz, w, d) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(cx, 0.012, cz); stripeG.push(g); };
  for (const sx of [-1, 1]) {
    for (let k = -10.2; k <= 10.2; k += 0.9) { bar(sx * 14.7, k, 4.4, 0.45); bar(k, sx * 14.7, 0.45, 4.4); }
    bar(sx * 17.6, 0, 0.4, 22); bar(0, sx * 17.6, 22, 0.4);
    for (let d = 19; d < 150; d += 9) { for (const l of [-5.5, 5.5]) { bar(sx * (d + 2), l, 4, 0.15); bar(l, sx * (d + 2), 0.15, 4); } }
    bar(sx * 85, 0, 132, 0.18); bar(0, sx * 85, 0.18, 132);
  }
  // 斜めの横断（スクランブル）
  for (const dir of [1, -1]) for (let k = -13; k <= 13; k += 0.9) { const g = new THREE.PlaneGeometry(4.2, 0.45); g.rotateX(-Math.PI / 2); g.rotateY(dir * Math.PI / 4); g.translate(k * 0.7071, 0.013, dir * k * 0.7071); stripeG.push(g); }
  const stripes = mesh(mergeGeometries(stripeG), white, 0, 0, 0, s); stripes.castShadow = false;
  // ビル
  const facade = (kind) => {
    const c = canvas(512, 768), g = c.getContext('2d');
    const base = ['#cfc8bc', '#8f9aa6', '#b59f86', '#e6e2da', '#6f747b'][kind]; g.fillStyle = base; g.fillRect(0, 0, 512, 768);
    const rr = rng(kind + 7);
    for (let fl = 0; fl < 4; fl++) for (let b = 0; b < 4; b++) {
      const x = b * 128 + 12, y = fl * 192 + 30, w = 104, h = kind === 1 ? 160 : 120;
      const gg = g.createLinearGradient(x, y, x + w, y + h); const lv = 40 + rr() * 40;
      gg.addColorStop(0, `rgb(${lv + 30},${lv + 45},${lv + 60})`); gg.addColorStop(1, `rgb(${lv},${lv + 8},${lv + 18})`);
      g.fillStyle = gg; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, w, 4); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w / 2 - 2, y, 4, h);
      if (rr() < .15) { g.fillStyle = `rgba(255,230,180,${.25 + rr() * .2})`; g.fillRect(x + 4, y + 4, w - 8, h - 8); }
    }
    return tex(c);
  };
  const facades = [0, 1, 2, 3, 4].map(k => new THREE.MeshStandardMaterial({ map: facade(k), roughness: .55, metalness: .1, envMapIntensity: .6 }));
  const roofM = new THREE.MeshStandardMaterial({ map: tex(noiseCanvas(256, '#8d8f90', .12, 9), true, [3, 3]), roughness: .9 });
  const unitM = new THREE.MeshStandardMaterial({ color: 0xd8dadc, roughness: .5, envMapIntensity: .5 });
  const screenC = canvas(512, 768); { const g = screenC.getContext('2d'); const gg = g.createLinearGradient(0, 0, 512, 768); gg.addColorStop(0, '#ff5f8a'); gg.addColorStop(.5, '#7a5cff'); gg.addColorStop(1, '#22d3ee'); g.fillStyle = gg; g.fillRect(0, 0, 512, 768); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '900 120px sans-serif'; g.textAlign = 'center'; g.fillText('100', 256, 420); }
  const screenM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex(screenC), emissiveIntensity: 1.6 });
  const building = (x0, z0, w, d, h, kind) => {
    const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv, nm = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) { const ny = Math.abs(nm.getY(i)); if (ny < .5) { const horiz = Math.abs(nm.getX(i)) > .5 ? d : w; uv.setXY(i, uv.getX(i) * horiz / 8, uv.getY(i) * h / 12); } }
    const mats = [facades[kind], facades[kind], roofM, roofM, facades[kind], facades[kind]];
    const b = mesh(geo, mats, x0 + w / 2, h / 2, z0 + d / 2, s);
    mesh(new THREE.BoxGeometry(w + 0.3, 0.8, d + 0.3), roofM, x0 + w / 2, h + 0.4, z0 + d / 2, s);
    for (let i = 0; i < 2 + (r() * 4 | 0); i++) mesh(new RoundedBoxGeometry(1.6 + r() * 2, 1 + r() * 1.2, 1.6 + r() * 2, 2, .15), unitM, x0 + 2 + r() * (w - 4), h + 1.2, z0 + 2 + r() * (d - 4), s);
    return b;
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    let x = 19;
    while (x < 120) {
      const w = 11 + r() * 9; let z = 19;
      while (z < 120) { const d = 11 + r() * 9, h = 14 + r() * 42 * (1 - (x + z) / 400); const bx = sx > 0 ? x : -x - w, bz = sz > 0 ? z : -z - d; building(bx, bz, w - 0.6, d - 0.6, h, (r() * 5) | 0); z += d; }
      x += w;
    }
  }
  // 交差点に面した大型ビジョン
  const sc = mesh(new THREE.PlaneGeometry(10, 15), screenM, -19.3, 26, -26, s); sc.rotation.y = Math.PI / 4; sc.castShadow = false;
  // 街路樹
  const canopyG = (() => { const gs = []; const rr = rng(5); for (let i = 0; i < 9; i++) { const g = new THREE.IcosahedronGeometry(0.9 + rr() * .7, 2); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const v = V(p.getX(k), p.getY(k), p.getZ(k)); v.multiplyScalar(1 + .18 * vnoise(v.x * 2.3 + i, v.z * 2.3 - i)); p.setXYZ(k, v.x, v.y, v.z); } g.translate((rr() - .5) * 2, (rr() - .3) * 1.4, (rr() - .5) * 2); gs.push(g); } const m = mergeGeometries(gs); m.computeVertexNormals(); return m; })();
  const trees = [];
  for (const sx of [-1, 1]) for (let d = 24; d < 110; d += 8.5) { trees.push([sx * d, 15.3], [15.3, sx * d], [sx * d, -15.3], [-15.3, sx * d]); }
  const can = new THREE.InstancedMesh(canopyG, new THREE.MeshStandardMaterial({ color: 0x4f7a39, roughness: .85, envMapIntensity: .4 }), trees.length);
  const trk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.2, 3, 8), new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: .9 }), trees.length);
  const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc3 = V(1, 1, 1);
  trees.forEach(([x, z], i) => { const k = 0.85 + r() * .4; q.setFromAxisAngle(V(0, 1, 0), r() * 6); tm.compose(V(x, 4.2 * k, z), q, V(k, k, k)); can.setMatrixAt(i, tm); can.setColorAt(i, new THREE.Color().setHSL(.27 + r() * .05, .35, .5 + r() * .15)); tm.compose(V(x, 1.5, z), q, sc3); trk.setMatrixAt(i, tm); });
  can.castShadow = trk.castShadow = true; can.receiveShadow = true; s.add(can, trk);
  // 信号待ちの車
  const carCols = [0xf4f4f2, 0x111214, 0xb8bcc2, 0x9e1b20, 0x23395d, 0xf0c419, 0x2f6b4f, 0xe9e6df];
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x15181c, roughness: .08, metalness: .2, clearcoat: 1, envMapIntensity: 1.2 });
  const tireM = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .8 });
  const car = (x, z, ry, col) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; s.add(g);
    const paint = new THREE.MeshPhysicalMaterial({ color: col, roughness: .35, metalness: .4, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1 });
    mesh(new RoundedBoxGeometry(1.78, 0.72, 4.45, 4, .22), paint, 0, 0.62, 0, g);
    mesh(new RoundedBoxGeometry(1.58, 0.62, 2.35, 4, .26), glassM, 0, 1.18, -0.2, g);
    mesh(new RoundedBoxGeometry(1.5, 0.07, 1.75, 2, .03), paint, 0, 1.49, -0.25, g);
    [[-.82, 1.4], [.82, 1.4], [-.82, -1.4], [.82, -1.4]].forEach(([wx, wz]) => { const w = mesh(new THREE.CylinderGeometry(.33, .33, .24, 18), tireM, wx, .33, wz, g); w.rotation.z = Math.PI / 2; });
  };
  const lanes = [2.75, 8.25];
  for (const L of lanes) for (let k = 0; k < 4; k++) {
    if (r() < .85) car(-L, 21.5 + k * 6.6, 0, carCols[(r() * 8) | 0]);
    if (r() < .85) car(L, -21.5 - k * 6.6, Math.PI, carCols[(r() * 8) | 0]);
    if (r() < .85) car(21.5 + k * 6.6, L, Math.PI / 2, carCols[(r() * 8) | 0]);
    if (r() < .85) car(-21.5 - k * 6.6, -L, -Math.PI / 2, carCols[(r() * 8) | 0]);
  }
  // 群衆
  const P = (x, z, vx, vz, walk) => CROWD.push({ x, z, vx, vz, walk });
  const along = (n, f) => { for (let i = 0; i < n; i++) f(r()); };
  for (const sx of [-1, 1]) {
    along(430, u => { const dir = r() < .5 ? 1 : -1, sp = 1.1 + r() * .45; P(sx * (12.6 + r() * 4.2), -12 + u * 24, (r() - .5) * .15, dir * sp, true); });
    along(430, u => { const dir = r() < .5 ? 1 : -1, sp = 1.1 + r() * .45; P(-12 + u * 24, sx * (12.6 + r() * 4.2), dir * sp, (r() - .5) * .15, true); });
  }
  for (const dg of [1, -1]) along(320, u => { const t = -12 + u * 24, off = (r() - .5) * 3.6, dir = r() < .5 ? 1 : -1, sp = 1.15 + r() * .4; P(t * .7071 + off * .7071 * dg * -1, dg * t * .7071 + off * .7071, dir * sp * .7071, dir * dg * sp * .7071, true); });
  along(260, () => { const a = r() * 6.28, sp = 1 + r() * .5; P((r() - .5) * 20, (r() - .5) * 20, Math.cos(a) * sp, Math.sin(a) * sp, true); });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) along(150, () => { const x = sx * (11.8 + r() * 6), z = sz * (11.8 + r() * 6); if (Math.abs(x) < 12.2 && Math.abs(z) < 12.2) return; const w = r() < .35, a = r() * 6.28; P(x, z, w ? Math.cos(a) * .9 : 0, w ? Math.sin(a) * .9 : 0, w); });
  const n = CROWD.length;
  const geo = crowdGeometry();
  const aShirt = new Float32Array(n * 3), aPants = new Float32Array(n * 3), aGait = new Float32Array(n * 3);
  // 交差点に最後まで残る1人（2.9秒に交差点の中央付近を歩いている人）と、消える順番（しきい値）
  let bd = 1e9; CROWD.forEach((p, i) => { if (!p.walk) return; const d = Math.hypot(p.x + p.vx * 2.9 - 1.0, p.z + p.vz * 2.9 - 2.5); if (d < bd) { bd = d; SURV = i; } });
  const keep = new Set([SURV]);
  CROWD.forEach((p, i) => {
    const sc = SHIRTS[(r() * SHIRTS.length) | 0], pc = PANTS[(r() * PANTS.length) | 0];
    aShirt.set([sc.r, sc.g, sc.b], i * 3); aPants.set([pc.r, pc.g, pc.b], i * 3);
    const sp = Math.hypot(p.vx, p.vz);
    aGait.set([r() * 6.28, p.walk ? sp * 0.92 : 0, 0], i * 3);
    p.keep = keep.has(i); p.th = p.keep ? -1 : r(); p.h = 0.92 + r() * 0.16; p.ry = sp > .01 ? Math.atan2(p.vx, p.vz) : r() * 6.28;
  });
  aShirt.set([0.75, 0.03, 0.02], SURV * 3); // 最後の1人は赤い服で目立たせる
  geo.setAttribute('aShirt', new THREE.InstancedBufferAttribute(aShirt, 3));
  geo.setAttribute('aPants', new THREE.InstancedBufferAttribute(aPants, 3));
  geo.setAttribute('aGait', new THREE.InstancedBufferAttribute(aGait, 3));
  crowdMesh = new THREE.InstancedMesh(geo, crowdMaterial(), n);
  crowdMesh.castShadow = crowdMesh.receiveShadow = true; crowdMesh.frustumCulled = false; s.add(crowdMesh);
  // 消えるときの光の粒
  sparkGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(n * 3 * 3), st = new Float32Array(n * 3), ss = new Float32Array(n * 3);
  CROWD.forEach((p, i) => { for (let k = 0; k < 3; k++) { st[i * 3 + k] = 999; ss[i * 3 + k] = r(); } });
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sparkGeo.setAttribute('aT', new THREE.BufferAttribute(st, 1)); sparkGeo.setAttribute('aS', new THREE.BufferAttribute(ss, 1));
  sparkMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aT,aS;uniform float uTime;varying float vA;
      void main(){float age=uTime-aT;vec3 p=position;float k=clamp(age/.75,0.,1.);
        p.y+=0.6+k*(1.6+aS*1.4);p.x+=sin(aS*40.+age*6.)*.25*k;p.z+=cos(aS*31.+age*5.)*.25*k;
        vA=(age>0.&&age<.75)?(1.-k)*(1.-k):0.;vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_PointSize=(18.+aS*20.)*(1.-k*.6)*(60./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vA;void main(){vec2 d=gl_PointCoord-.5;float a=smoothstep(.5,0.,length(d));a=a*a;gl_FragColor=vec4(vec3(1.,.97,.85)*a*vA*2.2,a*vA);}`,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; sparks.renderOrder = 9; s.add(sparks); A.fx.push(sparks);
}
// 人口の表示（80億→100）と、消える割合
const POP0 = 8e9, POP1 = 100, CT0 = 0.55, CT1 = 2.75;
function popAt(t) { const u = ease((t - CT0) / (CT1 - CT0)); return Math.round(Math.exp(lerp(Math.log(POP0), Math.log(POP1), u))); }
function fracAt(t) { return ease((t - CT0) / (CT1 - CT0)); } // 0→1：消えた割合
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = V(0, 1, 0);
function updateCrowd(t) {
  crowdUniforms.uTime.value = t; sparkMat.uniforms.uTime.value = t;
  const f = fracAt(t), sp = sparkGeo.attributes.position, st = sparkGeo.attributes.aT;
  const span = CT1 - CT0;
  CROWD.forEach((p, i) => {
    const x = p.x + p.vx * t, z = p.z + p.vz * t;
    // しきい値 th を、消える時刻に変換（f が th を超えた時刻）
    let k = 0, tg = 999;
    if (!p.keep) { tg = CT0 + span * invEase(p.th); k = smooth(tg, tg + 0.16, t); }
    // 消えきった人は大きさ0にして完全に描かない（平たい欠片が地面に残らないように）
    const gone = k >= 0.999, sy = gone ? 1e-5 : p.h * (1 - k), sxz = gone ? 1e-5 : 1 - k * 0.55;
    _q.setFromAxisAngle(_up, p.ry); _m4.compose(V(x, 0.16 * inSidewalk(x, z), z), _q, V(sxz, Math.max(sy, 1e-5), sxz)); crowdMesh.setMatrixAt(i, _m4);
    for (let j = 0; j < 3; j++) { sp.setXYZ(i * 3 + j, x, 0, z); st.setX(i * 3 + j, tg + j * 0.05); }
  });
  crowdMesh.instanceMatrix.needsUpdate = true; sp.needsUpdate = true; st.needsUpdate = true;
}
function inSidewalk(x, z) { return (Math.abs(x) > 11 && Math.abs(z) > 11) ? 1 : 0; }
function invEase(y) { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; }

// =====================================================================
// B: 日本4個分（3.3〜8.25秒）
// =====================================================================
const B = newScene('B', 1.0);
const JAPANS = [];
const GRID = [[-7.8, -8.9], [7.8, -8.9], [-7.8, 8.9], [7.8, 8.9]];
{
  const s = B.scene; s.environment = roomEnv; s.background = new THREE.Color(0x050b14);
  // 海（グラデーション＋緯線・経線）
  const S = 2048, oc = canvas(S, S), g = oc.getContext('2d');
  const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * .62); rg.addColorStop(0, '#16355a'); rg.addColorStop(.55, '#0b1d33'); rg.addColorStop(1, '#040912');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(140,190,240,.14)'; g.lineWidth = 2; const step = S / 140 * 5.55;
  for (let x = S / 2 % step; x < S; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
  for (let y = S / 2 % step; y < S; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  const rr = rng(4); for (let i = 0; i < 60000; i++) { g.fillStyle = `rgba(160,200,255,${rr() * .05})`; g.fillRect(rr() * S, rr() * S, 2, 2); }
  const ot = tex(oc);
  const ocean = mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ map: ot, emissive: 0xffffff, emissiveMap: ot, emissiveIntensity: .55, roughness: .45, metalness: .1, envMapIntensity: .25 }), 0, -0.02, 0, s);
  ocean.rotation.x = -Math.PI / 2; ocean.castShadow = false;
  s.add(new THREE.HemisphereLight(0xdfeaff, 0x203040, 0.6));
  const sun = new THREE.DirectionalLight(0xfff3e2, 3.2); sun.position.set(-30, 60, -20); s.add(sun);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 10, far: 140 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 6;
  // 日本列島（経度・緯度の概略点を滑らかにつなぐ。1単位＝100km）
  const LON0 = 137.5, LAT0 = 38.2, KX = Math.cos(37 * Math.PI / 180) * 1.11, KY = 1.11;
  const ISL = {
    hokkaido: [[141.94, 45.52], [142.6, 44.9], [143.3, 44.32], [144.0, 44.05], [144.8, 43.95], [145.3, 44.35], [145.1, 43.9], [145.3, 43.55], [145.8, 43.38], [145.3, 43.17], [144.4, 42.98], [143.6, 42.6], [143.25, 41.92], [142.5, 42.25], [141.7, 42.6], [141.0, 42.35], [140.6, 42.12], [140.85, 42.0], [141.18, 41.8], [140.73, 41.77], [140.1, 41.42], [140.12, 41.87], [139.85, 42.45], [140.5, 42.98], [140.35, 43.33], [141.0, 43.2], [141.35, 43.3], [141.63, 43.95], [141.65, 44.88]],
    honshu: [[140.91, 41.53], [141.46, 41.43], [141.4, 40.9], [141.5, 40.5], [141.8, 40.2], [142.07, 39.55], [141.9, 39.27], [141.65, 38.9], [141.5, 38.3], [141.0, 38.25], [140.98, 37.8], [140.95, 37.0], [140.65, 36.6], [140.6, 36.3], [140.87, 35.72], [140.4, 35.3], [139.85, 34.9], [139.82, 35.3], [140.1, 35.6], [139.8, 35.65], [139.65, 35.45], [139.62, 35.15], [139.15, 35.25], [139.07, 35.08], [138.85, 34.6], [138.85, 35.08], [138.4, 34.95], [138.22, 34.6], [137.7, 34.68], [137.0, 34.6], [136.85, 35.05], [136.6, 34.95], [136.85, 34.48], [136.8, 34.25], [136.2, 34.05], [135.76, 33.44], [135.35, 33.68], [135.15, 34.2], [135.4, 34.65], [135.2, 34.68], [134.98, 34.65], [134.7, 34.78], [133.9, 34.55], [133.35, 34.4], [132.45, 34.35], [132.2, 34.15], [131.8, 34.0], [131.25, 33.95], [130.92, 33.95], [131.15, 34.4], [131.4, 34.42], [131.85, 34.68], [132.08, 34.9], [132.65, 35.4], [133.05, 35.57], [133.33, 35.45], [134.2, 35.55], [134.6, 35.65], [135.1, 35.75], [135.35, 35.5], [136.05, 35.65], [136.0, 36.1], [136.6, 36.6], [136.7, 36.9], [136.85, 37.3], [137.35, 37.5], [137.0, 37.05], [137.2, 36.78], [137.85, 37.05], [138.25, 37.2], [139.05, 37.92], [139.45, 38.25], [139.85, 38.9], [139.95, 39.6], [139.7, 39.95], [140.0, 40.2], [139.95, 40.65], [140.35, 41.25], [140.75, 40.83], [141.15, 40.88], [141.2, 41.28], [140.8, 41.15]],
    shikoku: [[134.6, 34.25], [134.6, 34.05], [134.7, 33.9], [134.4, 33.6], [134.18, 33.25], [133.55, 33.5], [133.3, 33.38], [133.02, 32.72], [132.7, 32.95], [132.55, 33.22], [132.0, 33.34], [132.4, 33.45], [132.75, 33.85], [133.0, 34.07], [133.3, 33.97], [133.65, 34.13], [134.05, 34.35], [134.4, 34.23]],
    kyushu: [[130.97, 33.95], [131.0, 33.72], [131.2, 33.6], [131.7, 33.6], [131.5, 33.3], [131.65, 33.25], [132.0, 33.25], [131.95, 32.95], [131.7, 32.6], [131.65, 32.4], [131.45, 31.9], [131.4, 31.6], [131.35, 31.37], [131.1, 31.45], [130.66, 31.0], [130.75, 31.55], [130.6, 31.2], [130.5, 31.18], [130.3, 31.25], [130.2, 31.6], [130.2, 32.0], [130.38, 32.2], [130.6, 32.5], [130.65, 32.8], [130.45, 33.0], [130.4, 33.15], [130.3, 33.2], [130.1, 33.1], [130.05, 32.85], [130.37, 32.78], [130.2, 32.6], [130.2, 32.73], [129.87, 32.75], [129.75, 32.58], [129.7, 33.0], [129.72, 33.17], [129.55, 33.35], [129.88, 33.32], [129.97, 33.47], [130.2, 33.6], [130.4, 33.6], [130.5, 33.82]],
    sado: [[138.25, 38.32], [138.5, 38.3], [138.55, 38.1], [138.35, 37.82], [138.22, 37.95]],
  };
  const proj = ([lo, la]) => new THREE.Vector3((lo - LON0) * KX, (la - LAT0) * KY, 0);
  // 地表のテクスチャ（緑〜茶）
  const TS = 512, tc = canvas(TS, TS), tg = tc.getContext('2d'), img = tg.createImageData(TS, TS);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const n = fbm(x / 60, y / 60, 5), m = fbm(x / 22 + 9, y / 22, 3);
    const c0 = [86, 128, 66], c1 = [128, 118, 84], c2 = [62, 104, 56];
    const k = clamp(n * .9 + .45, 0, 1), k2 = clamp(m * .6 + .5, 0, 1);
    const i = (y * TS + x) * 4;
    for (let ch = 0; ch < 3; ch++) img.data[i + ch] = lerp(lerp(c2[ch], c0[ch], k2), c1[ch], k * k);
    img.data[i + 3] = 255;
  }
  tg.putImageData(img, 0, 0);
  const landT = tex(tc, true); landT.wrapS = landT.wrapT = THREE.RepeatWrapping; landT.repeat.set(1 / 9, 1 / 9);
  const landM = new THREE.MeshStandardMaterial({ map: landT, roughness: .8, envMapIntensity: .6 });
  const sideM = new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: .7, envMapIntensity: .5 });
  const rimM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x8fd8ff, emissiveIntensity: 2.6 });
  const japanGroup = () => {
    const g = new THREE.Group();
    for (const k in ISL) {
      const pts = ISL[k].map(proj), curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', .5);
      const sp = curve.getPoints(k === 'sado' ? 40 : 260);
      const shape = new THREE.Shape(sp.map(p => new THREE.Vector2(p.x, p.y)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 3, curveSegments: 4 });
      geo.rotateX(-Math.PI / 2);
      mesh(geo, [landM, sideM], 0, 0, 0, g);
      const rim = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp.map(p => V(p.x, 0.4, -p.y)), true), 400, .035, 6, true), rimM, 0, 0, 0, g);
      rim.castShadow = false;
    }
    return g;
  };
  for (let i = 0; i < 4; i++) { const g = japanGroup(); g.position.set(GRID[i][0], 0, GRID[i][1]); s.add(g); JAPANS.push(g); }
}
const LAND_T = [3.35, 5.75, 6.0, 6.25];
function updateJapans(t) {
  JAPANS.forEach((g, i) => {
    const t0 = LAND_T[i], k = (t - t0) / 0.45;
    g.visible = t >= t0;
    if (i === 0) { const e = easeOut((t - t0) / 0.6); g.position.y = lerp(-0.6, 0, e); g.scale.setScalar(lerp(.9, 1, e)); }
    else { const e = easeBack(k); g.position.y = lerp(14, 0, clamp(e, 0, 1.2)); g.rotation.y = (1 - clamp(k, 0, 1)) * 0.35 * (i % 2 ? 1 : -1); g.scale.setScalar(lerp(.7, 1, clamp(e, 0, 1))); }
  });
}

// =====================================================================
// C: 広大な草原（8.25〜12.3秒）
// =====================================================================
const C = newScene('C', 0.72, 0.3);
const SUN_DIR = V(0.62, 0.62, 0.48).normalize();
function terrainH(x, z) {
  const r = Math.hypot(x, z);
  let h = fbm(x * 0.03, z * 0.03, 3) * 0.3;
  h += fbm(x * 0.0016 + 3.1, z * 0.0016 - 1.7, 5) * 55 * smooth(70, 480, r);
  const m = 1 - Math.abs(fbm(x * 0.0007 + 9, z * 0.0007 + 4, 5)); h += m * m * 560 * smooth(1300, 2700, r);
  return h - 0.0;
}
const grassUniforms = { uTime: { value: 0 } };
let figureC;
{
  const s = C.scene;
  addSky(s, SUN_DIR, 0xb4c8dc, 0.00021);
  s.add(new THREE.HemisphereLight(0xc4d8f0, 0x6a7a40, 0.9));
  const sun = new THREE.DirectionalLight(0xffe4bd, 4.4); sun.position.copy(SUN_DIR).multiplyScalar(90); s.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 220 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
  // 地形
  const tg = new THREE.PlaneGeometry(9000, 9000, 420, 420); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = terrainH(x, z); p.setY(i, h);
    const n = fbm(x * .004 + 7, z * .004, 4), hm = smooth(80, 380, h);
    c.setRGB(lerp(.12, .21, n * .5 + .5), lerp(.21, .3, n * .5 + .5), lerp(.045, .07, n * .5 + .5)).lerp(new THREE.Color(.18, .24, .17), hm);
    col.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  const detail = tex(noiseCanvas(512, '#ffffff', .22, 3), true, [900, 900]);
  const terrain = mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: .95, envMapIntensity: .45 }), 0, 0, 0, s); terrain.castShadow = false;
  // 草（足元の半径50m）
  const bg = new THREE.BufferGeometry(); const segs = 4, bp = [], bu = [], bi = [];
  for (let j = 0; j <= segs; j++) { const v = j / segs, w = 0.022 * (1 - v * .9); bp.push(-w, v, 0, w, v, 0); bu.push(0, v, 1, v); }
  for (let j = 0; j < segs; j++) { const a = j * 2; bi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); bg.setIndex(bi); bg.computeVertexNormals();
  const NG = 330000, gm = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .75, envMapIntensity: .5 });
  gm.onBeforeCompile = sh => {
    sh.uniforms.uTime = grassUniforms.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;varying float vH;')
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(vec3(0.,1.,0.)+vec3(normal)*0.45);')
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position); vH=uv.y;
        vec3 ip=vec3(instanceMatrix[3]); float w=sin(uTime*1.6+ip.x*.35+ip.z*.22)*.5+sin(uTime*2.7+ip.x*.9)*.25;
        transformed.z += (0.25+w*0.35)*uv.y*uv.y; transformed.x += w*0.08*uv.y*uv.y;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vH;')
      // 両面描画でも、裏面で法線を反転させない（裏から見た草が黒くなるのを防ぐ）
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize( vNormal );')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.3,1.25,vH*vH*(3.-2.*vH));');
  };
  const grass = new THREE.InstancedMesh(bg, gm, NG); const r = rng(77), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), gc = new THREE.Color();
  for (let i = 0; i < NG; i++) {
    // 近く（〜50m）は細かく密に、遠く（〜170m）は太く・まばらにして、境目を消す
    const outer = i >= 160000, rad = outer ? 45 + 230 * Math.pow(r(), 0.85) : 50 * Math.sqrt(r()), a = r() * 6.283, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    if (Math.abs(x) < 0.8 && Math.abs(z) < 1.15) { i--; continue; } // シートの上は空ける
    const h = (0.22 + r() * 0.32) * (outer ? 1.5 : 1), wd = outer ? 1 + (rad - 45) / 30 : 1; q.setFromAxisAngle(V(0, 1, 0), r() * 6.283);
    m4.compose(V(x, terrainH(x, z) - 0.02, z), q, V(wd, h, wd)); grass.setMatrixAt(i, m4);
    const dry = r() < .12; gc.setRGB(lerp(.2, .36, r()) + (dry ? .14 : 0), lerp(.36, .5, r()) + (dry ? .05 : 0), lerp(.07, .13, r())); grass.setColorAt(i, gc);
  }
  grass.receiveShadow = true; grass.frustumCulled = false; s.add(grass);
  // 野の花
  const NF = 1400, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshStandardMaterial({ roughness: .6 }), NF);
  const FC = [0xffffff, 0xf7e27a, 0xc9b6ff, 0xfff4e0].map(c => new THREE.Color(c));
  for (let i = 0; i < NF; i++) { const rad = 45 * Math.sqrt(r()), a = r() * 6.283, x = Math.cos(a) * rad, z = Math.sin(a) * rad; if (Math.abs(x) < 0.9 && Math.abs(z) < 1.2) continue; m4.compose(V(x, terrainH(x, z) + 0.22 + r() * .2, z), q, V(1, 1, 1)); fl.setMatrixAt(i, m4); fl.setColorAt(i, FC[(r() * 4) | 0]); }
  s.add(fl);
  // 一本の木
  const tree = new THREE.Group(); const tx = -24, tz = -34; tree.position.set(tx, terrainH(tx, tz), tz); s.add(tree);
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: .95 });
  mesh(new THREE.CylinderGeometry(0.35, 0.6, 5.5, 14), bark, 0, 2.75, 0, tree);
  [[.9, 4.5, .4, -.7], [-.8, 4.8, -.3, .8], [.2, 5.2, .9, .2]].forEach(([x, y, z, rz]) => { const b = mesh(new THREE.CylinderGeometry(0.12, 0.22, 3, 10), bark, x, y, z, tree); b.rotation.set(z * .6, 0, rz); });
  const fol = []; const rf = rng(12);
  for (let i = 0; i < 55; i++) { const g = new THREE.IcosahedronGeometry(1 + rf() * 1.1, 3), pp = g.attributes.position; for (let k = 0; k < pp.count; k++) { const v = V(pp.getX(k), pp.getY(k), pp.getZ(k)); v.multiplyScalar(1 + .22 * vnoise(v.x * 1.8 + i, v.y * 1.8 + v.z)); pp.setXYZ(k, v.x, v.y, v.z); } const a = rf() * 6.28, rr = rf() * 4.2; g.translate(Math.cos(a) * rr, 6.2 + rf() * 3.6 - rr * .25, Math.sin(a) * rr); fol.push(g); }
  const fg = mergeGeometries(fol); fg.computeVertexNormals();
  mesh(fg, new THREE.MeshStandardMaterial({ color: 0x3c6428, roughness: .85, envMapIntensity: .5 }), 0, 0, 0, tree);
  // シートと、寝転ぶ人
  const pc = canvas(512, 512); { const g = pc.getContext('2d'); g.fillStyle = '#f3efe6'; g.fillRect(0, 0, 512, 512); g.fillStyle = 'rgba(196,48,44,.75)'; for (let i = 0; i < 512; i += 64) { g.fillRect(i, 0, 28, 512); g.fillRect(0, i, 512, 28); } g.fillStyle = 'rgba(140,20,20,.35)'; for (let i = 0; i < 512; i += 64) for (let j = 0; j < 512; j += 64) g.fillRect(i, j, 28, 28); }
  const blanket = mesh(new THREE.PlaneGeometry(1.5, 2.2, 10, 10), new THREE.MeshStandardMaterial({ map: tex(pc, true, [2, 3]), roughness: .9, side: THREE.DoubleSide }), 0, terrainH(0, 0) + 0.03, 0, s);
  blanket.rotation.x = -Math.PI / 2; blanket.rotation.z = 0.08; blanket.castShadow = false;
  const f = makeFigure({ shirt: 0xf1efe9, pants: 0x34507a, skin: 0xe0b394, hair: 0x2a1d16, shoe: 0xf2f2f2 });
  f.root.rotation.x = -Math.PI / 2; f.root.position.set(0.05, terrainH(0, 0) + 0.13, 0.86);
  f.armR.sh.rotation.z = 2.55; f.armR.el.rotation.z = 2.0; f.armL.sh.rotation.z = -2.55; f.armL.el.rotation.z = -2.0;
  f.legR.hp.rotation.x = -0.75; f.legR.kn.rotation.x = 1.45; f.legL.hp.rotation.x = -0.05; f.legL.hp.rotation.z = -0.06;
  f.head.rotation.x = 0.15;
  s.add(f.root); figureC = f;
}

// =====================================================================
// T: 空っぽの住宅街と、選び放題のピン（12.3〜21.45秒）
// =====================================================================
const T = newScene('T', 0.8, 0.7, 0.1);
const townUni = { uNight: { value: 0 }, uTime: { value: 0 } };
const LIGHTS_OFF0 = 38.3; // 夜の街の明かりが消え始める時刻（ここから波のように広がる）
const PINS = []; let pinMesh, goldPin, goldRings = [];
const TARGET = V(-22, 0, -112);
{
  const s = T.scene, r = rng(303), sunDir = V(-0.45, 0.8, 0.42);
  const sky = addSky(s, sunDir, 0xbcd0e2, 0.0011);
  T.skyMat = sky.skyMat; T.envDay = sky.env; sky.skyMat.uniforms.uMode.value = 2; T.envNight = envFromSky(sky.skyMat); sky.skyMat.uniforms.uMode.value = 0;
  T.hemi = new THREE.HemisphereLight(0xd2e2f5, 0x6d6a58, 0.8); s.add(T.hemi);
  T.sun = addSun(s, sunDir, 0xfff1dc, 4.3, V(0, 0, -90), 240);
  // 地面（芝）と道路
  const grassM = new THREE.MeshStandardMaterial({ map: tex(noiseCanvas(512, '#5f7a3e', .12, 21), true, [400, 400]), roughness: .95, envMapIntensity: .3 });
  const gnd = mesh(new THREE.PlaneGeometry(3000, 3000), grassM, 0, -0.02, 0, s); gnd.rotation.x = -Math.PI / 2; gnd.castShadow = false;
  const asph = new THREE.MeshStandardMaterial({ map: tex(noiseCanvas(512, '#55575b', .1, 22), true, [1, 60]), roughness: .9, envMapIntensity: .3 });
  const roadsG = [], G0 = -8, G1 = 8, P = 44;
  for (let i = G0; i <= G1; i++) { const a = new THREE.PlaneGeometry(6, (G1 - G0) * P); a.rotateX(-Math.PI / 2); a.translate(i * P, 0.01, 0); roadsG.push(plain(a)); const b = new THREE.PlaneGeometry((G1 - G0) * P, 6); b.rotateX(-Math.PI / 2); b.translate(0, 0.011, i * P); roadsG.push(plain(b)); }
  mesh(mergeGeometries(roadsG), asph, 0, 0, 0, s).castShadow = false;
  // 家（形ごとに頂点色で塗り分け、材質ごとに1つのメッシュへまとめる）
  const WALLS = [0xf2efe8, 0xe6dccb, 0xd8d4cc, 0xc9b9a2, 0xeae6df, 0xb9b2a6, 0xa9b0b4, 0xf4ece0];
  const ROOFS = [0x3a3f45, 0x4a3a32, 0x2f3b4a, 0x5a5a58, 0x6b4a3a, 0x444b40];
  const wallG = [], roofG = [], glassG = [], frameG = [], lotG = [], treeP = [], pinP = [];
  const isTower = (cx, cz) => cx > 120 && cx < 270 && cz > -320 && cz < -165;
  // 夜の窓明かり：窓ごとに「明るさ」と「消える時刻」を持たせる（家の配置を変えないよう乱数は別系列）
  const rw = rng(909);
  const winAttr = (g, m) => {
    const n = g.attributes.position.count, a = new Float32Array(n * 2), lit = rw() < .72 ? .55 + rw() * .8 : 0;
    const off = LIGHTS_OFF0 + Math.hypot(m.elements[12] - 40, m.elements[14] + 40) * 0.0042 + rw() * .3;
    for (let i = 0; i < n; i++) { a[i * 2] = lit; a[i * 2 + 1] = off; }
    g.setAttribute('aWin', new THREE.BufferAttribute(a, 2)); return g;
  };
  const win = (lx, ly, face, w, d, m, ww = 1.5, wh = 1.15) => {
    // face: 0=前(+z) 1=後(-z) 2=右(+x) 3=左(-x)
    const g = new THREE.PlaneGeometry(ww, wh), f = new THREE.PlaneGeometry(ww + .22, wh + .22);
    const rot = [0, Math.PI, Math.PI / 2, -Math.PI / 2][face];
    const off = [[lx, ly, d / 2 + .03], [lx, ly, -d / 2 - .03], [w / 2 + .03, ly, lx], [-w / 2 - .03, ly, lx]][face];
    for (const [geo, arr, e] of [[g, glassG, .012], [f, frameG, 0]]) { geo.rotateY(rot); const o = off.slice(); if (face === 0) o[2] += e; if (face === 1) o[2] -= e; if (face === 2) o[0] += e; if (face === 3) o[0] -= e; geo.translate(o[0], o[1], o[2]); geo.applyMatrix4(m); arr.push(arr === frameG ? colored(geo, 0xf4f4f2) : winAttr(plain(geo), m)); }
  };
  const house = (cx, cz, ry) => {
    const w = 8 + r() * 3, d = 7.5 + r() * 2.5, two = r() > .12, hw = two ? 5.8 : 3.0, wc = WALLS[(r() * WALLS.length) | 0];
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(cx, 0, cz);
    const body = new THREE.BoxGeometry(w, hw, d); body.translate(0, hw / 2, 0); body.applyMatrix4(m); wallG.push(colored(body, wc));
    let top = hw;
    if (r() < .75) { // 切妻屋根
      const W = w + .9, RH = 1.3 + r() * .9, sh = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, RH)]);
      const rg = new THREE.ExtrudeGeometry(sh, { depth: d + .9, bevelEnabled: false }); rg.translate(0, hw, -(d + .9) / 2); rg.applyMatrix4(m); roofG.push(colored(rg, ROOFS[(r() * ROOFS.length) | 0])); top = hw + RH;
    } else { const rg = new THREE.BoxGeometry(w + .3, .45, d + .3); rg.translate(0, hw + .22, 0); rg.applyMatrix4(m); wallG.push(colored(rg, new THREE.Color(wc).multiplyScalar(.9).getHex())); top = hw + .45; }
    const nw = w > 9.6 ? 3 : 2, floors = two ? [1.6, 4.4] : [1.6];
    floors.forEach(y => { for (let i = 0; i < nw; i++) { const lx = (i - (nw - 1) / 2) * (w / nw); win(lx, y, 0, w, d, m); if (i < nw - 1) win(lx + w / nw / 2, y, 1, w, d, m, 1.2, 1.0); } win(0, y, r() < .5 ? 2 : 3, w, d, m, 1.1, 1.0); });
    const door = new THREE.BoxGeometry(1.0, 2.1, .1); door.translate(w / 2 - 1.2, 1.05, d / 2 + .05); door.applyMatrix4(m); wallG.push(colored(door, 0x5b4636));
    if (two && r() < .7) { const bw = w * .55, sl = new THREE.BoxGeometry(bw, .14, .9); sl.translate(-w * .15, 2.95, d / 2 + .45); sl.applyMatrix4(m); wallG.push(colored(sl, 0xdedad2)); const rl = new THREE.BoxGeometry(bw, .95, .06); rl.translate(-w * .15, 3.5, d / 2 + .88); rl.applyMatrix4(m); wallG.push(colored(rl, 0x4c5056)); }
    return top;
  };
  for (let bx = G0; bx < G1; bx++) for (let bz = G0; bz < G1; bz++) {
    const x0 = bx * P + 3, z0 = bz * P + 3, cxB = x0 + 19, czB = z0 + 19;
    if (isTower(cxB, czB)) continue;
    if (Math.abs(cxB - TARGET.x) < 5 && Math.abs(czB - TARGET.z) < 5) continue; // 目的の豪邸の区画は空ける
    for (let ix = 0; ix < 2; ix++) for (let iz = 0; iz < 2; iz++) {
      const lx = x0 + ix * 19 + 9.5, lz = z0 + iz * 19 + 9.5, ry = iz === 0 ? Math.PI : 0;
      const lot = new THREE.BoxGeometry(18.6, .06, 18.6); lot.translate(lx, .03, lz); lotG.push(colored(lot, r() < .55 ? 0x6e8448 : [0xa8a49a, 0x9c988e, 0xb3ada0][(r() * 3) | 0]));
      const hz = lz + (iz === 0 ? 1.5 : -1.5) * (r() * .8 + .4), hx = lx + (r() - .5) * 3;
      const top = house(hx, hz, ry);
      // ブロック塀（道路側を一部あける）
      const wc = 0xbdb8ae, fz = lz + (iz === 0 ? -9.2 : 9.2);
      for (const [x, z, sx, sz] of [[lx - 5.5, fz, 7.8, .16], [lx + 6.5, fz, 5.8, .16], [lx - 9.2, lz, .16, 18.4], [lx + 9.2, lz, .16, 18.4]]) { const bw = new THREE.BoxGeometry(sx, 1.1, sz); bw.translate(x, .55, z); wallG.push(colored(bw, wc)); }
      if (r() < .8) treeP.push([lx + (r() - .5) * 13, lz + (iz === 0 ? -5.5 : 5.5), .7 + r() * .5]);
      if (r() < .6) pinP.push([hx, top + 4.2, hz, 1.6]);
    }
  }
  // ホテルの塔
  const hotelC = (k) => { const c = canvas(512, 512), g = c.getContext('2d'); g.fillStyle = ['#f3f1ec', '#e3e7ea', '#efe6da'][k]; g.fillRect(0, 0, 512, 512); for (let f = 0; f < 8; f++) { const y = f * 64; const gg = g.createLinearGradient(0, y + 4, 0, y + 52); gg.addColorStop(0, '#4d6680'); gg.addColorStop(1, '#16222e'); g.fillStyle = gg; g.fillRect(0, y + 4, 512, 48); g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(0, y + 52, 512, 10); for (let x = 0; x < 512; x += 32) { g.fillStyle = 'rgba(30,40,50,.6)'; g.fillRect(x, y + 10, 3, 38); } } return tex(c); };
  const hotelLit = (k) => { const c = canvas(512, 512), g = c.getContext('2d'), rr = rng(70 + k); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); for (let f = 0; f < 8; f++) for (let x = 0; x < 512; x += 32) if (rr() < .6) { g.fillStyle = `rgba(255,${190 + rr() * 50 | 0},${120 + rr() * 60 | 0},${.6 + rr() * .4})`; g.fillRect(x + 3, f * 64 + 6, 27, 44); } return tex(c); };
  const hotelM = [0, 1, 2].map(k => new THREE.MeshStandardMaterial({ map: hotelC(k), emissive: 0xffffff, emissiveMap: hotelLit(k), emissiveIntensity: 0, roughness: .35, metalness: .15, envMapIntensity: .8 }));
  T.hotelM = hotelM;
  const roofM = new THREE.MeshStandardMaterial({ color: 0x9a9c9e, roughness: .85 });
  for (let bx = G0; bx < G1; bx++) for (let bz = G0; bz < G1; bz++) {
    const cx = bx * P + 22, cz = bz * P + 22; if (!isTower(cx, cz)) continue;
    const w = 24 + r() * 10, d = 18 + r() * 8, h = 60 + r() * 95, geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv, nm = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) if (Math.abs(nm.getY(i)) < .5) { const hz = Math.abs(nm.getX(i)) > .5 ? d : w; uv.setXY(i, uv.getX(i) * hz / 16, uv.getY(i) * h / 25.6); }
    const hm = hotelM[(r() * 3) | 0]; mesh(geo, [hm, hm, roofM, roofM, hm, hm], cx, h / 2, cz, s);
    mesh(new THREE.BoxGeometry(w + .6, 1.2, d + .6), roofM, cx, h + .6, cz, s);
    pinP.push([cx, h + 7, cz, 2.6]);
  }
  const vc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, envMapIntensity: .5 });
  mesh(mergeGeometries(wallG), vc, 0, 0, 0, s);
  mesh(mergeGeometries(roofG), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .15, envMapIntensity: .6 }), 0, 0, 0, s);
  mesh(mergeGeometries(frameG), vc, 0, 0, 0, s).castShadow = false;
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x1b2632, roughness: .06, metalness: .3, clearcoat: 1, envMapIntensity: 1.3 });
  glassM.onBeforeCompile = sh => {
    sh.uniforms.uNight = townUni.uNight; sh.uniforms.uTime = townUni.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aWin;varying vec2 vWin;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWin=aWin;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight,uTime;varying vec2 vWin;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.,.72,.42)*vWin.x*uNight*(1.-smoothstep(vWin.y,vWin.y+.08,uTime))*4.2;');
  };
  mesh(mergeGeometries(glassG), glassM, 0, 0, 0, s).castShadow = false;
  mesh(mergeGeometries(lotG), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, envMapIntensity: .3 }), 0, 0, 0, s).castShadow = false;
  const canG = canopyGeometry(31);
  const can = new THREE.InstancedMesh(canG, new THREE.MeshStandardMaterial({ color: 0x4d7a37, roughness: .85, envMapIntensity: .4 }), treeP.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  treeP.forEach(([x, z, k], i) => { q.setFromAxisAngle(V(0, 1, 0), r() * 6); m4.compose(V(x, 2.6 * k + 1.2, z), q, V(k * 1.2, k, k * 1.2)); can.setMatrixAt(i, m4); can.setColorAt(i, new THREE.Color().setHSL(.26 + r() * .06, .38, .42 + r() * .14)); });
  can.castShadow = can.receiveShadow = true; s.add(can);
  // 目的の豪邸（白い箱＋木の外壁＋大きなガラス＋プール）
  const tg = new THREE.Group(); tg.position.copy(TARGET); s.add(tg);
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f4f0, roughness: .55, envMapIntensity: .6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xa06d45, roughness: .7, envMapIntensity: .5 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x223040, roughness: .04, metalness: .3, clearcoat: 1, envMapIntensity: 1.5 });
  mesh(new THREE.BoxGeometry(38, .08, 38), new THREE.MeshStandardMaterial({ color: 0x7fa04e, roughness: .95 }), 0, .04, 0, tg).castShadow = false;
  mesh(new THREE.BoxGeometry(16, 3.6, 10), white, 0, 1.8, -6, tg);
  mesh(new THREE.BoxGeometry(11, 3.4, 9), wood, -2, 5.3, -6.5, tg);
  mesh(new THREE.BoxGeometry(12, .35, 10.5), white, -2, 7.15, -6.4, tg);
  mesh(new THREE.PlaneGeometry(13, 2.8), glass, 0, 1.7, -0.98, tg);
  mesh(new THREE.PlaneGeometry(8, 2.4), glass, -2, 5.2, -1.98, tg);
  mesh(new THREE.BoxGeometry(14, .25, 9), new THREE.MeshStandardMaterial({ color: 0xdedbd4, roughness: .7 }), 0, .12, 5.5, tg);
  const pool = mesh(new THREE.PlaneGeometry(10, 4.6), new THREE.MeshPhysicalMaterial({ color: 0x2cc3d6, emissive: 0x0b5c6a, emissiveIntensity: .5, roughness: .03, clearcoat: 1, envMapIntensity: 1.4 }), 0, .27, 5.6, tg); pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
  for (const [x, z] of [[-14, 8], [13, 9], [-15, -14], [14, -13]]) { const c = new THREE.Mesh(canG, new THREE.MeshStandardMaterial({ color: 0x4b7d36, roughness: .85 })); c.position.set(x, 3.4, z); c.scale.setScalar(1.3); c.castShadow = true; tg.add(c); }
  // ピン
  const pinGeo = (() => { const h = new THREE.SphereGeometry(1.3, 24, 16); h.translate(0, 2.9, 0); const c = new THREE.ConeGeometry(.75, 2.4, 24); c.rotateX(Math.PI); c.translate(0, 1.25, 0); const dot = new THREE.SphereGeometry(.5, 16, 10); dot.translate(0, 2.9, 1.02); return mergeGeometries([plain(h), plain(c), plain(dot)]); })();
  pinMesh = new THREE.InstancedMesh(pinGeo, new THREE.MeshStandardMaterial({ color: 0xff4a36, emissive: 0xff2a14, emissiveIntensity: .55, roughness: .35, envMapIntensity: .8 }), pinP.length);
  pinMesh.castShadow = true; pinMesh.frustumCulled = false; s.add(pinMesh);
  const start = V(20, 0, 70);
  pinP.forEach(([x, y, z, sc = 1]) => PINS.push({ x, y, z, sc, ph: r() * 6, t0: 13.3 + Math.hypot(x - start.x, z - start.z) * 0.0032 + r() * 0.25 }));
  goldPin = new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({ color: 0xffc83a, emissive: 0xffa400, emissiveIntensity: .9, roughness: .25, metalness: .3, envMapIntensity: 1 }));
  goldPin.position.set(TARGET.x - 2, 12, TARGET.z - 6); goldPin.castShadow = true; s.add(goldPin);
  for (let i = 0; i < 2; i++) { const rg = new THREE.Mesh(new THREE.RingGeometry(1, 1.25, 64), new THREE.MeshBasicMaterial({ color: 0xffd25a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); rg.rotation.x = -Math.PI / 2; rg.position.set(TARGET.x - 2, .35, TARGET.z - 6); s.add(rg); goldRings.push(rg); T.fx.push(rg); }
}
// 街灯（夜だけ表示）：電球の点と、地面の光だまり。どちらも場所ごとの時刻で消える
{
  const s = T.scene, r = rng(808), pos = [], offs = [];
  for (let i = -8; i <= 8; i++) for (let k = -16; k < 16; k++) {
    for (const [x, z] of [[k * 22 + 11, i * 44 + 3.8], [i * 44 + 3.8, k * 22 + 11]]) {
      if (x > 120 && x < 270 && z > -320 && z < -165) continue;
      pos.push(x, 6.2, z); offs.push(LIGHTS_OFF0 + Math.hypot(x - 40, z + 40) * 0.0042 + r() * .3);
    }
  }
  const n = offs.length, glowVS = `attribute float aOff;uniform float uTime,uNight;varying float vOn;varying vec2 vUv;`;
  const on = 'vOn=uNight*(1.-smoothstep(aOff,aOff+.08,uTime));';
  // 光だまり
  const pg = new THREE.PlaneGeometry(13, 13).rotateX(-Math.PI / 2);
  pg.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(offs), 1));
  const pools = new THREE.InstancedMesh(pg, new THREE.ShaderMaterial({
    uniforms: townUni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: glowVS + `void main(){vUv=uv;${on}gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader: 'varying float vOn;varying vec2 vUv;void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d),2.2)*vOn*.95;gl_FragColor=vec4(vec3(1.,.72,.4)*a,a);}',
  }), n);
  const m4 = new THREE.Matrix4(); for (let i = 0; i < n; i++) { m4.makeTranslation(pos[i * 3], .06, pos[i * 3 + 2]); pools.setMatrixAt(i, m4); }
  pools.frustumCulled = false; pools.renderOrder = 4;
  // 電球
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('aOff', new THREE.Float32BufferAttribute(offs, 1));
  const bulbs = new THREE.Points(bg, new THREE.ShaderMaterial({
    uniforms: townUni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: glowVS + `void main(){${on}vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=900./-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: 'varying float vOn;void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),3.)*vOn;gl_FragColor=vec4(vec3(1.,.85,.6)*a*2.5,a);}',
  }));
  bulbs.frustumCulled = false; bulbs.renderOrder = 5;
  T.night = new THREE.Group(); T.night.add(pools, bulbs); T.night.visible = false; s.add(T.night); T.fx.push(T.night);
}
// 住宅街の昼夜切り替え（夜は月明かり・星空・窓と街灯の明かり。ピンは隠す）
function setTNight(on, t) {
  townUni.uNight.value = on ? 1 : 0; townUni.uTime.value = t;
  T.skyMat.uniforms.uMode.value = on ? 2 : 0; T.scene.environment = on ? T.envNight : T.envDay;
  T.sun.color.set(on ? 0x8fa6ff : 0xfff1dc); T.sun.intensity = on ? 0.28 : 4.3;
  T.hemi.intensity = on ? 0.07 : 0.8; T.hemi.color.set(on ? 0x5a6a9a : 0xd2e2f5); T.hemi.groundColor.set(on ? 0x101018 : 0x6d6a58);
  T.scene.fog.color.set(on ? 0x0b1020 : 0xbcd0e2);
  T.night.visible = on; pinMesh.visible = goldPin.visible = !on; goldRings.forEach(g => g.visible = !on);
  const towerOn = on ? 1 - smooth(LIGHTS_OFF0 + .9, LIGHTS_OFF0 + 1.1, t) : 0;
  T.hotelM.forEach(m => m.emissiveIntensity = 1.8 * towerOn);
  T.exposure = on ? 1.0 : 0.8;
}
const GOLD_T = 17.9;
function updateTown(t) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  PINS.forEach((p, i) => {
    const k = (t - p.t0) / 0.42, sc = k <= 0 ? 1e-5 : clamp(easeBack(k), 0, 1.4) * p.sc;
    q.setFromAxisAngle(V(0, 1, 0), t * .8 + p.ph); m4.compose(V(p.x, p.y + Math.sin(t * 2.2 + p.ph) * .35, p.z), q, V(sc, sc, sc)); pinMesh.setMatrixAt(i, m4);
  });
  pinMesh.instanceMatrix.needsUpdate = true;
  const kg = (t - GOLD_T) / 0.55, gs = kg <= 0 ? 1e-5 : clamp(easeBack(kg), 0, 1.4) * 1.35 * (1 + .05 * Math.sin(t * 6));
  goldPin.scale.setScalar(gs); goldPin.rotation.y = t * 1.2; goldPin.position.y = 9.5 + Math.sin(t * 2.4) * .3;
  goldRings.forEach((rg, i) => { const ph = ((t - GOLD_T) / 1.4 + i * .5) % 1; const on = t > GOLD_T; rg.scale.setScalar(on ? 1 + ph * 15 : 1e-5); rg.material.opacity = on ? (1 - ph) * .9 : 0; });
}

// =====================================================================
// S: 誰もいない海（21.45〜22.2秒）
// =====================================================================
const SEA = newScene('S', 0.8, 0.5, 0.08);
const seaUni = { uTime: { value: 0 } };
const sandH = (x, z) => z < 0 ? z * 0.045 : z * 0.012 + fbm(x * .02, z * .02, 3) * .6 * smooth(20, 60, z);
const UMB = V(3.5, 0, 7); UMB.y = sandH(UMB.x, UMB.z);
const CHAIR = V(UMB.x + 0.75, 0, UMB.z + 0.15); CHAIR.y = sandH(CHAIR.x, CHAIR.z);
{
  const s = SEA.scene, r = rng(404), sunDir = V(-0.35, 0.72, 0.6); // 晴れた昼。太陽はカメラの左後ろ（海がエメラルドに明るく見える）
  addSky(s, sunDir, 0xc6d9e8, 0.0003);
  s.add(new THREE.HemisphereLight(0xd6e6f7, 0xd8c49c, 0.85));
  addSun(s, sunDir, 0xfff3e0, 4.4, V(UMB.x, 0, UMB.z), 18, 4096);
  // 砂浜
  const sg = new THREE.PlaneGeometry(700, 700, 280, 280); sg.rotateX(-Math.PI / 2);
  const p = sg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), dry = new THREE.Color(0xf3e9d3), wet = new THREE.Color(0xc7b08a);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) + 200; p.setZ(i, z); p.setY(i, sandH(x, z)); const n = fbm(x * .05, z * .05, 3) * .5 + .5; c.copy(dry).lerp(wet, 1 - smooth(-2, 7, z)).multiplyScalar(.88 + n * .16); col.set([c.r, c.g, c.b], i * 3); }
  sg.setAttribute('color', new THREE.BufferAttribute(col, 3)); sg.computeVertexNormals();
  // 風紋（砂の細かい波模様）を凹凸として付ける
  const rip = canvas(512, 512); { const g = rip.getContext('2d'), img = g.createImageData(512, 512); for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const v = 128 + 70 * Math.sin((y + vnoise(x / 40, y / 40) * 22) / 512 * Math.PI * 2 * 9) + 30 * vnoise(x / 6, y / 6); const i = (y * 512 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp(v, 0, 255); img.data[i + 3] = 255; } g.putImageData(img, 0, 0); }
  mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex(noiseCanvas(512, '#ffffff', .22, 41), true, [220, 220]), bumpMap: tex(rip, false, [90, 90]), bumpScale: 1.4, roughness: .95, envMapIntensity: .4 }), 0, 0, 0, s).castShadow = false;
  // 海（波で上下させ、浅瀬はエメラルド、波打ち際は白い泡）
  const wg = new THREE.PlaneGeometry(2400, 1200, 480, 300);
  const wm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .04, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.25, transparent: true });
  wm.onBeforeCompile = sh => {
    sh.uniforms.uTime = seaUni.uTime;
    const H = `float wv(vec2 p){return sin(p.y*.35+uTime*1.8)*.12+sin(p.x*.22+p.y*.18+uTime*1.1)*.08+sin(p.x*.9-uTime*2.3)*.03+sin(p.y*1.7+p.x*.4+uTime*3.)*.015;}`;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nuniform float uTime;varying vec3 vW;${H}`)
      .replace('#include <beginnormal_vertex>', `vec2 wp0=(modelMatrix*vec4(position,1.)).xz;float e=.15;
        float dx=(wv(wp0+vec2(e,0.))-wv(wp0-vec2(e,0.)))/(2.*e),dz=(wv(wp0+vec2(0.,e))-wv(wp0-vec2(0.,e)))/(2.*e);
        vec3 objectNormal=normalize(vec3(-dx,dz,1.));`)
      .replace('#include <begin_vertex>', 'vec3 transformed=vec3(position);vec2 wp=(modelMatrix*vec4(position,1.)).xz;transformed.z+=wv(wp);vW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;varying vec3 vW;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float depth=max(0.,-vW.z)*.045; float sh=1.-smoothstep(0.,2.4,depth);
        vec3 wc=mix(vec3(.03,.28,.52),vec3(.16,.72,.66),sh);
        float n=sin(vW.x*.15)*1.5+sin(vW.x*.043+1.3)*2.;
        float band=smoothstep(.62,1.,sin(-vW.z*1.15+uTime*2.1+n)*.5+.5)*(1.-smoothstep(.05,.75,depth));
        float edge=1.-smoothstep(0.,.1,depth);
        float foam=clamp(band*.85+edge,0.,1.);
        diffuseColor.rgb=mix(wc,vec3(.96),foam);
        diffuseColor.a=mix(.62,1.,smoothstep(0.,1.2,depth))+foam;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.8,clamp(diffuseColor.r-.5,0.,1.));')
      // 細かいさざ波（法線を揺らして、きらめきを出す）
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        {vec2 q=vW.xz;vec2 pp=vec2(sin(q.x*2.3+q.y*1.1+uTime*2.1)+.5*sin(q.x*5.7-q.y*3.9+uTime*3.3),cos(q.y*2.9-q.x*.7+uTime*1.8)+.5*cos(q.y*6.1+q.x*4.3-uTime*2.9))*.07;
         normal=normalize(normal+vec3(pp.x,0.,pp.y));}`);
  };
  const sea = mesh(wg, wm, 0, 0.0, -598, s); sea.rotation.x = -Math.PI / 2; sea.castShadow = false; sea.receiveShadow = false; sea.renderOrder = 2;
  // パラソルとデッキチェア
  const stripe = canvas(512, 64); { const g = stripe.getContext('2d'); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#e2483a'; g.fillRect(i * 32, 0, 32, 64); } }
  const umb = mesh(new THREE.ConeGeometry(1.6, .6, 32, 1, true), new THREE.MeshStandardMaterial({ map: tex(stripe), roughness: .8, side: THREE.DoubleSide }), UMB.x, UMB.y + 2.25, UMB.z, s);
  mesh(new THREE.CylinderGeometry(.03, .03, 2.3, 10), new THREE.MeshStandardMaterial({ color: 0xe8e6e0, metalness: .6, roughness: .3 }), UMB.x, UMB.y + 1.12, UMB.z, s);
  // ビーチチェアに一人で座って海を眺める人（海＝-z を向く）
  const fab = canvas(256, 256); { const g = fab.getContext('2d'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f5f3ee' : '#2f6fb8'; g.fillRect(i * 32, 0, 32, 256); } }
  const fabM = new THREE.MeshStandardMaterial({ map: tex(fab), roughness: .85, side: THREE.DoubleSide });
  const tubeM = new THREE.MeshStandardMaterial({ color: 0xd9dcdf, metalness: .8, roughness: .3, envMapIntensity: 1 });
  const ch = new THREE.Group(); ch.position.copy(CHAIR); s.add(ch);
  const seat = mesh(new THREE.PlaneGeometry(.56, .5), fabM, 0, .3, -.05, ch); seat.rotation.x = -Math.PI / 2 + .12;
  const bk = mesh(new THREE.PlaneGeometry(.56, .72), fabM, 0, .6, .3, ch); bk.rotation.x = -.38;
  for (const sx of [-1, 1]) {
    const leg = mesh(new THREE.CylinderGeometry(.016, .016, .9, 8), tubeM, sx * .29, .42, .12, ch); leg.rotation.x = -.38;
    const fl = mesh(new THREE.CylinderGeometry(.016, .016, .42, 8), tubeM, sx * .29, .18, -.28, ch); fl.rotation.x = .5;
    mesh(new RoundedBoxGeometry(.06, .035, .5, 2, .012), new THREE.MeshStandardMaterial({ color: 0xc89b62, roughness: .6 }), sx * .3, .5, 0, ch);
  }
  const f = makeFigure({ shirt: 0xf6f3ec, pants: 0x3c6fa8, skin: 0xe0b394, hair: 0x2a1d16, shoe: 0xf2f2f2 });
  f.root.rotation.y = Math.PI; f.root.position.set(0, -0.58, 0.02); ch.add(f.root);
  f.legL.hp.rotation.x = f.legR.hp.rotation.x = -1.42; f.legL.kn.rotation.x = f.legR.kn.rotation.x = 1.25;
  f.legL.hp.rotation.z = -.08; f.legR.hp.rotation.z = .08;
  f.chest.rotation.x = -.32; f.head.rotation.x = .12;
  for (const [a, sx] of [[f.armL, -1], [f.armR, 1]]) { a.sh.rotation.x = -.35; a.sh.rotation.z = sx * .18; a.el.rotation.x = -.95; }
  const hatM = new THREE.MeshStandardMaterial({ color: 0xd8bf7f, roughness: .9 });
  mesh(new THREE.CylinderGeometry(.22, .22, .012, 40), hatM, 0, .13, 0, f.head); mesh(new THREE.CylinderGeometry(.1, .115, .1, 32), hatM, 0, .18, 0, f.head);
  mesh(new THREE.CylinderGeometry(.116, .116, .025, 32), new THREE.MeshStandardMaterial({ color: 0x1f3e6e, roughness: .7 }), 0, .145, 0, f.head);
  // 横の小さなテーブルと、オレンジのドリンク
  const tb = new THREE.Group(); tb.position.set(CHAIR.x - .62, CHAIR.y, CHAIR.z - .05); s.add(tb);
  mesh(new THREE.CylinderGeometry(.21, .21, .03, 32), new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: .5 }), 0, .46, 0, tb);
  mesh(new THREE.CylinderGeometry(.02, .02, .46, 10), tubeM, 0, .23, 0, tb);
  mesh(new THREE.CylinderGeometry(.04, .033, .13, 24), new THREE.MeshStandardMaterial({ color: 0xff8a1c, emissive: 0x803000, emissiveIntensity: .3, roughness: .2 }), .05, .54, 0, tb);
  mesh(new THREE.CylinderGeometry(.045, .036, .15, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .35, side: THREE.DoubleSide }), .05, .55, 0, tb);
  // 岩
  for (const [x, z, k] of [[-14, 3, 1.4], [-17, -1, 2.1], [-11, 6, .8], [16, 12, 1.6]]) { const g = new THREE.IcosahedronGeometry(k, 3), pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const v = V(pp.getX(i), pp.getY(i), pp.getZ(i)); v.multiplyScalar(1 + .25 * vnoise(v.x * 1.5 + x, v.y * 1.5 + v.z)); v.y *= .65; pp.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); mesh(g, new THREE.MeshStandardMaterial({ color: 0x6f6a63, roughness: .9 }), x, sandH(x, z) + k * .2, z, s); }
}

// =====================================================================
// G: 誰もいないゴルフ場（22.2〜23.15秒）
// =====================================================================
const GOLF = newScene('G', 0.8, 0.5, 0.1);
const flagUni = { uTime: { value: 0 } };
const golfH = (x, z) => fbm(x * .006 + 2, z * .006, 4) * 9 * smooth(45, 200, Math.abs(x)) + fbm(x * .03, z * .03, 2) * .25 * smooth(45, 80, Math.abs(x)) + (1 - Math.abs(fbm(x * .0008 + 3, z * .0008, 5))) ** 2 * 420 * smooth(1300, 2600, Math.hypot(x, z));
const FLAG = V(0, 0, -122); FLAG.y = golfH(FLAG.x, FLAG.z);
const BALL0 = FLAG.clone().add(V(0, 0.111, 4.9)); // グリーン面（+0.09）にボール半径を足した高さ
let GOLFER, golfBall;
{
  const s = GOLF.scene, r = rng(505), sunDir = V(-0.55, 0.55, 0.62);
  addSky(s, sunDir, 0xbcd0e2, 0.00025);
  s.add(new THREE.HemisphereLight(0xcfe0f5, 0x5b6a3a, 0.8));
  addSun(s, sunDir, 0xfff0d8, 4.3, FLAG.clone().add(V(0, 0, 4)), 22);
  const tg = new THREE.PlaneGeometry(6000, 6000, 360, 360); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, golfH(x, z)); const n = fbm(x * .01, z * .01, 3) * .5 + .5; c.setRGB(lerp(.13, .2, n), lerp(.22, .3, n), lerp(.05, .08, n)); col.set([c.r, c.g, c.b], i * 3); }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex(noiseCanvas(512, '#ffffff', .2, 51), true, [900, 900]), roughness: .95, envMapIntensity: .35 }), 0, 0, 0, s).castShadow = false;
  // フェアウェイ（刈り込みの縞・角丸）
  const fc = canvas(256, 1024), fg = fc.getContext('2d');
  fg.fillStyle = 'rgba(0,0,0,0)'; fg.clearRect(0, 0, 256, 1024);
  fg.beginPath(); fg.roundRect(4, 4, 248, 1016, 110); fg.clip();
  for (let i = 0; i < 8; i++) { fg.fillStyle = i % 2 ? '#7fae4a' : '#6c9b3d'; fg.fillRect(i * 32, 0, 32, 1024); }
  const fwT = tex(fc); const fw = new THREE.PlaneGeometry(42, 150, 21, 75); fw.rotateX(-Math.PI / 2);
  const fp = fw.attributes.position; for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i) - 32; fp.setZ(i, z); fp.setY(i, golfH(x, z) + .04); } fw.computeVertexNormals();
  mesh(fw, new THREE.MeshStandardMaterial({ map: fwT, transparent: true, alphaTest: .5, roughness: .85, envMapIntensity: .4 }), 0, 0, 0, s).castShadow = false;
  // グリーン・カラー・バンカー・カップ・旗
  const disc = (rad, color, y, x = 0, z = 0, sx = 1, map = null) => { const g = new THREE.CircleGeometry(rad, 72); g.rotateX(-Math.PI / 2); g.scale(sx, 1, 1); const m = mesh(g, new THREE.MeshStandardMaterial({ color, map, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2, envMapIntensity: .4 }), FLAG.x + x, FLAG.y + y, FLAG.z + z, s); m.castShadow = false; return m; };
  const gc = canvas(1024, 1024), gg = gc.getContext('2d'); gg.save(); gg.translate(512, 512); gg.rotate(Math.PI / 4); for (let i = -16; i < 16; i++) { gg.fillStyle = i % 2 ? '#9ed35d' : '#86bd4a'; gg.fillRect(i * 64, -800, 64, 1600); } gg.restore();
  { const rr = rng(57); for (let i = 0; i < 120000; i++) { const v = rr() > .5 ? 255 : 0; gg.fillStyle = `rgba(${v},${v},${v},${.05 + rr() * .08})`; gg.fillRect(rr() * 1024, rr() * 1024, 1.5, 1.5); } } // 刈り込んだ芝の細かい粒
  disc(17.5, 0x5f9636, .07); disc(15, 0xffffff, .09, 0, 0, 1, tex(gc));
  disc(5, 0xe6d6ae, .1, 15, 9, 1.6); disc(.07, 0x111111, .12);
  mesh(new THREE.CylinderGeometry(.022, .022, 2.4, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3 }), FLAG.x, FLAG.y + 1.2, FLAG.z, s);
  const flagM = new THREE.MeshStandardMaterial({ color: 0xe0281e, roughness: .6, side: THREE.DoubleSide });
  flagM.onBeforeCompile = sh => { sh.uniforms.uTime = flagUni.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', 'vec3 transformed=vec3(position);float u=uv.x;transformed.z+=sin(u*5.-uTime*7.)*.09*u;transformed.y-=u*u*.06;'); };
  mesh(new THREE.PlaneGeometry(.9, .58, 16, 6).translate(.45, 0, 0), flagM, FLAG.x, FLAG.y + 2.1, FLAG.z, s);
  // 木立
  const canG = canopyGeometry(52); const NT = 160;
  const can = new THREE.InstancedMesh(canG, new THREE.MeshStandardMaterial({ color: 0x3f6b2c, roughness: .85, envMapIntensity: .4 }), NT), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < NT; i++) { const side = i % 2 ? 1 : -1, x = side * (34 + r() * 40), z = 60 - r() * 330, k = 1.5 + r() * 1.2; q.setFromAxisAngle(V(0, 1, 0), r() * 6); m4.compose(V(x, golfH(x, z) + 3.4 * k, z), q, V(k * 1.3, k * 1.6, k * 1.3)); can.setMatrixAt(i, m4); can.setColorAt(i, new THREE.Color().setHSL(.27 + r() * .05, .4, .36 + r() * .14)); }
  can.castShadow = can.receiveShadow = true; s.add(can);
  // グリーン周りの芝（草を1本ずつ。グリーンの上は除く）
  const bg = new THREE.BufferGeometry(), bp = [], bu = [], bi = [];
  for (let j = 0; j <= 3; j++) { const v = j / 3, w = 0.016 * (1 - v * .9); bp.push(-w, v, 0, w, v, 0); bu.push(0, v, 1, v); }
  for (let j = 0; j < 3; j++) { const a = j * 2; bi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); bg.setIndex(bi);
  const gm = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .75, envMapIntensity: .5 });
  gm.onBeforeCompile = sh => {
    sh.uniforms.uTime = grassUniforms.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;varying float vH;')
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(vec3(0.,1.,0.)+vec3(normal)*0.45);')
      .replace('#include <begin_vertex>', 'vec3 transformed=vec3(position);vH=uv.y;vec3 ip=vec3(instanceMatrix[3]);float w=sin(uTime*1.6+ip.x*.35+ip.z*.22)*.5;transformed.z+=(0.2+w*0.3)*uv.y*uv.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vH;')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize( vNormal );')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.35,1.2,vH*vH*(3.-2.*vH));');
  };
  const NGB = 140000, blades = new THREE.InstancedMesh(bg, gm, NGB), gcol = new THREE.Color(), C0 = FLAG.clone().add(V(0, 0, 6));
  for (let i = 0; i < NGB; i++) {
    const rad = 30 * Math.sqrt(r()), a = r() * 6.283, x = C0.x + Math.cos(a) * rad, z = C0.z + Math.sin(a) * rad, dg = Math.hypot(x - FLAG.x, z - FLAG.z);
    if (dg < 15.2) { i--; continue; }
    const h = dg < 17.6 ? .05 + r() * .04 : .1 + r() * .14; q.setFromAxisAngle(V(0, 1, 0), r() * 6.283);
    m4.compose(V(x, golfH(x, z) + .01, z), q, V(1, h, 1)); blades.setMatrixAt(i, m4);
    gcol.setRGB(lerp(.2, .32, r()), lerp(.38, .5, r()), lerp(.08, .13, r())); blades.setColorAt(i, gcol);
  }
  blades.receiveShadow = true; blades.frustumCulled = false; s.add(blades);
  // クラブを片手に、グリーンを一人で歩くゴルファー（+x 方向へ歩く。姿勢は updateGolf で毎フレーム決める）
  const g = makeFigure({ shirt: 0xf6f6f3, pants: 0x1f2c45, skin: 0xd9a988, hair: 0x2a1d16, shoe: 0xf5f5f2 });
  g.root.rotation.y = Math.PI / 2; s.add(g.root);
  const capM = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: .7 });
  mesh(new THREE.SphereGeometry(.112, 32, 16, 0, Math.PI * 2, 0, Math.PI * .5), capM, 0, .07, -.005, g.head);
  const brim = mesh(new THREE.CylinderGeometry(.09, .09, .01, 32, 1, false, -Math.PI / 2, Math.PI), capM, 0, .075, .1, g.head);
  const putter = new THREE.Group(); putter.position.set(0, -.3, 0); putter.rotation.x = .85; g.armR.el.add(putter); // 手に持ったクラブ（ヘッドは後ろ下へ）
  mesh(new THREE.CylinderGeometry(.009, .009, .86, 10), new THREE.MeshStandardMaterial({ color: 0xc7cbd0, metalness: .9, roughness: .25 }), 0, -.43, 0, putter);
  mesh(new THREE.CylinderGeometry(.016, .016, .22, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .6 }), 0, -.02, 0, putter);
  mesh(new RoundedBoxGeometry(.03, .025, .11, 2, .006), new THREE.MeshStandardMaterial({ color: 0x2a2d31, metalness: .8, roughness: .3 }), 0, -.87, .01, putter);
  GOLFER = g;
  // カップの近くに止まっているボール
  golfBall = mesh(new THREE.SphereGeometry(.021, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .35, clearcoat: .6 }), FLAG.x + .55, BALL0.y, FLAG.z + .9, s);
}
// ゴルファーの歩き（旗の手前を左から右へ。脚・腕・体の上下を周期で動かす）
const GOLF_WALK = { x0: -2.1, z: 4.6, v: 1.3, hz: 0.95 };
const golferPos = lt => FLAG.clone().add(V(GOLF_WALK.x0 + lt * GOLF_WALK.v, 0.09, GOLF_WALK.z));
function updateGolf(t, lt) {
  flagUni.uTime.value = t; grassUniforms.uTime.value = t;
  const g = GOLFER, ph = (lt + 0.15) * Math.PI * 2 * GOLF_WALK.hz, s = Math.sin(ph), c = Math.cos(ph);
  g.root.position.copy(golferPos(lt)); g.root.position.y += 0.03 * Math.abs(c) - 0.015;
  // 脚：太ももを前後に振り、前に出る脚は膝を曲げる（負の回転が前）
  g.legL.hp.rotation.x = -0.42 * s; g.legR.hp.rotation.x = 0.42 * s;
  g.legL.kn.rotation.x = 0.08 + 0.65 * Math.max(0, c); g.legR.kn.rotation.x = 0.08 + 0.65 * Math.max(0, -c);
  // 腕：脚と逆に振る（クラブを持つ右腕は小さく）
  g.armL.sh.rotation.x = 0.32 * s; g.armL.sh.rotation.z = -0.08; g.armL.el.rotation.x = -0.25;
  g.armR.sh.rotation.x = -0.14 * s; g.armR.sh.rotation.z = 0.1; g.armR.el.rotation.x = -0.15;
  g.chest.rotation.x = 0.06; g.chest.rotation.y = 0.06 * s; g.head.rotation.x = 0.02; g.head.rotation.y = -0.05 * s;
}

// =====================================================================
// R: 地平線まで続く無人の高速道路（23.15〜25.95秒）
// =====================================================================
const ROAD = newScene('R', 0.8, 0.5, 0.1);
const roadH = (x, z) => { const ax = Math.abs(x); return fbm(x * .004 + 5, z * .004, 4) * 16 * smooth(30, 320, ax) + (1 - Math.abs(fbm(x * .0007 + 3, z * .0007, 5))) ** 2 * 520 * smooth(1600, 3200, Math.hypot(x, z)); };
let car, roadSun;
{
  const s = ROAD.scene, r = rng(606), sunDir = V(0.6, 0.42, -0.68);
  addSky(s, sunDir, 0xc2d3e2, 0.00018);
  s.add(new THREE.HemisphereLight(0xd2e2f5, 0x6a6a48, 0.8));
  addSun(s, sunDir, 0xffe9cc, 4.2, V(0, 0, -40), 30);
  // 田畑（区画ごとに色を変える）
  const tg = new THREE.PlaneGeometry(10000, 10000, 420, 420); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const FIELD = [[.2, .33, .08], [.27, .36, .1], [.42, .4, .14], [.18, .28, .07], [.33, .38, .12]];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, roadH(x, z)); const f = FIELD[(hash2(Math.floor(x / 70), Math.floor(z / 95)) * 5) | 0], n = fbm(x * .01, z * .01, 3) * .1; c.setRGB(f[0] + n, f[1] + n, f[2] + n * .5); col.set([c.r, c.g, c.b], i * 3); }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex(noiseCanvas(512, '#ffffff', .2, 61), true, [1200, 1200]), roughness: .95, envMapIntensity: .35 }), 0, -0.05, 0, s).castShadow = false;
  // 道路本体と白線
  const asph = new THREE.MeshStandardMaterial({ map: tex(noiseCanvas(512, '#4c4e52', .1, 62), true, [6, 1800]), roughness: .88, envMapIntensity: .35 });
  const rg = new THREE.PlaneGeometry(19, 7000); rg.rotateX(-Math.PI / 2); mesh(rg, asph, 0, 0.02, -3300, s).castShadow = false;
  const lines = [], bar = (x, z, w, l) => { const g = new THREE.PlaneGeometry(w, l); g.rotateX(-Math.PI / 2); g.translate(x, .035, z); lines.push(plain(g)); };
  for (const sx of [-1, 1]) { bar(sx * 8.9, -3300, .18, 7000); bar(sx * 1.0, -3300, .15, 7000); for (let z = 150; z > -3000; z -= 20) bar(sx * 4.95, z, .15, 8); }
  mesh(mergeGeometries(lines), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2 }), 0, 0, 0, s).castShadow = false;
  // 中央分離帯・ガードレール・照明柱
  mesh(new THREE.BoxGeometry(1.2, .85, 7000), new THREE.MeshStandardMaterial({ color: 0xc4c1ba, roughness: .8 }), 0, .42, -3300, s);
  const railM = new THREE.MeshStandardMaterial({ color: 0xdfe2e4, metalness: .7, roughness: .35, envMapIntensity: .9 });
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(.1, .32, 7000), railM, sx * 10, .72, -3300, s);
  const posts = []; for (const sx of [-1, 1]) for (let z = 150; z > -2200; z -= 4) { const g = new THREE.BoxGeometry(.12, .8, .12); g.translate(sx * 10.05, .4, z); posts.push(plain(g)); }
  mesh(mergeGeometries(posts), railM, 0, 0, 0, s);
  const poles = []; for (const sx of [-1, 1]) for (let z = 120; z > -3000; z -= 50) { const a = new THREE.CylinderGeometry(.12, .16, 10, 8); a.translate(sx * 11, 5, z); poles.push(plain(a)); const b = new THREE.BoxGeometry(2.6, .12, .12); b.translate(sx * 9.8, 9.9, z); poles.push(plain(b)); const h = new THREE.BoxGeometry(.9, .18, .35); h.translate(sx * 8.6, 9.8, z); poles.push(plain(h)); }
  mesh(mergeGeometries(poles), new THREE.MeshStandardMaterial({ color: 0x9da2a6, metalness: .6, roughness: .4 }), 0, 0, 0, s);
  // 長い道路を、たった1台で走るスーパーカー
  car = makeSupercar(0xd0101a); s.add(car.g);
  roadSun = s.children.find(o => o.isDirectionalLight);
}
const CAR0 = 23.15, CAR_V = 72; // 時速およそ260km
const carPos = t => V(-4.95, 0, -(t - CAR0) * CAR_V);
function updateCar(t) {
  const p = carPos(t); car.g.position.copy(p);
  car.wheels.forEach(w => w.rotation.x = -(t - CAR0) * CAR_V / 0.34);
  // 影の範囲を車と一緒に動かす（どこを走っても影がくっきり出るように）
  const d = roadSun.position.clone().sub(roadSun.target.position); roadSun.target.position.copy(p); roadSun.position.copy(p).add(d); roadSun.target.updateMatrixWorld();
}
// なめらかな車体（横から見た輪郭を曲線で作り、角を丸めて押し出す）。鼻先は -z
function makeSupercar(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: .6, roughness: .18, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.6 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: .35, metalness: .3, clearcoat: .5 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1016, roughness: .03, metalness: .6, clearcoat: 1, envMapIntensity: 1.8 });
  const profile = (pts, width, bevel, mat, taper = 0, crown = 0) => {
    const c = new THREE.CatmullRomCurve3(pts.map(([z, y]) => V(z, y, 0)), true, 'centripetal', .5);
    const sh = new THREE.Shape(c.getPoints(160).map(v => new THREE.Vector2(v.x, v.y)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .9, bevelSegments: 6, curveSegments: 4, steps: 8 });
    geo.translate(0, 0, -width / 2); geo.rotateY(-Math.PI / 2);
    // 前後の端ほど幅を絞り、上面を丸く盛り上げる（箱っぽさを消す）
    const p = geo.attributes.position, hw = width / 2 + bevel;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i); const z = p.getZ(i); x *= 1 - taper * smooth(1.1, 2.4, Math.abs(z)); y += crown * (1 - Math.min(1, (x / hw) ** 2)) * smooth(.42, .72, y); p.setXY(i, x, y); }
    geo.computeVertexNormals();
    return mesh(geo, mat, 0, 0, 0, g);
  };
  // 車体（鼻先 -2.3、お尻 +2.3）。低く、くさび形。肩の高さ 0.78m
  profile([[-2.36, .3], [-2.34, .44], [-2.1, .5], [-1.5, .58], [-.8, .68], [0, .74], [.9, .77], [1.7, .78], [2.25, .74], [2.36, .6], [2.34, .32], [1.7, .24], [0, .22], [-1.7, .24]], 1.78, .17, paint, .16, .07);
  // ガラスのキャビン（前に寄せた低いキャノピー）
  profile([[-.95, .64], [-.55, .86], [-.05, 1.06], [.5, 1.1], [1.0, 1.02], [1.65, .8], [1.4, .7], [.2, .68]], 1.2, .14, glass, .1, .05);
  // 横の吸気口・前のリップ
  for (const sx of [-1, 1]) { const ai = mesh(new RoundedBoxGeometry(.04, .2, .7, 2, .02), black, sx * 1.04, .52, .75, g); ai.castShadow = false; }
  mesh(new RoundedBoxGeometry(1.9, .05, .3, 2, .02), black, 0, .26, -2.2, g);
  // 下まわり・ホイール
  mesh(new THREE.BoxGeometry(1.9, .1, 4.2), black, 0, .24, 0, g);
  const tireM = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .85 }), rimM = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: .2, envMapIntensity: 1.2 });
  const wheels = [];
  for (const [x, z] of [[-.97, -1.45], [.97, -1.45], [-1.0, 1.42], [1.0, 1.42]]) {
    const w = new THREE.Group(); w.position.set(x, .34, z); g.add(w); wheels.push(w);
    const tire = mesh(new THREE.CylinderGeometry(.34, .34, .3, 40), tireM, 0, 0, 0, w); tire.rotation.z = Math.PI / 2;
    const rim = mesh(new THREE.CylinderGeometry(.24, .24, .31, 40), rimM, 0, 0, 0, w); rim.rotation.z = Math.PI / 2;
    for (let k = 0; k < 5; k++) { const sp = mesh(new THREE.BoxGeometry(.32, .05, .03), black, Math.sign(x) * .16, 0, 0, w); sp.rotation.x = k * Math.PI * 2 / 5; }
  }
  // ライト・ウイング・ミラー
  const head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1a10, emissiveIntensity: 4 });
  for (const sx of [-1, 1]) { const h = mesh(new RoundedBoxGeometry(.46, .04, .1, 2, .015), head, sx * .62, .5, -2.18, g); h.rotation.x = .35; h.rotation.y = -sx * .12; h.castShadow = false; }
  mesh(new RoundedBoxGeometry(1.72, .05, .05, 2, .02), tail, 0, .66, 2.41, g).castShadow = false;
  mesh(new RoundedBoxGeometry(1.8, .045, .3, 2, .02), black, 0, .98, 2.12, g);
  for (const sx of [-1, 1]) { mesh(new THREE.BoxGeometry(.04, .2, .1), black, sx * .55, .87, 2.12, g); mesh(new RoundedBoxGeometry(.15, .06, .09, 2, .02), paint, sx * .82, .86, -.45, g); }
  mesh(new THREE.BoxGeometry(1.3, .12, .05), black, 0, .34, 2.38, g);
  return { g, wheels };
}

// =====================================================================
// P: 夕焼けの送電線と発電所（32.0〜37.6秒）
// =====================================================================
const PY = newScene('P', 0.95, 0.6, 0.12);
const pyUni = { uTime: { value: 0 } };
const PY_OFF = 35.75; // 火花が散り、発電所の明かりが落ちる時刻
const pyH = (x, z) => fbm(x * .003 + 7, z * .003, 4) * 30 * smooth(60, 400, Math.abs(x)) + (1 - Math.abs(fbm(x * .0007 + 1, z * .0007, 5))) ** 2 * 450 * smooth(1800, 3500, Math.hypot(x, z));
const PY_SPAN = 320, PY_N = 18;
const pyTower = i => V(0, pyH(0, 150 - i * PY_SPAN), 150 - i * PY_SPAN);
const PY_ATT = [[-7.5, 29.8], [7.5, 29.8], [-8.5, 35.3], [8.5, 35.3], [-6.5, 40.8], [6.5, 40.8]]; // 電線をつなぐ点（x, 高さ）
const pyPlantMats = [];
{
  const s = PY.scene, r = rng(707), sunDir = V(-0.25, 0.07, -1).normalize();
  addSky(s, sunDir, 0x6e5a62, 0.00024, 1);
  s.add(new THREE.HemisphereLight(0xffb48a, 0x2a2430, 0.5));
  addSun(s, sunDir, 0xff9558, 2.8, V(0, 0, -150), 260);
  const tg = new THREE.PlaneGeometry(9000, 9000, 400, 400); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, pyH(x, z)); const n = fbm(x * .008, z * .008, 3) * .5 + .5; c.setRGB(lerp(.06, .11, n), lerp(.08, .12, n), lerp(.04, .06, n)); col.set([c.r, c.g, c.b], i * 3); }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex(noiseCanvas(512, '#ffffff', .2, 71), true, [1000, 1000]), roughness: .95, envMapIntensity: .3 }), 0, 0, 0, s).castShadow = false;
  // 鉄塔（トラスを細い角材で組む）
  const beams = [], insul = [];
  const beam = (a, b, th, arr = beams) => { const len = a.distanceTo(b), g = new THREE.BoxGeometry(th, th, len); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), b.clone().sub(a).normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); arr.push(plain(g)); };
  const hs = [0, 7, 14, 20, 25, 29, 33, 37, 41, 45], hw = y => lerp(5.2, 1.1, y / 45);
  const cor = y => { const w = hw(y); return [V(-w, y, -w), V(w, y, -w), V(w, y, w), V(-w, y, w)]; };
  for (let i = 0; i < hs.length - 1; i++) {
    const a = cor(hs[i]), b = cor(hs[i + 1]);
    for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; beam(a[k], b[k], .34); beam(b[k], b[k2], .16); beam(a[k], b[k2], .11); beam(a[k2], b[k], .11); }
  }
  for (const [L, y] of [[7.5, 32], [8.5, 37.5], [6.5, 43]]) {
    for (const z of [-.9, .9]) { beam(V(-L, y, z), V(L, y, z), .16); beam(V(-L * .2, y - 1.4, z), V(-L, y, z), .12); beam(V(L * .2, y - 1.4, z), V(L, y, z), .12); }
    for (let x = -L; x <= L + .01; x += L / 4) { beam(V(x, y, -.9), V(x, y, .9), .1); }
    for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(.22, .22, 2.2, 10); g.translate(sx * L, y - 1.1, 0); insul.push(plain(g)); }
  }
  const steel = new THREE.InstancedMesh(mergeGeometries(beams), new THREE.MeshStandardMaterial({ color: 0x7d8287, metalness: .7, roughness: .45, envMapIntensity: .7 }), PY_N);
  const ins = new THREE.InstancedMesh(mergeGeometries(insul), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: .3, metalness: .2 }), PY_N);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < PY_N; i++) { m4.makeTranslation(pyTower(i).x, pyTower(i).y, pyTower(i).z); steel.setMatrixAt(i, m4); ins.setMatrixAt(i, m4); }
  steel.castShadow = true; steel.frustumCulled = false; ins.frustumCulled = false; s.add(steel, ins);
  // 電線（たるみのある曲線）
  const cables = [];
  for (let i = 0; i < PY_N - 1; i++) for (const [ax, ay] of PY_ATT) {
    const a = pyTower(i).add(V(ax, ay, 0)), b = pyTower(i + 1).add(V(ax, ay, 0)), pts = [];
    for (let j = 0; j <= 24; j++) { const u = j / 24, q = a.clone().lerp(b, u); q.y -= 11 * 4 * u * (1 - u); pts.push(q); }
    cables.push(plain(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .07, 5)));
  }
  mesh(mergeGeometries(cables), new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: .6, roughness: .45 }), 0, 0, 0, s).castShadow = false;
  // 地平線の発電所（冷却塔・煙突・明かりのついた建屋）
  const PL = V(380, 0, -4300); PL.y = pyH(PL.x, PL.z);
  const prof = []; for (let i = 0; i <= 24; i++) { const y = i * 5; prof.push(new THREE.Vector2(38 * Math.sqrt(1 + ((y - 78) / 52) ** 2) * .62, y)); }
  const conc = new THREE.MeshStandardMaterial({ color: 0xb9b2aa, roughness: .9 });
  for (const dx of [0, 95]) mesh(new THREE.LatheGeometry(prof, 48), conc, PL.x + dx, PL.y, PL.z, s);
  mesh(new THREE.CylinderGeometry(3.5, 6, 190, 24), conc, PL.x - 80, PL.y + 95, PL.z + 30, s);
  const litC = canvas(512, 256); { const g = litC.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 256); for (let y = 10; y < 256; y += 28) for (let x = 6; x < 512; x += 18) if (r() < .7) { g.fillStyle = `rgba(255,${200 + r() * 40 | 0},140,${.6 + r() * .4})`; g.fillRect(x, y, 10, 12); } }
  const bm = new THREE.MeshStandardMaterial({ color: 0x8a8d90, roughness: .7, emissive: 0xffffff, emissiveMap: tex(litC), emissiveIntensity: 2.2 }); pyPlantMats.push(bm);
  mesh(new THREE.BoxGeometry(160, 40, 60), bm, PL.x - 120, PL.y + 20, PL.z + 120, s);
  const redM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2010, emissiveIntensity: 5 }); pyPlantMats.push(redM);
  mesh(new THREE.SphereGeometry(2.2, 12, 8), redM, PL.x - 80, PL.y + 192, PL.z + 30, s).castShadow = false;
  // 火花（電線の付け根から飛び散る）
  const NS = 220, sp = new Float32Array(NS * 3), sv = new Float32Array(NS * 3), sd = new Float32Array(NS);
  for (let i = 0; i < NS; i++) { const [ax, ay] = PY_ATT[i % 6], b = pyTower(1).add(V(ax, ay - 2.2, 0)); sp.set([b.x, b.y, b.z], i * 3); sv.set([(r() - .5) * 9, r() * 6 - 1, (r() - .5) * 9], i * 3); sd[i] = r() * .12; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('aV', new THREE.BufferAttribute(sv, 3)); sg.setAttribute('aD', new THREE.BufferAttribute(sd, 1));
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: { uTime: pyUni.uTime, uT0: { value: PY_OFF } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aV;attribute float aD;uniform float uTime,uT0;varying float vA;
      void main(){float age=uTime-uT0-aD;vec3 p=position+aV*max(age,0.)+vec3(0.,-9.8,0.)*.5*max(age,0.)*max(age,0.);
        vA=(age>0.&&age<.6)?1.-age/.6:0.;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(2400./-mv.z)*(.4+vA);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: 'varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),2.)*vA;gl_FragColor=vec4(vec3(.75,.88,1.)*a*4.,a);}',
  }));
  sparks.frustumCulled = false; sparks.renderOrder = 6; s.add(sparks); PY.fx.push(sparks);
}
function updatePY(t) {
  pyUni.uTime.value = t;
  // 火花の瞬間に明滅し、そのあと発電所の明かりが落ちる
  const flick = t < PY_OFF ? 1 : t < PY_OFF + .35 ? (Math.sin((t - PY_OFF) * 90) > 0 ? .3 : 1) : 0;
  pyPlantMats.forEach((m, i) => m.emissiveIntensity = (i ? 5 : 2.2) * flick);
}

// =====================================================================
// H: 誰もいない病院と救急車（41.9〜44.5秒）
// =====================================================================
const HO = newScene('H', 1.05, 0.8, 0.1);
{
  const s = HO.scene, r = rng(919), sunDir = V(0.45, 0.04, -0.89).normalize();
  addSky(s, sunDir, 0x2e3850, 0.0016, 1.55);
  s.add(new THREE.HemisphereLight(0x7286c0, 0x15151c, 0.55));
  addSun(s, V(-0.5, 0.6, 0.5), 0xa9b8ff, 0.7, V(0, 0, -10), 60);
  const asphalt = new THREE.MeshStandardMaterial({ map: tex(noiseCanvas(512, '#3f4246', .1, 91), true, [60, 60]), roughness: .85, envMapIntensity: .4 });
  mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), asphalt, 0, 0, 0, s).castShadow = false;
  const lines = []; for (let x = -30; x <= 30; x += 3) { const g = new THREE.PlaneGeometry(.12, 5).rotateX(-Math.PI / 2); g.translate(x, .02, 6); lines.push(plain(g)); }
  mesh(mergeGeometries(lines), new THREE.MeshStandardMaterial({ color: 0xdcdcd6, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2 }), 0, 0, 0, s).castShadow = false;
  // 建物（白いパネルと暗い窓。停電で明かりはない）
  const fc = canvas(512, 512); { const g = fc.getContext('2d'); g.fillStyle = '#e9ebec'; g.fillRect(0, 0, 512, 512); for (let f = 0; f < 4; f++) for (let x = 0; x < 512; x += 64) { const gg = g.createLinearGradient(0, f * 128 + 30, 0, f * 128 + 100); gg.addColorStop(0, '#3e4f63'); gg.addColorStop(1, '#151d27'); g.fillStyle = gg; g.fillRect(x + 6, f * 128 + 30, 52, 70); } }
  const fm = new THREE.MeshStandardMaterial({ map: tex(fc), roughness: .5, metalness: .1, envMapIntensity: .8 });
  const bw = 70, bh = 26, bd = 22, geo = new THREE.BoxGeometry(bw, bh, bd), uv = geo.attributes.uv, nm = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) if (Math.abs(nm.getY(i)) < .5) { const hz = Math.abs(nm.getX(i)) > .5 ? bd : bw; uv.setXY(i, uv.getX(i) * hz / 14, uv.getY(i) * bh / 14); }
  const roofM = new THREE.MeshStandardMaterial({ color: 0x8e9092, roughness: .9 });
  mesh(geo, [fm, fm, roofM, roofM, fm, fm], 0, bh / 2, -40, s);
  mesh(new THREE.BoxGeometry(30, 18, 18), [fm, fm, roofM, roofM, fm, fm], 42, 9, -36, s);
  // 各階の床の張り出し（壁面に陰影を付ける）と、屋上の設備
  const slabM = new THREE.MeshStandardMaterial({ color: 0xf0f1f2, roughness: .6 });
  for (let f = 1; f < 7; f++) mesh(new THREE.BoxGeometry(bw + .8, .32, .9), slabM, 0, f * 3.72, -40 + bd / 2 + .4, s);
  for (let i = 0; i < 5; i++) mesh(new RoundedBoxGeometry(3 + r() * 3, 1.6, 3, 2, .2), slabM, -25 + i * 11, bh + .8, -42 + r() * 6, s);
  // 玄関のひさしと看板
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: .5 });
  mesh(new THREE.BoxGeometry(16, .6, 9), white, 0, 4.6, -24.5, s);
  for (const x of [-7, 7]) mesh(new THREE.CylinderGeometry(.3, .3, 4.4, 16), white, x, 2.2, -20.8, s);
  mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshPhysicalMaterial({ color: 0x0c1218, roughness: .05, metalness: .4, clearcoat: 1, envMapIntensity: 1.4 }), 0, 2.1, -28.95, s);
  const sc = canvas(1024, 160); { const g = sc.getContext('2d'); g.fillStyle = '#f4f4f1'; g.fillRect(0, 0, 1024, 160); g.fillStyle = '#2b5c9c'; g.font = '700 110px "Noto Sans JP"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('みなと総合病院', 512, 84); }
  const sign = mesh(new THREE.PlaneGeometry(13, 2.03), new THREE.MeshStandardMaterial({ map: tex(sc), roughness: .6 }), 0, 6.3, -28.98, s); sign.castShadow = false;
  // 置き去りの救急車
  const amb = new THREE.Group(); amb.position.set(5.5, 0, -14); amb.rotation.y = -0.55; s.add(amb);
  const bodyW = new THREE.MeshPhysicalMaterial({ color: 0xf4f4f2, roughness: .3, clearcoat: .8, envMapIntensity: 1 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x10151b, roughness: .05, metalness: .4, clearcoat: 1, envMapIntensity: 1.3 });
  mesh(new RoundedBoxGeometry(2.1, 2.3, 4.0, 3, .18), bodyW, 0, 1.55, .6, amb);
  mesh(new RoundedBoxGeometry(2.05, 1.6, 1.8, 3, .25), bodyW, 0, 1.2, -2.05, amb);
  mesh(new THREE.PlaneGeometry(1.8, .75), dark, 0, 1.6, -2.97, amb).rotation.x = -.25;
  for (const sx of [-1, 1]) { mesh(new THREE.BoxGeometry(.02, .28, 3.8), new THREE.MeshStandardMaterial({ color: 0xd12a24, roughness: .5 }), sx * 1.06, 1.3, .6, amb); mesh(new THREE.PlaneGeometry(.9, .6), dark, sx * 1.04, 1.75, -1.9, amb).rotation.y = sx * Math.PI / 2; }
  mesh(new RoundedBoxGeometry(1.4, .16, .35, 2, .05), new THREE.MeshStandardMaterial({ color: 0x5a0d0d, roughness: .3 }), 0, 2.78, -1.1, amb);
  const tire = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .85 });
  for (const [x, z] of [[-.95, -1.8], [.95, -1.8], [-.95, 1.6], [.95, 1.6]]) { const w = mesh(new THREE.CylinderGeometry(.42, .42, .3, 24), tire, x, .42, z, amb); w.rotation.z = Math.PI / 2; }
  // 消えた街灯
  for (const [x, z] of [[-14, -8], [14, -8], [-14, 14], [14, 14]]) { mesh(new THREE.CylinderGeometry(.09, .12, 7, 10), new THREE.MeshStandardMaterial({ color: 0x6b6f73, metalness: .6, roughness: .4 }), x, 3.5, z, s); }
}

// =====================================================================
// D: 1000人の中の、医師2人（44.5〜48.95秒）
// =====================================================================
const DI = newScene('D', 0.95, 0.6, 0.06);
const DI_COLS = 20, DI_ROWS = 50, DI_SP = 1.1, DI_DOC = [[17, 6], [34, 14]]; // [段, 列]
let diMesh, diShirt0, diRings = [];
const diPos = (rw, cl) => V((cl - (DI_COLS - 1) / 2) * DI_SP, 0, (rw - (DI_ROWS - 1) / 2) * DI_SP);
{
  const s = DI.scene, r = rng(1001);
  s.background = new THREE.Color(0xe7ebf0); s.environment = roomEnv;
  s.add(new THREE.HemisphereLight(0xffffff, 0xb9c2cc, 0.9));
  addSun(s, V(-0.35, 1, 0.45), 0xffffff, 2.2, V(0, 0, 0), 40);
  mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: .9, envMapIntensity: .4 }), 0, 0, 0, s).castShadow = false;
  const n = DI_COLS * DI_ROWS, geo = crowdGeometry();
  const aS = new Float32Array(n * 3), aP = new Float32Array(n * 3), aG = new Float32Array(n * 3);
  const MUTED = [0x7f97b3, 0xb39b7f, 0x8fa88a, 0xa58fb0, 0x9aa3ad, 0xc4a77a, 0x7a8fa0].map(c => new THREE.Color(c));
  for (let i = 0; i < n; i++) { const c = MUTED[(r() * MUTED.length) | 0], pc = PANTS[(r() * PANTS.length) | 0]; aS.set([c.r, c.g, c.b], i * 3); aP.set([pc.r, pc.g, pc.b], i * 3); aG.set([r() * 6.28, 0, 0], i * 3); }
  for (const [rw, cl] of DI_DOC) { const i = rw * DI_COLS + cl; aS.set([0.95, 0.95, 0.95], i * 3); aP.set([0.85, 0.87, 0.9], i * 3); }
  diShirt0 = aS.slice();
  geo.setAttribute('aShirt', new THREE.InstancedBufferAttribute(aS, 3)); geo.setAttribute('aPants', new THREE.InstancedBufferAttribute(aP, 3)); geo.setAttribute('aGait', new THREE.InstancedBufferAttribute(aG, 3));
  diMesh = new THREE.InstancedMesh(geo, crowdMaterial(), n); diMesh.castShadow = diMesh.receiveShadow = true; diMesh.frustumCulled = false; s.add(diMesh);
  for (const [rw, cl] of DI_DOC) {
    const p = diPos(rw, cl), rg = new THREE.Mesh(new THREE.RingGeometry(.42, .62, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x19b7ff, transparent: true, opacity: 0, depthWrite: false }));
    rg.position.set(p.x, .03, p.z); s.add(rg); diRings.push(rg); DI.fx.push(rg); // 影の処理（AO）から外す（出る前に暗い丸が見えないように）
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 6, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.set(p.x, 3, p.z); s.add(beam); diRings.push(beam); DI.fx.push(beam);
  }
}
const DI_DIM = 45.9;
function updateDI(t) {
  crowdUniforms.uTime.value = t; if (diGhost) diGhost.visible = false; diRings.forEach(m => m.visible = true);
  const m4 = new THREE.Matrix4(), aS = diMesh.geometry.attributes.aShirt, dim = smooth(DI_DIM, DI_DIM + .4, t);
  for (let rw = 0; rw < DI_ROWS; rw++) for (let cl = 0; cl < DI_COLS; cl++) {
    const i = rw * DI_COLS + cl, k = clamp(easeBack((t - (44.5 + (DI_ROWS - 1 - rw) * .016)) / .3), 0, 1.3), sc = Math.max(k, 1e-5);
    const p = diPos(rw, cl); m4.compose(p, _q.identity(), V(sc, sc, sc)); diMesh.setMatrixAt(i, m4);
    const doc = DI_DOC.some(([a, b]) => a === rw && b === cl);
    for (let j = 0; j < 3; j++) aS.array[i * 3 + j] = doc ? diShirt0[i * 3 + j] : lerp(diShirt0[i * 3 + j], 0.18, dim);
  }
  diMesh.instanceMatrix.needsUpdate = true; aS.needsUpdate = true;
  diRings.forEach((m, i) => { m.material.opacity = dim * (i % 2 ? .55 : 1) * (1 + .15 * Math.sin(t * 6)); });
}

// =====================================================================
// O: 誰もいない手術室（48.95〜54.4秒）
// =====================================================================
const OR = newScene('O', 1.0, 0.85, 0.12);
let orMonCtx, orMonTex;
{
  const s = OR.scene; s.background = new THREE.Color(0x0a0d10); s.environment = roomEnv;
  s.add(new THREE.HemisphereLight(0xbfd6e0, 0x1c2426, 0.35));
  // 部屋（タイルの壁・つやのある床・天井）
  const tc = canvas(512, 512); { const g = tc.getContext('2d'); g.fillStyle = '#9fbfb9'; g.fillRect(0, 0, 512, 512); const rr = rng(5); for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) { const v = 205 + rr() * 14 | 0; g.fillStyle = `rgb(${v - 18},${v + 10},${v + 2})`; g.fillRect(x + 2, y + 2, 60, 60); } }
  const wallM = new THREE.MeshStandardMaterial({ map: tex(tc, true, [5.6, 2]), roughness: .35, envMapIntensity: .6, side: THREE.BackSide });
  const floorM = new THREE.MeshPhysicalMaterial({ color: 0x5f7470, roughness: .25, clearcoat: .7, envMapIntensity: .6, side: THREE.BackSide });
  const ceilM = new THREE.MeshStandardMaterial({ color: 0xe9eded, roughness: .8, side: THREE.BackSide });
  const room = mesh(new THREE.BoxGeometry(9, 3.2, 9), [wallM, wallM, ceilM, floorM, wallM, wallM], 0, 1.6, 0, s); room.castShadow = false;
  for (const [x, z] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) { const pn = mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf6ff, emissiveIntensity: .7 }), x, 3.19, z, s); pn.castShadow = false; }
  for (const [x, z] of [[-2.6, -2.6], [2.6, 2.6]]) { const l = new THREE.PointLight(0xdff0ff, 4, 9, 2); l.position.set(x, 3, z); s.add(l); }
  // 手術台
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9cfd4, metalness: .9, roughness: .25, envMapIntensity: 1 });
  mesh(new THREE.CylinderGeometry(.22, .3, .75, 24), steel, 0, .38, 0, s);
  mesh(new RoundedBoxGeometry(.7, .12, 2.1, 3, .04), new THREE.MeshStandardMaterial({ color: 0x23405e, roughness: .55 }), 0, .82, 0, s);
  mesh(new RoundedBoxGeometry(.68, .02, 2.0, 2, .01), new THREE.MeshStandardMaterial({ color: 0x5c8f86, roughness: .9 }), 0, .89, .02, s);
  mesh(new RoundedBoxGeometry(.3, .08, .25, 2, .03), new THREE.MeshStandardMaterial({ color: 0x23405e, roughness: .55 }), 0, .92, -.92, s);
  // 無影灯（天井から2灯。手術台を照らす）
  const lampEm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3 });
  mesh(new THREE.CylinderGeometry(.06, .06, .9, 12), steel, 0, 2.75, 0, s);
  for (const [x, z, ang] of [[.35, .25, .35], [-.4, -.35, -.3]]) {
    const hd = new THREE.Group(); hd.position.set(x, 2.15, z); hd.rotation.z = ang * .4; s.add(hd);
    mesh(new THREE.BoxGeometry(Math.abs(x) + .1, .05, .05), steel, -x / 2, .3, 0, hd);
    mesh(new THREE.CylinderGeometry(.42, .34, .16, 40), new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: .4 }), 0, 0, 0, hd);
    mesh(new THREE.CircleGeometry(.3, 40).rotateX(Math.PI / 2), lampEm, 0, -.085, 0, hd).castShadow = false;
    const sp = new THREE.SpotLight(0xfff8ee, 70, 6, .42, .55, 2); sp.position.set(x, 2.05, z); sp.target.position.set(0, .9, 0); sp.castShadow = true; sp.shadow.mapSize.set(2048, 2048); sp.shadow.bias = -.0005; s.add(sp, sp.target);
  }
  // 器具台
  mesh(new THREE.CylinderGeometry(.02, .02, 1.0, 10), steel, .85, .5, .5, s);
  mesh(new RoundedBoxGeometry(.55, .03, .4, 2, .01), steel, .85, 1.0, .5, s);
  for (let i = 0; i < 6; i++) mesh(new THREE.BoxGeometry(.012, .008, .16 + (i % 3) * .03), steel, .66 + i * .07, 1.02, .5, s);
  // 心電図モニター（毎フレーム描き直す）
  const mc = canvas(512, 320); orMonCtx = mc.getContext('2d'); orMonTex = tex(mc);
  const mon = new THREE.Group(); mon.position.set(-1.35, 1.55, -.9); mon.rotation.y = .6; s.add(mon);
  mesh(new RoundedBoxGeometry(.7, .48, .08, 2, .02), new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: .5 }), 0, 0, 0, mon);
  mesh(new THREE.PlaneGeometry(.62, .39), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: orMonTex, emissiveIntensity: 1.6 }), 0, 0, .042, mon).castShadow = false;
  mesh(new THREE.CylinderGeometry(.03, .03, 1.3, 10), steel, 0, -.9, -.05, mon);
  // 麻酔器・点滴台・戸棚
  mesh(new RoundedBoxGeometry(.75, 1.4, .6, 3, .04), new THREE.MeshStandardMaterial({ color: 0xe4e7ea, roughness: .5 }), -1.6, .7, .6, s);
  mesh(new THREE.CylinderGeometry(.015, .015, 1.9, 8), steel, 1.1, .95, -.9, s);
  mesh(new RoundedBoxGeometry(.18, .26, .05, 2, .02), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .1, transparent: true, opacity: .55 }), 1.1, 1.75, -.9, s);
  for (let i = 0; i < 4; i++) mesh(new RoundedBoxGeometry(1.0, 1.9, .5, 2, .02), steel, -3.2 + i * 1.05, .95, -4.2, s);
}
const FLAT_T = 53.35; // 心電図が止まる（平らになり「ピー」と鳴る）時刻
function updateOR(t) {
  const g = orMonCtx, W2 = 512, H2 = 320, flat = t >= FLAT_T, blink = flat && Math.floor((t - FLAT_T) * 4) % 2 === 0;
  g.fillStyle = flat && blink ? '#1c0505' : '#030805'; g.fillRect(0, 0, W2, H2);
  g.strokeStyle = 'rgba(40,90,60,.5)'; g.lineWidth = 1; for (let x = 0; x < W2; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H2); g.stroke(); }
  g.strokeStyle = '#39ff8a'; g.lineWidth = 4; g.beginPath();
  for (let x = 0; x < 380; x++) { const tt = t - (380 - x) / 160, ph = (tt * 1.15) % 1; let y = 0; if (tt < FLAT_T) { if (ph > .3 && ph < .34) y = -90 * Math.sin((ph - .3) / .04 * Math.PI); else if (ph > .34 && ph < .38) y = 30 * Math.sin((ph - .34) / .04 * Math.PI); else if (ph > .5 && ph < .62) y = -14 * Math.sin((ph - .5) / .12 * Math.PI); } x ? g.lineTo(x, 150 + y) : g.moveTo(x, 150 + y); }
  g.stroke();
  g.fillStyle = flat ? (blink ? '#ff3b30' : '#7a1a16') : '#39ff8a'; g.font = '700 84px "Noto Sans JP"'; g.fillText(flat ? '0' : '72', 395, 130);
  g.fillStyle = flat ? '#ff3b30' : '#39ff8a'; g.font = '700 26px "Noto Sans JP"'; g.fillText('HR', 400, 54);
  if (flat) { g.strokeStyle = blink ? '#ff3b30' : 'rgba(255,59,48,.35)'; g.lineWidth = 10; g.strokeRect(5, 5, W2 - 10, H2 - 10); }
  g.fillStyle = '#5fd0ff'; g.font = '700 54px "Noto Sans JP"'; g.fillText('98', 400, 250); g.font = '700 22px "Noto Sans JP"'; g.fillText('SpO2', 400, 196);
  orMonTex.needsUpdate = true;
}

// ================= shared: 歩く・座るポーズ =================
// 歩き（ph は周期の位相）。戻り値は体の上下（root の y に足す）
function walkPose(g, ph, armK = 1) {
  const s = Math.sin(ph), c = Math.cos(ph);
  g.legL.hp.rotation.x = -0.42 * s; g.legR.hp.rotation.x = 0.42 * s;
  g.legL.kn.rotation.x = .08 + .65 * Math.max(0, c); g.legR.kn.rotation.x = .08 + .65 * Math.max(0, -c);
  if (armK) { g.armL.sh.rotation.x = .32 * s * armK; g.armR.sh.rotation.x = -.32 * s * armK; g.armL.el.rotation.x = g.armR.el.rotation.x = -.22; }
  g.chest.rotation.y = .05 * s; return .03 * Math.abs(c) - .015;
}
// 座る（root を座面の高さ - 0.6 くらいに置く）
function seatPose(g) {
  g.legL.hp.rotation.x = g.legR.hp.rotation.x = -1.45; g.legL.kn.rotation.x = g.legR.kn.rotation.x = 1.4;
  g.legL.hp.rotation.z = -.1; g.legR.hp.rotation.z = .1; g.chest.rotation.x = .12;
  for (const [a, sx] of [[g.armL, -1], [g.armR, 1]]) { a.sh.rotation.x = -.75; a.sh.rotation.z = sx * .12; a.el.rotation.x = -.55; }
}
const canMesh = (parent, color = 0xc8352a) => { const c = new THREE.Group(); parent.add(c); mesh(new THREE.CylinderGeometry(.038, .038, .1, 20), new THREE.MeshStandardMaterial({ color, metalness: .3, roughness: .45 }), 0, 0, 0, c); mesh(new THREE.CylinderGeometry(.039, .039, .012, 20), new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: .9, roughness: .25 }), 0, .056, 0, c); return c; };

// =====================================================================
// M: 缶詰の並ぶスーパー（54.4〜58.9秒）
// =====================================================================
const MK = newScene('M', 0.95, 0.8, 0.08);
let shopper, cart;
{
  const s = MK.scene, r = rng(1101); s.background = new THREE.Color(0xdfe3e6); s.environment = roomEnv;
  s.add(new THREE.HemisphereLight(0xffffff, 0xbfc4c8, 0.9));
  addSun(s, V(0.25, 1, 0.35), 0xffffff, 1.6, V(0, 0, -8), 26);
  for (let z = 6; z > -36; z -= 7) { const l = new THREE.PointLight(0xffffff, 9, 14, 2); l.position.set(0, 3, z); s.add(l); }
  // 床（つやのあるタイル）・天井・照明
  const fc = canvas(512, 512); { const g = fc.getContext('2d'); g.fillStyle = '#c9cdd0'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 128) for (let x = 0; x < 512; x += 128) { const v = 212 + r() * 12 | 0; g.fillStyle = `rgb(${v},${v + 2},${v + 4})`; g.fillRect(x + 2, y + 2, 124, 124); } }
  mesh(new THREE.PlaneGeometry(40, 70).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: tex(fc, true, [20, 35]), roughness: .3, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: .7 }), 0, 0, -12, s).castShadow = false;
  mesh(new THREE.PlaneGeometry(40, 70).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2f3f4, roughness: .9 }), 0, 3.4, -12, s).castShadow = false;
  for (const x of [-.6, .6]) mesh(new THREE.BoxGeometry(.18, .05, 46), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 }), x, 3.36, -12, s).castShadow = false;
  mesh(new THREE.PlaneGeometry(40, 4).translate(0, 2, 0), new THREE.MeshStandardMaterial({ color: 0xe6e8ea, roughness: .8 }), 0, 0, -38, s);
  // 棚（両側・5段）と、ぎっしりの缶詰
  const shelfM = new THREE.MeshStandardMaterial({ color: 0xe9ebec, roughness: .5, metalness: .2 });
  const levels = [.12, .48, .84, 1.2, 1.56];
  for (const sx of [-1, 1]) {
    mesh(new THREE.BoxGeometry(.04, 1.95, 44), shelfM, sx * 1.82, .98, -12, s);
    for (const y of levels) mesh(new THREE.BoxGeometry(.62, .025, 44), shelfM, sx * 1.52, y - .015, -12, s);
    mesh(new THREE.BoxGeometry(.62, .1, 44), new THREE.MeshStandardMaterial({ color: 0xd9dcdf, roughness: .6 }), sx * 1.52, 1.98, -12, s);
  }
  const lc = canvas(256, 128); { const g = lc.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, 256, 18); g.fillRect(0, 110, 256, 18); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(128, 64, 46, 30, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(100, 56, 56, 6); g.fillRect(108, 68, 40, 5); }
  const canG = new THREE.CylinderGeometry(.04, .04, .11, 20);
  const CANC = [0xd23a2c, 0xe8a53a, 0x2f6fb8, 0x3c8c4a, 0xf0d24a, 0x8c3a8c, 0xe8e2d6, 0x2a2a2a, 0xd8662a].map(c => new THREE.Color(c));
  const cpos = []; for (const sx of [-1, 1]) for (const y of levels) for (let z = 9.8; z > -33.8; z -= .088) for (const dx of [-.12, .12]) cpos.push([sx * 1.5 + dx, y + .055, z]);
  const cans = new THREE.InstancedMesh(canG, [new THREE.MeshStandardMaterial({ map: tex(lc), roughness: .45, metalness: .2 }), new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: .9, roughness: .25 }), new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: .9, roughness: .25 })], cpos.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let blk = 0;
  cpos.forEach(([x, y, z], i) => { if (i % 24 === 0) blk = (r() * CANC.length) | 0; q.setFromAxisAngle(V(0, 1, 0), r() * 6.28); m4.compose(V(x, y, z), q, V(1, 1, 1)); cans.setMatrixAt(i, m4); cans.setColorAt(i, CANC[blk]); });
  cans.castShadow = cans.receiveShadow = true; s.add(cans);
  // 吊り下げ看板
  const sc = canvas(1024, 220); { const g = sc.getContext('2d'); g.fillStyle = '#c8352a'; g.fillRect(0, 0, 1024, 220); g.fillStyle = '#ffffff'; g.font = '900 120px "Noto Sans JP"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('缶詰・レトルト', 512, 116); }
  const sm = new THREE.MeshStandardMaterial({ map: tex(sc), roughness: .6, side: THREE.DoubleSide });
  for (const z of [-4, -20]) { mesh(new THREE.PlaneGeometry(2.4, .52), sm, 0, 2.75, z, s).castShadow = false; for (const x of [-1, 1]) mesh(new THREE.CylinderGeometry(.005, .005, .4, 6), shelfM, x, 3.2, z, s); }
  // カートを押して一人で歩く人（こちらへ向かって歩く）
  shopper = makeFigure({ shirt: 0x5c7fa8, pants: 0x2b2f38, skin: 0xd9a988, hair: 0x2a1d16, shoe: 0xf2f2f2 }); s.add(shopper.root);
  cart = new THREE.Group(); s.add(cart);
  const wire = canvas(128, 128); { const g = wire.getContext('2d'); g.clearRect(0, 0, 128, 128); g.strokeStyle = '#ffffff'; g.lineWidth = 6; for (let i = 0; i <= 128; i += 21) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } }
  const wm = new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: .8, roughness: .3, alphaMap: tex(wire, false, [3, 2]), transparent: true, alphaTest: .5, side: THREE.DoubleSide });
  mesh(new THREE.BoxGeometry(.56, .42, .85), wm, 0, .78, 0, cart);
  mesh(new THREE.CylinderGeometry(.015, .015, .58, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc8352a, roughness: .5 }), 0, .98, -.46, cart);
  for (const [x, z] of [[-.22, .36], [.22, .36], [-.22, -.36], [.22, -.36]]) { mesh(new THREE.CylinderGeometry(.012, .012, .5, 6), wm, x, .33, z, cart); mesh(new THREE.CylinderGeometry(.05, .05, .03, 12).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x222222 }), x, .05, z, cart); }
  for (let i = 0; i < 5; i++) { const c = canMesh(cart, CANC[i].getHex()); c.position.set(-.15 + (i % 3) * .14, .64, -.15 + Math.floor(i / 3) * .2); }
}
const SHOP_Z0 = -7.5, SHOP_V = 1.05;
function updateMarket(t, lt) {
  const z = SHOP_Z0 + lt * SHOP_V, bob = walkPose(shopper, lt * Math.PI * 2 * .9, 0);
  shopper.root.position.set(.15, bob, z);
  for (const [a, sx] of [[shopper.armL, -1], [shopper.armR, 1]]) { a.sh.rotation.x = -.85; a.sh.rotation.z = sx * .05; a.el.rotation.x = -.5; }
  cart.position.set(.15, 0, z + .95);
}

// =====================================================================
// F: 畑と家畜（58.9〜64.4秒）
// =====================================================================
const FA = newScene('F', 0.8, 0.6, 0.08);
let farmer;
{
  const s = FA.scene, r = rng(1201), sunDir = V(-0.5, 0.6, 0.55);
  addSky(s, sunDir, 0xbfd2e3, 0.0002);
  s.add(new THREE.HemisphereLight(0xcfe0f5, 0x6a5a3a, 0.8));
  addSun(s, sunDir, 0xfff0d8, 4.2, V(0, 0, -10), 60);
  const farmH = (x, z) => fbm(x * .002, z * .002, 3) * 12 * smooth(150, 500, Math.hypot(x, z)) + (1 - Math.abs(fbm(x * .0008 + 2, z * .0008, 5))) ** 2 * 420 * smooth(1300, 2800, Math.hypot(x, z));
  const tg = new THREE.PlaneGeometry(8000, 8000, 320, 320); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, farmH(x, z)); const n = fbm(x * .006, z * .006, 3) * .5 + .5; c.setRGB(lerp(.15, .24, n), lerp(.24, .32, n), lerp(.07, .1, n)); col.set([c.r, c.g, c.b], i * 3); }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex(noiseCanvas(512, '#ffffff', .2, 121), true, [900, 900]), roughness: .95, envMapIntensity: .35 }), 0, -.05, 0, s).castShadow = false;
  // 広い畑（畝の縞）と、手前の作物
  const rc = canvas(64, 256); { const g = rc.getContext('2d'); g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, 64, 256); g.fillStyle = '#4f8a2f'; g.fillRect(0, 0, 64, 110); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 200, 64, 30); }
  // 畑は左側（x < -2）。右側（x > 2）は牧場。境目に土の道
  mesh(new THREE.PlaneGeometry(220, 300).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex(rc, true, [1, 375]), roughness: .95, polygonOffset: true, polygonOffsetFactor: -2 }), -112, .01, -100, s).castShadow = false;
  mesh(new THREE.PlaneGeometry(1.6, 300).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }), -1.4, .015, -100, s).castShadow = false;
  const pc = canvas(512, 512); { const g = pc.getContext('2d'); g.fillStyle = '#6aa043'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${r() > .5 ? '150,190,80' : '60,110,40'},${.15 + r() * .2})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 80, 20 + r() * 50, r() * 3, 0, 7); g.fill(); } }
  mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex(pc, true, [12, 12]), roughness: .95, polygonOffset: true, polygonOffsetFactor: -2 }), 152, .012, -100, s).castShadow = false;
  const plantG = new THREE.IcosahedronGeometry(.22, 2); { const pp = plantG.attributes.position; for (let i = 0; i < pp.count; i++) { const v = V(pp.getX(i), pp.getY(i), pp.getZ(i)); v.multiplyScalar(1 + .25 * vnoise(v.x * 9, v.z * 9)); v.y *= .7; pp.setXYZ(i, v.x, v.y, v.z); } plantG.computeVertexNormals(); }
  const pl = []; for (let z = 49.5; z > -250; z -= .8) for (let x = -160; x < -2.4; x += .55) { if (Math.hypot(x, z) > 70) continue; pl.push([x, z]); }
  const plants = new THREE.InstancedMesh(plantG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 }), pl.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  pl.forEach(([x, z], i) => { const k = .8 + r() * .5; q.setFromAxisAngle(V(0, 1, 0), r() * 6.28); m4.compose(V(x, .12, z), q, V(k, k, k)); plants.setMatrixAt(i, m4); plants.setColorAt(i, new THREE.Color().setHSL(.25 + r() * .05, .5, .32 + r() * .1)); });
  plants.castShadow = plants.receiveShadow = true; s.add(plants);
  // 牧場（柵と牛）と赤い納屋
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: .9 });
  // 牧場の柵（道沿いと奥）
  const fence = []; for (let z = 40; z > -160; z -= 3) { const g = new THREE.BoxGeometry(.12, 1.2, .12); g.translate(2.4, .6, z); fence.push(plain(g)); } for (let x = 2.4; x < 90; x += 3) { const g = new THREE.BoxGeometry(.12, 1.2, .12); g.translate(x, .6, -160); fence.push(plain(g)); }
  for (const y of [1.0, .55]) { const a = new THREE.BoxGeometry(.06, .1, 200); a.translate(2.4, y, -60); fence.push(plain(a)); const b = new THREE.BoxGeometry(88, .1, .06); b.translate(46, y, -160); fence.push(plain(b)); }
  mesh(mergeGeometries(fence), wood, 0, 0, 0, s);
  // 羊・干し草のロール・サイロ・奥の木立
  const wool = new THREE.IcosahedronGeometry(.55, 3); { const pp = wool.attributes.position; for (let i = 0; i < pp.count; i++) { const v = V(pp.getX(i), pp.getY(i), pp.getZ(i)); v.multiplyScalar(1 + .14 * vnoise(v.x * 9, v.y * 9 + v.z * 5)); v.z *= 1.35; pp.setXYZ(i, v.x, v.y, v.z); } wool.computeVertexNormals(); }
  const woolM = new THREE.MeshStandardMaterial({ color: 0xf1ede2, roughness: 1 }), sheepDark = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: .8 });
  for (let i = 0; i < 12; i++) { const sh = new THREE.Group(); sh.position.set(12 + r() * 22, 0, 6 + r() * 26); sh.rotation.y = r() * 6.28; s.add(sh); mesh(wool, woolM, 0, .72, 0, sh); mesh(new RoundedBoxGeometry(.24, .26, .34, 2, .08), sheepDark, 0, .62, .72, sh).rotation.x = .6; for (const [lx, lz] of [[-.18, .35], [.18, .35], [-.18, -.35], [.18, -.35]]) mesh(new THREE.CylinderGeometry(.04, .04, .45, 8), sheepDark, lx, .22, lz, sh); }
  const hayM = new THREE.MeshStandardMaterial({ map: tex(noiseCanvas(256, '#d8b860', .3, 141), true, [3, 1]), roughness: 1 });
  for (let i = 0; i < 9; i++) { const h = mesh(new THREE.CylinderGeometry(.7, .7, 1.2, 28).rotateZ(Math.PI / 2), hayM, 8 + r() * 26, .7, -8 - r() * 45, s); h.rotation.y = r() * 3; }
  const silo = new THREE.Group(); silo.position.set(42, 0, 30); s.add(silo);
  mesh(new THREE.CylinderGeometry(3, 3, 14, 32), new THREE.MeshStandardMaterial({ color: 0xc9cbc8, metalness: .5, roughness: .4 }), 0, 7, 0, silo);
  mesh(new THREE.SphereGeometry(3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a3a30, roughness: .6 }), 0, 14, 0, silo);
  const rowT = canopyGeometry(99), trow = new THREE.InstancedMesh(rowT, new THREE.MeshStandardMaterial({ color: 0x3a6a2c, roughness: .9 }), 40), tm4 = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { const k = 2 + r() * 1.2; tm4.compose(V(80 + r() * 18, 3.6 * k, 30 - i * 5.2 - r() * 2), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r() * 6), V(k * 1.2, k * 1.7, k * 1.2)); trow.setMatrixAt(i, tm4); }
  trow.castShadow = true; s.add(trow);
  const cowC = canvas(256, 256); { const g = cowC.getContext('2d'); g.fillStyle = '#f2efe8'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#1d1d1f'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(r() * 256, r() * 256, 20 + r() * 34, 14 + r() * 24, r() * 3, 0, 7); g.fill(); } }
  const cowM = new THREE.MeshStandardMaterial({ map: tex(cowC), roughness: .8 }), dark = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .7 }), pink = new THREE.MeshStandardMaterial({ color: 0xe7a9a0, roughness: .6 });
  for (const [x, z, ry] of [[7, -6, .6], [11, -14, -1.1], [9, -24, 2.2], [16, -4, 1.4], [20, -18, .2], [13, -36, -2.4], [24, -30, 1.0], [8, -46, -.6], [19, -52, 2.8], [28, -10, -1.7]]) {
    const cw = new THREE.Group(); cw.position.set(x, 0, z); cw.rotation.y = ry; s.add(cw);
    mesh(new THREE.CapsuleGeometry(.48, 1.1, 8, 20).rotateX(Math.PI / 2), cowM, 0, 1.0, 0, cw);
    for (const [lx, lz] of [[-.28, .5], [.28, .5], [-.28, -.5], [.28, -.5]]) mesh(new THREE.CylinderGeometry(.09, .08, .75, 12), cowM, lx, .4, lz, cw);
    const hd = new THREE.Group(); hd.position.set(0, .8, .95); hd.rotation.x = .9; cw.add(hd);
    mesh(new RoundedBoxGeometry(.38, .4, .55, 3, .14), cowM, 0, 0, .15, hd); mesh(new RoundedBoxGeometry(.32, .2, .18, 2, .08), pink, 0, -.08, .42, hd);
    for (const sx of [-1, 1]) mesh(new THREE.ConeGeometry(.04, .16, 10), new THREE.MeshStandardMaterial({ color: 0xe8e0cc }), sx * .14, .24, 0, hd);
    mesh(new THREE.CylinderGeometry(.02, .02, .5, 6), dark, 0, .9, -.75, cw).rotation.x = .3;
  }
  const barn = new THREE.Group(); barn.position.set(28, 0, 38); barn.rotation.y = .5 + Math.PI; s.add(barn);
  mesh(new THREE.BoxGeometry(12, 7, 16), new THREE.MeshStandardMaterial({ color: 0xa83228, roughness: .8 }), 0, 3.5, 0, barn);
  const rs = new THREE.Shape([new THREE.Vector2(-6.6, 0), new THREE.Vector2(6.6, 0), new THREE.Vector2(0, 4)]); const rg = new THREE.ExtrudeGeometry(rs, { depth: 16.8, bevelEnabled: false }); rg.translate(0, 7, -8.4);
  mesh(rg, new THREE.MeshStandardMaterial({ color: 0x4a4a4c, roughness: .7 }), 0, 0, 0, barn);
  mesh(new THREE.PlaneGeometry(4, 5), new THREE.MeshStandardMaterial({ color: 0xf2efe8 }), 0, 2.5, 8.01, barn);
  // 鍬を持って一人で畑を歩く農夫
  farmer = makeFigure({ shirt: 0x6b8fb3, pants: 0x4a4038, skin: 0xc99475, hair: 0x2a1d16, shoe: 0x3a3028 }); farmer.root.rotation.y = Math.PI; s.add(farmer.root);
  const hatM = new THREE.MeshStandardMaterial({ color: 0xd8bf7f, roughness: .9 });
  mesh(new THREE.CylinderGeometry(.24, .24, .012, 40), hatM, 0, .13, 0, farmer.head); mesh(new THREE.CylinderGeometry(.1, .115, .1, 32), hatM, 0, .18, 0, farmer.head);
  const hoe = new THREE.Group(); hoe.position.set(0, -.3, 0); hoe.rotation.x = -2.2; farmer.armR.el.add(hoe);
  mesh(new THREE.CylinderGeometry(.018, .018, 1.3, 10), wood, 0, -.55, 0, hoe); mesh(new THREE.BoxGeometry(.2, .02, .16), new THREE.MeshStandardMaterial({ color: 0x777b80, metalness: .8, roughness: .4 }), 0, -1.2, .07, hoe);
}
function updateFarm(t, lt) {
  const z = 2 - lt * 1.1, bob = walkPose(farmer, lt * Math.PI * 2 * .9, 1);
  farmer.root.position.set(-1.5, bob, z);
  farmer.armR.sh.rotation.x = -.55; farmer.armR.el.rotation.x = -1.1; // 鍬は肩にかつぐ
}

// =====================================================================
// 種の存続（64.4〜70.4秒）：D の場面を使い回す。いる100人と、足りない数百人（半透明）
// =====================================================================
let diGhost;
{
  const s = DI.scene, gg = crowdGeometry();
  diGhost = new THREE.InstancedMesh(gg, new THREE.MeshStandardMaterial({ color: 0x7f93ad, roughness: .8, transparent: true, opacity: .38, depthWrite: false }), 400);
  diGhost.frustumCulled = false; diGhost.visible = false; s.add(diGhost); DI.fx.push(diGhost);
}
const SURV_COLS = 25, SURV_ROWS = 20;
const survPos = i => V((i % SURV_COLS - (SURV_COLS - 1) / 2) * 1.1, 0, (Math.floor(i / SURV_COLS) - (SURV_ROWS - 1) / 2) * 1.1);
// 中央の100マスを、中心から近い順（渦巻き）に並べる → 1人から100人へ増える順番
const SURV_ORDER = (() => { const a = []; for (let i = 0; i < SURV_COLS * SURV_ROWS; i++) { const cx = i % SURV_COLS, ry = Math.floor(i / SURV_COLS); if (Math.abs(cx - 12) <= 4.5 && Math.abs(ry - 9.5) <= 4.5) a.push(i); } const c = survPos(12 + 9 * SURV_COLS); return a.sort((p, q) => { const P = survPos(p).sub(c), Q = survPos(q).sub(c); return (P.length() + Math.atan2(P.z, P.x) * .02) - (Q.length() + Math.atan2(Q.z, Q.x) * .02); }); })();
const GROW0 = 64.55, GROW1 = 66.2, GHOST0 = 66.4;
const growTime = n => n === 0 ? GROW0 : GROW0 + .45 + (GROW1 - GROW0 - .45) * Math.pow(n / 99, .7); // 最初の1人のあと、加速しながら増える
const growCount = t => { let n = 0; while (n < 100 && t >= growTime(n)) n++; return n; };
function updateSurvive(t) {
  crowdUniforms.uTime.value = t;
  const m4 = new THREE.Matrix4(), aS = diMesh.geometry.attributes.aShirt; let ghost = 0;
  diRings.forEach(m => m.visible = false); diGhost.visible = true;
  SURV_ORDER.forEach((i, n) => { const k = clamp(easeBack((t - growTime(n)) / .22), 0, 1.3), sc = Math.max(k, 1e-5); m4.compose(survPos(i), _q.identity(), V(sc, sc, sc)); diMesh.setMatrixAt(n, m4); for (let j = 0; j < 3; j++) aS.array[n * 3 + j] = diShirt0[n * 3 + j]; });
  const solid = 100;
  for (let i = 0; i < SURV_COLS * SURV_ROWS; i++) {
    const cx = i % SURV_COLS, ry = Math.floor(i / SURV_COLS), inner = Math.abs(cx - 12) <= 4.5 && Math.abs(ry - 9.5) <= 4.5, p = survPos(i);
    if (!inner) { const d = Math.hypot(cx - 12, ry - 9.5), k = clamp(easeBack((t - GHOST0 - d * .045) / .35), 0, 1.3), sc = Math.max(k, 1e-5); m4.compose(p, _q.identity(), V(sc, sc, sc)); diGhost.setMatrixAt(ghost++, m4); }
  }
  for (let i = solid; i < diMesh.count; i++) { m4.makeScale(1e-5, 1e-5, 1e-5); diMesh.setMatrixAt(i, m4); }
  diMesh.instanceMatrix.needsUpdate = diGhost.instanceMatrix.needsUpdate = true; aS.needsUpdate = true;
}

// =====================================================================
// K: 夜、たき火を囲む100人（70.4〜87.2秒）
// =====================================================================
const KA = newScene('K', 1.0, 0.7, 0.18);
const fireUni = { uTime: { value: 0 } };
let campCrowd, campData = [], fireLight, sitters = [], handCan, lanterns, torchSticks, meteor, guitarArmT = 0;
const GRILL = V(1.15, 0, 1.75); // 焼き網の位置（たき火と座る人の間）
{
  const s = KA.scene, r = rng(1301), moon = V(0.4, 0.55, -0.6);
  addSky(s, moon, 0x0a0e18, 0.0035, 2);
  s.add(new THREE.HemisphereLight(0x405080, 0x0a0a10, 0.18));
  const ms = addSun(s, moon, 0x8fa0d8, 0.35, V(0, 0, 0), 50); ms.castShadow = false;
  const tg = new THREE.PlaneGeometry(3000, 3000, 200, 200); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z); p.setY(i, fbm(x * .004, z * .004, 4) * 25 * smooth(90, 500, rr)); const n = fbm(x * .02, z * .02, 3) * .5 + .5; c.setRGB(lerp(.1, .16, n), lerp(.14, .19, n), lerp(.06, .08, n)); col.set([c.r, c.g, c.b], i * 3); }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex(noiseCanvas(512, '#ffffff', .2, 131), true, [700, 700]), roughness: .95, envMapIntensity: .3 }), 0, 0, 0, s).castShadow = false;
  // 森（まわりの木）とテント
  const canG = canopyGeometry(77); const NT = 140, trees = new THREE.InstancedMesh(canG, new THREE.MeshStandardMaterial({ color: 0x223a20, roughness: .9 }), NT), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < NT; i++) { const a = r() * 6.28, rr = 36 + r() * 60, k = 2 + r() * 1.6; q.setFromAxisAngle(V(0, 1, 0), r() * 6); m4.compose(V(Math.cos(a) * rr, 3.8 * k, Math.sin(a) * rr), q, V(k * 1.2, k * 2, k * 1.2)); trees.setMatrixAt(i, m4); }
  trees.castShadow = true; s.add(trees);
  const TC = [0xe2702c, 0x2f6fb8, 0x3c8c4a, 0xd8b23a, 0xb83a3a, 0x6b4a8a];
  // テント（電気は無いので、自分では光らせない。たき火の明かりで照らされるだけ）
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + .3, rr = 15 + (i % 2) * 3; const tn = mesh(new THREE.ConeGeometry(1.7, 2.1, 4), new THREE.MeshStandardMaterial({ color: TC[i % TC.length], roughness: .75 }), Math.cos(a) * rr, 1.05, Math.sin(a) * rr, s); tn.rotation.y = r() * 3; }
  // 火の明かりの光の玉（揺らめきを強めにして、電灯ではなく炎に見せる）
  const glowMat = (sz, col) => new THREE.ShaderMaterial({
    uniforms: { uTime: fireUni.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime;varying float vF;void main(){float s=position.x*3.+position.z*5.;vF=.7+.18*sin(uTime*11.+s)+.12*sin(uTime*23.+s*1.7);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=${sz}*vF/-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vF;void main(){vec2 q=gl_PointCoord-.5;q.y*=.8;float d=length(q)*2.;float a=pow(max(0.,1.-d),2.2)*vF;vec3 c=mix(vec3(${col}),vec3(1.,.9,.6),pow(max(0.,1.-d),6.));gl_FragColor=vec4(c*a,a);}`,
  });
  // 集まる人が持つ松明の火（位置は毎フレーム更新）
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(90 * 3), 3));
  lanterns = new THREE.Points(lg, glowMat('1000.', '1.,.42,.08')); lanterns.frustumCulled = false; s.add(lanterns); KA.fx.push(lanterns);
  torchSticks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.022, .03, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: .9 }), 90); torchSticks.frustumCulled = false; s.add(torchSticks);
  // 焼き網で温まる缶詰と湯気
  const grill = new THREE.Group(); grill.position.copy(GRILL); s.add(grill);
  const ironM = new THREE.MeshStandardMaterial({ color: 0x2b2b2d, metalness: .7, roughness: .5 });
  const gw = canvas(128, 128); { const g = gw.getContext('2d'); g.clearRect(0, 0, 128, 128); g.fillStyle = '#fff'; for (let i = 0; i < 128; i += 16) { g.fillRect(i, 0, 5, 128); g.fillRect(0, i, 128, 5); } }
  mesh(new THREE.BoxGeometry(.7, .02, .5), new THREE.MeshStandardMaterial({ color: 0x333336, metalness: .8, roughness: .4, alphaMap: tex(gw, false, [2, 1.5]), alphaTest: .5 }), 0, .42, 0, grill);
  for (const [x, z] of [[-.32, -.22], [.32, -.22], [-.32, .22], [.32, .22]]) mesh(new THREE.CylinderGeometry(.015, .015, .42, 6), ironM, x, .21, z, grill);
  mesh(new THREE.BoxGeometry(.5, .06, .32), new THREE.MeshStandardMaterial({ color: 0x1a0d08, emissive: 0xff4a10, emissiveIntensity: 2.2 }), 0, .12, 0, grill).castShadow = false;
  const ember = new THREE.PointLight(0xff7a30, 5, 3, 2); ember.position.set(0, .3, 0); grill.add(ember); // 炭火の照り返し
  for (const [x, z, c] of [[-.18, -.08, 0xd23a2c], [.02, .1, 0xe8a53a], [.2, -.06, 0x2f6fb8], [-.04, -.16, 0x3c8c4a]]) { const cn = canMesh(grill, c); cn.position.set(x, .49, z); }
  const sp2 = new Float32Array(60 * 3), ss2 = new Float32Array(60); for (let i = 0; i < 60; i++) { sp2.set([(r() - .5) * .45, 0, (r() - .5) * .3], i * 3); ss2[i] = r(); }
  const stg = new THREE.BufferGeometry(); stg.setAttribute('position', new THREE.BufferAttribute(sp2, 3)); stg.setAttribute('aS', new THREE.BufferAttribute(ss2, 1));
  const steam = new THREE.Points(stg, new THREE.ShaderMaterial({
    uniforms: fireUni, transparent: true, depthWrite: false,
    vertexShader: 'attribute float aS;uniform float uTime;varying float vA;void main(){float u=fract(uTime*.5+aS);vec3 p=position;p.y=.55+u*1.1;p.x+=sin(uTime+aS*20.)*u*.2;vA=sin(u*3.14)*.22;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(120.+u*200.)/-mv.z;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),2.)*vA;gl_FragColor=vec4(vec3(1.,.93,.86),a);}',
  }));
  steam.position.copy(GRILL); steam.frustumCulled = false; s.add(steam); KA.fx.push(steam);
  // 流れ星（最後のカットでカメラの前の空を横切る）
  meteor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uA;varying vec2 vUv;void main(){float w=1.-abs(vUv.y-.5)*2.;float a=pow(vUv.x,3.)*pow(w,4.)*uA;gl_FragColor=vec4(vec3(.85,.92,1.)*a*3.,a);}',
  }));
  meteor.frustumCulled = false; meteor.renderOrder = 10; meteor.visible = false; s.add(meteor); KA.fx.push(meteor);
  // たき火：薪・炎・火の粉・揺れる明かり
  const logM = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: .95 });
  // 薪はティピー型（外側の地面から中心に寄りかかる）
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, b = V(Math.cos(a) * .62, 0, Math.sin(a) * .62), tp = V(0, .95, 0), lg = mesh(new THREE.CylinderGeometry(.08, .11, b.distanceTo(tp), 10), logM, (b.x + tp.x) / 2, (b.y + tp.y) / 2, (b.z + tp.z) / 2, s); lg.quaternion.setFromUnitVectors(V(0, 1, 0), tp.clone().sub(b).normalize()); }
  mesh(new THREE.CircleGeometry(1.1, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1210, emissive: 0xff5a10, emissiveIntensity: 1.2 }), 0, .03, 0, s).castShadow = false;
  const flameM = new THREE.ShaderMaterial({
    uniforms: fireUni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float uTime;varying vec2 vUv;
      float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
      float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p*=2.;a*=.5;}return s;}
      void main(){float n=fb(vec2(vUv.x*4.,vUv.y*3.-uTime*3.2));float h=vUv.y+(n-.5)*.5;
        float w=abs(vUv.x-.5+(n-.5)*.22)*(1.6+vUv.y*2.6);float a=smoothstep(.5,.05,w)*smoothstep(1.,.2,h)*smoothstep(0.,.06,vUv.y);
        a*=smoothstep(.2,.55,n+(1.-vUv.y)*.65); // 炎の舌（上へ行くほど切れ切れに）
        vec3 c=mix(vec3(1.,.93,.62),vec3(1.,.42,.07),smoothstep(.1,.6,h));c=mix(c,vec3(.55,.08,.02),smoothstep(.6,.95,h));
        gl_FragColor=vec4(c*a*1.15,a);}`,
  });
  const flames = new THREE.Group(); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 2.6), flameM); f.position.y = 1.35; f.rotation.y = i * Math.PI / 3; flames.add(f); } s.add(flames); KA.fx.push(flames);
  const NE = 160, ep = new Float32Array(NE * 3), es = new Float32Array(NE); for (let i = 0; i < NE; i++) { ep.set([(r() - .5) * 1.2, 0, (r() - .5) * 1.2], i * 3); es[i] = r(); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3)); eg.setAttribute('aS', new THREE.BufferAttribute(es, 1));
  const embers = new THREE.Points(eg, new THREE.ShaderMaterial({
    uniforms: fireUni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aS;uniform float uTime;varying float vA;void main(){float u=fract(uTime*.35+aS);vec3 p=position;p.y=.6+u*7.;p.x+=sin(uTime*2.+aS*30.)*u*.8;p.z+=cos(uTime*1.7+aS*21.)*u*.8;vA=(1.-u)*step(.0,u);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(90./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: 'varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),2.)*vA;gl_FragColor=vec4(vec3(1.,.55,.15)*a*3.,a);}',
  }));
  embers.frustumCulled = false; s.add(embers); KA.fx.push(embers);
  fireLight = new THREE.PointLight(0xff8a3a, 160, 60, 2); fireLight.position.set(0, 1.3, 0); fireLight.castShadow = true; fireLight.shadow.mapSize.set(1024, 1024); fireLight.shadow.bias = -.002; s.add(fireLight);
  // 内側の輪：丸太に座る10人（缶詰を持つ人・手渡す人）
  const SK = [0xd9a988, 0xe3b99c, 0xc99475, 0xb98261], SH = [0x7a4a3a, 0x3f5f7f, 0x6b7d4a, 0x8a6a8a, 0xa8743a, 0x4a4a52];
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * 6.283 + .15, rr = 3.1, f = makeFigure({ shirt: SH[i % SH.length], pants: 0x2b2f38, skin: SK[i % 4], hair: 0x241a14, shoe: 0x3a3a3a });
    const face = Math.atan2(-Math.cos(a), -Math.sin(a)); // たき火の中心を向く
    f.root.position.set(Math.cos(a) * rr, -.52, Math.sin(a) * rr); f.root.rotation.y = face; seatPose(f); s.add(f.root);
    mesh(new THREE.CylinderGeometry(.16, .17, 1.0, 12).rotateZ(Math.PI / 2), logM, Math.cos(a) * (rr + .05), .2, Math.sin(a) * (rr + .05), s).rotation.y = face;
    if (i !== 6 && i !== 8) { const cn = canMesh(f.armR.el, [0xd23a2c, 0xe8a53a, 0x2f6fb8][i % 3]); cn.position.set(0, -.3, .03); }
    sitters.push(f);
  }
  // 8番の人はギターを弾く
  const gt = sitters[8], gtr = new THREE.Group(); gtr.position.set(.04, .2, .19); gtr.rotation.set(0, 0, .95); gt.chest.add(gtr);
  const woodG = new THREE.MeshStandardMaterial({ color: 0xb07a3c, roughness: .4, envMapIntensity: .6 });
  mesh(new THREE.CylinderGeometry(.19, .19, .09, 32).rotateX(Math.PI / 2), woodG, 0, -.1, 0, gtr); mesh(new THREE.CylinderGeometry(.15, .15, .09, 32).rotateX(Math.PI / 2), woodG, 0, .14, 0, gtr);
  mesh(new THREE.CircleGeometry(.055, 24), new THREE.MeshStandardMaterial({ color: 0x120a06 }), 0, .03, .047, gtr);
  mesh(new THREE.BoxGeometry(.05, .55, .03), new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: .6 }), 0, .5, .02, gtr);
  gt.armL.sh.rotation.set(-1.0, 0, -.65); gt.armL.el.rotation.x = -1.0;
  // 手渡し：5番の人が右手の缶を、隣の6番の人へ差し出す（カメラから見て火の向こう側）
  const g0 = sitters[5]; g0.armR.sh.rotation.x = -1.25; g0.armR.sh.rotation.z = -.5; g0.armR.el.rotation.x = -.25;
  const g1 = sitters[6]; g1.armL.sh.rotation.x = -1.2; g1.armL.sh.rotation.z = .55; g1.armL.el.rotation.x = -.3;
  for (let i = 0; i < 6; i++) { const cn = canMesh(s, [0xd23a2c, 0xe8a53a, 0x2f6fb8, 0x3c8c4a][i % 4]); const a = .8 + i * .12; cn.position.set(Math.cos(a) * 2.1, .05, Math.sin(a) * 2.1); }
  // 外側の輪：集まってくる90人（群衆用の人型。着いたら止まる）
  const NC = 90, geo = crowdGeometry(), aS = new Float32Array(NC * 3), aP = new Float32Array(NC * 3), aG = new Float32Array(NC * 3);
  for (let i = 0; i < NC; i++) {
    const ring = i < 40 ? 5.3 : 7.2, a = (i < 40 ? i / 40 : (i - 40) / 50) * 6.283 + (i < 40 ? 0 : .06), tx = Math.cos(a) * ring, tz = Math.sin(a) * ring;
    const sa = a + (r() - .5) * 1.2, sr = 22 + r() * 26, sx = Math.cos(sa) * sr, sz = Math.sin(sa) * sr;
    campData.push({ sx, sz, tx, tz, arrive: 72.4 + r() * .8, face: Math.atan2(-tx, -tz) });
    const sc = SHIRTS[(r() * SHIRTS.length) | 0], pc = PANTS[(r() * PANTS.length) | 0]; aS.set([sc.r * .8, sc.g * .8, sc.b * .8], i * 3); aP.set([pc.r, pc.g, pc.b], i * 3); aG.set([r() * 6.28, 2.2, 0], i * 3);
  }
  geo.setAttribute('aShirt', new THREE.InstancedBufferAttribute(aS, 3)); geo.setAttribute('aPants', new THREE.InstancedBufferAttribute(aP, 3)); geo.setAttribute('aGait', new THREE.InstancedBufferAttribute(aG, 3));
  campCrowd = new THREE.InstancedMesh(geo, crowdMaterial(), NC); campCrowd.castShadow = campCrowd.receiveShadow = true; campCrowd.frustumCulled = false; s.add(campCrowd);
}
const GATHER0 = 70.4, METEOR_T = 84.7;
function updateCamp(t) {
  fireUni.uTime.value = t; crowdUniforms.uTime.value = t;
  fireLight.intensity = 160 * (.85 + .1 * Math.sin(t * 13) + .07 * Math.sin(t * 23.7) + .05 * Math.sin(t * 41));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), aG = campCrowd.geometry.attributes.aGait;
  campData.forEach((d, i) => {
    const u = clamp((t - GATHER0) / (d.arrive - GATHER0), 0, 1), e = 1 - Math.pow(1 - u, 1.6);
    const x = lerp(d.sx, d.tx, e), z = lerp(d.sz, d.tz, e), walking = u < 1;
    const ry = walking ? Math.atan2(d.tx - d.sx, d.tz - d.sz) : d.face;
    q.setFromAxisAngle(V(0, 1, 0), ry); m4.compose(V(x, 0, z), q, V(1, 1, 1)); campCrowd.setMatrixAt(i, m4);
    aG.array[i * 3 + 1] = walking ? 2.2 : 0;
    // 松明の火：歩く間は手に掲げ、着いたら足元に立てる
    const lp = lanterns.geometry.attributes.position;
    if (walking) lp.setXYZ(i, x + Math.cos(ry) * .3, 1.55, z - Math.sin(ry) * .3); else lp.setXYZ(i, d.tx * 1.08, .95, d.tz * 1.08);
    m4.makeTranslation(lp.getX(i), lp.getY(i) - .55, lp.getZ(i)); torchSticks.setMatrixAt(i, m4); // 火の下に木の柄
  });
  campCrowd.instanceMatrix.needsUpdate = true; aG.needsUpdate = true; lanterns.geometry.attributes.position.needsUpdate = true; torchSticks.instanceMatrix.needsUpdate = true;
  // ギターを弾く手と、体を揺らす人たち
  const gt = sitters[8]; gt.armR.sh.rotation.set(-.55, 0, .35); gt.armR.el.rotation.x = -1.05 + .16 * Math.sin(t * 14);
  sitters.forEach((f, i) => { if (i !== 5 && i !== 6) f.chest.rotation.z = .06 * Math.sin(t * 2.4 + i * .9); });
}

// ================= post =================
const rtOpt = { type: THREE.HalfFloatType };
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, rtOpt)); composer.renderToScreen = false;
const renderPass = new RenderPass(A.scene, camera); composer.addPass(renderPass);
const gtao = new GTAOPass(A.scene, camera, W, H);
gtao.updateGtaoMaterial({ radius: 0.4, distanceExponent: 1.5, thickness: 1, scale: 1.1, samples: 16 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
gtao.blendIntensity = 0.85; composer.addPass(gtao);
// 被写界深度のぼかしは使わない（遠景が常にぼけて「ピンが合っていない」と言われたため）
const bokeh = new BokehPass(A.scene, camera, { focus: 50, aperture: 0, maxblur: 0 }); bokeh.enabled = false; composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.12, 0.35, 1.8); composer.addPass(bloom);
let CUR = A;
[gtao, bokeh].forEach(p => { const o = p.render.bind(p); p.render = (...a) => { const v = CUR.fx.map(f => f.visible); CUR.fx.forEach(f => f.visible = false); o(...a); CUR.fx.forEach((f, i) => f.visible = v[i]); }; });
function useScene(S) { CUR = S; renderPass.scene = S.scene; gtao.scene = S.scene; bokeh.scene = S.scene; gtao.blendIntensity = S.ao; bloom.strength = S.bloomK; }

const QVS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const accRT = new THREE.WebGLRenderTarget(W, H, rtOpt);
const accQuad = new FullScreenQuad(new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, w: { value: 1 } }, vertexShader: QVS,
  fragmentShader: 'uniform sampler2D tSrc;uniform float w;varying vec2 vUv;void main(){gl_FragColor=texture2D(tSrc,vUv)*w;}',
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, depthTest: false, depthWrite: false, transparent: true,
}));
const finalQuad = new FullScreenQuad(new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: accRT.texture }, exposure: { value: 1.0 }, seed: { value: 0 }, vig: { value: 0.3 }, fade: { value: 1 }, flash: { value: 0 }, texel: { value: new THREE.Vector2(1 / W, 1 / H) }, sharp: { value: 0.45 } }, vertexShader: QVS,
  fragmentShader: `uniform sampler2D tSrc;uniform float exposure,seed,vig,fade,flash,sharp;uniform vec2 texel;varying vec2 vUv;
  vec3 aces(vec3 x){const float a=2.51,b=.03,c=2.43,d=.59,e=.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);}
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+seed)*43758.5453);}
  void main(){vec2 d=vUv-.5;float r2=dot(d,d);
    vec3 c=texture2D(tSrc,vUv).rgb;
    vec3 bl=(texture2D(tSrc,vUv+vec2(texel.x,0.)).rgb+texture2D(tSrc,vUv-vec2(texel.x,0.)).rgb+texture2D(tSrc,vUv+vec2(0.,texel.y)).rgb+texture2D(tSrc,vUv-vec2(0.,texel.y)).rgb)*.25;
    c=max(c+(c-bl)*sharp,0.); // 軽いシャープ（輪郭をくっきり）
    c*=exposure;c=aces(c);
    float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,1.04);
    c=pow(c,vec3(1./2.2));
    c=mix(c,c*vec3(1.03,1.,.96),smoothstep(.35,.9,l));c=mix(c,c*vec3(.96,1.,1.04)+.01,1.-smoothstep(.0,.35,l));
    c*=1.-vig*smoothstep(.12,.55,r2*1.6);
    c+=(h(vUv*vec2(1080.,1920.))-.5)*.008;
    c=mix(c,vec3(1.),flash);
    gl_FragColor=vec4(c*fade,1.);}`,
  depthTest: false, depthWrite: false,
}));

// ================= shots =================
// カット：0 交差点 / 1 日本地図 / 2 草原 / 3 住宅街 / 4 海 / 5 ゴルフ場 / 6 高速道路 / 7 夕暮れの交差点
//        8 夜の住宅街 / 9 送電線 / 10 明かりが消える街 / 11 病院 / 12 1000人の図 / 13 手術室
//        14 スーパー / 15 畑と家畜 / 16 種の存続 / 17 ランタンを持って集まる人々 / 18 缶詰を分け合う / 19 焼き網の缶詰
//        20 ギターと揺れる人たち / 21 電球の飾りとテントを回り込む / 22 空へ引いて流れ星で終わる
const SHOTS = [0, 3.32, 8.25, 12.3, 21.45, 22.2, 23.15, 25.95, 30.3, 32.0, 37.6, 41.9, 44.5, 48.95, 54.4, 58.9, 64.4, 70.4, 73.3, 74.8, 76.2, 77.6, 79.9, 87.2];
const END_T = 87.2;
const SUBS = [
  { a: 0.12, b: 3.26, html: 'もしも、人類が<br><em>100人</em>になったら？', center: true },
  { a: 3.32, b: 8.2, html: 'まず、ひとり当たりの土地は、<br>日本の約4個分。', cls: 'map' },
  { a: 8.25, b: 12.3, html: '広大な土地を<br>独占して、<br>のんびり暮らせます。' },
  { a: 12.45, b: 15.2, html: 'しかも、<br>家は<em>選び放題</em>。' },
  { a: 15.3, b: 17.85, html: '世界中の家もホテルも<br>空っぽだから、' },
  { a: 17.9, b: 21.4, html: '好きな場所に、<br>好きなだけ住めます。' },
  { a: 21.5, b: 22.2, html: '海も、' },
  { a: 22.2, b: 23.15, html: 'ゴルフ場も、' },
  { a: 23.2, b: 25.9, html: '道路もすべて<br><em>貸し切り</em>です。' },
  { a: 26.05, b: 30.3, html: '……でも実は、<br>困るのは、<br>「<em>人手</em>」なんです。', cls: 'turn' },
  { a: 30.33, b: 31.95, html: 'たとえば<em>電気</em>。' },
  { a: 32.06, b: 37.5, html: '発電所も送電網も、<br>人が調整し続けないと、<br>すぐ止まります。' },
  { a: 37.64, b: 41.8, html: '数日で、<br>夜の街から<br>明かりが消えます。' },
  { a: 41.94, b: 44.45, html: 'じゃあ、<br>病気やケガをしたら？' },
  { a: 44.65, b: 48.9, html: '世界の医師は、<br>人口の約<em>0.2％</em>。' },
  { a: 49.06, b: 54.35, html: '盲腸でも、<br>手術できる人が<br>いなければ、<br>命に関わります。' },
  { a: 54.52, b: 58.8, html: '食べ物も<br>最初の数年は<br><em>缶詰</em>があるから大丈夫' },
  { a: 59.09, b: 64.3, html: 'でも、その後は<br>畑も家畜も<br>100人で<br>回すしかありません' },
  { a: 64.73, b: 70.3, html: 'そしてなにより<br>種を存続させるには<br>数百人は必要と<br>言われます' },
  { a: 70.77, b: 73.25, html: 'つまり<br>みんなバラバラにならず<br>一か所に集まって' },
  { a: 73.34, b: 74.75, html: '<em>缶詰</em>を分け合って' },
  { a: 74.84, b: 79.8, html: '電気の無い中<br>火を囲んで<br>暮らすのです' },
  { a: 80.41, b: 81.2, html: '……つまり', cls: 'final' },
  { a: 81.24, b: 83.05, html: '人類が<em>100人</em><br>になったら', cls: 'final' },
  { a: 83.08, b: 84.18, html: '最終的に', cls: 'final' },
  { a: 84.21, b: 86.75, html: 'みんなで<br><em>キャンプ</em>に<br>なります', cls: 'final' },
];
// 住宅街の空撮の通り道（位置と注視点）
const T_POS = new THREE.CatmullRomCurve3([V(30, 82, 150), V(55, 64, 45), V(18, 48, -26), V(-2, 26, -70)], false, 'centripetal');
const T_LOOK = new THREE.CatmullRomCurve3([V(0, 0, 40), V(160, 35, -200), V(-14, 0, -114), V(-22, 3, -114)], false, 'centripetal');
const vlerp = (a, b, k) => a.clone().lerp(b, k);
function setScene(t) {
  const shot = Math.max(0, SHOTS.findIndex((s, i) => t >= s && t < (SHOTS[i + 1] ?? 1e9)));
  const lt = t - SHOTS[shot];
  let cp, cl, up = V(0, 1, 0), fov = 40, focus = 10, ap = 0.01, near = .1, far = 1000;
  if (shot === 0) {
    useScene(A); setADusk(false); updateCrowd(t);
    // 前半は交差点全体を見下ろし、最後に残った1人へ寄る（その人は数字の下＝画面の下寄りに置く）
    const k = ease(lt / 2.4), sp = CROWD[SURV], S = V(sp.x + sp.vx * t, 0.9, sp.z + sp.vz * t);
    const kp = ease((t - 2.3) / 1.0);
    cp = vlerp(vlerp(V(6, 50, 27), V(2, 43, 22), k), S.clone().add(V(0, 17, 9.5)), kp);
    cl = vlerp(vlerp(V(0.5, 0, -1.5), V(0, 0, -1), k), S.clone().add(V(0, -0.9, -3.5)), kp);
    fov = 37; focus = cp.distanceTo(S); ap = 0.005; far = 600;
  } else if (shot === 1) {
    useScene(B); updateJapans(t);
    const c0 = V(GRID[0][0] + 0.2, 0, GRID[0][1] - 0.3);
    const p1 = vlerp(V(c0.x, 40, c0.z + 10.5), V(c0.x, 37.5, c0.z + 9.6), ease(lt / 2.3));
    const k2 = ease((t - 5.55) / 1.25);
    cp = vlerp(p1, V(0, 86, 24), k2); cl = vlerp(c0, V(0, 0, 0.5), k2);
    if (t > 6.8) { const k3 = (t - 6.8) / 1.45; cp.y -= k3 * 3; cp.z -= k3 * 1; }
    fov = 40; focus = cp.distanceTo(cl); ap = 0.0006; near = .5; far = 400;
  } else if (shot === 3) {
    // 住宅街：ピンが次々に立つ → ホテルの塔を横目に → 豪邸へ降りていく
    useScene(T); setTNight(false, t); updateTown(t);
    const u = 0.5 - 0.5 * Math.cos(Math.PI * clamp(lt / 9.15, 0, 1));
    cp = T_POS.getPoint(u); cl = T_LOOK.getPoint(u);
    fov = 42; focus = cp.distanceTo(cl); ap = 0.0015; near = .5; far = 12000;
  } else if (shot === 4) {
    useScene(SEA); seaUni.uTime.value = t;
    // ビーチチェアに一人で座る人を、斜め後ろから。目の前は誰もいない海
    const k = ease(lt / 0.75);
    cp = vlerp(CHAIR.clone().add(V(0.55, 2.15, 4.5)), CHAIR.clone().add(V(0.45, 1.95, 3.8)), k);
    cl = vlerp(CHAIR.clone().add(V(-0.3, -0.3, -14)), CHAIR.clone().add(V(-0.35, -0.3, -14)), k);
    fov = 46; near = .1; far = 9000;
  } else if (shot === 5) {
    // クラブを持って一人で歩くゴルファーを真横から追う（奥に旗）
    useScene(GOLF); updateGolf(t, lt);
    const G = golferPos(lt);
    cp = V(G.x + 0.25, G.y + 1.15, G.z + 4.6); cl = V(G.x + 0.45, G.y + 0.75, FLAG.z + 1.0);
    fov = 44; near = .05; far = 9000;
  } else if (shot === 6) {
    // 高速道路：猛スピードのスーパーカーを低い位置から追い、上昇して「長い道にたった1台」を見せる
    useScene(ROAD); updateCar(t);
    const P = carPos(t).add(V(0, 0.5, 0)), k = ease(lt / 2.8), kc = Math.pow(smooth(0.12, 1, lt / 2.8), 1.15);
    // はじめは迫ってくる車を前斜めから。カメラが減速・上昇して車に追い抜かれ、最後は高い空から「長い道にたった1台」
    cp = P.clone().add(vlerp(V(3.0, 1.0, -7.5), V(4, 38, 62), kc));
    const d0 = P.clone().sub(cp).normalize(), d1 = V(-0.01, -0.34, -1).normalize(); // 最後も車は画面の下寄りに残す
    cl = cp.clone().add(d0.lerp(d1, smooth(0.3, 0.95, lt / 2.8)).normalize());
    fov = lerp(52, 46, k); near = .1; far = 12000;
  } else if (shot === 7) {
    // 夕暮れの交差点：赤い服の1人だけ。ゆっくり回り込みながら下りる
    useScene(A); setADusk(true);
    const tt = 3.6 + (t - 25.95) * 0.5; updateCrowd(tt);
    const sp = CROWD[SURV], S = V(sp.x + sp.vx * tt, 0.9, sp.z + sp.vz * tt), k = ease(lt / 4.35);
    const a = lerp(0.55, -0.2, k), R = lerp(17, 9.5, k), h = lerp(30, 12.5, k);
    cp = S.clone().add(V(Math.sin(a) * R, h, Math.cos(a) * R));
    cl = S.clone().add(V(-Math.sin(a) * 3.4, -0.9, -Math.cos(a) * 3.4));
    fov = 38; focus = cp.distanceTo(S); ap = 0.004; far = 600;
  } else if (shot === 8 || shot === 10) {
    // 夜の住宅街（8：明かりのついた街 / 10：明かりが波のように消えていく）
    useScene(T); setTNight(true, t); updateTown(t);
    const k = ease(lt / (shot === 8 ? 1.7 : 4.3));
    if (shot === 8) { cp = vlerp(V(-70, 100, 130), V(-52, 92, 108), k); cl = vlerp(V(60, 0, -110), V(62, 0, -112), k); }
    else { cp = vlerp(V(150, 85, 70), V(128, 74, 52), k); cl = vlerp(V(-10, 0, -70), V(-14, 0, -74), k); }
    fov = 46; near = .5; far = 12000;
  } else if (shot === 9) {
    // 夕焼けの送電線：鉄塔の列に沿って飛び、地平線の発電所へ
    useScene(PY); updatePY(t);
    const k = lt / 5.6;
    cp = V(lerp(34, 30, k), lerp(36, 33, k) + pyH(30, 60 - lt * 22), 60 - lt * 22); cl = V(-18, 26, cp.z - 650);
    fov = 46; near = .5; far = 12000;
  } else if (shot === 11) {
    useScene(HO);
    const k = ease(lt / 2.6);
    cp = vlerp(V(15, 2.3, 32), V(11.5, 2.1, 23), k); cl = vlerp(V(-2, 7, -40), V(-1.5, 6.5, -40), k);
    fov = 46; near = .1; far = 9000;
  } else if (shot === 12) {
    // 1000人を真上近くから。医師2人が光ったら、1人目へ少し寄る
    useScene(DI); updateDI(t);
    const d0 = diPos(...DI_DOC[0]), kz = ease((t - 46.1) / 2.8);
    cp = vlerp(V(0, 66, 14), V(d0.x * .75, 24, d0.z * .75 + 6), kz); cl = vlerp(V(0, 0, -1.5), V(d0.x * .75, 0, d0.z * .75 - 1.5), kz);
    fov = 45; near = .5; far = 1000;
  } else if (shot === 13) {
    // 最後はモニターへ寄り、心電図が止まるのを見せる
    useScene(OR); updateOR(t);
    const k = ease(lt / 5.45), km = ease((t - 52.5) / 1.5);
    const MON = V(-1.35, 1.55, -.9), MN = V(Math.sin(.6), 0, Math.cos(.6));
    cp = vlerp(vlerp(V(3.4, 1.75, 3.6), V(2.25, 1.6, 2.45), k), MON.clone().add(MN.clone().multiplyScalar(1.15)).add(V(0, .05, 0)), km);
    cl = vlerp(vlerp(V(0, 1.0, -.2), V(-.1, .95, -.3), k), MON, km);
    fov = 50; near = .05; far = 100;
  } else if (shot === 14) {
    // スーパー：カートを押してこちらへ歩いてくる人。カメラは同じ速さで後ずさる
    useScene(MK); updateMarket(t, lt);
    const z = SHOP_Z0 + lt * SHOP_V;
    cp = V(.55, 1.55, z + 4.6); cl = V(-.1, 1.05, z - 6);
    fov = 46; near = .05; far = 200;
  } else if (shot === 15) {
    // 畑：農夫の近くから、上昇・後退して畑の広さを見せる
    useScene(FA); updateFarm(t, lt);
    const P = farmer.root.position.clone().add(V(0, 1, 0)), k = ease(lt / 5.5);
    // 引いた画面で、左に畑・右に牧場（牛・羊・納屋）が並ぶように、道の真上あたりから見る
    cp = P.clone().add(vlerp(V(2.4, .6, -4.2), V(9, 30, -46), Math.pow(k, 1.3)));
    const d0 = P.clone().sub(cp).normalize(), d1 = V(.1, -.5, 1).normalize();
    cl = cp.clone().add(d0.lerp(d1, smooth(.3, 1, k)).normalize());
    fov = 46; near = .1; far = 12000;
  } else if (shot === 16) {
    // 1人のアップから、人が増えるのに合わせて引いていく
    useScene(DI); updateSurvive(t);
    const c = survPos(12 + 9 * SURV_COLS), kz = ease((t - (GROW0 + .25)) / 1.8), k = ease((t - 66.4) / 4);
    cp = vlerp(c.clone().add(V(0, 4.2, 3.6)), V(0, 30, 9), kz).add(V(0, 4 * k, 2 * k)); cl = vlerp(c.clone().add(V(0, .9, 0)), V(0, 0, -.8), kz);
    fov = 45; near = .5; far = 1000;
  } else if (shot >= 17 && shot <= 22) {
    useScene(KA); updateCamp(t); meteor.visible = false;
    fov = 46; near = .05; far = 12000;
    const hand = V(Math.sin(t * 1.3) * .03, Math.sin(t * 1.7 + 1) * .02, 0); // 手持ちカメラのような、わずかな揺れ
    if (shot === 17) { // 空から：ランタンの光が一つのたき火へ集まってくる（らせん状に降りる）
      const k = ease(lt / 2.9), a = .6 + lt * .22; cp = V(Math.cos(a) * lerp(26, 15, k), lerp(46, 24, k), Math.sin(a) * lerp(26, 15, k)); cl = V(0, 0, 0);
    } else if (shot === 18) { // 缶詰を手渡すところ：火の手前から、炎の脇越しに向かいの5番・6番を撮る
      const A = sitters[5].root.position, B = sitters[6].root.position, M = A.clone().add(B).multiplyScalar(.5);
      const am = Math.atan2(M.z, M.x) + Math.PI + .5, k = ease(lt / 1.5), rr = lerp(4.4, 4.0, k);
      cp = V(Math.cos(am) * rr, 1.25, Math.sin(am) * rr).add(hand); cl = V(M.x, .9, M.z); fov = 40;
    } else if (shot === 19) { // 焼き網で温まる缶詰と湯気（奥にたき火）
      // たき火の横方向から撮り、缶詰の側面に火の光が当たるようにする
      const k = ease(lt / 1.4), out = V(GRILL.x, 0, GRILL.z).normalize(), tan = V(-out.z, 0, out.x);
      cp = GRILL.clone().add(tan.clone().multiplyScalar(lerp(1.15, .95, k))).add(out.clone().multiplyScalar(.25)).add(V(0, lerp(.95, .85, k), 0)).add(hand); cl = GRILL.clone().add(V(0, .45, 0));
      fov = 42;
    } else if (shot === 20) { // ギターを弾く人と、体を揺らして聴く人たち
      const S = sitters[8].root.position, inn = V(-S.x, 0, -S.z).normalize(), k = ease(lt / 1.4);
      cp = S.clone().add(inn.clone().multiplyScalar(lerp(2.75, 2.45, k))).add(V(inn.z * .5, 1.45, -inn.x * .5)).add(hand); cl = S.clone().add(V(0, 1.15, 0));
      fov = 44;
    } else if (shot === 21) { // 低い位置から回り込み：電球の飾り・光るテント・人の輪
      const k = ease(lt / 2.3), a = lerp(.8, 1.25, k); cp = V(Math.cos(a) * 12.5, lerp(2.0, 2.6, k), Math.sin(a) * 12.5); cl = V(0, 1.0, 0);
    } else { // 斜めに引き上げていき、下に小さなたき火、上に満天の星。途中で流れ星
      const k = ease(lt / 7.3), a = 1.1 + k * .5, rr = lerp(16, 75, k), h = lerp(8, 55, k);
      cp = V(Math.cos(a) * rr, h, Math.sin(a) * rr);
      cl = vlerp(V(0, .8, 0), V(-Math.cos(a) * 400, -120, -Math.sin(a) * 400), smooth(.1, .8, k));
    }
  } else {
    useScene(C); grassUniforms.uTime.value = t;
    // 寝転ぶ人が米粒ほどになるまで、距離を指数的に伸ばして一気に引く（9m → 約235m）
    const P = V(0, terrainH(0, 0) + 0.2, 0.0), k = ease(lt / 4.05);
    const dist = 9 * Math.pow(26, k);
    const dir = V(0.1, 1, 0.3).normalize().lerp(V(-0.08, 0.42, 0.9).normalize(), smooth(0, 0.7, k)).normalize();
    cp = P.clone().add(dir.multiplyScalar(dist));
    // 見る向きを「人物」から「地平線の少し下」へ移す（人物は画面の下寄り、地平線は上3分の1）
    const d0 = P.clone().sub(cp).normalize(), d1 = V(0.03, -Math.sin(0.17), -Math.cos(0.17)).normalize();
    cl = cp.clone().add(d0.lerp(d1, smooth(0.25, 0.95, k)).normalize());
    up = V(0, 0, -1).lerp(V(0, 1, 0), smooth(0.05, 0.6, k)).normalize();
    fov = lerp(40, 56, k); focus = cp.distanceTo(P); ap = 0.004 * (1 - k); near = .2; far = 12000;
  }
  camera.up.copy(up); camera.position.copy(cp); camera.fov = fov; camera.near = near; camera.far = far; camera.updateProjectionMatrix(); camera.lookAt(cl);
  if (shot === 22) { // 流れ星：カメラの前の空を、右上から左下へ横切る
    const u = (t - METEOR_T) / .7;
    if (u > 0 && u < 1) {
      camera.updateMatrixWorld(); const f = V(0, 0, -1).applyQuaternion(camera.quaternion), uu = V(0, 1, 0).applyQuaternion(camera.quaternion), rt = V(1, 0, 0).applyQuaternion(camera.quaternion);
      meteor.visible = true; meteor.position.copy(cp).add(f.multiplyScalar(300)).add(uu.multiplyScalar(lerp(120, 70, u))).add(rt.multiplyScalar(lerp(90, -60, u)));
      meteor.quaternion.copy(camera.quaternion); meteor.rotateZ(Math.PI + .32); meteor.scale.set(55, 1.4, 1); meteor.material.uniforms.uA.value = Math.sin(u * Math.PI);
    }
  }
  bokeh.uniforms.focus.value = focus; bokeh.uniforms.aperture.value = ap; bokeh.uniforms.nearClip.value = near; bokeh.uniforms.farClip.value = far;
  return shot;
}
const fmt = n => n.toLocaleString('en-US');
function op(t, a, b, f = 0.15) { return t < a || t > b ? 0 : Math.min(1, (t - a) / f, (b - t) / f); }
function setDOM(t) {
  const sub = document.getElementById('sub'), s = SUBS.find(s => t >= s.a && t < s.b);
  sub.className = 'ov ol' + (s && s.center ? ' center' : '') + (s && s.cls ? ' ' + s.cls : '');
  // 行ごとに span で包む（帯・札などのデザインを1行ずつ当てるため）
  // 改行で区切るので、行末の句読点（、。）は付けない（「？」は残す）
  sub.innerHTML = s ? s.html.split('<br>').map(l => `<span class="ln">${l.replace(/[、。]+((?:<\/em>)?)$/, '$1')}</span>`).join('<br>') : ''; sub.style.opacity = s ? Math.min(1, (t - s.a) / 0.12, (s.b - t) / 0.08) : 0;
  const cnt = document.getElementById('count'); cnt.style.opacity = op(t, 0.25, 3.26, 0.2);
  document.getElementById('cnum').textContent = fmt(t < CT0 ? POP0 : popAt(t));
  // 桁が多くて画面からはみ出すときだけ、数字を縮める
  // （transform で縮めると中心がずれて右が切れるので、文字サイズそのものを下げる）
  const numEl = cnt.querySelector('.num'); numEl.style.fontSize = ''; const nw = numEl.offsetWidth;
  if (nw > 860) numEl.style.fontSize = (parseFloat(getComputedStyle(numEl).fontSize) * 860 / nw) + 'px';
  const pop = t > CT1 ? easeBack((t - CT1) / 0.35) : 1; cnt.style.transform = `scale(${t > CT1 ? lerp(1.25, 1, clamp(pop, 0, 1.3)) : 1})`;
  cnt.querySelector('.num').style.color = t > CT1 ? '#ffd75e' : '#ffffff';
  document.getElementById('land').style.opacity = op(t, 4.06, 8.2, 0.25);
  document.getElementById('doc').style.opacity = op(t, DI_DIM + .1, 48.9, 0.2);
  document.getElementById('need').style.opacity = op(t, 66.5, 70.3, 0.2);
  const gr = document.getElementById('grow'); gr.style.opacity = op(t, GROW0, 66.45, 0.12);
  if (t >= GROW0 && t < 66.5) { const n = growCount(t); document.getElementById('gnum').textContent = n; gr.querySelector('.num').style.color = n >= 100 ? '#ffd75e' : '#ffffff'; }
  const rent = document.getElementById('rent'); rent.style.opacity = op(t, 19.05, 21.38, 0.18);
  rent.style.transform = `scale(${t > 19.05 ? lerp(1.3, 1, clamp(easeBack((t - 19.05) / 0.35), 0, 1.3)) : 1})`;
  const xe = document.getElementById('x4'); xe.style.opacity = op(t, 5.6, 8.2, 0.2);
  const nland = LAND_T.filter(x => t >= x + 0.3).length; document.getElementById('xn').textContent = '×' + Math.max(1, nland);
  const lastLand = LAND_T.filter(x => t >= x + 0.3).pop() ?? 0; const bump = clamp((t - lastLand - 0.3) / 0.25, 0, 1);
  document.getElementById('xn').style.transform = `scale(${lerp(1.35, 1, easeOut(bump))})`;
}

// ================= render =================
let frameNo = 0;
// くっきり優先：動きのブレは使わず、同じ瞬間を1px未満ずつずらして重ね、輪郭のギザギザだけを取る
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
window.renderFrame = (t, sub = 6) => {
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 0); renderer.clear();
  setScene(t);
  for (let k = 0; k < sub; k++) {
    if (sub > 1) camera.setViewOffset(W, H, halton(k + 1, 2) - 0.5, halton(k + 1, 3) - 0.5, W, H);
    composer.render();
    accQuad.material.uniforms.tSrc.value = composer.readBuffer.texture; accQuad.material.uniforms.w.value = 1 / sub;
    renderer.setRenderTarget(accRT); accQuad.render(renderer);
  }
  camera.clearViewOffset();
  const u = finalQuad.material.uniforms;
  u.seed.value = (frameNo++ % 97) * 1.37; u.exposure.value = CUR.exposure;
  u.fade.value = Math.max(0, Math.min(1, t / 0.15, (END_T - 0.1 - t) / 0.7)); // 最後は暗転
  u.flash.value = 0.55 * Math.max(0, 1 - Math.abs(t - 3.32) / 0.12) * (t >= 3.32 ? 1 : 0) + 0.35 * Math.max(0, 1 - (t - 8.25) / 0.12) * (t >= 8.25 ? 1 : 0) + 0.3 * Math.max(0, 1 - Math.abs(t - (PY_OFF + .03)) / 0.06);
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear(); finalQuad.render(renderer);
  setDOM(t);
};
window.DURATION = END_T;
await document.fonts.load('800 148px "Noto Sans JP"'); await document.fonts.load('500 50px "Noto Sans JP"');
{ // 文字デザイン案で使う Web フォントを、使う文字のぶんだけ先に読み込む
  const sample = 'もしも、人類が100人になったら？世界の人口広大な土地を独占して、のんびり暮らせます。まずひとり当たりの日本約4個分0123456789,';
  for (const f of ['400 100px "Dela Gothic One"', '800 100px "Shippori Mincho B1"', '900 100px "Zen Maru Gothic"', '900 100px "Noto Sans JP"', 'italic 900 100px "Noto Sans JP"'])
    await document.fonts.load(f, sample).catch(() => {});
  await document.fonts.ready;
  console.log('fonts', ['Dela Gothic One', 'Shippori Mincho B1', 'Zen Maru Gothic'].map(f => f + '=' + document.fonts.check(`100px "${f}"`, '人類')).join(' '));
}
for (const t of [0.01, 4, 9, 13, 21.8, 22.6, 24, 27, 31, 34, 39, 43, 46, 50, 56, 60, 66, 72, 76, 82]) window.renderFrame(t, 1); // 各場面のシェーダーを先に用意する
window.ready = true;
