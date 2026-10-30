// ================= models.js（モデルライブラリ v5） =================
// 読み込み順：three.min.js → 基準実装の utilities/THREE base/asset library（R, lerp, box, cyl, sph, at, M, tree, car, W, H, renderer）→ このファイル → 各動画のシーン/タイムライン
// 規約：モデル関数は THREE.Group を返す。原点＝地面の中心、1単位≒1m、+Zが正面。状態違い（雪・凍結・季節）は引数で切り替える。最後に shadowAll(g)。

// ====== 画質設定（必須） ======
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const SNOW=0xf4f7fb, ICE=0xcfe6f2;
const MS=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.85,metalness:0,flatShading:true},o));
// 空のグラデーション＋霧
function sky(top,bot,fogNear,fogFar){const s=new THREE.Scene();const cv=document.createElement('canvas');cv.width=4;cv.height=256;const g=cv.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,4,256);
  s.background=new THREE.CanvasTexture(cv);s.background.colorSpace=THREE.SRGBColorSpace;s.fog=new THREE.Fog(new THREE.Color(bot),fogNear,fogFar);return s;}
// 半球光＋影を落とす太陽。sz＝影の範囲（被写体の大きさに合わせる）
function lights(s,o){s.add(new THREE.HemisphereLight(o.sky,o.ground,o.hemi));const d=new THREE.DirectionalLight(o.sun,o.sunI);d.position.set(...o.dir);
  d.castShadow=true;d.shadow.mapSize.set(2048,2048);const c=d.shadow.camera;c.left=-o.sz;c.right=o.sz;c.top=o.sz;c.bottom=-o.sz;c.near=1;c.far=600;d.shadow.bias=-0.0008;
  d.target.position.set(...(o.tgt||[0,0,0]));s.add(d,d.target);return d;}
const COLD={sky:0xdfe9f3,ground:0x8796a8,hemi:0.9,sun:0xe6eef8,sunI:0.9,dir:[-80,140,60],sz:120};
const WARM={sky:0xcfe6ff,ground:0x8a7a5a,hemi:0.75,sun:0xfff0d6,sunI:2.2,dir:[-90,120,80],sz:120};
function shadowAll(o){o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});}
// 2点間の角材（鉄骨・トラス用）
function beam(p,q,th,mat){const a=new THREE.Vector3(...p),b=new THREE.Vector3(...q);const len=a.distanceTo(b);
  const m=new THREE.Mesh(new THREE.BoxGeometry(th,len,th),mat);m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return m;}

// ====== 汎用：ビル・街・雪・つらら ======
function winTex(lit){const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');g.fillStyle='#d9dde3';g.fillRect(0,0,64,128);
  for(let y=4;y<128;y+=12)for(let x=4;x<64;x+=10){g.fillStyle=lit&&((x*7+y*3)%5<2)?'#ffd98a':'#3c4b5e';g.fillRect(x,y,7,8);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
const WT=winTex(false);
// 窓付きビル（snow=true で屋上に雪）
function building(w,h,d,col,snow){const g=new THREE.Group();const tex=WT.clone();tex.needsUpdate=true;tex.repeat.set(Math.max(1,w/6),Math.max(1,h/10));
  const mat=new THREE.MeshStandardMaterial({color:col,map:tex,roughness:0.7});const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);b.position.y=h/2;g.add(b);
  const roof=box(w+0.4,0.6,d+0.4,snow?SNOW:0x6a6f78);roof.position.y=h+0.3;g.add(roof);
  if(R()<0.5){const eq=box(w*0.3,1.6,d*0.3,snow?SNOW:0x8a8f96);eq.position.set(w*0.15,h+1.3,0);g.add(eq);}
  return g;}
// 中心を囲むリング状の街並み（o:{n,rmin,rmax,snow,skip(x,z)}）
function city(s,o){const g=new THREE.Group();for(let i=0;i<o.n;i++){const a=R()*Math.PI*2,r=o.rmin+R()*(o.rmax-o.rmin);const x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(o.skip&&o.skip(x,z))continue;const h=8+R()*R()*60;const b=building(8+R()*10,h,8+R()*10,[0xe6e2da,0xcfd6de,0xbfc7cf,0xe9ddc8,0xa9b4c0][(R()*5)|0],o.snow);b.position.set(x,0,z);b.rotation.y=(R()*4|0)*Math.PI/2;g.add(b);}
  s.add(g);return g;}
// 丸い粒テクスチャ（雪・花びら。無いと四角く見える）
const DOT=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');const gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'#fff');gr.addColorStop(0.6,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);return new THREE.CanvasTexture(c);})();
// 吹雪：update(t,速度,風) を返す。n＝粒数（2500程度まで）、c＝中心、spread＝範囲、hgt＝高さ
function blizzard(s,n,c,spread,hgt,size=0.35){const pos=new Float32Array(n*3);const base=[];for(let i=0;i<n;i++)base.push([c[0]+(R()-.5)*spread,R()*hgt,c[2]+(R()-.5)*spread,0.7+R()*0.6,R()*10]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(geo,new THREE.PointsMaterial({color:0xffffff,size,map:DOT,alphaTest:0.25,transparent:true,depthWrite:false}));s.add(p);
  return (t,sp=6,wind=4)=>{for(let i=0;i<n;i++){const b=base[i];const f=(t*sp*b[3]+b[4]*9)%hgt;pos[i*3]=b[0]+((t*wind*b[3]+b[4]*3)%spread)-spread/2+Math.sin(t+b[4])*0.5;pos[i*3+1]=c[1]+hgt-f;pos[i*3+2]=b[2];}geo.attributes.position.needsUpdate=true;};}
// つらら：x0〜x1 に n本、高さyから下向き
function icicles(g,x0,x1,y,z,n,len=1.2){for(let i=0;i<n;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(0.12+R()*0.1,len*(0.5+R()),5),MS(ICE,{roughness:0.2,transparent:true,opacity:0.92}));c.rotation.x=Math.PI;c.position.set(lerp(x0,x1,i/(n-1))+(R()-.5)*0.2,y-c.geometry.parameters.height/2,z);g.add(c);}}
// 雪をかぶった松
function pine(s=1){const g=new THREE.Group();at(cyl(0.3*s,0.45*s,3*s,0x5a4130,6),0,1.5*s,0,g);
  for(let i=0;i<4;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(1.6*s-i*0.25*s,7,5),MS(0x2f4f34));l.scale.set(1.4,0.45,1.1);l.position.set((R()-.5)*s,3*s+i*0.9*s,(R()-.5)*s);g.add(l);
    const sn=new THREE.Mesh(new THREE.SphereGeometry(1.5*s-i*0.25*s,7,4),MS(SNOW));sn.scale.set(1.35,0.22,1.05);sn.position.copy(l.position).y+=0.35*s;g.add(sn);}
  shadowAll(g);return g;}
// 寄棟屋根（4角錐台）
function hipRoof(w,d,h,col){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.35,1,h,4,1),MS(col));m.rotation.y=Math.PI/4;m.scale.set(w/1.414,1,d/1.414);return m;}
// 3D内の電光掲示板（文字はcanvasに書く）
function screenSign(s,text,x,y,z,ry,w,h,color='#8fdcff'){const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d');g.fillStyle='#0a1a2a';g.fillRect(0,0,512,256);
  g.fillStyle=color;g.font='900 150px "Noto Sans CJK JP"';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,138);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));m.position.set(x,y,z);m.rotation.y=ry;s.add(m);return m;}

// ====== 名所：東京タワー（高さ約150、脚の幅±20） ======
function tokyoTower(frozen){const g=new THREE.Group();const OR=frozen?0xd98a6e:0xff4a14,WH=frozen?0xf4f6f8:0xf2f2f2;
  const mo=MS(OR,{roughness:0.6}),mw=MS(WH,{roughness:0.6});const H=96;const wy=y=>3.2+17*Math.pow(1-y/H,1.9);
  const lv=[];for(let y=0;y<=H;y+=6)lv.push(y);
  for(let i=0;i<lv.length-1;i++){const y0=lv[i],y1=lv[i+1],w0=wy(y0),w1=wy(y1);const mat=(Math.floor(i/2)%2===0)?mo:mw;
    const C0=[[w0,w0],[-w0,w0],[-w0,-w0],[w0,-w0]],C1=[[w1,w1],[-w1,w1],[-w1,-w1],[w1,-w1]];
    for(let k=0;k<4;k++){const a0=C0[k],b0=C0[(k+1)%4],a1=C1[k],b1=C1[(k+1)%4];
      g.add(beam([a0[0],y0,a0[1]],[a1[0],y1,a1[1]],0.9,mat));
      g.add(beam([a0[0],y0,a0[1]],[b1[0],y1,b1[1]],0.35,mat));g.add(beam([b0[0],y0,b0[1]],[a1[0],y1,a1[1]],0.35,mat));
      g.add(beam([a1[0],y1,a1[1]],[b1[0],y1,b1[1]],0.4,mat));}}
  const dk=(y,w,h)=>{const d=new THREE.Mesh(new THREE.CylinderGeometry(w,w*0.92,h,8),MS(0xe8e8ea));d.rotation.y=Math.PI/8;d.position.y=y;g.add(d);
    const gl=new THREE.Mesh(new THREE.CylinderGeometry(w*1.01,w*0.95,h*0.45,8),MS(0x6f8fb0,{roughness:0.15,metalness:0.4,emissive:frozen?0x000000:0x101820}));gl.rotation.y=Math.PI/8;gl.position.y=y+h*0.1;g.add(gl);
    if(frozen){const sn=new THREE.Mesh(new THREE.CylinderGeometry(w*1.02,w*1.02,0.5,8),MS(SNOW));sn.rotation.y=Math.PI/8;sn.position.y=y+h/2+0.25;g.add(sn);
      for(let k=0;k<8;k++){const a=k/8*Math.PI*2+Math.PI/8;const ig=new THREE.Group();icicles(ig,-w*0.35,w*0.35,0,0,6,2.2);ig.position.set(Math.cos(a)*w*0.97,y-h/2,Math.sin(a)*w*0.97);ig.rotation.y=-a+Math.PI/2;g.add(ig);}}};
  dk(46,wy(46)+3.5,6);dk(84,wy(84)+2.2,4); // 大展望台・特別展望台
  for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(1.6-i*0.22,1.8-i*0.22,5.5,8),(i%2?mw:mo));m.position.y=H+2.75+i*5.5;g.add(m);}
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.4,10,6),mw);ant.position.y=H+38;g.add(ant);
  const ft=box(36,10,30,0xe9e6e0);ft.position.set(0,5,24);g.add(ft);if(frozen){const s2=box(36.4,0.8,30.4,SNOW);s2.position.set(0,10.4,24);g.add(s2);} // フットタウン
  shadowAll(g);return g;}

// ====== 名所：金閣寺（幅15・高さ約21。snow=false で雪なし） ======
function kinkaku(snow=true){const g=new THREE.Group();const GOLD=MS(0xf0c040,{metalness:0.15,roughness:0.45,emissive:0x5a3c00});
  at(box(15,1,12,0x7a7a72),0,0.5,0,g);
  const f1=box(12,4.5,9,0xe9e2cf);f1.position.y=3.25;g.add(f1);
  for(let i=0;i<7;i++){at(box(0.45,4.5,0.45,0x4a3424),-5.6+i*1.87,3.25,4.6,g);}
  const r1=hipRoof(16,13,1.6,0x3a2e26);r1.position.y=6.3;g.add(r1);
  const f2=new THREE.Mesh(new THREE.BoxGeometry(10.5,3.8,8),GOLD);f2.position.y=9.1;g.add(f2);
  const bal=box(11.5,0.4,9,0x3a2e26);bal.position.y=7.4;g.add(bal);
  const r2=hipRoof(14.5,12,1.5,0x3a2e26);r2.position.y=11.8;g.add(r2);
  const f3=new THREE.Mesh(new THREE.BoxGeometry(6.5,3.4,6.5),GOLD);f3.position.y=14.4;g.add(f3);
  const r3=new THREE.Mesh(new THREE.ConeGeometry(6.6,3.6,4),MS(0x3a2e26));r3.rotation.y=Math.PI/4;r3.position.y=17.9;g.add(r3);
  const ph=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.6,5),GOLD);ph.position.y=20.6;g.add(ph); // 鳳凰
  if(snow){const s1=hipRoof(15.6,12.6,0.9,SNOW);s1.position.y=7.0;g.add(s1);const s2=hipRoof(14,11.6,0.9,SNOW);s2.position.y=12.5;g.add(s2);
    const s3=new THREE.Mesh(new THREE.ConeGeometry(6.2,3.2,4),MS(SNOW));s3.rotation.y=Math.PI/4;s3.position.y=18.3;g.add(s3);
    icicles(g,-7.5,7.5,5.6,6.4,14,1.4);icicles(g,-6.8,6.8,11.1,5.9,12,1.2);}
  shadowAll(g);return g;}

// ====== 名所：厳島神社の大鳥居（幅23・高さ17。snow=false で雪なし） ======
function torii(snow=true){const g=new THREE.Group();const red=MS(0xd8321e,{roughness:0.6}),blk=MS(0x1c1c1c);
  for(const x of[-7,7]){at(new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,16,12),red),x,8,0,g);
    for(const z of[-3,3]){at(new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,11,10),red),x,5.5,z,g);at(box(0.8,0.8,6,red),x,9,0,g);}} // 主柱＋袖柱（両部鳥居）
  at(box(17,1.1,1.1,red),0,12.2,0,g);at(box(1.2,2.4,0.9,red),0,13.6,0,g); // 貫・額束
  const kasa=box(22,1.0,1.8,red);kasa.position.y=15.3;g.add(kasa);const top=box(23,0.9,2.0,blk);top.position.y=16.2;g.add(top); // 笠木・島木
  for(const sx of[-1,1]){const tip=box(2.5,0.9,2.0,blk);tip.position.set(sx*12.2,16.6,0);tip.rotation.z=sx*0.25;g.add(tip);} // 反り
  if(snow){at(box(23,0.7,2.2,SNOW),0,17.0,0,g);at(box(17.2,0.4,1.3,SNOW),0,12.95,0,g);icicles(g,-10,10,15.4,0.95,16,1.6);}
  shadowAll(g);return g;}

