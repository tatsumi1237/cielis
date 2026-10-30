// ================= utilities =================
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let R=mulberry32(2026);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), lerp=(a,b,k)=>a+(b-a)*k;
const smooth=(a,b,x)=>{const k=clamp((x-a)/(b-a),0,1);return k*k*(3-2*k)};
const easeOut=k=>1-Math.pow(1-clamp(k,0,1),3);
const easeBack=k=>{k=clamp(k,0,1);const c=1.70158;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2)};
function vis(t,a,b,f=0.2){if(t<a||t>b)return 0;return Math.min(1,(t-a)/f,(b-t)/f)}
const yen=v=>v.toLocaleString('ja-JP');

// ================= THREE base =================
const W=1080,H=1920;
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.autoClear=false;
const M=(c,o={})=>new THREE.MeshLambertMaterial(Object.assign({color:c,flatShading:true},o));
const box=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof c==='number'?M(c):c);
const cyl=(rt,rb,h,c,s=12)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s),typeof c==='number'?M(c):c);
const sph=(r,c,s=10)=>new THREE.Mesh(new THREE.SphereGeometry(r,s,Math.max(6,s*0.7|0)),typeof c==='number'?M(c):c);
function at(m,x,y,z,parent){m.position.set(x,y,z);parent&&parent.add(m);return m;}

function mkScene(top,bot,warm){
  const s=new THREE.Scene();
  const cv=document.createElement('canvas');cv.width=4;cv.height=256;const g=cv.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,4,256);
  s.background=new THREE.CanvasTexture(cv);
  s.fog=new THREE.Fog(new THREE.Color(bot),80,400);
  s.add(new THREE.HemisphereLight(warm?0xfff1d6:0xdfe6ef,warm?0x9a8a6a:0x707680,warm?1.0:0.9));
  const sun=new THREE.DirectionalLight(warm?0xffe2b0:0xe8eef5,warm?1.3:0.75);sun.position.set(-60,100,70);s.add(sun);
  return s;
}
const SKY_COOL=['#8d97a4','#c3c9d1'], SKY_WARM=['#6fb2ff','#ffe2ad'];

// ----- asset library（使い回す） -----
function person(o={}){const k=o.kid?0.62:1;const g=new THREE.Group();
  const legs=box(0.46*k,0.9*k,0.3*k,o.pants||0x2a3550);legs.position.y=0.45*k;g.add(legs);
  const body=box(0.62*k,0.78*k,0.36*k,o.shirt||0xd8261c);body.position.y=1.29*k;g.add(body);
  const head=sph(0.22*k,0xe8c39e,8);head.position.y=1.9*k;g.add(head);
  const hair=sph(0.235*k,o.hair||0x2b211b,8);hair.scale.set(1,0.6,1);hair.position.y=2.0*k;g.add(hair);
  const armL=new THREE.Group(),armR=new THREE.Group();
  const al=box(0.16*k,0.7*k,0.16*k,o.shirt||0xd8261c);al.position.y=-0.32*k;armL.add(al);
  const ar=al.clone();armR.add(ar);armL.position.set(-0.4*k,1.62*k,0);armR.position.set(0.4*k,1.62*k,0);g.add(armL,armR);
  g.userData={armL,armR,body,legs,k};return g;}
function tree(s=1,c=0x4f8a43){const g=new THREE.Group();const tr=cyl(0.25*s,0.35*s,2*s,0x7a5634,6);tr.position.y=s;g.add(tr);
  const f=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8*s,0),M(c));f.position.y=3*s;g.add(f);return g;}
function palm(s=1){const g=new THREE.Group();for(let i=0;i<6;i++){const seg=cyl(0.22*s,0.26*s,0.9*s,0x9b7a4a,6);seg.position.set(i*0.12*s,0.45*s+i*0.85*s,0);seg.rotation.z=-0.08;g.add(seg);}
  for(let i=0;i<6;i++){const l=box(0.4*s,0.08*s,3*s,0x3f9a48);const a=i/6*Math.PI*2;l.position.set(0.7*s+Math.cos(a)*1.3*s,5.3*s,Math.sin(a)*1.3*s);l.rotation.y=-a+Math.PI/2;l.rotation.x=0.35;g.add(l);}return g;}
function car(type,color){const g=new THREE.Group();
  if(type==='kei'){const b=box(1.5,1.1,3.3,color);b.position.y=0.85;g.add(b);const t=box(1.45,0.8,2.2,color);t.position.set(0,1.8,-0.25);g.add(t);
    const gl=box(1.47,0.62,0.06,0x3a4a5c);gl.position.set(0,1.8,0.87);g.add(gl);
    for(let i=0;i<4;i++){const r=box(0.25,0.14,0.04,0x7a4a2a);r.position.set(-0.4+R()*0.8,0.6+R()*0.4,1.66);g.add(r);}
    [[-0.72,1.1],[0.72,1.1],[-0.72,-1.1],[0.72,-1.1]].forEach(([x,z])=>{const w=cyl(0.33,0.33,0.25,0x1a1a1a,10);w.rotation.z=Math.PI/2;w.position.set(x,0.33,z);g.add(w);});}
  else{const mat=M(color,{emissive:new THREE.Color(color).multiplyScalar(0.12)});
    const b=box(2.1,1.2,4.9,mat);b.position.y=1.05;g.add(b);const t=box(1.95,0.85,3.0,mat);t.position.set(0,2.05,-0.3);g.add(t);
    const gl=box(1.97,0.7,0.06,0x22303e);gl.position.set(0,2.05,1.22);g.add(gl);const gs=box(2.0,0.6,2.6,0x22303e);gs.position.set(0,2.08,-0.35);g.add(gs);t.scale.set(0.98,1,0.98);
    const grill=box(1.4,0.35,0.05,0x111111);grill.position.set(0,1.0,2.46);g.add(grill);
    [-0.7,0.7].forEach(x=>{const l=box(0.4,0.14,0.05,0xfff6d0);l.position.set(x,1.3,2.46);g.add(l);});
    [[-0.98,1.5],[0.98,1.5],[-0.98,-1.5],[0.98,-1.5]].forEach(([x,z])=>{const w=cyl(0.48,0.48,0.32,0x111111,12);w.rotation.z=Math.PI/2;w.position.set(x,0.48,z);g.add(w);const h=cyl(0.28,0.28,0.34,0xc8ccd2,8);h.rotation.z=Math.PI/2;h.position.set(x,0.48,z);g.add(h);});}
  return g;}
