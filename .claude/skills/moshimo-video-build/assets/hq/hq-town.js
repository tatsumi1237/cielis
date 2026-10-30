// ================= hq-town.js（海沿いの町：家・津波避難ビル・海と津波・電柱・炎と煙・がれき） =================
// 使い方：TOD=TODP.day; SC.town=buildTown(); 毎フレーム SC.town.update(T,{zf,lv,sweep}) （zf＝津波の先端z、lv＝水位m、sweep＝家が流される度合い0〜1）
// 座標：海は -z（海岸線 z=-60）、町は z=-45〜130、大通りは x=0 を z方向に、山は z>140
function sidingTex(col,seed){return cv(256,256,(g,w,h)=>{g.fillStyle=col;g.fillRect(0,0,w,h);const r=mulberry32(seed);for(let y=0;y<h;y+=12){g.fillStyle='rgba(0,0,0,.07)';g.fillRect(0,y,w,2);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(0,y+2,w,1);}
  const id=g.getImageData(0,0,w,h),d=id.data;for(let i=0;i<d.length;i+=4){const n=(r()-.5)*8;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}g.putImageData(id,0,0);});}
function roofTex(col,seed){return cv(256,256,(g,w,h)=>{g.fillStyle=col;g.fillRect(0,0,w,h);const r=mulberry32(seed);for(let y=0;y<h;y+=16){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(0,y,w,3);for(let x=(y/16%2)*14;x<w;x+=28){g.fillStyle=`rgba(255,255,255,${0.03+r()*0.06})`;g.fillRect(x,y+3,26,12);}}});}
const WALLC=['#f4ecdc','#e8f1f6','#dfeee6','#f6e4dc','#ffffff','#f2e6c8','#e6e2f0'];const ROOFC=['#2f5b9a','#c4482e','#3c7a52','#3a3e48','#9a5a2a','#d0702a','#7a2a3a'];
function house2(o={}){const g=new THREE.Group();const w=o.w||8,d=o.d||7,h=o.h||5.8;const sd=o.seed||1;const r=mulberry32(sd);
  const wt=sidingTex(WALLC[sd%WALLC.length],sd);wt.wrapS=wt.wrapT=THREE.RepeatWrapping;wt.repeat.set(w/4,h/4);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),SM(0xffffff,{map:wt,roughness:0.85}));wall.position.y=h/2;g.add(wall);
  const base=new THREE.Mesh(new THREE.BoxGeometry(w+0.1,0.45,d+0.1),SM(0x9a948a,{roughness:0.95}));base.position.y=0.22;g.add(base);
  const rh=2.2+r()*0.8;const sh=new THREE.Shape();sh.moveTo(-w/2-0.6,0);sh.lineTo(w/2+0.6,0);sh.lineTo(0,rh);sh.closePath();
  const rt=roofTex(ROOFC[(sd*3)%ROOFC.length],sd);rt.wrapS=rt.wrapT=THREE.RepeatWrapping;rt.repeat.set(1.5,1.5);
  const rg=new THREE.ExtrudeGeometry(sh,{depth:d+1.2,bevelEnabled:false});rg.translate(0,0,-(d+1.2)/2);const roof=new THREE.Mesh(rg,SM(0xffffff,{map:rt,roughness:0.6,metalness:0.1}));roof.position.y=h;g.add(roof);
  const gable=new THREE.Mesh(new THREE.ShapeGeometry((()=>{const s2=new THREE.Shape();s2.moveTo(-w/2,0);s2.lineTo(w/2,0);s2.lineTo(0,rh*0.92);s2.closePath();return s2;})()),SM(0xffffff,{map:wt,roughness:0.85}));
  for(const sz of[1,-1]){const gb=gable.clone();gb.position.set(0,h,sz*(d/2+0.01));if(sz<0)gb.rotation.y=Math.PI;g.add(gb);}
  const fr=SM(0xffffff,{roughness:0.5}),gl=SM(0x6a90b8,{roughness:0.05,metalness:0.6,envMapIntensity:1.6});
  for(let f=0;f<2;f++)for(let i=0;i<2;i++){const x=(i?1:-1)*w*0.24,y=1.6+f*2.6;for(const sz of[1,-1]){const fm=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.2,0.12),fr);fm.position.set(x,y,sz*(d/2+0.03));g.add(fm);const gm=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.0,0.13),gl);gm.position.set(x,y,sz*(d/2+0.04));g.add(gm);}}
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.0,2.1,0.12),SM(0x6a4a32,{roughness:0.6}));door.position.set(0,1.3,d/2+0.04);g.add(door);
  const bal=new THREE.Mesh(new THREE.BoxGeometry(w*0.5,0.9,1.0),SM(0xf4f4f2,{roughness:0.6}));bal.position.set(w*0.18,3.5,d/2+0.5);if(r()<0.6)g.add(bal);
  if(r()<0.7){const ac=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.6,0.3),SM(0xe8e8e4));ac.position.set(-w/2-0.2,1.0,0);ac.rotation.y=Math.PI/2;g.add(ac);}
  g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});return g;}