// ====== シーン（そのまま使える完成シーン。{s,bz} を返す。bz=吹雪update or null） ======
// 推奨カメラは各関数のコメント。カメラ fov55・aspect W/H（全画面）基準
// 吹雪の東京タワー｜見上げ: pos(-52→-46,4,-88→-80) look(0,72,0) fov60｜高い引き: pos(110,100,-110) look(0,70,0)
function sceneTowerSnow(){const s=sky('#7d8c9e','#d4dde6',40,520);lights(s,COLD);s.add(at(box(800,1,800,SNOW),0,-0.5,0));
  s.add(tokyoTower(true));city(s,{n:120,rmin:45,rmax:260,snow:true});const bz=blizzard(s,2500,[0,0,0],120,140,0.45);return {s,bz};}
// いつもの東京タワー（秋・晴れ）｜高い引き: pos(-125→-112,95,125→112) look(0,70,0)
function sceneTowerAutumn(){const s=sky('#4f9cf0','#cfe7ff',140,700);lights(s,WARM);s.add(at(box(800,1,800,0x8fa36a),0,-0.5,0));
  s.add(tokyoTower(false));city(s,{n:140,rmin:45,rmax:300,snow:false});
  for(let i=0;i<40;i++){const tr=tree(1.1+R()*0.5,[0xd8692a,0xe0a030,0xc0452a,0x6f9a3a][(R()*4)|0]);const a=R()*6.28,r=30+R()*16;tr.position.set(Math.cos(a)*r,0,Math.sin(a)*r+10);shadowAll(tr);s.add(tr);}
  return {s,bz:null};}
// 雪の金閣寺と凍った鏡湖池｜正面: pos(-3→3,4.5,50) look(0,15,-6)
function sceneKinkakuSnow(){const s=sky('#8e9aa8','#e2e8ee',40,300);lights(s,Object.assign({},COLD,{sz:60}));
  s.add(at(box(400,1,400,SNOW),0,-0.5,0));const k=kinkaku(true);k.position.set(0,0,-6);s.add(k);
  const ice=new THREE.Mesh(new THREE.PlaneGeometry(90,40).rotateX(-Math.PI/2),MS(0xcfe2ee,{roughness:0.15,metalness:0.1}));ice.position.set(0,0.05,16);ice.receiveShadow=true;s.add(ice);
  for(let i=0;i<10;i++){const cr=box(0.2,0.03,4+R()*8,0x9fb6c8);cr.position.set(-30+R()*60,0.08,6+R()*24);cr.rotation.y=R()*3;s.add(cr);} // 氷のひび
  for(let i=0;i<5;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(1+R()*1.4,0),MS(0x6a6a66));r.position.set(-20+i*10+(R()-.5)*4,0.4,12+R()*10);r.scale.y=0.6;s.add(r);at(new THREE.Mesh(new THREE.SphereGeometry(1.1,6,4),MS(SNOW)),r.position.x,r.position.y+0.7,r.position.z,s).scale.set(1,0.35,1);}
  [[-16,-2],[-22,6],[15,-4],[21,3],[-9,-16],[10,-15],[0,-22]].forEach(([x,z])=>{const p=pine(1.1+R()*0.4);p.position.set(x,0,z);s.add(p);});
  const bz=blizzard(s,1600,[0,0,10],70,50,0.3);return {s,bz};}
// 雪の渋谷スクランブル交差点（ビジョンに text）｜高い俯瞰: pos(9→6,78→72,70) look(0,4,-14)
function sceneShibuyaSnow(text='-15℃'){const s=sky('#7b8696','#cfd7e0',60,420);lights(s,Object.assign({},COLD,{sz:90}));
  s.add(at(box(600,1,600,0xe8edf2),0,-0.5,0));
  const road=box(400,0.05,26,0xd6dde4);road.position.y=0.03;s.add(road);const road2=box(26,0.05,400,0xd6dde4);road2.position.y=0.03;s.add(road2);
  const stripe=(x,z,rot)=>{const st=box(1.2,0.06,6,0xf8fafc);st.position.set(x,0.07,z);st.rotation.y=rot;s.add(st);};
  for(let i=-5;i<=5;i++){stripe(i*2.2,-16,0);stripe(i*2.2,16,0);stripe(-16,i*2.2,Math.PI/2);stripe(16,i*2.2,Math.PI/2);}
  for(let i=-6;i<=6;i++){const st=box(1.2,0.06,5,0xf8fafc);st.position.set(i*1.6,0.07,i*1.6);st.rotation.y=Math.PI/4;s.add(st);} // 斜め横断
  for(let i=0;i<40;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(1.5+R()*3,7,4),MS(SNOW));p.position.set((R()-.5)*70,0,(R()-.5)*70);p.scale.y=0.25;s.add(p);} // 雪だまり
  const blds=[[-34,-34,30,70],[34,-34,26,55],[-34,34,30,40],[34,34,28,62],[-34,-80,30,45],[34,-80,30,80],[-80,-34,30,50],[80,34,30,45],[-80,34,26,35],[80,-34,26,58]];
  blds.forEach(([x,z,w,h])=>{const b=building(w,h,w,[0xcfd6de,0xbfc7cf,0xe6e2da,0xa9b4c0][(R()*4)|0],true);b.position.set(x,0,z);s.add(b);});
  screenSign(s,text,-19.8,40,-34,Math.PI/2,20,10);screenSign(s,text,34,30,-18.9,0,18,9);
  for(let i=0;i<9;i++){const c=car(i%3?'kei':'suv',[0xf2f2f2,0x2b2b2b,0xb02222,0x3c6fb0][i%4]);const onX=i%2;c.position.set(onX?-40+i*9:(i%3-1)*5,0,onX?(i%3-1)*5:-40+i*9);c.rotation.y=onX?Math.PI/2:0;c.rotation.z=(R()-.5)*0.1;s.add(c);
    at(box(2.4,0.6,4.8,SNOW),c.position.x,2.3,c.position.z,s).rotation.y=c.rotation.y;} // 雪に埋もれた車
  for(const [x,z] of [[-14,-14],[14,-14],[-14,14],[14,14]]){at(cyl(0.25,0.25,7,0x5a5f66,6),x,3.5,z,s);const sg=box(1.2,2.6,0.8,0x2a2a2a);sg.position.set(x,7.2,z);s.add(sg);at(sph(0.3,MS(0xff3b30,{emissive:0x661010}),6),x,7.8,z+0.45,s);}
  shadowAll(s);const bz=blizzard(s,2200,[0,0,0],110,90,0.4);return {s,bz};}
// 凍った海に立つ大鳥居｜海面すれすれ: pos(-12→-9,2.2,22) look(0,16,-30)
function sceneToriiIce(){const s=sky('#6f7f92','#cdd7e1',50,380);lights(s,Object.assign({},COLD,{sz:60}));
  const ice=new THREE.Mesh(new THREE.PlaneGeometry(800,800).rotateX(-Math.PI/2),MS(0xd6e6f0,{roughness:0.2,metalness:0.1}));ice.receiveShadow=true;s.add(ice);
  for(let i=0;i<60;i++){const ch=new THREE.Mesh(new THREE.IcosahedronGeometry(0.6+R()*2,0),MS(R()<.5?0xffffff:0xd2e4ef));ch.position.set((R()-.5)*120,0.2,-10-R()*90);ch.scale.y=0.35;s.add(ch);} // 流氷
  for(let i=0;i<20;i++){const cr=box(0.25,0.04,8+R()*14,0x9cb4c6);cr.position.set((R()-.5)*100,0.04,(R()-.5)*100-20);cr.rotation.y=R()*3;s.add(cr);}
  const t=torii(true);t.position.set(0,0,-30);s.add(t);
  const mt=new THREE.Mesh(new THREE.ConeGeometry(70,45,9),MS(0xe9eef3));mt.position.set(-20,18,-190);s.add(mt);const mt2=new THREE.Mesh(new THREE.ConeGeometry(55,35,8),MS(0xdfe6ec));mt2.position.set(60,12,-170);s.add(mt2);
  const bz=blizzard(s,1800,[0,0,-10],90,60,0.35);return {s,bz};}

// ================= models.js 追記分（v2：動くモデル・新しい名所） =================
// 汎用の粒（色・テクスチャ指定可）：update(t,落下速度,風,揺れ) を返す。桜の花びら・雪・火の粉など
function particles(s,n,c,spread,hgt,size=0.3,color=0xffffff,opacity=1){const pos=new Float32Array(n*3);const base=[];for(let i=0;i<n;i++)base.push([c[0]+(R()-.5)*spread,R()*hgt,c[2]+(R()-.5)*spread,0.6+R()*0.8,R()*10]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(geo,new THREE.PointsMaterial({color,size,map:DOT,alphaTest:0.25,transparent:true,opacity,depthWrite:false}));s.add(p);
  return (t,sp=2,wind=1,sway=0.8)=>{for(let i=0;i<n;i++){const b=base[i];pos[i*3]=b[0]+((t*wind*b[3]+b[4]*3)%spread)-spread/2+Math.sin(t*1.3+b[4])*sway;pos[i*3+1]=c[1]+hgt-((t*sp*b[3]+b[4]*9)%hgt);pos[i*3+2]=b[2]+Math.cos(t*0.9+b[4])*sway;}geo.attributes.position.needsUpdate=true;};}

// ====== 動く車：タイヤ回転・ワイパー・ライト付き（type: kei|suv|truck、+Zが前） ======
// v.userData.wheels / wipers を vehicleAnim(v,t,回転速度,ワイパー速度) で動かす
function vehicle(type='suv',color=0x2f6db0,o={}){const g=new THREE.Group();
  const P={kei:{w:1.48,l:3.4,h:0.95,ch:0.85,cl:2.3,cz:-0.2,r:0.32},suv:{w:1.95,l:4.7,h:1.0,ch:0.85,cl:2.9,cz:-0.35,r:0.44},truck:{w:2.3,l:7.6,h:1.1,ch:1.3,cl:2.2,cz:2.4,r:0.5}}[type];
  const paint=MS(color,{roughness:0.35,metalness:0.35,flatShading:false}),glass=MS(0x1b2733,{roughness:0.1,metalness:0.7}),blk=MS(0x141414,{roughness:0.9}),chrome=MS(0xcfd4da,{roughness:0.3,metalness:0.8});
  const y0=P.r+0.12;
  if(type==='truck'){at(box(P.w,P.h+P.ch,2.4,paint),0,y0+(P.h+P.ch)/2,P.l/2-1.2,g);at(box(P.w*0.96,0.9,0.06,glass),0,y0+P.h+0.55,P.l/2+0.01,g);
    at(box(P.w+0.1,2.9,P.l-2.7,MS(o.cargo||0xf2f2f2,{roughness:0.6})),0,y0+1.55,-1.35,g);at(box(P.w*0.6,0.5,0.05,MS(o.logo||0x2f6db0)),0,y0+2.2,P.l/2-2.71,g);}
  else{at(box(P.w,P.h,P.l,paint),0,y0+P.h/2,0,g);at(box(P.w*0.9,P.ch,P.cl,glass),0,y0+P.h+P.ch/2,P.cz,g);
    at(box(P.w*0.92,0.1,P.cl*0.86,paint),0,y0+P.h+P.ch+0.03,P.cz,g);
    for(const sx of[-1,1])for(const z of[P.cz+P.cl/2-0.08,P.cz-P.cl/2+0.08])at(box(0.08,P.ch,0.12,paint),sx*P.w*0.45,y0+P.h+P.ch/2,z,g);
    at(box(P.w*0.7,0.25,0.05,blk),0,y0+0.35,P.l/2+0.01,g);at(box(P.w+0.04,0.18,0.3,blk),0,y0+0.12,P.l/2-0.1,g);at(box(P.w+0.04,0.18,0.3,blk),0,y0+0.12,-P.l/2+0.1,g);}
  const lightOn=o.lights?1.6:0.25;
  for(const sx of[-1,1]){at(box(0.38,0.16,0.06,MS(0xfff6d8,{emissive:0xfff0c0,emissiveIntensity:lightOn})),sx*P.w*0.34,y0+P.h*0.72,P.l/2+0.02,g);
    at(box(0.32,0.14,0.06,MS(0xc81e1e,{emissive:0xff2020,emissiveIntensity:o.lights?1.2:0.3})),sx*P.w*0.38,y0+P.h*0.7,-P.l/2-0.02,g);}
  const wheels=[];const wz=type==='truck'?[P.l/2-1.2,-P.l/2+1.6,-P.l/2+2.8]:[P.l/2-0.75,-P.l/2+0.75];
  for(const z of wz)for(const sx of[-1,1]){const w=new THREE.Group();w.position.set(sx*(P.w/2-0.05),P.r,z);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(P.r,P.r,0.3,16),blk);tire.rotation.z=Math.PI/2;w.add(tire);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(P.r*0.6,P.r*0.6,0.32,10),chrome);hub.rotation.z=Math.PI/2;w.add(hub);
    for(let k=0;k<3;k++){const sp=box(0.34,P.r*1.15,0.09,MS(0x333333));sp.rotation.x=k*Math.PI/3;w.add(sp);} // スポーク（回転が見える）
    g.add(w);wheels.push(w);}
  const wipers=[];const wzF=type==='truck'?P.l/2+0.05:P.cz+P.cl/2+0.02,wyF=type==='truck'?y0+P.h+0.12:y0+P.h+0.05;
  for(const x of[-P.w*0.28,P.w*0.12]){const pv=new THREE.Group();pv.position.set(x,wyF,wzF);const arm=box(0.05,(type==='truck'?0.85:P.ch*0.85),0.04,blk);arm.position.y=arm.geometry.parameters.height/2;pv.add(arm);g.add(pv);wipers.push(pv);}
  shadowAll(g);g.userData={wheels,wipers,P};return g;}