const WALLS=[0xe9dfc8,0xf3f1ea,0xcfdde6,0xe6d3b3,0xdcd9cf];const ROOFS=[0x3b4352,0x2f5e8c,0x6b4a35,0x4c4c4c,0x8a3a2c];
function house(){const w=7+R()*3,h=4.5+R()*3,d=7+R()*2;const g=new THREE.Group();
  const wall=box(w,h,d,WALLS[(R()*5)|0]);wall.position.y=h/2;g.add(wall);
  const rh=1.6+R()*1.2;const sh=new THREE.Shape();sh.moveTo(-w/2-0.5,0);sh.lineTo(w/2+0.5,0);sh.lineTo(0,rh);sh.lineTo(-w/2-0.5,0);
  const rg=new THREE.ExtrudeGeometry(sh,{depth:d+1,bevelEnabled:false});rg.translate(0,0,-(d+1)/2);const roof=new THREE.Mesh(rg,M(ROOFS[(R()*5)|0]));roof.position.y=h;g.add(roof);
  for(let i=0;i<2;i++){const ww=box(1.4,1.2,0.1,0x2d3b4c);ww.position.set(-w/4+i*w/2,h*0.55,d/2+0.05);g.add(ww);}return g;}
function coin(){return cyl(0.9,0.9,0.18,M(0xf2c230,{emissive:0x553300}),16);}
function apartment(){const g=new THREE.Group();
  const b=box(18,6.4,8,0xd9d4c7);b.position.y=3.2;g.add(b);
  const roof=box(18.6,0.4,8.6,0x5a5f66);roof.position.y=6.6;g.add(roof);
  const walk=box(18,0.25,1.6,0xa9a59c);walk.position.set(0,3.2,4.8);g.add(walk);
  const rail=box(18,1.0,0.12,0x8d8a82);rail.position.set(0,3.85,5.6);g.add(rail);
  for(let i=0;i<4;i++)for(let f=0;f<2;f++){const d=box(1.1,2.1,0.08,0x6f7680);d.position.set(-6.5+i*4.3,1.05+f*3.2,4.04);g.add(d);
    const w=box(1.6,1.0,0.08,0x3a4655);w.position.set(-5.1+i*4.3,1.8+f*3.2,4.04);g.add(w);}
  for(let i=0;i<8;i++){const st=box(1.2,0.2,0.5,0x8d8a82);st.position.set(9.6,0.2+i*0.4,4.6-i*0.5+2);g.add(st);}
  const ac=box(0.9,0.6,0.4,0xeeeeee);ac.position.set(-8,0.4,4.4);g.add(ac);
  return g;}
function modernHouse(){const g=new THREE.Group();
  const a=box(13,6.5,10,0xf6f4ef);a.position.set(0,3.25,0);g.add(a);
  const b=box(9,4,9,0x7a5536);b.position.set(4,8.5,-0.5);g.add(b);
  const r1=box(13.6,0.35,10.6,0x2b2f36);r1.position.set(0,6.65,0);g.add(r1);const r2=box(9.6,0.35,9.6,0x2b2f36);r2.position.set(4,10.65,-0.5);g.add(r2);
  const glass=M(0x9fd2f0,{emissive:0x274a66});
  const gw=box(7,4.5,0.1,glass);gw.position.set(-2,2.6,5.06);g.add(gw);const gw2=box(5,2.4,0.1,glass);gw2.position.set(4,8.6,4.06);g.add(gw2);
  const deck=box(14,0.3,5,0x9b6b43);deck.position.set(-1,0.15,7.5);g.add(deck);
  const lawn=box(30,0.1,20,0x7dc25a);lawn.position.set(0,0.02,9);g.add(lawn);
  for(let i=0;i<14;i++){const f=box(2,0.9,0.18,0xf3f3f3);f.position.set(-14+i*2.1,0.45,19);g.add(f);}
  [[-12,12],[12,13],[-9,4]].forEach(([x,z])=>{const t=tree(1.0,0x5aa54a);t.position.set(x,0,z);g.add(t);});
  const c=car('suv',0x1d2733);c.position.set(10,0,6);c.rotation.y=-0.3;g.add(c);
  return g;}
function plate(r,c=0xffffff){return cyl(r,r*0.8,0.08,c,16);}