function evacBuilding(){const g=new THREE.Group();const W2=16,D2=12,F=5,FH=3.4;
  const ct=cv(256,512,(gg,w,h)=>{gg.fillStyle='#e6e4de';gg.fillRect(0,0,w,h);for(let f=0;f<F;f++){const y=h-(f+1)*h/F;gg.fillStyle='rgba(0,0,0,.08)';gg.fillRect(0,y,w,3);for(let x=14;x<w-30;x+=58){gg.fillStyle='#3a5a7a';gg.fillRect(x,y+22,44,46);gg.fillStyle='rgba(255,255,255,.35)';gg.fillRect(x,y+22,44,10);gg.strokeStyle='#ffffff';gg.lineWidth=3;gg.strokeRect(x,y+22,44,46);}}});
  const b=new THREE.Mesh(new THREE.BoxGeometry(W2,F*FH,D2),[SM(0xffffff,{map:ct,roughness:0.8}),SM(0xffffff,{map:ct,roughness:0.8}),SM(0xd8d6d0),SM(0x888888),SM(0xffffff,{map:ct,roughness:0.8}),SM(0xffffff,{map:ct,roughness:0.8})]);b.position.y=F*FH/2;g.add(b);
  const par=new THREE.Mesh(new THREE.BoxGeometry(W2+0.2,1.1,D2+0.2),SM(0xd0cec8));par.position.y=F*FH+0.5;g.add(par);const roofIn=new THREE.Mesh(new THREE.BoxGeometry(W2-0.4,1.2,D2-0.4),SM(0x9a9ca2));roofIn.position.y=F*FH+0.55;g.add(roofIn);
  // 外階段（-x側＝大通り側）
  const st=new THREE.Group();const sm=SM(0xc8c6c0,{roughness:0.8}),rail=SM(0x2e7d5a,{metalness:0.4,roughness:0.4});
  for(let f=0;f<F;f++){const dir=f%2?1:-1;const run=new THREE.Group();for(let i=0;i<12;i++){const s2=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.2,0.5),sm);s2.position.set(0,i*FH/12,dir*(-3+i*0.5));run.add(s2);}
    const lnd=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.25,1.6),sm);lnd.position.set(0,FH,dir*3.6);run.add(lnd);for(let i=0;i<12;i+=2){run.add(pos(new THREE.Mesh(new THREE.BoxGeometry(0.05,1.0,0.05),rail),-0.82,i*FH/12+0.6,dir*(-3+i*0.5)));}run.add(pos(new THREE.Mesh(new THREE.BoxGeometry(0.06,1.0,0.06),rail),-0.82,FH+0.6,dir*3.6));
    run.position.set(-W2/2-1.0,f*FH,0);st.add(run);}g.add(st);
  // 看板「津波避難ビル」
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(4.6,6.4),new THREE.MeshStandardMaterial({map:cv(320,448,(gg,w,h)=>{gg.fillStyle='#1d8a4e';gg.fillRect(0,0,w,h);gg.strokeStyle='#fff';gg.lineWidth=10;gg.strokeRect(12,12,w-24,h-24);
    gg.fillStyle='#fff';gg.beginPath();gg.moveTo(60,230);gg.quadraticCurveTo(110,150,170,200);gg.quadraticCurveTo(210,235,260,190);gg.lineTo(260,240);gg.lineTo(60,240);gg.fill();gg.fillRect(150,70,110,100);gg.fillStyle='#1d8a4e';gg.fillRect(170,90,24,20);gg.fillRect(214,90,24,20);gg.fillRect(170,125,24,20);gg.fillRect(214,125,24,20);
    gg.fillStyle='#fff';gg.font='900 64px "Zen Kaku Gothic New"';gg.textAlign='center';gg.fillText('津波',w/2,320);gg.fillText('避難ビル',w/2,395);}),emissive:0xffffff,emissiveIntensity:0.25,roughness:0.5}));
  sg.material.emissiveMap=sg.material.map;sg.position.set(-W2/2-0.02,F*FH-4.2,-3.2);sg.rotation.y=-Math.PI/2;g.add(sg);
  g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});g.userData={top:F*FH+1.1,stairX:-W2/2-1.0,FH,F};return g;}