function vehicleAnim(v,t,spin=0,wipe=0){v.userData.wheels.forEach(w=>w.rotation.x=t*spin);v.userData.wipers.forEach(w=>w.rotation.z=wipe?(-0.15+0.95*(0.5+0.5*Math.sin(t*wipe))):-0.15);}

// ====== 動く人：歩く・腕を振る・震える（o:{coat,pants,hair,hat,scarf,kid}） ======
function human(o={}){if(o.hd)return humanHD(o);const g=new THREE.Group();const k=o.kid?0.66:1;const coat=MS(o.coat||0x3c6fb0,{roughness:0.9}),pant=MS(o.pants||0x2a2f3a),skin=MS(0xe8c39e),hairM=MS(o.hair||0x2b211b);
  const hip=new THREE.Group();hip.position.y=0.92*k;g.add(hip);
  at(box(0.5*k,0.66*k,0.3*k,coat),0,0.33*k,0,hip);at(box(0.52*k,0.2*k,0.32*k,coat),0,0.02*k,0,hip);
  at(new THREE.Mesh(new THREE.SphereGeometry(0.17*k,12,10),skin),0,0.86*k,0,hip);
  const hr=at(new THREE.Mesh(new THREE.SphereGeometry(0.18*k,12,8,0,Math.PI*2,0,Math.PI*0.55),hairM),0,0.88*k,-0.01,hip);
  if(o.hat){at(new THREE.Mesh(new THREE.SphereGeometry(0.19*k,12,8,0,Math.PI*2,0,Math.PI*0.5),MS(o.hat)),0,0.9*k,0,hip);at(sph(0.06*k,MS(0xffffff),6),0,1.1*k,0,hip);}
  if(o.scarf)at(box(0.34*k,0.1*k,0.3*k,MS(o.scarf)),0,0.68*k,0.02,hip);
  if(o.suit){at(box(0.16*k,0.42*k,0.02,MS(0xf4f4f4)),0,0.45*k,0.152*k,hip);at(box(0.07*k,0.38*k,0.02,MS(o.tie||0xb02222)),0,0.43*k,0.163*k,hip);} // suit=白シャツ＋ネクタイ
  const legs=[],arms=[];
  for(const sx of[-1,1]){const lg=new THREE.Group();lg.position.set(sx*0.12*k,0,0);at(box(0.18*k,0.86*k,0.2*k,pant),0,-0.43*k,0,lg);at(box(0.2*k,0.1*k,0.3*k,MS(0x1a1a1a)),0,-0.88*k,0.04,lg);hip.add(lg);legs.push(lg);
    const am=new THREE.Group();am.position.set(sx*0.32*k,0.62*k,0);at(box(0.13*k,0.6*k,0.14*k,coat),0,-0.3*k,0,am);at(sph(0.07*k,skin,6),0,-0.63*k,0,am);hip.add(am);arms.push(am);}
  shadowAll(g);g.userData={hip,legs,arms,h0:0.92*k};return g;}
function walkAnim(p,t,sp=6,amp=0.5){const u=p.userData;const a=Math.sin(t*sp)*amp;u.legs[0].rotation.x=a;u.legs[1].rotation.x=-a;u.arms[0].rotation.x=-a*0.8;u.arms[1].rotation.x=a*0.8;u.hip.position.y=u.h0+Math.abs(Math.cos(t*sp))*0.04;if(u.knees){u.knees[0].rotation.x=Math.max(0,-a)*1.3+0.05;u.knees[1].rotation.x=Math.max(0,a)*1.3+0.05;u.elbows.forEach(e=>e.rotation.x=-0.35);}}
function shiverAnim(p,t,i=0){const u=p.userData;u.hip.rotation.z=Math.sin(t*28+i)*0.03;u.arms[0].rotation.set(-0.5,0,0.7);u.arms[1].rotation.set(-0.5,0,-0.7);u.hip.position.y=u.h0-0.03;}

// ====== 動物・鳥・飛行機 ======
function deerM(){const g=new THREE.Group();const c=MS(0x8a5a34),w=MS(0xf3ece0);
  at(box(1.5,0.62,0.52,c),0,1.3,0,g);at(box(0.2,0.2,0.3,w),-0.78,1.45,0,g);
  const nk=at(box(0.24,0.7,0.24,c),0.72,1.75,0,g);nk.rotation.z=-0.5;at(box(0.5,0.26,0.26,c),1.02,2.05,0,g);at(sph(0.05,MS(0x111111),6),1.27,2.05,0,g);
  for(const z of[0.1,-0.1]){const a=at(cyl(0.025,0.035,0.55,MS(0xd8c8a8),4),0.92,2.42,z,g);a.rotation.x=z*4;const b=at(cyl(0.02,0.02,0.25,MS(0xd8c8a8),4),0.98,2.6,z*2.2,g);b.rotation.z=-0.7;}
  const legs=[];for(const [x,z] of[[0.55,0.18],[0.55,-0.18],[-0.55,0.18],[-0.55,-0.18]]){const lg=new THREE.Group();lg.position.set(x,1.05,z);at(box(0.11,1.0,0.11,c),0,-0.5,0,lg);g.add(lg);legs.push(lg);}
  shadowAll(g);g.userData={legs};return g;}
function deerAnim(d,t,i=0){d.userData.legs.forEach((l,j)=>l.rotation.z=Math.sin(t*6+j*1.6+i)*0.4);}
function bird(color=0xffffff,s=1){const g=new THREE.Group();const m=MS(color),tip=MS(0x333333);
  const b=at(new THREE.Mesh(new THREE.SphereGeometry(0.25*s,8,6),m),0,0,0,g);b.scale.set(0.8,0.7,2);
  at(new THREE.Mesh(new THREE.ConeGeometry(0.06*s,0.25*s,5),MS(0xf0b030)),0,0,0.55*s,g).rotation.x=Math.PI/2;
  const wings=[];for(const sx of[-1,1]){const pv=new THREE.Group();const wg=box(0.9*s,0.04,0.36*s,m);wg.position.x=sx*0.45*s;pv.add(wg);at(box(0.25*s,0.05,0.3*s,tip),sx*0.85*s,0,0,pv);g.add(pv);wings.push([pv,sx]);}
  g.userData={wings};return g;}
function birdAnim(b,t,i=0){b.userData.wings.forEach(([w,sx])=>w.rotation.z=sx*Math.sin(t*10+i)*0.6);}
function airliner(){const g=new THREE.Group();const wm=MS(0xf4f6f8,{roughness:0.4,metalness:0.2}),bl=MS(0x1e4fa0);
  const f=at(new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,28,14),wm),0,0,0,g);f.rotation.x=Math.PI/2;
  const n=at(new THREE.Mesh(new THREE.SphereGeometry(1.6,14,10),wm),0,0,14,g);n.scale.set(1,1,1.8);
  const tl=at(new THREE.Mesh(new THREE.ConeGeometry(1.6,6,14),wm),0,0.4,-17,g);tl.rotation.x=-Math.PI/2;
  at(box(30,0.35,5,wm),0,-0.6,1,g);at(box(0.35,6,4,bl),0,3.6,-16.5,g);at(box(10,0.3,2.6,wm),0,0.5,-16.5,g);
  for(const sx of[-1,1])at(new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,3,10),MS(0xb8bec6)),sx*7,-1.6,2.5,g).rotation.x=Math.PI/2;
  at(box(3.25,0.5,22,bl),0,-0.3,0,g).scale.set(1,1,1);shadowAll(g);return g;}

// ====== 日本の街並み：家・電柱と電線・自販機・道路 ======
function houseM(o={}){const w=7+R()*3,h=4.5+R()*3,d=7+R()*2;const g=new THREE.Group();
  at(box(w,h,d,MS([0xe9dfc8,0xf3f1ea,0xcfdde6,0xe6d3b3,0xdcd9cf][(R()*5)|0])),0,h/2,0,g);
  const rh=1.6+R()*1.2;const sh=new THREE.Shape();sh.moveTo(-w/2-0.5,0);sh.lineTo(w/2+0.5,0);sh.lineTo(0,rh);sh.lineTo(-w/2-0.5,0);
  const rg=new THREE.ExtrudeGeometry(sh,{depth:d+1,bevelEnabled:false});rg.translate(0,0,-(d+1)/2);
  const rc=[0x3b4352,0x2f5e8c,0x6b4a35,0x4c4c4c,0x8a3a2c][(R()*5)|0];at(new THREE.Mesh(rg,MS(o.snow?SNOW:rc)),0,h,0,g);
  if(o.snow){const rg2=new THREE.ExtrudeGeometry(sh,{depth:d+1,bevelEnabled:false});rg2.translate(0,0,-(d+1)/2);const sn=at(new THREE.Mesh(rg2,MS(SNOW)),0,h+0.35,0,g);sn.scale.set(1.02,1,1);}
  const lit=o.lit&&R()<0.85;const wm=lit?MS(0xffd98a,{emissive:0xffb040,emissiveIntensity:1.2}):MS(o.night?0x10141a:0x2d3b4c,{roughness:0.2,metalness:0.3});
  for(let i=0;i<2;i++){at(box(1.4,1.2,0.1,wm),-w/4+i*w/2,h*0.55,d/2+0.05,g);at(box(1.6,0.12,0.16,MS(0xf4f4f4)),-w/4+i*w/2,h*0.55-0.66,d/2+0.08,g);}
  at(box(1.1,2.1,0.1,MS(0x6b4a35)),w/2-1.4,1.05,d/2+0.05,g);
  if(o.ice)icicles(g,-w/2,w/2,h-0.05,d/2+0.45,9,1.2);
  shadowAll(g);return g;}
function utilityPole(h=10){const g=new THREE.Group();const m=MS(0x8a8a84);at(cyl(0.16,0.22,h,m,8),0,h/2,0,g);at(box(2.4,0.14,0.14,m),0,h-0.6,0,g);at(box(1.8,0.12,0.12,m),0,h-1.4,0,g);
  at(cyl(0.3,0.3,0.8,MS(0x9a9a9a),8),0.4,h-2.4,0.25,g);shadowAll(g);return g;}
function vending(lit=true,snow=false){const g=new THREE.Group();at(box(1.1,1.9,0.8,MS(0xd8261c)),0,0.95,0,g);
  at(box(0.95,0.9,0.05,MS(lit?0xeaf6ff:0x22262c,{emissive:lit?0xbfe0ff:0x000000,emissiveIntensity:lit?0.9:0})),0,1.35,0.41,g);
  for(let i=0;i<3;i++)for(let j=0;j<4;j++)at(box(0.14,0.22,0.04,MS([0x3a8ad8,0xf2c230,0x3aa85a,0xe85a3a][(i+j)%4],{emissive:lit?0x222222:0})),-0.33+j*0.22,1.1+i*0.28,0.44,g);
  if(snow)at(box(1.2,0.3,0.9,MS(SNOW)),0,2.05,0,g);shadowAll(g);return g;}
// 道路沿いの日本の街（z方向に伸びる）。o:{snow,depth,ice,night,lit,poles}
function streetJ(s,o={}){const depth=o.snow?(o.depth||0.3):0;const sn=!!o.snow;
  const gnd=at(box(400,1,400,MS(sn?SNOW:0x8db35e)),0,-0.5,0,s);gnd.receiveShadow=true;
  if(sn&&depth>0.05)at(box(400,depth,400,MS(SNOW)),0,depth/2,0,s).receiveShadow=true;
  const rd=at(box(10,0.06,400,MS(sn?0xdde5ec:0x55585e,{roughness:sn?0.2:0.9,metalness:sn?0.15:0})),0,depth+0.03,0,s);rd.receiveShadow=true;
  if(!sn)for(let z=-180;z<180;z+=8)at(box(0.25,0.07,3.5,MS(0xf2f2f2)),0,0.065,z,s);else for(const x of[-1.8,1.8])at(box(0.5,0.08,400,MS(0xb8c4ce)),x,depth+0.05,0,s);
  for(const sx of[-1,1])at(box(3,0.2,400,MS(sn?SNOW:0xb9b6ae)),sx*6.5,depth+0.1,0,s).receiveShadow=true;
  for(let z=-170;z<=90;z+=12)for(const sx of[-1,1]){const h=houseM({snow:sn,ice:o.ice,night:o.night,lit:o.lit});h.position.set(sx*(13+R()*2),depth*0.3,z);h.rotation.y=-sx*Math.PI/2;s.add(h);}
  const poles=[];for(let z=-170;z<=90;z+=14){const p=utilityPole();p.position.set(-8.3,depth,z);s.add(p);poles.push(p);
    if(o.night){at(sph(0.3,MS(o.lit?0xfff3c0:0x333333,{emissive:o.lit?0xffe08a:0,emissiveIntensity:1.5}),8),-7.4,8.2,z,s);}}
  for(let i=0;i<poles.length-1;i++)for(const dy of[-0.6,-1.4])for(const dx of[-1,0,1]){const a=poles[i].position,b=poles[i+1].position;s.add(beam([a.x+dx,10+dy,a.z],[b.x+dx,10+dy-0.01,b.z],0.04,MS(0x222222)));}
  for(let z=-150;z<=60;z+=55){const v=vending(o.night?!!o.lit:true,sn);v.position.set(8.6,depth,z);v.rotation.y=-Math.PI/2;s.add(v);}
  return depth;}

// ====== 夜の街（明かりを1棟ずつ消せる）：update(t, 消灯の判定(d)=>bool) ======
function nightWinTex(){const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,64,128);
  for(let y=4;y<128;y+=12)for(let x=4;x<64;x+=10){if(R()<0.38){g.fillStyle=R()<0.8?'#ffcf7a':'#cfe6ff';g.fillRect(x+1,y+1,5,6);}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
function nightCity(s,o={}){const N=o.n||140,RR=o.r||160;const blds=[];const ET=[nightWinTex(),nightWinTex(),nightWinTex()];
  const gnd=at(box(800,1,800,MS(o.snow?0x9aa8b8:0x1a1d22)),0,-0.5,0,s);gnd.receiveShadow=true;
  for(let i=-4;i<=4;i++){at(box(6,0.05,800,MS(o.snow?0xb8c4d0:0x2a2d33)),i*36,0.03,0,s);at(box(800,0.05,6,MS(o.snow?0xb8c4d0:0x2a2d33)),0,0.03,i*36,s);}
  for(let ix=-4;ix<4;ix++)for(let iz=-4;iz<4;iz++)for(let k=0;k<2;k++){if(R()<0.3)continue;const x=ix*36+18+(k?8:-8)+(R()-.5)*3,z=iz*36+18+(R()-.5)*10;if(Math.hypot(x,z)>RR)continue;
    const w=8+R()*6,d=8+R()*6,h=10+R()*R()*70;const tex=ET[(R()*3)|0].clone();tex.needsUpdate=true;tex.repeat.set(Math.max(1,w/6),Math.max(1,h/10));
    const mat=new THREE.MeshStandardMaterial({color:0x2a3240,roughness:0.6,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:0.8});
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);b.position.set(x,h/2,z);b.castShadow=b.receiveShadow=true;s.add(b);
    if(o.snow)at(box(w+0.3,0.5,d+0.3,MS(SNOW)),x,h+0.25,z,s);
    at(box(w*0.3,0.4,0.4,MS(0xff2020,{emissive:0xff2020,emissiveIntensity:h>45?1.5:0})),x,h+0.6,z,s);
    blds.push({mat,d:Math.hypot(x+60,z+60),h});}
  const lamps=[];for(let i=-4;i<=4;i++)for(let j=-4;j<=4;j++){const m=MS(0xfff0c0,{emissive:0xffd890,emissiveIntensity:2});const l=at(sph(0.6,m,6),i*36+3.5,6,j*36+3.5,s);lamps.push({m,d:Math.hypot(i*36+60,j*36+60)});}
  const cars=[];for(let i=0;i<40;i++){const g=new THREE.Group();const lane=(R()*9|0)-4;const along=R()<0.5;
    at(box(1.2,0.3,0.4,MS(0xffffff,{emissive:0xfff4d0,emissiveIntensity:2.5})),0,0.6,0,g);g.userData={lane,along,off:R()*300,v:(10+R()*8)*(R()<.5?1:-1)};s.add(g);cars.push(g);}
  return {blds,lamps,cars,update(t,offAt){blds.forEach(b=>{b.mat.emissiveIntensity=offAt&&offAt(b.d,t)?0:0.8;});lamps.forEach(l=>l.m.emissiveIntensity=offAt&&offAt(l.d,t)?0:2);
    cars.forEach(c=>{const u=c.userData;const p=((u.off+t*u.v)%300+300)%300-150;const stop=offAt&&offAt(80,t);const q=stop?((u.off+ (o.stopT||0)*u.v)%300+300)%300-150:p;
      if(u.along)c.position.set(u.lane*36+(u.v>0?1.4:-1.4),0,q);else c.position.set(q,0,u.lane*36+(u.v>0?1.4:-1.4));c.rotation.y=u.along?Math.PI/2:0;c.visible=!(offAt&&offAt(200,t));});}};}

// ====== スーパーの棚（full=商品びっしり / false=空っぽ＋霜） ======
function storeShelf(full=true,len=10){const g=new THREE.Group();const frame=MS(0xdcdfe3,{roughness:0.5,metalness:0.4});
  at(box(len,2.2,0.12,frame),0,1.1,-0.45,g);at(box(len,0.15,1.0,frame),0,0.08,0,g);
  for(let i=0;i<4;i++)at(box(len,0.05,1.0,frame),0,0.5+i*0.5,0,g);
  at(box(len,0.3,0.06,MS(full?0xffd23d:0x8a9098,{emissive:full?0x3a2a00:0})),0,2.35,0.4,g);
  const N=full?Math.floor(len*4*4.5):6;const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),MS(0xffffff,{roughness:0.5}),N);
  const m4=new THREE.Matrix4(),col=new THREE.Color();const PAL=[0xff5a4a,0xffd23d,0x3a8ad8,0x3aa85a,0xf28a2a,0xffffff,0xe84a8a,0x8a5a3a];let n=0;
  for(let lv=0;lv<4&&n<N;lv++){let x=-len/2+0.25;while(x<len/2-0.2&&n<N){const w=0.18+R()*0.25,h=0.2+R()*0.25;if(!full&&R()<0.92){x+=w+1.2;continue;}
    m4.makeScale(w,h,0.5);m4.setPosition(x+w/2,0.55+lv*0.5+h/2,0.05);im.setMatrixAt(n,m4);im.setColorAt(n,col.setHex(PAL[(R()*PAL.length)|0]));n++;x+=w+0.04;}}
  im.count=n;im.castShadow=true;g.add(im);
  if(!full)for(let lv=0;lv<4;lv++)at(box(len,0.03,0.95,MS(0xeaf4fb,{roughness:0.3})),0,0.54+lv*0.5,0,g);
  shadowAll(g);return g;}
function cart(){const g=new THREE.Group();const m=MS(0xb8bec6,{metalness:0.7,roughness:0.3});at(box(0.6,0.5,0.9,m),0,0.75,0,g);at(box(0.62,0.04,0.04,MS(0xd8261c)),0,1.1,-0.5,g);
  for(const [x,z] of[[-0.25,0.35],[0.25,0.35],[-0.25,-0.35],[0.25,-0.35]])at(cyl(0.07,0.07,0.05,MS(0x222222),8),x,0.07,z,g).rotation.z=Math.PI/2;shadowAll(g);return g;}

// ====== 港：貨物船・ガントリークレーン・波の海 ======
function cargoShip(snow=false){const g=new THREE.Group();const hull=MS(0x8a2a22),dark=MS(0x1d2a3a),wh=MS(0xf4f4f4);
  at(box(7,3,26,dark),0,0.6,0,g);at(box(7.05,1.2,26.05,hull),0,-0.5,0,g);const bow=at(new THREE.Mesh(new THREE.CylinderGeometry(0.1,3.5,6,4,1),dark),0,0.6,15.8,g);bow.rotation.x=Math.PI/2;bow.rotation.y=Math.PI/4;bow.scale.set(1,1,0.86);
  at(box(5.6,4,4.4,wh),0,4.1,-9.5,g);at(box(5.7,0.7,0.1,MS(0x22303e)),0,5.2,-7.25,g);at(cyl(0.7,0.7,2.6,MS(0xd8261c),10),0,7.2,-10.5,g);
  for(let i=0;i<5;i++)for(let j=0;j<2;j++){at(box(2.9,2.3,4.6,MS([0x2f6db0,0xd8261c,0x3a8a4a,0xf2c230,0xe8e8e8][(i+j*2)%5])),j?1.5:-1.5,3.3,-4+i*4.8,g);if(snow)at(box(3,0.4,4.7,MS(SNOW)),j?1.5:-1.5,4.65,-4+i*4.8,g);}
  if(snow)at(box(5.8,0.5,4.6,MS(SNOW)),0,6.35,-9.5,g);shadowAll(g);return g;}
function gantryCrane(frozen=false){const g=new THREE.Group();const m=MS(frozen?0xc8a8a0:0xd8461c,{roughness:0.6});
  for(const x of[-4,4])for(const z of[-3,3])at(box(0.8,22,0.8,m),x,11,z,g);
  at(box(9,1.2,1.2,m),0,22,-3,g);at(box(9,1.2,1.2,m),0,22,3,g);at(box(1.4,1.4,40,m),-3,23,8,g);at(box(1.4,1.4,40,m),3,23,8,g);
  const tro=new THREE.Group();at(box(7,1.6,3,MS(0x333333)),0,0,0,tro);at(box(0.15,10,0.15,MS(0x222222)),0,-6,0,tro);at(box(3,0.6,6,MS(0x555555)),0,-11,0,tro);tro.position.set(0,24,6);g.add(tro);
  if(frozen){at(box(8,0.5,42,MS(SNOW)),0,24,8,g);icicles(g,-4,4,22.6,-3.6,10,2);}
  shadowAll(g);g.userData={tro};return g;}
function waterPlane(w,d,seg,color){const geo=new THREE.PlaneGeometry(w,d,seg,seg).rotateX(-Math.PI/2);const m=new THREE.Mesh(geo,MS(color,{roughness:0.15,metalness:0.3,flatShading:true}));m.receiveShadow=true;
  const p=geo.attributes.position,b=p.array.slice();return {mesh:m,update(t,amp=0.5){for(let i=0;i<p.count;i++){const x=b[i*3],z=b[i*3+2];p.array[i*3+1]=Math.sin(x*0.09+t*1.6)*amp+Math.cos(z*0.12+t*1.2)*amp*0.7+Math.sin((x+z)*0.2+t*2.3)*amp*0.25;}p.needsUpdate=true;geo.computeVertexNormals();}};}

// ====== 桜（bloom=true 満開 / false 雪の枯れ木）・ブルーシート ======
function sakura(s=1,bloom=true){const g=new THREE.Group();const bark=MS(0x5a4130);at(cyl(0.35*s,0.55*s,3.2*s,bark,8),0,1.6*s,0,g);
  const tips=[];for(let i=0;i<6;i++){const a=i/6*Math.PI*2+R()*0.4;const tip=[Math.cos(a)*3*s,4.6*s+R()*1.2*s,Math.sin(a)*3*s];g.add(beam([0,3*s,0],tip,0.22*s,bark));tips.push(tip);
    const t2=[tip[0]*1.35+(R()-.5)*s,tip[1]+0.8*s,tip[2]*1.35+(R()-.5)*s];g.add(beam(tip,t2,0.12*s,bark));tips.push(t2);}
  if(bloom){const pk=[MS(0xf7b8cc,{roughness:0.9}),MS(0xfcd3e0,{roughness:0.9}),MS(0xf29ab6,{roughness:0.9})];
    tips.forEach((p,i)=>{for(let k=0;k<2;k++){const c=at(new THREE.Mesh(new THREE.IcosahedronGeometry((1.3+R()*0.8)*s,1),pk[(i+k)%3]),p[0]+(R()-.5)*s,p[1]+(R()-.3)*s,p[2]+(R()-.5)*s,g);c.scale.y=0.75;}});
    at(new THREE.Mesh(new THREE.IcosahedronGeometry(2.6*s,1),pk[0]),0,5.6*s,0,g).scale.y=0.7;}
  else tips.forEach(p=>{at(new THREE.Mesh(new THREE.SphereGeometry(0.35*s,6,4),MS(SNOW)),p[0],p[1]+0.15*s,p[2],g).scale.set(1.6,0.5,1.6);});
  shadowAll(g);return g;}

// ====== 名所：富士山（snow: 'cap'=山頂だけ雪 / 'all'=全部雪）。半径260・高さ125 ======
function fuji(snow='cap'){const g=new THREE.Group();const R0=260,Hh=125,top=22;const prof=r=>Hh*Math.pow(1-(r-top)/(R0-top),1.8);
  const pts=[];for(let i=0;i<=24;i++){const r=top+(R0-top)*i/24;pts.push(new THREE.Vector2(r,prof(r)));}pts.unshift(new THREE.Vector2(0,Hh-6));
  const body=new THREE.Mesh(new THREE.LatheGeometry(pts,40),MS(snow==='all'?0xeef3f8:0x4a5a78,{side:THREE.DoubleSide,flatShading:false,roughness:0.95}));g.add(body);
  if(snow!=='all'){const cp=pts.filter(p=>p.y>Hh*0.52).map(p=>new THREE.Vector2(p.x*1.012,p.y+0.6));
    const cap=new THREE.Mesh(new THREE.LatheGeometry(cp,40),MS(0xf6f9fc,{side:THREE.DoubleSide,flatShading:false}));g.add(cap);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const rr=top+(R0-top)*0.42;const st=beam([Math.cos(a)*(rr-10),prof(rr-10)+0.8,Math.sin(a)*(rr-10)],[Math.cos(a)*(rr+18+R()*14),prof(rr+18)+0.8,Math.sin(a)*(rr+18+R()*14)],5,MS(0xf6f9fc));g.add(st);}}
  return g;}

// ====== 新幹線（cars両編成。+Zが先頭）・線路 ======
function shinkansen(cars=4,snow=false){const g=new THREE.Group();const wm=MS(0xf6f7f9,{roughness:0.35,metalness:0.2,flatShading:false}),bl=MS(0x1e4fa0,{flatShading:false}),win=MS(0x1b2733,{roughness:0.1,metalness:0.6});
  const L=24,wheels=[];
  for(let c=0;c<cars;c++){const z0=-c*(L+0.6);const car=new THREE.Group();car.position.z=z0;g.add(car);
    at(box(3.4,3.4,L,wm),0,2.6,0,car);at(box(3.42,0.35,L,bl),0,1.5,0,car);at(box(3.44,0.12,L,bl),0,1.85,0,car);at(box(3.43,0.7,L-2,win),0,3.1,0,car);
    at(box(3.0,0.6,L-1,MS(0x8a9098)),0,0.6,0,car);
    for(const bz of[L/2-3,-L/2+3])for(const dz of[-1,1])for(const sx of[-1,1]){const w=new THREE.Group();w.position.set(sx*1.3,0.5,bz+dz*1.1);const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.2,12),MS(0x333333));tr.rotation.z=Math.PI/2;w.add(tr);
      const sp=box(0.22,0.7,0.12,MS(0x777777));w.add(sp);car.add(w);wheels.push(w);}
    if(snow)at(box(3.5,0.5,L,MS(SNOW)),0,4.55,0,car);
    if(c===0){const nose=at(new THREE.Mesh(new THREE.SphereGeometry(1,20,14,0,Math.PI*2,0,Math.PI/2),wm),0,1.0,L/2,car);nose.rotation.x=Math.PI/2;nose.scale.set(1.7,8.5,2.6);
      const st=at(box(3.2,0.3,7,bl),0,1.5,L/2+2.6,car);st.scale.set(0.9,1,1);const cw=at(new THREE.Mesh(new THREE.SphereGeometry(1,14,10,0,Math.PI*2,0,Math.PI/2),win),0,3.0,L/2+1.6,car);cw.rotation.x=Math.PI/2;cw.scale.set(1.0,2.6,0.8);
      if(snow){const sn=at(new THREE.Mesh(new THREE.SphereGeometry(1,14,10,0,Math.PI*2,0,Math.PI/2),MS(SNOW)),0,1.6,L/2,car);sn.rotation.x=Math.PI/2;sn.scale.set(1.75,7,2.4);}}
    if(c===1){at(box(0.15,1.6,0.15,MS(0x555555)),0,5.1,0,car);at(box(2.2,0.1,0.3,MS(0x555555)),0,5.9,0,car);}}
  shadowAll(g);g.userData={wheels,len:cars*(L+0.6)};return g;}