// 炎（加算スプライト）と煙（ソフトな粒）
const FLT=cv(128,256,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h*0.72,4,w/2,h*0.6,w*0.62);gr.addColorStop(0,'rgba(255,250,220,1)');gr.addColorStop(0.25,'rgba(255,200,80,.95)');gr.addColorStop(0.55,'rgba(255,100,20,.6)');gr.addColorStop(1,'rgba(200,30,0,0)');g.fillStyle=gr;g.beginPath();g.moveTo(w/2,0);g.quadraticCurveTo(w,h*0.6,w/2,h);g.quadraticCurveTo(0,h*0.6,w/2,0);g.fill();});
const SMT=cv(128,128,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(0.5,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
function fire2(s,x,y,z,sc=1){const G=new THREE.Group();s.add(G);const fl=[];
  for(let i=0;i<18;i++){const add=i%3===0;const m=new THREE.Sprite(new THREE.SpriteMaterial({map:FLT,color:add?0xffffff:0xffb070,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,transparent:true,opacity:add?0.7:0.95}));m.userData={ox:(RK()-.5)*3.2*sc,oz:(RK()-.5)*2*sc,p:RK()*10,s:(1.8+RK()*2.4)*sc};G.add(m);fl.push(m);}
  const L=new THREE.PointLight(0xff7a30,60*sc,30*sc,1.6);L.position.set(x,y+2*sc,z);G.add(L);
  const sm=[];for(let i=0;i<46;i++){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:SMT,color:0x2a2624,transparent:true,opacity:0.0,depthWrite:false}));m.userData={p:RK(),ox:(RK()-.5)*2*sc,sp:0.6+RK()*0.6};G.add(m);sm.push(m);}
  const f=T=>{fl.forEach((m,i)=>{const u=m.userData;const k=0.75+0.35*Math.sin(T*11+u.p)+0.15*Math.sin(T*23+i);m.scale.set(u.s*0.65,u.s*k*1.5,1);m.position.set(x+u.ox+Math.sin(T*5+u.p)*0.2*sc,y+u.s*k*0.6+0.2,z+u.oz);});L.intensity=(50+16*Math.sin(T*13)+8*Math.sin(T*29))*sc;
    sm.forEach(m=>{const u=m.userData;const k=(T*0.08*u.sp+u.p)%1;m.position.set(x+u.ox+k*14*sc,y+3*sc+k*40*sc,z-k*4*sc);const sz=(3+k*18)*sc;m.scale.set(sz,sz,1);m.material.opacity=0.78*Math.sin(Math.PI*k);});};f.g=G;return f;}
// 水面（波打つ・空が映る）。setFront で先端と水位を決める
function water2(w,d,col=0x4f8a8c){const geo=new THREE.PlaneGeometry(w,d,120,90).rotateX(-Math.PI/2);const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:col,roughness:0.22,metalness:0.0,envMapIntensity:0.55}));m.receiveShadow=true;
  const p=geo.attributes.position,b=p.array.slice();return {mesh:m,update(T,amp=0.25,chop=1){for(let i=0;i<p.count;i++){const x=b[i*3],z=b[i*3+2];p.array[i*3+1]=Math.sin(x*0.08+T*1.3)*amp+Math.cos(z*0.11+T*1.1)*amp*0.8+Math.sin((x+z)*0.31+T*2.6)*amp*0.35*chop+Math.sin((x-z)*0.6+T*3.5)*amp*0.15*chop;}p.needsUpdate=true;geo.computeVertexNormals();}};}