function railTrack(s,len=1200,snowy=false){const g=new THREE.Group();at(box(6,0.6,len,MS(snowy?SNOW:0x8a8780)),0,0.3,0,g);
  if(!snowy){for(const x of[-0.75,0.75])at(box(0.15,0.2,len,MS(0x9aa0a8,{metalness:0.8,roughness:0.3})),x*1.8,0.7,0,g);for(let z=-len/2;z<len/2;z+=2.5)at(box(3.2,0.15,0.4,MS(0x6a6a66)),0,0.62,z,g);}
  for(let z=-len/2;z<len/2;z+=50){at(box(0.3,7.5,0.3,MS(0x8a8f96)),3.4,3.75,z,g);at(box(3.6,0.2,0.2,MS(0x8a8f96)),1.7,7.3,z,g);}
  at(box(0.06,0.06,len,MS(0x222222)),0,6.9,0,g);s.add(g);return g;}

// ====== 東京タワー＋雪に埋もれた街（10年後）。完成シーン ======
// 夜・月明かり。deers=歩くシカ（deerAnimで脚を動かす）｜ドローン降下: pos(150→60,170→40,150→60) look(0,40,0)
function sceneTowerBuried(){const s=sky('#05080f','#2b3a55',60,520);
  s.add(new THREE.HemisphereLight(0x9fb8e0,0x2a3448,0.55));const moon=new THREE.DirectionalLight(0xbfd4ff,0.9);moon.position.set(120,160,-60);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);const c=moon.shadow.camera;c.left=-150;c.right=150;c.top=150;c.bottom=-150;c.far=600;moon.shadow.bias=-0.0008;s.add(moon,moon.target);
  const mn=new THREE.Mesh(new THREE.SphereGeometry(10,20,14),new THREE.MeshBasicMaterial({color:0xf4f6ff,fog:false}));mn.position.set(260,240,-420);s.add(mn);
  const T=tokyoTower(true);T.position.y=-6;s.add(T);
  const snowG=at(box(900,1,900,MS(0xe6eef8,{roughness:0.9})),0,5.5,0,s);snowG.receiveShadow=true;
  const cg=city(s,{n:130,rmin:45,rmax:280,snow:true,skip:(x,z)=>x>10&&z>10});cg.position.y=-4;
  for(let i=0;i<70;i++){const d=new THREE.Mesh(new THREE.SphereGeometry(3+R()*6,8,5),MS(0xe6eef8));d.position.set((R()-.5)*300,6,(R()-.5)*300);d.scale.y=0.3;d.receiveShadow=true;s.add(d);}
  const deers=[];for(let i=0;i<5;i++){const d=deerM();d.scale.setScalar(2.2);d.position.set(-30+i*5,6,40-i*3);s.add(d);deers.push(d);}
  const bz=blizzard(s,1500,[0,0,0],160,120,0.4);return {s,bz,deers};}

// ================= models.js 追記分（v3：働き方・ライフスタイル系） =================
// 立ちのぼる粒（湯気・焚き火の火の粉）：update(t) で上へ昇りながら広がる
function rising(s,n,c,r,h,size=0.6,color=0xffffff,opacity=0.5,speed=0.6){const pos=new Float32Array(n*3);const base=[];for(let i=0;i<n;i++)base.push([(R()-.5)*2*r,(R()-.5)*2*r,R()*10,0.6+R()*0.8]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(geo,new THREE.PointsMaterial({color,size,map:DOT,transparent:true,opacity,depthWrite:false}));s.add(p);
  return t=>{for(let i=0;i<n;i++){const b=base[i];const k=((t*speed*b[3]+b[2])%h)/h;pos[i*3]=c[0]+b[0]*(1+k*1.5)+Math.sin(t+b[2])*0.3*k;pos[i*3+1]=c[1]+k*h;pos[i*3+2]=c[2]+b[1]*(1+k*1.5);}geo.attributes.position.needsUpdate=true;};}
function palmM(s=1){const g=new THREE.Group();const bark=MS(0x9b7a4a);for(let i=0;i<7;i++){const seg=new THREE.Mesh(new THREE.CylinderGeometry(0.2*s,0.26*s,0.9*s,7),bark);seg.position.set(i*i*0.03*s,0.45*s+i*0.85*s,0);seg.rotation.z=-0.06*i;g.add(seg);}
  const top=[0.36*s*1.0+0.9*s,6.2*s,0];const lf=MS(0x2f9a48,{roughness:0.8});
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const l=new THREE.Mesh(new THREE.BoxGeometry(0.5*s,0.06*s,3.4*s),lf);l.position.set(top[0]+Math.cos(a)*1.5*s,top[1]-0.5*s,Math.sin(a)*1.5*s);l.rotation.y=-a+Math.PI/2;l.rotation.x=0.45;g.add(l);}
  for(let i=0;i<3;i++)at(sph(0.2*s,MS(0x6a4a2a),6),top[0]+(R()-.5)*0.4*s,top[1]-0.3*s,(R()-.5)*0.4*s,g);shadowAll(g);return g;}
// ====== ノートPC（画面にSNSの管理画面） ======
function snsScreenTex(){const c=document.createElement('canvas');c.width=256;c.height=160;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,256,160);
  g.fillStyle='#ff4f7a';g.fillRect(0,0,256,22);g.fillStyle='#fff';g.font='bold 14px sans-serif';g.fillText('INSIGHTS',8,16);
  for(let i=0;i<9;i++){const h=18+i*i*1.3;g.fillStyle=i===8?'#ff4f7a':'#ffb3c5';g.fillRect(14+i*25,140-h,16,h);}
  g.fillStyle='#ff4f7a';g.font='bold 22px sans-serif';g.fillText('♥ 12.4K',150,48);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const SNST=snsScreenTex();
function laptop(){const g=new THREE.Group();const al=MS(0xc8ccd2,{metalness:0.7,roughness:0.3});at(box(0.36,0.02,0.25,al),0,0.01,0,g);
  const lid=new THREE.Group();lid.position.set(0,0.02,-0.12);lid.rotation.x=-0.25;at(box(0.36,0.24,0.012,al),0,0.12,0,lid);
  const sc=new THREE.Mesh(new THREE.PlaneGeometry(0.33,0.21),new THREE.MeshStandardMaterial({map:SNST,emissive:0xffffff,emissiveMap:SNST,emissiveIntensity:0.9}));sc.position.set(0,0.12,0.007);lid.add(sc);g.add(lid);shadowAll(g);return g;}
// 手元で打つ（キーボード）
function typeAnim(p,t,i=0){const u=p.userData;if(u.elbows){u.arms.forEach((m,j)=>{m.rotation.x=-0.45;m.rotation.z=(j?1:-1)*0.12;});u.elbows[0].rotation.x=-1.05+Math.sin(t*18+i)*0.1;u.elbows[1].rotation.x=-1.05+Math.cos(t*16+i)*0.1;return;}u.arms[0].rotation.x=-1.25+Math.sin(t*18+i)*0.08;u.arms[1].rotation.x=-1.25+Math.cos(t*16+i)*0.08;}
function sitPose(p,y=-0.42){p.userData.legs.forEach(l=>l.rotation.x=-1.5);if(p.userData.knees)p.userData.knees.forEach(k=>k.rotation.x=1.5);p.position.y+=y;}
function chair(col=0x2a2f3a){const g=new THREE.Group();const m=MS(col);at(box(0.5,0.08,0.5,m),0,0.48,0,g);at(box(0.5,0.6,0.08,m),0,0.8,-0.24,g);at(cyl(0.04,0.04,0.45,MS(0x777777),6),0,0.24,0,g);shadowAll(g);return g;}
function table(w=1,d=0.7,h=0.72,col=0xb08a5a){const g=new THREE.Group();const m=MS(col,{roughness:0.6});at(box(w,0.05,d,m),0,h,0,g);for(const [x,z] of[[-1,-1],[1,-1],[-1,1],[1,1]])at(box(0.05,h,0.05,m),x*(w/2-0.05),h/2,z*(d/2-0.05),g);shadowAll(g);return g;}
function cupSteam(s,x,y,z,soft){at(cyl(0.05,0.04,0.1,MS(0xffffff),10),x,y+0.05,z,s);return soft?rising(s,60,[x,y+0.1,z],0.02,0.35,0.035,0xffffff,0.22,0.25):rising(s,40,[x,y+0.1,z],0.03,0.5,0.08,0xffffff,0.5,0.3);} // soft=true：近くで撮るとき（水玉に見えない細かい湯気）

// ====== 満員電車の車内（crowd=人数）。窓の外の景色が流れる。update(t) ======
function trainInterior(s,o={}){const g=new THREE.Group();s.add(g);const L=20,Wd=2.9,Hh=2.4;
  const fl=at(box(Wd,0.05,L,MS(0x7a6a5a)),0,0,0,g);fl.receiveShadow=true;at(box(Wd,0.05,L,MS(0xf2f2f0)),0,Hh,0,g);
  for(const sx of[-1,1]){at(box(0.05,Hh,L,MS(0xe8e6e0)),sx*Wd/2,Hh/2,0,g);at(box(0.45,0.42,L,MS(0x3a5a9a)),sx*(Wd/2-0.25),0.21,0,g);at(box(0.12,0.5,L,MS(0x3a5a9a)),sx*(Wd/2-0.06),0.55,0,g);}
  const oc=document.createElement('canvas');oc.width=512;oc.height=128;const og=oc.getContext('2d');const grd=og.createLinearGradient(0,0,0,128);grd.addColorStop(0,o.night?'#0b1530':'#a8c8e8');grd.addColorStop(1,o.night?'#1a2440':'#dfe9f2');og.fillStyle=grd;og.fillRect(0,0,512,128);
  for(let i=0;i<40;i++){const w=8+R()*24,h=20+R()*80;og.fillStyle=o.night?'#1b2235':['#9aa6b4','#b8c0ca','#8592a2'][(R()*3)|0];og.fillRect(i*13,128-h,w,h);if(o.night)for(let k=0;k<6;k++){og.fillStyle='#ffd98a';og.fillRect(i*13+2+R()*w*0.7,128-h+R()*h,3,3);}}
  const otex=new THREE.CanvasTexture(oc);otex.wrapS=THREE.RepeatWrapping;otex.colorSpace=THREE.SRGBColorSpace;otex.repeat.set(3,1);
  for(const sx of[-1,1])for(let z=-L/2+2;z<L/2;z+=4){const w=new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.9),new THREE.MeshBasicMaterial({map:otex,toneMapped:false}));w.position.set(sx*(Wd/2-0.03),1.45,z);w.rotation.y=-sx*Math.PI/2;g.add(w);
    at(box(0.06,1.0,2.7,MS(0xb8bec6,{metalness:0.5})),sx*(Wd/2-0.02),1.45,z,g).scale.set(1,1,1);}
  const straps=[];for(const sx of[-1,1]){at(box(0.04,0.04,L,MS(0xc8ccd2,{metalness:0.8,roughness:0.3})),sx*0.75,2.15,0,g);for(let z=-L/2+0.5;z<L/2;z+=0.55){const p=new THREE.Group();p.position.set(sx*0.75,2.15,z);at(box(0.02,0.25,0.02,MS(0xeeeeee)),0,-0.125,0,p);const r=new THREE.Mesh(new THREE.TorusGeometry(0.07,0.015,6,12),MS(0xf2f2f2));r.position.y=-0.3;p.add(r);g.add(p);straps.push(p);}}
  for(let z=-L/2+2;z<L/2;z+=3)at(box(Wd-0.2,0.03,0.6,MS(0xfff8ec,{emissive:0xfffbf0,emissiveIntensity:1.4})),0,Hh-0.03,z,g);
  for(let z=-L/2+1;z<L/2;z+=5)at(box(0.6,0.12,0.02,MS(0x2a3a5a,{emissive:0x1a2a4a})),0,2.05,z,g);
  const crowd=[];const N=o.crowd||0;for(let i=0;i<N;i++){const p=human({coat:[0x1d2433,0x2a2f3a,0x3a3f4a,0x22283a,0x4a4f58][i%5],pants:0x1a1d26,hair:0x1a1410,suit:R()<0.7,tie:[0x7a1a1a,0x1a3a7a,0x3a3a3a][i%3]});
    p.position.set((R()-.5)*1.8,0,-L/2+1+R()*(L-2));p.rotation.y=R()*6.28;p.userData.arms[R()<.5?0:1].rotation.x=-2.6;g.add(p);crowd.push(p);}
  return {g,crowd,straps,update(t,sway=1){otex.offset.x=t*0.6;const a=Math.sin(t*1.7)*0.06*sway+Math.sin(t*4.3)*0.02*sway;straps.forEach((p,i)=>p.rotation.x=a+Math.sin(t*2+i)*0.03);crowd.forEach((p,i)=>{p.userData.hip.rotation.x=a*0.6;p.userData.hip.rotation.z=Math.sin(t*1.3+i)*0.02*sway;});}};}

// ====== オフィス（night=残業の夜）。workers が打鍵する ======
function officeFloor(s,o={}){const g=new THREE.Group();s.add(g);const tc=document.createElement('canvas');tc.width=tc.height=64;const tg=tc.getContext('2d');tg.fillStyle='#8a8f96';tg.fillRect(0,0,64,64);tg.fillStyle='#7f848c';tg.fillRect(0,0,32,32);tg.fillRect(32,32,32,32);
  const tx=new THREE.CanvasTexture(tc);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(20,16);const fl=new THREE.Mesh(new THREE.PlaneGeometry(40,32).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:tx,roughness:0.9}));fl.receiveShadow=true;g.add(fl);
  at(box(40,0.2,32,MS(0xf4f4f2)),0,3.2,0,g);
  const wc=document.createElement('canvas');wc.width=512;wc.height=128;const wg=wc.getContext('2d');wg.fillStyle=o.night?'#0a1228':'#cfe0f0';wg.fillRect(0,0,512,128);for(let i=0;i<30;i++){const w=10+R()*20,h=30+R()*90;wg.fillStyle=o.night?'#141c30':'#aab6c4';wg.fillRect(i*17,128-h,w,h);if(o.night)for(let k=0;k<5;k++){wg.fillStyle='#ffd98a';wg.fillRect(i*17+2+R()*w*0.7,128-h+R()*h,3,3);}}
  const wt=new THREE.CanvasTexture(wc);wt.colorSpace=THREE.SRGBColorSpace;const win=new THREE.Mesh(new THREE.PlaneGeometry(40,2.6),new THREE.MeshBasicMaterial({map:wt,toneMapped:false}));win.position.set(0,1.7,-15.9);g.add(win);
  for(let x=-19;x<=19;x+=2.5)at(box(0.15,3.2,0.2,MS(0xdedede)),x,1.6,-15.8,g);
  const lamps=[];for(let x=-12;x<=12;x+=4)for(let z=-12;z<=10;z+=4){const m=MS(0xffffff,{emissive:0xfffcf2,emissiveIntensity:o.night?(R()<0.3?1.6:0):1.6});at(box(0.3,0.06,2.2,m),x,3.08,z,g);lamps.push(m);}
  const workers=[];const scrM=MS(0xbfd8ff,{emissive:0x9fc4ff,emissiveIntensity:1.0});
  for(let r=0;r<4;r++)for(let c=0;c<6;c++){const x=-7.5+c*3,z=-10+r*3.4;const dk=table(1.4,0.7,0.72,0xe6e2da);dk.position.set(x,0,z);g.add(dk);
    at(box(0.6,0.38,0.04,MS(0x1a1a1a)),x,1.03,z-0.22,g);at(box(0.55,0.33,0.01,scrM),x,1.03,z-0.195,g);at(box(0.45,0.02,0.15,MS(0x333333)),x,0.76,z+0.05,g);
    for(let k=0;k<3;k++)at(box(0.22,0.03+R()*0.05,0.3,MS([0xf4f4f4,0xe8d8b0,0xd8e4f0][k])),x+0.45,0.76+k*0.04,z+(R()-.5)*0.1,g);
    const ch=chair();ch.position.set(x,0,z+0.65);ch.rotation.y=Math.PI;g.add(ch);
    if(!o.night||(r===2&&c===2)||(r===0&&c===4)){const p=human({coat:[0x1d2433,0x2a2f3a,0x3a3f4a][(r+c)%3],suit:true,tie:[0x7a1a1a,0x1a3a7a][(r+c)%2]});p.position.set(x,0,z+0.6);p.rotation.y=Math.PI;sitPose(p,-0.36);g.add(p);workers.push(p);}}
  return {g,workers,lamps};}

// ====== コンビニ（外観） ======
function conbini(){const g=new THREE.Group();at(box(12,4.2,8,MS(0xf6f6f2)),0,2.1,0,g);
  at(box(12.1,0.5,0.1,MS(0x23a35a,{emissive:0x0d5a2c,emissiveIntensity:0.5})),0,3.7,4.02,g);at(box(12.1,0.25,0.1,MS(0xff8a1d,{emissive:0x7a3a00,emissiveIntensity:0.5})),0,3.3,4.03,g);at(box(12.1,0.2,0.1,MS(0x2f6db0)),0,3.08,4.03,g);
  const gl=at(box(10,2.6,0.06,MS(0xeaf6ff,{emissive:0xcfe6ff,emissiveIntensity:0.6,roughness:0.1})),-0.5,1.4,4.03,g);
  for(let i=0;i<5;i++)for(let j=0;j<3;j++)at(box(1.4,0.25,0.3,MS([0xff6a4a,0xffd23d,0x6ac0ff,0x7ad06a,0xff9ad0][(i+j)%5])),-4.5+i*2,0.6+j*0.6,3.6,g);
  at(box(1.6,2.4,0.08,MS(0xbfd8ef,{roughness:0.1,metalness:0.4})),5,1.2,4.05,g);shadowAll(g);return g;}

// ====== 京都：町家・五重塔（八坂の塔）・野点傘と縁台 ======
function machiya(){const g=new THREE.Group();const w=6+R()*2;const wood=MS(0x5a3a22,{roughness:0.8});
  at(box(w,3.2,6,MS(0xe8dcc4)),0,1.6,0,g);const roof=hipRoof(w+1.2,7.2,1.0,0x3a3e44);roof.position.y=3.6;g.add(roof);at(box(w+0.6,0.15,0.9,MS(0x3a3e44)),0,2.35,3.3,g);
  for(let i=0;i<Math.floor(w/0.18);i++)at(box(0.06,1.8,0.06,wood),-w/2+0.2+i*0.18,1.1,3.02,g);
  at(box(1.4,1.1,0.03,MS([0x2a3a6a,0x6a2a2a,0x3a4a3a][(R()*3)|0])),w/2-1.2,1.75,3.06,g);
  const lan=at(cyl(0.22,0.22,0.5,MS(0xfff4e0,{emissive:0xffd890,emissiveIntensity:0.6}),10),-w/2+0.6,2.0,3.3,g);
  shadowAll(g);g.userData.w=w;return g;}
function pagoda5(){const g=new THREE.Group();const wood=MS(0x4a3424),wall=MS(0xe9e2cf),red=MS(0xb03a2a);
  at(box(8,1.2,8,MS(0x8a8a82)),0,0.6,0,g);
  for(let i=0;i<5;i++){const s=1-i*0.1;const y=1.2+i*4.6;at(box(5.4*s,3.6,5.4*s,i%2?wall:red),0,y+1.8,0,g);const r=hipRoof(9.5*s,9.5*s,1.0,0x2e2a28);r.position.y=y+3.9;g.add(r);}
  at(cyl(0.18,0.25,8,MS(0x8a7a40,{metalness:0.5,roughness:0.4}),8),0,26.5,0,g);for(let i=0;i<9;i++)at(cyl(0.55,0.55,0.12,MS(0x8a7a40,{metalness:0.5}),10),0,23.5+i*0.6,0,g);
  shadowAll(g);return g;}
function nodategasa(){const g=new THREE.Group();at(cyl(0.04,0.04,2.4,MS(0x5a3a22),6),0,1.2,0,g);const u=new THREE.Mesh(new THREE.ConeGeometry(1.4,0.5,16,1,true),MS(0xc8281e,{side:THREE.DoubleSide,roughness:0.7}));u.position.y=2.45;g.add(u);
  at(box(1.8,0.08,0.6,MS(0xc8281e)),0.9,0.45,0.3,g);at(box(1.8,0.4,0.05,MS(0x5a3a22)),0.9,0.22,0.3,g);shadowAll(g);return g;}

// ====== 温泉（露天風呂）。update(t) で湯気 ======
function onsenScene(o={}){const s=sky('#7fb8e8','#f4e4d0',40,260);lights(s,Object.assign({},WARM,{sz:30,sunI:1.6}));
  at(box(200,1,200,MS(0x6a7a4a)),0,-0.5,0,s).receiveShadow=true;
  const pool=at(new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.2,0.4,24),MS(0x7fc8d8,{roughness:0.05,metalness:0.2,emissive:0x1a4a58,emissiveIntensity:0.4})),0,0.25,0,s);
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2;const r=new THREE.Mesh(new THREE.DodecahedronGeometry(0.6+R()*0.4,0),MS([0x5a5a58,0x6a6660,0x4a4a48][i%3]));r.position.set(Math.cos(a)*4.6,0.4,Math.sin(a)*4.6);r.scale.y=0.7;r.castShadow=true;s.add(r);}
  for(let x=-8;x<=8;x+=0.25)at(box(0.12,2.4,0.12,MS(0x9a7a4a)),x,1.2,-7,s);
  [[-7,-9],[-3,-10],[3,-10],[7,-9],[10,-5],[-10,-4]].forEach(([x,z],i)=>{const t=tree(1.4+R()*0.4,[0xd8392a,0xe86a2a,0xc8281e,0xf0a030][i%4]);t.position.set(x,0,z);shadowAll(t);s.add(t);});
  const st=rising(s,150,[0,0.4,0],3.5,3.5,0.9,0xffffff,0.13,0.35);return {s,st};}

// ====== キャンプ：テント・焚き火（炎がゆらぐ） ======
function tent(col=0xe8862a){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.ConeGeometry(2.2,2.6,4,1),MS(col,{roughness:0.7}));t.rotation.y=Math.PI/4;t.position.y=1.3;t.scale.set(1,1,1.3);g.add(t);
  at(box(0.9,1.4,0.05,MS(0x3a2a1a)),0,0.7,1.32,g);shadowAll(g);return g;}
function campfire(s,x,z){const g=new THREE.Group();g.position.set(x,0,z);s.add(g);for(let i=0;i<5;i++){const l=box(0.12,0.12,1.0,MS(0x5a3a22));l.rotation.y=i/5*Math.PI;l.position.y=0.08;g.add(l);}
  const fl=[];for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.ConeGeometry(0.22-i*0.03,0.8-i*0.1,6),new THREE.MeshBasicMaterial({color:[0xff7a1a,0xffa02a,0xffd04a,0xff5a10][i],transparent:true,opacity:0.9}));f.position.set((R()-.5)*0.2,0.45,(R()-.5)*0.2);g.add(f);fl.push(f);}
  const light=new THREE.PointLight(0xff9a40,2.5,12);light.position.set(0,1,0);g.add(light);const sp=rising(s,40,[x,0.6,z],0.2,3,0.12,0xffb040,0.9,1.2);
  return t=>{fl.forEach((f,i)=>{f.scale.set(1,0.8+0.35*Math.sin(t*13+i*2),1);f.rotation.y=t*2+i;});light.intensity=2.2+Math.sin(t*17)*0.5;sp(t);};}

// ====== 駅のホーム ======
function platformJ(s,o={}){const g=new THREE.Group();s.add(g);at(box(10,1.1,160,MS(0xb8b4ac)),-6,0.55,0,g).receiveShadow=true;at(box(0.5,0.02,160,MS(0xf2c230)),-2.0,1.11,0,g);
  for(let z=-70;z<=70;z+=10){at(box(0.3,4.6,0.3,MS(0x8a8f96)),-7,3.3,z,g);}at(box(6,0.25,160,MS(0x6a6f78)),-6.5,5.6,0,g);
  for(let z=-60;z<=60;z+=30){const sg=signPlaneS(o.sign||'東京','#ffffff','#1a2a4a',2.4,0.7);sg.position.set(-6,4.4,z);sg.rotation.y=Math.PI/2;g.add(sg);}
  return g;}
function signPlaneS(text,bg,fg,w,h){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.fillStyle=fg;g.font='900 90px "Noto Sans CJK JP"';g.textAlign='center';g.textBaseline='middle';g.fillText(text,c.width/2,c.height/2+4);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:0.3,side:THREE.DoubleSide}));}

// ====== 沖縄の海辺（ビーチ）。sunset=夕焼け。完成シーン {s,water,update} ======
function sceneOkinawaBeach(o={}){const ss=o.sunset;const s=sky(ss?'#3a3a7a':'#2f9ae8',ss?'#ffa060':'#d8f4ff',80,520);
  lights(s,ss?{sky:0xffc8a0,ground:0x6a5060,hemi:0.8,sun:0xff9a50,sunI:2.0,dir:[-120,30,-160],sz:40}:Object.assign({},WARM,{sz:40,dir:[-60,120,60]}));
  const sand=at(box(400,1,60,MS(0xf2e4c4)),0,-0.45,20,s);sand.receiveShadow=true;
  const w=waterPlane(500,300,50,ss?0x2a5a8a:0x22b8c8);w.mesh.position.set(0,-0.1,-160);s.add(w.mesh);
  const lag=at(new THREE.Mesh(new THREE.PlaneGeometry(400,14).rotateX(-Math.PI/2),MS(ss?0x6a8ab0:0x7ae8e0,{roughness:0.1,transparent:true,opacity:0.85})),0,0.02,-3,s);
  [[-12,6],[-16,12],[9,8],[14,4],[18,14],[-22,3]].forEach(([x,z])=>{const p=palmM(1+R()*0.3);p.position.set(x,0,z);p.rotation.y=R()*6;s.add(p);});
  if(ss){const sun=new THREE.Mesh(new THREE.SphereGeometry(18,24,16),new THREE.MeshBasicMaterial({color:0xffd080,fog:false}));sun.position.set(-60,14,-420);s.add(sun);}
  return {s,water:w,update(t){w.update(t,0.45);lag.position.y=0.02+Math.sin(t*1.2)*0.03;}};}