const FOAM=cv(512,128,(g,w,h)=>{g.clearRect(0,0,w,h);const r=mulberry32(7);for(let i=0;i<900;i++){const x=r()*w,y=r()*h;const rr=2+r()*9;g.fillStyle=`rgba(255,255,255,${0.25+r()*0.6*(1-y/h)})`;g.beginPath();g.arc(x,y,rr,0,7);g.fill();}});
function utilityLine(s,pts,h=8.5){const m=SM(0x8a8a86,{roughness:0.8});pts.forEach(([x,z])=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.17,h,10),m);p.position.set(x,h/2,z);p.castShadow=true;s.add(p);const a=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.12,0.12),m);a.position.set(x,h-0.6,z);s.add(a);const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.8,12),SM(0x9a9c9e));tr.position.set(x+0.4,h-1.6,z);s.add(tr);});
  const lm=new THREE.LineBasicMaterial({color:0x1a1a1a});for(const off of[-0.7,0,0.7])for(let i=0;i<pts.length-1;i++){const [x1,z1]=pts[i],[x2,z2]=pts[i+1];const arr=[];for(let k=0;k<=12;k++){const t=k/12;arr.push(new THREE.Vector3(lerp(x1,x2,t)+off,h-0.6-Math.sin(Math.PI*t)*0.5,lerp(z1,z2,t)));}s.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arr),lm));}}