// ================= models.js 追記分（v4：近くで映しても破綻しない高精細版・質感・空気感） =================
// v4 の関数は乱数に専用の LR（固定シード）を使い、共通の R を消費しない＝既存シーンの見た目を変えない
const LR=mulberry32(77);
// ====== 高精細の人物：human({hd:true,...}) で使う。顔・髪型・首・襟・手・靴つき。userData は human() と同じなので walkAnim / typeAnim / sitPose がそのまま使える ======
// o: {coat,pants,hair,skin,suit,tie,shirt,style:'short'|'side'|'long',glasses,beard}
function humanHD(o={}){const g=new THREE.Group();const k=o.kid?0.66:1;
  const suitC=o.suit&&!o.coat?0x56607a:(o.coat||0x3c6fb0);           // スーツは真っ黒にしない（チャコール）
  const coat=MS(suitC,{roughness:o.suit?0.6:0.85,flatShading:false}),pant=MS(o.pants||(o.suit?0x4a5368:0x2a2f3a),{roughness:0.8,flatShading:false});
  const skin=MS(o.skin||0xf0c9a4,{roughness:0.7,flatShading:false}),hairM=MS(o.hair||0x2b211b,{roughness:0.6,flatShading:false}),dark=MS(0x1c1a1a,{roughness:0.4}),white=MS(0xf7f7f5,{flatShading:false});
  const S=(r,m,ws=16,hs=12)=>new THREE.Mesh(new THREE.SphereGeometry(r,ws,hs),m);
  const C=(rt,rb,h,m,s=14)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s),m);
  const hip=new THREE.Group();hip.position.y=0.92*k;g.add(hip);
  // 胴：上が広い台形（肩幅）＋丸い肩
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(0.25*k,0.21*k,0.62*k,4,1),coat);torso.rotation.y=Math.PI/4;torso.scale.set(1.25,1,0.72);torso.position.y=0.36*k;hip.add(torso);
  for(const sx of[-1,1])at(S(0.07*k,coat,12,10),sx*0.27*k,0.6*k,0,hip).scale.set(1,0.85,1);
  at(C(0.17*k,0.17*k,0.16*k,pant,14),0,0.02*k,0,hip).scale.set(1.08,1,0.75);   // 腰
  if(o.suit){const sh=MS(o.shirt||0xf7f7f5,{flatShading:false});
    at(box(0.15*k,0.4*k,0.02,sh),0,0.46*k,0.135*k,hip);at(box(0.055*k,0.34*k,0.025,MS(o.tie||0x8a1e2a,{flatShading:false})),0,0.44*k,0.15*k,hip);
    for(const sx of[-1,1]){const lp=at(box(0.06*k,0.3*k,0.02,MS(0x4a5268,{flatShading:false})),sx*0.07*k,0.5*k,0.146*k,hip);lp.rotation.z=-sx*0.38;} // 襟（ラペル）
    at(box(0.4*k,0.012,0.012,MS(0x2a2e36)),0,0.12*k,0.14*k,hip);}
  else{for(const sx of[-1,1]){const cl=at(box(0.1*k,0.03*k,0.06*k,coat),sx*0.06*k,0.68*k,0.09*k,hip);cl.rotation.z=sx*-0.4;}  // Tシャツの襟
    at(box(0.42*k,0.04*k,0.27*k,MS(0x3a2a1e)),0,0.09*k,0,hip);}                                           // ベルト
  // 首と頭
  at(C(0.06*k,0.07*k,0.1*k,skin,10),0,0.72*k,0,hip);
  const head=new THREE.Group();head.position.y=0.85*k;hip.add(head);
  at(S(0.15*k,skin),0,0,0,head).scale.set(0.92,1.08,1);
  for(const sx of[-1,1]){at(S(0.026*k,white,10,8),sx*0.05*k,0.005*k,0.128*k,head).scale.set(1,0.7,0.5);at(S(0.016*k,dark,8,6),sx*0.05*k,0.005*k,0.138*k,head);                     // 目
    at(box(0.05*k,0.01*k,0.01*k,hairM),sx*0.05*k,0.045*k,0.136*k,head).rotation.z=sx*-0.12;           // 眉
    at(S(0.03*k,skin,8,6),sx*0.138*k,0,0,head).scale.set(0.5,1,0.8);}                                   // 耳
  at(box(0.024*k,0.045*k,0.03*k,skin),0,-0.02*k,0.145*k,head);                                          // 鼻
  at(box(0.05*k,0.008*k,0.01*k,MS(0xb8706a)),0,-0.07*k,0.135*k,head);                                   // 口
  const cap=at(new THREE.Mesh(new THREE.SphereGeometry(0.16*k,16,12,0,Math.PI*2,0,Math.PI*0.47),hairM),0,0.03*k,-0.012*k,head);cap.scale.set(0.98,1.12,1.04);
  at(S(0.15*k,hairM),0,0.0,-0.035*k,head).scale.set(0.95,1.0,0.9);                                       // 後頭部
  const st=o.style||'short';
  if(st==='side'){const f=at(S(0.11*k,hairM,14,10),0.03*k,0.1*k,0.075*k,head);f.scale.set(1.25,0.42,0.62);f.rotation.z=-0.3;}
  else if(st==='long'){at(box(0.28*k,0.26*k,0.08*k,hairM),0,-0.05*k,-0.12*k,head);for(const sx of[-1,1])at(box(0.05*k,0.22*k,0.12*k,hairM),sx*0.14*k,-0.04*k,0,head);}
  else at(S(0.11*k,hairM,14,10),0,0.085*k,0.08*k,head).scale.set(1.2,0.4,0.6);                                          // 前髪
  if(o.glasses){for(const sx of[-1,1])at(new THREE.Mesh(new THREE.TorusGeometry(0.03*k,0.006*k,6,14),dark),sx*0.052*k,0.015*k,0.15*k,head);at(box(0.03*k,0.006*k,0.006*k,dark),0,0.02*k,0.152*k,head);}
  if(o.beard)at(S(0.1*k,hairM,12,8),0,-0.08*k,0.07*k,head).scale.set(1,0.5,0.6);
  // 腕（肩で回る。袖口・手）と脚（靴）
  const legs=[],arms=[],knees=[],elbows=[];
  for(const sx of[-1,1]){
    const lg=new THREE.Group();lg.position.set(sx*0.11*k,0,0);
    at(C(0.085*k,0.078*k,0.44*k,pant,10),0,-0.22*k,0,lg);                                               // 太もも
    const kn=new THREE.Group();kn.position.y=-0.43*k;lg.add(kn);
    at(C(0.077*k,0.068*k,0.42*k,pant,10),0,-0.21*k,0,kn);                                               // すね（膝で曲がる）
    const shoe=at(box(0.14*k,0.08*k,0.24*k,MS(o.suit?0x1a1412:(o.shoes||0xf0f0ee),{roughness:o.suit?0.3:0.8})),0,-0.44*k,0.04*k,kn);
    at(S(0.07*k,shoe.material,10,8),0,-0.44*k,0.15*k,kn).scale.set(1,0.55,0.8);hip.add(lg);legs.push(lg);knees.push(kn);
    const am=new THREE.Group();am.position.set(sx*0.29*k,0.6*k,0);
    at(C(0.06*k,0.056*k,0.3*k,coat,10),0,-0.15*k,0,am);                                                 // 上腕
    const el=new THREE.Group();el.position.y=-0.29*k;am.add(el);
    at(C(0.056*k,0.05*k,0.27*k,coat,10),0,-0.135*k,0,el);                                               // 前腕（ひじで曲がる）
    at(C(0.05*k,0.05*k,0.04*k,o.suit?white:skin,10),0,-0.28*k,0,el);                                    // 袖口
    at(box(0.07*k,0.1*k,0.05*k,skin),0,-0.35*k,0.01*k,el);hip.add(am);arms.push(am);elbows.push(el);}
  shadowAll(g);g.userData={hip,legs,arms,knees,elbows,head,h0:0.92*k,hd:true};return g;}

// ====== 地面の質感（模様のない一色の板にしない） ======
// kind: 'sand' | 'grass' | 'asphalt' | 'tile' | 'wood' | 'concrete'。repeat＝繰り返し数（大きい地面ほど大きく）
function groundTex(kind,repeat=20){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const P={sand:['#efe0bf',['#e2cfa6','#f8ecd2','#d8c194'],0.5],grass:['#7aa65a',['#6a9a4c','#8bb866','#5e8a44'],0.6],asphalt:['#5a5d62',['#4e5156','#686b70','#45484c'],0.5],
    tile:['#d8d6d0',['#cfcdc6','#e2e0da'],0.2],wood:['#a87a4e',['#9a6d42','#b8885a','#8a5e36'],0.4],concrete:['#b9b6ae',['#aeaba3','#c6c3bb','#a29f97'],0.45]}[kind];
  g.fillStyle=P[0];g.fillRect(0,0,256,256);
  if(kind==='tile'){g.strokeStyle='#bdbab3';g.lineWidth=3;for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke();}}
  if(kind==='wood'){for(let y=0;y<256;y+=32){g.fillStyle=P[1][(y/32)%3];g.fillRect(0,y,256,30);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,y+30,256,2);}}
  for(let i=0;i<2600;i++){g.globalAlpha=P[2]*LR();g.fillStyle=P[1][(LR()*P[1].length)|0];const s=kind==='grass'?1+LR()*3:1+LR()*2;g.fillRect(LR()*256,LR()*256,s,kind==='grass'?s*2.5:s);}
  g.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
// 質感付きの地面を置く（w×d、中心 x,z）
function groundPlane(s,kind,w,d,x=0,z=0,y=0,repeat){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:groundTex(kind,repeat||Math.max(4,w/6)),roughness:kind==='tile'?0.35:0.95}));
  m.position.set(x,y,z);m.receiveShadow=true;s.add(m);return m;}

// ====== 空気感：遠景のシルエット・漂う粒 ======
// 遠くの街並みのシルエット（地平線が空っぽにならないように）。kind:'city'|'hills'|'forest'。dist＝距離
function skyline(s,kind='city',dist=260,color=0x9aa8b8,n=60,arc=[0,Math.PI*2]){const g=new THREE.Group();const m=new THREE.MeshBasicMaterial({color});
  for(let i=0;i<n;i++){const a=lerp(arc[0],arc[1],LR()),r=dist*(0.9+LR()*0.25);let o;
    if(kind==='city'){const h=10+LR()*LR()*60;o=new THREE.Mesh(new THREE.BoxGeometry(8+LR()*14,h,8+LR()*10),m);o.position.y=h/2;}
    else if(kind==='hills'){const h=20+LR()*40;o=new THREE.Mesh(new THREE.ConeGeometry(40+LR()*50,h,7),m);o.position.y=h/2-4;}
    else{const h=8+LR()*8;o=new THREE.Mesh(new THREE.ConeGeometry(3+LR()*2,h,6),m);o.position.y=h/2;}
    o.position.x=Math.cos(a)*r;o.position.z=Math.sin(a)*r;g.add(o);}
  s.add(g);return g;}
// 漂う粒（光のほこり・波しぶき・花粉）。小さく・薄く・ゆっくり。update(t)
function floaters(s,n,c,spread,hgt,color=0xffffff,size=0.06,opacity=0.55){const pos=new Float32Array(n*3);const base=[];for(let i=0;i<n;i++)base.push([c[0]+(LR()-.5)*spread,c[1]+LR()*hgt,c[2]+(LR()-.5)*spread,LR()*10]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  s.add(new THREE.Points(geo,new THREE.PointsMaterial({color,size,map:DOT,transparent:true,opacity,depthWrite:false})));
  return t=>{for(let i=0;i<n;i++){const b=base[i];pos[i*3]=b[0]+Math.sin(t*0.4+b[3])*0.6;pos[i*3+1]=b[1]+Math.sin(t*0.3+b[3]*2)*0.4;pos[i*3+2]=b[2]+Math.cos(t*0.35+b[3])*0.6;}geo.attributes.position.needsUpdate=true;};}
// 逆光の縁取り（人物・小物の輪郭を背景から浮かせる）。カメラの反対側から当てる
function rimLight(s,color=0xfff0dd,i=0.8,pos=[0,6,-10]){const d=new THREE.DirectionalLight(color,i);d.position.set(...pos);s.add(d);return d;}
// ================= models.js 追記分（v5：老人・経済テーマ） =================
// 上下分割で同じ配置を2回作れるよう、配置の乱数は seed 付きのローカル乱数（mulberry32(seed)）を使う
// ====== 小物：杖・帽子・買い物袋 ======
function cane(col=0x5a3a22){const g=new THREE.Group();const m=MS(col,{roughness:0.5,flatShading:false});
  at(new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.016,0.86,8),m),0,-0.43,0,g);
  const h=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.014,6,12,Math.PI),m);h.position.set(0.05,0,0);g.add(h);
  at(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.03,8),MS(0x111111)),0,-0.86,0,g);shadowAll(g);return g;}
function hatM(col=0x8a7a5a){const g=new THREE.Group();const m=MS(col,{roughness:0.9,flatShading:false});
  at(new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.012,20),m),0,0.006,0,g);at(new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,0.11,16),m),0,0.06,0,g);
  at(new THREE.Mesh(new THREE.CylinderGeometry(0.121,0.121,0.025,16),MS(0x3a2a1a)),0,0.03,0,g);shadowAll(g);return g;}
function shopBag(col=0xf2f2f2){const g=new THREE.Group();at(box(0.3,0.32,0.14,MS(col,{roughness:0.8})),0,0.16,0,g);
  at(new THREE.Mesh(new THREE.TorusGeometry(0.07,0.008,6,12,Math.PI),MS(col)),0,0.32,0,g);shadowAll(g);return g;}
// ====== 高齢者（HD人物＋白髪・少し前かがみ・杖） ======
function elder(o={}){const p=humanHD(Object.assign({hair:[0xd8d8d4,0xbcbcb8,0x9a9894][o.v||0],skin:0xe8c09c,style:o.style||'short',coat:o.coat||0x8a7a62,pants:o.pants||0x5a5a62,shoes:0x4a3a2a},o));
  p.userData.hip.rotation.x=0.12;p.userData.head.rotation.x=-0.1;
  if(o.cane){const c=cane();c.position.set(0,-0.36,0.03);p.userData.elbows[1].add(c);p.userData.elbows[1].rotation.x=-0.25;p.userData.cane=c;}
  return p;}
function elderWalk(p,t,i=0){walkAnim(p,t,3.4,0.22);p.userData.hip.rotation.x=0.12;if(p.userData.cane){p.userData.arms[1].rotation.x=-0.25+Math.sin(t*3.4+i)*0.12;p.userData.elbows[1].rotation.x=-0.25;}}

// ====== 銀行（年金支給日のATM）。+Zが道路側。歩道は z=2〜6 ======
function bankFront(s,o={}){const g=new THREE.Group();s.add(g);
  groundPlane(g,'asphalt',200,40,0,24,0,30);groundPlane(g,'tile',200,8,0,4,0.02,40);
  const b=building(26,22,16,0xd9d6ce,false);b.position.set(0,0,-8);g.add(b);
  at(box(26.2,4.2,0.3,MS(0x2a3a4a,{roughness:0.2,metalness:0.4})),0,2.1,0.05,g);                                   // 1階のガラス
  for(let x=-12;x<=12;x+=4)at(box(0.25,4.2,0.4,MS(0xc8c4bc)),x,2.1,0.1,g);
  const sg=signPlaneS('みらい銀行','#1f7a4a','#ffffff',9,1.4);sg.position.set(-5,5.2,0.35);g.add(sg);
  const at2=signPlaneS('ATM','#f2c230','#1a1a1a',2.4,0.9);at2.position.set(7,5.0,0.35);g.add(at2);
  for(let i=0;i<3;i++){const m=new THREE.Group();at(box(0.9,1.5,0.7,MS(0xe8eaec)),0,0.75,0,m);at(box(0.6,0.4,0.05,MS(0x7ad0ff,{emissive:0x4aa0d8,emissiveIntensity:0.9})),0,1.25,0.36,m);
    at(box(0.7,0.05,0.3,MS(0x333333)),0,0.95,0.45,m);m.position.set(5+i*1.6,0,0.9);shadowAll(m);g.add(m);}                    // 外向きのATM
  for(const x of[-30,30]){const bb=building(24,14+(x>0?10:0),14,x>0?0xbfc7cf:0xe6e2da,false);bb.position.set(x,0,-7);g.add(bb);}
  for(let x=-40;x<=40;x+=14){const p=utilityPole(9);p.position.set(x,0,7.2);g.add(p);}
  const tr=tree(1.0,0x4f8a43);tr.position.set(-14,0,6.5);shadowAll(tr);g.add(tr);
  return g;}

// ====== 病院の待合室（+Zがカメラ側）。seats=座席の位置 ======
function hospitalLobby(s,o={}){const g=new THREE.Group();s.add(g);
  groundPlane(g,'tile',22,18,0,0,0,10);
  at(box(22,0.2,18,MS(0xf6f6f4)),0,3.6,0,g);at(box(22,3.6,0.2,MS(0xe8eef0)),0,1.8,-9,g);for(const sx of[-1,1])at(box(0.2,3.6,18,MS(0xeef0ee)),sx*11,1.8,0,g);
  at(box(22,0.9,0.05,MS(0x8ac0b0)),0,0.45,-8.88,g);
  for(let x=-8;x<=8;x+=4)for(let z=-6;z<=6;z+=4)at(box(0.4,0.05,2.4,MS(0xffffff,{emissive:0xfffcf4,emissiveIntensity:1.5})),x,3.48,z,g);
  const desk=new THREE.Group();at(box(7,1.1,1.2,MS(0xf2efe8)),0,0.55,0,desk);at(box(7.2,0.08,1.4,MS(0xb89a6a)),0,1.14,0,desk);desk.position.set(-3,0,-6.8);shadowAll(desk);g.add(desk);
  const uk=signPlaneS('受付','#2a7a9a','#ffffff',2.4,0.8);uk.position.set(-3,2.6,-8.85);g.add(uk);
  const call=screenSign(g,o.num||'128',4.5,2.5,-8.8,0,3.2,1.6,'#ff9a3a');
  const seats=[];const bench=(x,z)=>{const b=new THREE.Group();const v=MS(0x3a7ab8,{roughness:0.5,flatShading:false});at(box(4.2,0.12,0.55,v),0,0.46,0,b);at(box(4.2,0.5,0.1,v),0,0.78,-0.27,b);
    for(const lx of[-1.9,1.9])at(box(0.06,0.45,0.5,MS(0x9a9ea4,{metalness:0.6})),lx,0.22,0,b);b.position.set(x,0,z);shadowAll(b);g.add(b);for(let k=0;k<5;k++)seats.push([x-1.68+k*0.84,z]);};
  for(const x of[-5.5,0,5.5])for(const z of[-3.5,-1,1.5,4])bench(x,z);
  const pl=new THREE.Group();at(cyl(0.3,0.25,0.5,MS(0xf4f4f4),12),0,0.25,0,pl);at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6,1),MS(0x3f8a43)),0,1.0,0,pl);pl.position.set(9.5,0,-7.5);shadowAll(pl);g.add(pl);
  return {g,seats,call};}

// ====== 山あいの集落（棚田・家・電柱・山）。seed が同じなら同じ配置。lit=窓の明かり、smoke=煙 ======
function mountainVillage(s,o={}){const rnd=mulberry32(o.seed||11);const g=new THREE.Group();s.add(g);
  groundPlane(g,'grass',600,600,0,0,0,80);
  const hill=(x,z,r,h,c)=>{const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,9),MS(c,{roughness:0.95}));m.position.set(x,h/2-2,z);m.receiveShadow=true;g.add(m);
    for(let i=0;i<22;i++){const a=rnd()*6.28,rr=r*(0.25+rnd()*0.6),y=h*(1-rr/r)-2;const t=new THREE.Mesh(new THREE.ConeGeometry(2.2+rnd()*1.5,6+rnd()*4,6),MS([0x2f5a2e,0x3f6a34,0xb85a2a,0xc8862a][(rnd()*4)|0]));t.position.set(x+Math.cos(a)*rr,y+3,z+Math.sin(a)*rr);g.add(t);}};
  hill(-70,-110,90,70,0x3a5a34);hill(70,-120,100,85,0x34522f);hill(0,-200,150,130,0x2e4a2c);hill(120,-30,60,40,0x3f6236);hill(-120,-20,60,40,0x3a5a34);
  for(let i=0;i<6;i++){const w=46-i*3;at(box(w,0.3,6,MS(o.harvest?0xd0a83a:0x6a9a3a,{roughness:0.9})),-6,0.15+i*0.3,28-i*6,g).receiveShadow=true;}                      // 棚田
  at(box(4,0.08,200,MS(0x6a6a66)),26,0.05,-20,g);                                                                                     // 道
  const houses=[];
  for(let i=0;i<18;i++){const x=(rnd()<0.5?-1:1)*(8+rnd()*40),z=-4-rnd()*50;if(Math.abs(x-26)<6)continue;const h=new THREE.Group();const w=6+rnd()*2,d=6+rnd()*2;
    at(box(w,3.4,d,MS([0xe8dcc4,0xd8ccb0,0xcfc4a8][(rnd()*3)|0])),0,1.7,0,h);const r=hipRoof(w+1.4,d+1.4,1.6,[0x3a3e44,0x5a3a2a,0x2f3a4a][(rnd()*3)|0]);r.position.y=4.2;h.add(r);
    const lit=o.lit&&rnd()<0.9;const win=MS(lit?0xffcf7a:0x1a1d22,{emissive:lit?0xffa040:0,emissiveIntensity:lit?1.4:0});
    for(const wx of[-w/4,w/4])at(box(1.3,1.0,0.06,win),wx,1.8,d/2+0.03,h);
    h.position.set(x,0,z);h.rotation.y=(rnd()-.5)*0.6;shadowAll(h);g.add(h);houses.push(h);}
  for(let z=60;z>-100;z-=16){const p=utilityPole(9);p.position.set(29.5,0,z);g.add(p);}
  const smk=[];if(o.smoke)houses.slice(0,6).forEach(h=>smk.push(rising(s,30,[h.position.x,4.5,h.position.z],0.3,9,1.6,0xd8d8d8,0.25,0.8)));
  return {g,houses,update(t){smk.forEach(f=>f(t));}};}

// ====== 商店街（アーケード）。shutter=シャッター街。z方向に伸びる。seed で同じ並び ======
const SHOPS=['やおや','パン','くすり','とうふ','お茶','本','花','時計','呉服','喫茶','魚','和菓子'];
function shutterTex(){const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');x.fillStyle='#a8acb0';x.fillRect(0,0,64,128);
  for(let y=0;y<128;y+=6){x.fillStyle='#8e9296';x.fillRect(0,y,64,2);}x.fillStyle='#7a7e82';x.fillRect(0,120,64,8);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const SHT=shutterTex();
function shoppingArcade(s,o={}){const rnd=mulberry32(o.seed||21);const g=new THREE.Group();s.add(g);
  groundPlane(g,'tile',10,140,0,-50,0.01,12);groundPlane(g,'concrete',200,200,0,-50,0,30);
  const lanterns=[];
  for(const sx of[-1,1])for(let i=0;i<14;i++){const z=10-i*5.2;const sh=new THREE.Group();sh.position.set(sx*6.5,0,z);sh.rotation.y=-sx*Math.PI/2;g.add(sh);
    const h=6+rnd()*2.5;at(box(5,h,4,MS([0xe8e0d0,0xd8d0c0,0xcfc8bc,0xe4d8c4][(rnd()*4)|0])),0,h/2,-2,sh);
    const shut=o.shutter&&rnd()<0.82;
    if(shut){at(new THREE.Mesh(new THREE.PlaneGeometry(4.6,3.0),new THREE.MeshStandardMaterial({map:SHT,roughness:0.6,metalness:0.3})),0,1.5,0.02,sh);}
    else{at(box(4.6,3.0,0.05,MS(0x2a2420)),0,1.5,0.0,sh);const lt=MS(0xfff2d8,{emissive:0xffe0a8,emissiveIntensity:0.9});at(box(4.4,0.08,1.2,lt),0,2.9,-0.6,sh);
      for(let k=0;k<6;k++)at(box(0.6,0.35,0.5,MS([0xe85a3a,0xf2c230,0x3aa85a,0xf28a2a,0xffffff,0x8a5a3a][(rnd()*6)|0])),-1.8+k*0.72,0.9+((k%2)*0.4),0.4,sh);
      at(box(4.6,0.8,0.7,MS(0xb89a6a)),0,0.4,0.4,sh);}
    const aw=at(box(5,0.12,1.4,MS([0xc8282a,0x2a6ab0,0x2a8a5a,0xe8862a][(rnd()*4)|0])),0,3.3,0.6,sh);aw.rotation.x=0.25;
    const sg=signPlaneS(SHOPS[(rnd()*SHOPS.length)|0],shut?'#6a6e72':'#fff6e0',shut?'#3a3e42':'#3a2a1a',3.4,0.9);sg.position.set(0,4.0,0.08);sh.add(sg);
    shadowAll(sh);}
  for(let z=10;z>-66;z-=4){const a=new THREE.Mesh(new THREE.TorusGeometry(6.8,0.12,6,16,Math.PI),MS(0x9aa0a6,{metalness:0.5}));a.position.set(0,7.5,z);g.add(a);}
  const roof=new THREE.Mesh(new THREE.CylinderGeometry(6.8,6.8,80,16,1,true,-Math.PI/2,Math.PI),MS(0xe8f0f4,{transparent:true,opacity:0.35,side:THREE.DoubleSide,roughness:0.2}));roof.rotation.x=Math.PI/2;roof.position.set(0,7.5,-28);g.add(roof);
  for(let z=8;z>-64;z-=8){const l=at(cyl(0.3,0.3,0.6,MS(0xd8282a,{emissive:o.shutter?0x000000:0x801010,emissiveIntensity:0.6}),10),0,7.2,z,g);lanterns.push(l);}
  return {g};}

// ====== 国会議事堂（中央塔＋左右の翼。幅約200・中央塔の高さ約65） ======
function dietBuilding(){const g=new THREE.Group();const st=MS(0xddd6c6,{roughness:0.8}),dk=MS(0x8a8478),win=MS(0x3a4250,{roughness:0.3,metalness:0.3});
  at(box(206,2,40,MS(0xcfc8b8)),0,1,0,g);
  for(const sx of[-1,1]){at(box(80,20,34,st),sx*58,12,0,g);at(box(82,1.2,36,dk),sx*58,22.6,0,g);
    for(let i=0;i<14;i++)for(let j=0;j<2;j++)at(box(2.4,4.2,0.2,win),sx*(22+i*5.6),7+j*8,17.1,g);
    at(box(16,26,36,st),sx*96,14,0,g);at(box(17,1.2,37,dk),sx*96,27.6,0,g);}
  at(box(34,28,38,st),0,15,0,g);for(let i=0;i<8;i++)at(box(1.6,18,1.6,MS(0xe8e2d4)),-12+i*3.4,13,19.5,g);at(box(32,2,4,st),0,23,19.5,g);
  at(box(22,18,22,st),0,38,0,g);for(let i=0;i<4;i++)for(const sx of[-1,1])at(box(2.2,10,0.2,win),sx*(3+i*2.4)-sx*3,38,11.1,g);
  for(let i=0;i<6;i++){const s=1-i*0.15;at(box(20*s,2.2,20*s,MS(0xc8c0b0)),0,48+i*2.2,0,g);}
  at(cyl(0.3,0.5,4,dk,8),0,63,0,g);
  shadowAll(g);return g;}