function buildTown(){const s=new THREE.Scene();const sunDir=v3(...TOD.sun).normalize();
  const dome=skyDome({sun:sunDir,top:TOD.top,hor:TOD.hor,sunCol:TOD.sunCol,cloudCol:TOD.cloudCol,cloud:TOD.cloud});s.add(dome);s.environment=envFrom(dome);s.fog=new THREE.Fog(TOD.fog,TOD.fn,TOD.ff);
  s.add(new THREE.HemisphereLight(TOD.hemiS,TOD.hemiG,TOD.hemi));const sun=new THREE.DirectionalLight(TOD.sunC,TOD.sunI);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);const sc=sun.shadow.camera;sc.left=-70;sc.right=70;sc.top=70;sc.bottom=-70;sc.near=1;sc.far=500;sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.04;s.add(sun,sun.target);
  const grass=noiseTex(256,256,'#6aa04a',22,9);grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(60,60);const gnd=new THREE.Mesh(new THREE.PlaneGeometry(900,600).rotateX(-Math.PI/2),SM(0xffffff,{map:grass,roughness:0.95}));gnd.position.set(0,0,240);gnd.receiveShadow=true;s.add(gnd);
  const asp=noiseTex(256,256,'#4a4c52',22,4);asp.wrapS=asp.wrapT=THREE.RepeatWrapping;asp.repeat.set(2,40);const am=SM(0xffffff,{map:asp,roughness:0.85});
  const road=(x,z,w,d)=>{const r=new THREE.Mesh(new THREE.BoxGeometry(w,0.1,d),am);r.position.set(x,0.05,z);r.receiveShadow=true;s.add(r);};road(0,45,10,210);for(const z of[-30,18,62,104])road(0,z,240,8);
  const lane=cv(64,512,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#f2f2ea';for(let y=0;y<h;y+=64)g.fillRect(w/2-3,y,6,36);});lane.wrapT=THREE.RepeatWrapping;lane.repeat.set(1,10);const ln=new THREE.Mesh(new THREE.PlaneGeometry(0.4,210).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:lane,transparent:true,roughness:0.7}));ln.position.set(0,0.11,45);s.add(ln);
  const sand=new THREE.Mesh(new THREE.PlaneGeometry(900,30).rotateX(-Math.PI/2),SM(0xe8d6a8,{roughness:0.95}));sand.position.set(0,0.03,-52);sand.receiveShadow=true;s.add(sand);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(900,1.6,1.2),SM(0xcac8c0,{roughness:0.9}));wall.position.set(0,0.8,-38);wall.castShadow=wall.receiveShadow=true;s.add(wall);
  const sea=water2(1400,700,0x1e6a96);sea.mesh.position.set(0,0.1,-410);s.add(sea.mesh);
  // 家（大通りの両側・碁盤目）
  const H=[];let sd=3;for(let r=0;r<7;r++)for(let c=0;c<10;c++){const x=(c<5?-1:1)*(10+(c%5)*12.5)+((sd*7)%3-1),z=-24+r*20+((sd*5)%4);if(r===1&&c===5)continue;if(Math.abs(z-18)<5||Math.abs(z-62)<5||Math.abs(z-104)<5){sd++;continue;}
    const h=house2({seed:sd++,w:7.5+(sd%3),d:7+(sd%2)});h.position.set(x,0,z);h.rotation.y=(c<5?Math.PI/2:-Math.PI/2)*((sd%4===0)?0:1);s.add(h);H.push({g:h,x,z,id:sd});}
  const eb=evacBuilding();eb.position.set(15,0,12);s.add(eb);
  for(let i=0;i<90;i++){const t=tree2();const a=RK();t.position.set(-220+RK()*440,0,145+RK()*90);t.scale.setScalar(1.4+RK()*0.8);s.add(t);}
  const hill=new THREE.Mesh(new THREE.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2),SM(0x4f8a3e,{roughness:0.95}));hill.scale.set(360,42,90);hill.position.set(0,-2,300);hill.material.map=noiseTex(256,256,'#5a8f42',30,21);hill.receiveShadow=true;s.add(hill);
  const hills=new THREE.Mesh(new THREE.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2),SM(0x5a8aa0,{roughness:1}));hills.scale.set(700,120,120);hills.position.set(-100,-5,520);s.add(hills);
  utilityLine(s,[[-6.2,-26],[-6.2,-2],[-6.2,22],[-6.2,46],[-6.2,70],[-6.2,94],[-6.2,118]]);
  const cars=[];const cc=[0xd8261c,0xf2f2f0,0x2f6db0,0xf2c230,0x1a1c20,0x3a8a5a,0xe8e4dc];for(let i=0;i<9;i++){const v=vehicle(i%3===0?'kei':'suv',cc[i%7]);v.traverse(o=>{if(o.isMesh){o.castShadow=true;}});const x=(i%2?2.6:-2.6),z=-20+i*15;v.position.set(x,0.1,z);v.rotation.y=i%2?0:Math.PI;s.add(v);cars.push({v,x,z,id:i});}
  // 津波
  const tw=water2(600,400,0x5a5a40);s.add(tw.mesh);const front=new THREE.Mesh(new THREE.PlaneGeometry(600,1,1,1),new THREE.MeshStandardMaterial({map:FOAM,transparent:true,roughness:0.4,depthWrite:false,emissive:0xffffff,emissiveMap:FOAM,emissiveIntensity:0.25}));s.add(front);
  const foamTop=new THREE.Mesh(new THREE.PlaneGeometry(600,8).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:FOAM,transparent:true,depthWrite:false,roughness:0.5}));s.add(foamTop);
  const deb=[];const dc=[0x8a6a4a,0x5a4a3a,0xb8a888,0x6a7078,0xd8d0c0,0x3a5a8a];for(let i=0;i<120;i++){const d=new THREE.Mesh(new THREE.BoxGeometry(0.4+RK()*2.5,0.2+RK()*0.3,0.3+RK()*1.2),SM(dc[i%6],{roughness:0.85}));d.castShadow=true;d.userData={x:(RK()-.5)*120,dz:-RK()*30,r:RK()*6};s.add(d);deb.push(d);}
  return {s,sun,eb,H,cars,sea,update(T,o={}){const zf=o.zf??-60,lv=o.lv??0,sw=o.sweep??0;sun.position.set((o.cx||0)+sunDir.x*200,sunDir.y*200,(o.cz||0)+sunDir.z*200);sun.target.position.set(o.cx||0,0,o.cz||0);
      sea.update(T,0.35);const on=lv>0.05;tw.mesh.visible=front.visible=foamTop.visible=on;
      if(on){tw.mesh.position.set(0,lv,zf-200);tw.update(T,0.18+lv*0.05,1.5);front.scale.y=lv+0.6;front.position.set(0,(lv+0.6)/2-0.1,zf);foamTop.position.set(0,lv+0.08,zf-4);}
      deb.forEach((d,i)=>{d.visible=on&&o.debris!==false;const u=d.userData;d.position.set(u.x,lv+0.12+Math.sin(T*2+i)*0.08,zf+u.dz+Math.sin(T+i)*0.5);d.rotation.set(Math.sin(T*1.3+i)*0.2,u.r+T*0.2,Math.cos(T*1.1+i)*0.15);});
      H.forEach(h=>{const k=sw>0?smooth(0,1,(sw*160-(h.z+40))/40):0;if(k<=0){h.g.position.set(h.x,0,h.z);h.g.rotation.x=h.g.rotation.z=0;return;}h.g.position.set(h.x+Math.sin(h.id)*6*k,Math.max(0,lv-2.2)*k,h.z+k*26);h.g.rotation.z=Math.sin(h.id*1.7)*0.35*k;h.g.rotation.x=0.12*k;});
      cars.forEach(c=>{const k=lv>0.3&&zf>c.z?smooth(0,1,(zf-c.z)/25):0;c.v.position.set(c.x+Math.sin(c.id*2)*4*k,0.1+Math.min(lv*0.7,2)*k,c.z+k*14);c.v.rotation.z=k*(0.6+0.3*Math.sin(c.id));c.v.rotation.x=k*0.25*Math.sin(c.id*3);});}};}
