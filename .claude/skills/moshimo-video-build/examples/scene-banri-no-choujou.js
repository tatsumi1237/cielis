// ================= 万里の長城はどうやって作られたのか？ v2（約60秒） =================
const TOTAL=60;
const $=id=>document.getElementById(id);
const DAYS=763000;
const dayOf=T=>T>=55?DAYS:DAYS*Math.pow(T/55,2.2);
function eraOf(days){const c=Math.floor(-445+days/365.25);const yr=c<0?'紀元前'+(-c)+'年':'西暦'+c+'年';const e=c<-221?'戦国時代':c<-206?'秦':c<220?'漢':c<589?'南北朝':c<907?'隋・唐':c<1368?'宋・元':'明';return yr+'・'+e;}
function dynSky(s){const cv=document.createElement('canvas');cv.width=4;cv.height=256;const g=cv.getContext('2d');const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;s.background=tex;
  return (top,bot)=>{const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,4,256);tex.needsUpdate=true;if(s.fog)s.fog.color.set(bot);};}
function standPose(p){const u=p.userData;u.arms.forEach((a,i)=>{a.rotation.x=0.05;a.rotation.z=i?0.12:-0.12;});}
function backpack(p,col=0x2f5a8a){const g=new THREE.Group();at(box(0.36,0.48,0.2,MS(col,{flatShading:false})),0,0,0,g);at(box(0.3,0.16,0.08,MS(0x22344a)),0,-0.12,0.13,g);g.position.set(0,1.18,-0.2);p.add(g);shadowAll(g);}
function labelTex(lines,o={}){const W2=o.w||512,H2=o.h||256;const c=document.createElement('canvas');c.width=W2;c.height=H2;const g=c.getContext('2d');if(o.bg){g.fillStyle=o.bg;g.beginPath();g.roundRect(4,4,W2-8,H2-8,28);g.fill();}
  lines.forEach((l,i)=>{g.font=`900 ${l.s}px "Noto Sans CJK JP"`;g.fillStyle=l.c||'#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(l.t,W2/2,l.y);});const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function sprite(tex,w,h){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthWrite:false,toneMapped:false,fog:false}));m.scale.set(w,h,1);return m;}

// ===== 東京スカイツリー（634m） =====
const SKYW=0xe9f0f7;
function latticeTex(){const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d');g.clearRect(0,0,128,128);g.strokeStyle='#fff';g.lineWidth=9;
  g.beginPath();g.moveTo(0,0);g.lineTo(128,128);g.moveTo(128,0);g.lineTo(0,128);g.stroke();g.lineWidth=12;g.strokeRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
const LTX=latticeTex();
function skytree(){const g=new THREE.Group();const lat=(u,v)=>{const t=LTX.clone();t.needsUpdate=true;t.repeat.set(u,v);return new THREE.MeshStandardMaterial({color:SKYW,map:t,alphaMap:t,transparent:false,alphaTest:0.4,side:THREE.DoubleSide,roughness:0.6,metalness:0.2});};
  const solid=MS(SKYW,{flatShading:false,roughness:0.5,metalness:0.15});
  // 足元は三角形、上へ行くほど円に
  const base=new THREE.Mesh(new THREE.CylinderGeometry(30,40,160,3,1,true),lat(6,10));base.position.y=80;g.add(base);
  const mid=new THREE.Mesh(new THREE.CylinderGeometry(19,30,190,24,1,true),lat(14,14));mid.position.y=255;g.add(mid);
  const up=new THREE.Mesh(new THREE.CylinderGeometry(10,19,150,24,1,true),lat(10,12));up.position.y=425;g.add(up);
  at(new THREE.Mesh(new THREE.CylinderGeometry(7,9,500,20),solid),0,250,0,g);
  // 天望デッキ（350m）・天望回廊（450m）
  const glass=new THREE.MeshStandardMaterial({color:0x5a7a9a,roughness:0.15,metalness:0.5,emissive:0x203040,emissiveIntensity:0.4});
  at(new THREE.Mesh(new THREE.CylinderGeometry(28,26,12,32),glass),0,345,0,g);at(new THREE.Mesh(new THREE.CylinderGeometry(29,29,2.5,32),solid),0,352,0,g);at(new THREE.Mesh(new THREE.CylinderGeometry(27,29,3,32),solid),0,338,0,g);
  at(new THREE.Mesh(new THREE.CylinderGeometry(18,17,7,32),glass),0,448,0,g);at(new THREE.Mesh(new THREE.CylinderGeometry(19,19,2,32),solid),0,452.5,0,g);
  at(new THREE.Mesh(new THREE.CylinderGeometry(3,6,137,12),lat(4,20)),0,566,0,g);at(new THREE.Mesh(new THREE.CylinderGeometry(1,3,40,8),solid),0,614,0,g);
  shadowAll(g);return g;}

const SC={};
// ===== 山脈と長城（冒頭・歩く・カレンダー・世代・締め） =====
SC.land=(()=>{const s=new THREE.Scene();s.fog=new THREE.Fog(0xffffff,300,4200);const setSky=dynSky(s);
  const hemi=new THREE.HemisphereLight(0xffffff,0x444444,1);s.add(hemi);const sun=new THREE.DirectionalLight(0xffffff,2);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.bias=-0.0004;s.add(sun,sun.target);
  const sunM=new THREE.Mesh(new THREE.SphereGeometry(140,24,16),new THREE.MeshBasicMaterial({color:0xffffff,fog:false}));s.add(sunM);const rim=new THREE.DirectionalLight(0xffffff,0);s.add(rim);
  terrain(s,{});const sea=waterPlane(6000,3000,60,0x3a6f9a);sea.mesh.position.set(0,0.2,1500);s.add(sea.mesh);
  const GW=greatWall(s,{z0:28,len:3600,step:8,towerEvery:40,towerFirst:0});const pv=pavilion();pv.position.set(0,12.3,0);GW.towers[0].add(pv);seaHead(s,28,pathX(28),2.0);
  const sky1=skyline(s,'hills',4200,0x8a8aa8,40,[Math.PI*1.15,Math.PI*1.85]);const fl=floaters(s,220,[0,14,-40],60,14,0xffe0c0,0.12,0.5);
  const along=(d,side=0)=>{const z=28-d;const p=new THREE.Vector3(pathX(z),GW.yAt(z),z);const t=new THREE.Vector3(pathX(z-6)-pathX(z+6),0,-12).normalize();const n=new THREE.Vector3(-t.z,0,t.x);return {p:p.clone().addScaledVector(n,side),t,n};};
  const trav=human({hd:true,coat:0xd8462e,pants:0x2e3550,style:'short',shoes:0xeeeeee});backpack(trav);standPose(trav);s.add(trav);
  // カレンダー（日付の紙が舞う）
  const calT=(()=>{const c=document.createElement('canvas');c.width=128;c.height=160;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,128,160);g.fillStyle='#d23a2a';g.fillRect(0,0,128,40);g.fillStyle='#fff';g.font='900 26px "Noto Sans CJK JP"';g.textAlign='center';g.fillText('DAY',64,30);
    g.fillStyle='#222';g.font='900 72px "Noto Sans CJK JP"';g.fillText('日',64,122);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
  const NC=420,cal=new THREE.InstancedMesh(new THREE.PlaneGeometry(0.64,0.8),new THREE.MeshStandardMaterial({map:calT,side:THREE.DoubleSide,roughness:0.9}),NC);cal.frustumCulled=false;s.add(cal);const rk=mulberry32(91);const CD=[];for(let i=0;i<NC;i++)CD.push([rk(),rk(),rk(),rk()*6.28,rk()]);
  // 世代の列（時代ごとに色の違う服）
  const GEN=[0x8a3a2a,0x3a5a8a,0x5a7a3a,0x8a6a2a,0x6a3a7a,0x2a6a6a,0x9a4a5a,0x4a4a6a];const gens=[];for(let i=0;i<8;i++){const p=human({hd:true,coat:GEN[i],pants:0x2e2a28,style:i%2?'long':'short',shoes:0x2a2a2a});s.add(p);gens.push(p);}
  const NG=240;const gb=new THREE.InstancedMesh(new THREE.BoxGeometry(0.5,1.25,0.32),MS(0xffffff),NG),gh=new THREE.InstancedMesh(new THREE.SphereGeometry(0.15,8,6),MS(0x3a2e28),NG);gb.castShadow=true;s.add(gb,gh);
  const gc=new THREE.Color();for(let i=0;i<NG;i++){gc.set(GEN[i%8]);gb.setColorAt(i,gc);}
  const brickInHand=[];for(let i=0;i<8;i++){const b=box(0.4,0.1,0.2,MS(0x9a9488));s.add(b);brickInHand.push(b);}
  const LOOK={dusk:{top:'#3a2a5a',bot:'#ff9a5a',fog:[250,4000],sun:0xffa060,sunI:3.0,hemi:[0xffb090,0x3a3040,1.0],sea:0x5a3a5a,sky:0x5a3a5a},
    day:{top:'#2f7fe0',bot:'#cfe8ff',fog:[500,5200],sun:0xfff2dc,sunI:2.4,hemi:[0xcfe6ff,0x6a7a4a,0.95],sea:0x2a7fb0,sky:0x9ab0c8},
    gold:{top:'#4a6aa0',bot:'#ffd8a0',fog:[300,4200],sun:0xffd8a0,sunI:2.6,hemi:[0xffe0c0,0x5a5a40,0.95],sea:0x3a6f9a,sky:0x9a9ab0},
    night:{top:'#05081a',bot:'#1a2a4a',fog:[200,3000],sun:0x8aa0ff,sunI:0.6,hemi:[0x4a5a8a,0x101018,0.5],sea:0x0a1a2a,sky:0x101828},
    rise:{top:'#2f4f8a',bot:'#ffb27a',fog:[300,4200],sun:0xffc890,sunI:2.4,hemi:[0xffd6b0,0x4a5a3a,0.95],sea:0x3a6f9a,sky:0x8a8aa8}};
  function look(P,focus,sunDir,sunDisk,rimO,sz=220){setSky(P.top,P.bot);s.fog.near=P.fog[0];s.fog.far=P.fog[1];sun.color.set(P.sun);sun.intensity=P.sunI;hemi.color.set(P.hemi[0]);hemi.groundColor.set(P.hemi[1]);hemi.intensity=P.hemi[2];
    sea.mesh.material.color.set(P.sea);sky1.children.forEach(c=>c.material&&c.material.color.set(P.sky));
    sun.position.copy(focus).add(new THREE.Vector3(...sunDir));sun.target.position.copy(focus);const c=sun.shadow.camera;c.left=-sz;c.right=sz;c.top=sz;c.bottom=-sz;c.far=1600;c.updateProjectionMatrix();
    sunM.visible=!!sunDisk;if(sunDisk){sunM.position.set(...sunDisk);sunM.material.color.set(P===LOOK.rise?0xffc070:0xffd090);}rim.intensity=rimO?rimO.i:0;if(rimO){rim.color.set(rimO.c);rim.position.copy(focus).add(new THREE.Vector3(...rimO.d));}}
  const lerpLook=(A,B,k)=>{const o={};for(const key in A){if(typeof A[key]==='string')o[key]='#'+new THREE.Color(A[key]).lerp(new THREE.Color(B[key]),k).getHexString();else if(Array.isArray(A[key]))o[key]=A[key].map((v,i)=>typeof v==='number'&&v>1000?new THREE.Color(v).lerp(new THREE.Color(B[key][i]),k).getHex():lerp(v,B[key][i],k));else if(key==='sunI')o[key]=lerp(A[key],B[key],k);else o[key]=new THREE.Color(A[key]).lerp(new THREE.Color(B[key]),k).getHex();}return o;};
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(1,1,1),e=new THREE.Euler();
  return {s,GW,along,trav,look,LOOK,lerpLook,update(t){sea.update(t,0.4);fl(t);},
    setCal(on,t,c0){cal.visible=on;if(!on)return;for(let i=0;i<NC;i++){const d=CD[i];const ph=(d[0]+t*0.18)%1;const a=along(lerp(200,460,d[1]),(d[2]-.5)*40);v.set(a.p.x,a.p.y+2+ph*45+Math.sin(t*2+d[3])*2,a.p.z);e.set(t*2*d[4]+d[3],t*1.5+d[3],t*d[4]);q.setFromEuler(e);sc.setScalar(1.8);m4.compose(v,q,sc);cal.setMatrixAt(i,m4);}cal.instanceMatrix.needsUpdate=true;},
    setGen(on,t){gens.forEach(p=>p.visible=on);gb.visible=gh.visible=on;brickInHand.forEach(b=>b.visible=on);if(!on)return;
      gens.forEach((p,i)=>{const a=along(170+i*2.2,0);p.position.copy(a.p);p.rotation.y=Math.atan2(a.n.x,a.n.z)+(i%2?Math.PI:0);const u=p.userData;const ph=Math.sin(t*3+i*0.8);u.arms.forEach(ar=>{ar.rotation.x=-0.9+ph*0.4;ar.rotation.z=0;});
        const h=new THREE.Vector3(0,1.15,0.45).applyAxisAngle(new THREE.Vector3(0,1,0),p.rotation.y);const k=((t*1.2+i*0.25)%1);brickInHand[i].position.set(a.p.x+h.x+a.t.x*k*2.2,a.p.y+h.y+Math.sin(k*Math.PI)*0.3,a.p.z+h.z+a.t.z*k*2.2);brickInHand[i].rotation.y=Math.atan2(a.t.x,a.t.z);});
      for(let i=0;i<NG;i++){const a=along(188+i*2.2,0);v.set(a.p.x,a.p.y+0.78,a.p.z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(a.n.x,a.n.z));m4.compose(v,q,sc.set(1,1,1));gb.setMatrixAt(i,m4);v.y+=0.8;m4.compose(v,q,sc);gh.setMatrixAt(i,m4);}gb.instanceMatrix.needsUpdate=gh.instanceMatrix.needsUpdate=true;}};})();
// ===== スカイツリーを縦に積む =====
SC.sky=(()=>{const s=new THREE.Scene();s.fog=new THREE.Fog(0xcfe6ff,3000,16000);const setSky=dynSky(s);setSky('#0a1a40','#cfe8ff');
  s.add(new THREE.HemisphereLight(0xdfeeff,0x6a7a8a,1.0));const d=new THREE.DirectionalLight(0xfff4e0,2.6);d.position.set(-1500,2000,1200);s.add(d);
  const gp=groundPlane(s,'asphalt',12000,12000,0,0,0,400);gp.material.color.set(0x8a929a);
  city(s,{n:900,rmin:120,rmax:2600});skyline(s,'city',4000,0xa8b8c8,120,[0,Math.PI*2]);
  const towers=[];const st0=skytree();s.add(st0);towers.push(st0);for(let k=1;k<36;k++){const t=skytree();t.position.y=k*634;s.add(t);towers.push(t);}
  const tags=[];for(let k=0;k<0;k++){const sp=sprite(labelTex([{t:'×'+(k+1),s:120,y:128,c:'#ffd27a'}],{w:512,h:256}),220,110);sp.position.set(170,k*634+320,0);s.add(sp);tags.push(sp);}
  const stars=(()=>{const n=1500,pos=new Float32Array(n*3);const r=mulberry32(3);for(let i=0;i<n;i++){const a=r()*6.283,u=r();pos[i*3]=Math.cos(a)*9000;pos[i*3+1]=8000+u*12000;pos[i*3+2]=Math.sin(a)*9000;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));const m=new THREE.PointsMaterial({color:0xffffff,size:30,map:DOT,transparent:true,opacity:0.0,depthWrite:false,fog:false});s.add(new THREE.Points(g,m));return m;})();
  return {s,towers,tags,update(t,k){towers.forEach((tw,i)=>{const appear=clamp(k*36-i+0.6,0,1);tw.visible=appear>0;tw.position.y=i*634+(1-appear)*400;});tags.forEach((g,i)=>g.visible=k*36>i+0.6);stars.opacity=clamp((k-0.3)*2,0,1)*0.9;setSky('#'+new THREE.Color('#2a6ad0').lerp(new THREE.Color('#020414'),clamp(k*1.4,0,1)).getHexString(),'#cfe8ff');}};})();
// ===== 地球の半周 =====
SC.earth=(()=>{const s=new THREE.Scene();s.background=new THREE.Color(0x02040a);stars(s,2500,400,1.4);
  s.add(new THREE.AmbientLight(0x223344,0.5));const sun=new THREE.DirectionalLight(0xffffff,2.8);sun.position.set(-60,30,50);s.add(sun);
  const earth=new THREE.Group();s.add(earth);const ball=new THREE.Mesh(new THREE.SphereGeometry(10,64,48),new THREE.MeshStandardMaterial({map:earthTex(),roughness:0.8}));earth.add(ball);
  const cloud=new THREE.Mesh(new THREE.SphereGeometry(10.12,64,48),new THREE.MeshStandardMaterial({map:cloudTex(),transparent:true,depthWrite:false,opacity:0.8}));earth.add(cloud);
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10.6,48,32),new THREE.MeshBasicMaterial({color:0x6fb4ff,transparent:true,opacity:0.16,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false})));
  // 赤い線：緯度40°付近を西へ（中国北部から）。地球一周の53%
  const pts=[];const N=400;for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;const lat=0.70+0.12*Math.sin(a*2.0);pts.push(new THREE.Vector3(Math.cos(lat)*Math.cos(a)*10.25,Math.sin(lat)*10.25,Math.cos(lat)*Math.sin(a)*10.25));}
  const curve=new THREE.CatmullRomCurve3(pts);const tube=new THREE.TubeGeometry(curve,800,0.09,8,false);const lineM=new THREE.MeshBasicMaterial({color:0xff4a2a,toneMapped:false});const line=new THREE.Mesh(tube,lineM);earth.add(line);
  const glow=new THREE.Mesh(new THREE.TubeGeometry(curve,800,0.22,8,false),new THREE.MeshBasicMaterial({color:0xff7a3a,transparent:true,opacity:0.35,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));earth.add(glow);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.28,16,12),new THREE.MeshBasicMaterial({color:0xffe0a0,toneMapped:false}));earth.add(head);
  const tot=tube.index.count;return {s,earth,update(t,k){const f=clamp(k,0,1)*0.53;const cnt=Math.floor(tot*f/3)*3;tube.setDrawRange(0,cnt);glow.geometry.setDrawRange(0,cnt);head.position.copy(curve.getPointAt(Math.max(0.001,f)));cloud.rotation.y=t*0.02;const am=f*Math.PI;earth.rotation.y=am-Math.PI/2;}};})();
// ===== レンガの山 =====
SC.brick=(()=>{const s=sky('#6a8ab0','#f0dcb8',60,500);lights(s,{sky:0xf0e0c8,ground:0x6a5a40,hemi:0.95,sun:0xffe8c8,sunI:2.6,dir:[-40,60,30],sz:30});
  const gp=groundPlane(s,'sand',400,400,0,0);gp.material.color.set(0xc8a878);skyline(s,'hills',260,0x9a9a8a,40,[Math.PI*1.0,Math.PI*2.0]);
  const N=5200,geo=new THREE.BoxGeometry(0.4,0.1,0.2);const pile=new THREE.InstancedMesh(geo,MS(0xffffff,{roughness:0.9}),N);const rk=mulberry32(12);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(1,1,1),col=new THREE.Color();
  const P=[];for(let i=0;i<N;i++){const r=Math.sqrt(rk())*7.5,a=rk()*6.283;const x=Math.cos(a)*r,z=Math.sin(a)*r-4;const h=4.6*Math.pow(Math.max(0,1-r/7.5),0.8)*(0.92+rk()*0.12);P.push([x,h+0.05,z,rk()*3,rk()*3,rk()]);col.setHSL(0.07+rk()*0.03,0.18+rk()*0.1,0.42+rk()*0.18);pile.setColorAt(i,col);}
  pile.castShadow=pile.receiveShadow=true;s.add(pile);
  const NF=120,fall=new THREE.InstancedMesh(geo,MS(0x9a8a78,{roughness:0.9}),NF);fall.frustumCulled=false;s.add(fall);const FD=[];for(let i=0;i<NF;i++)FD.push([(rk()-.5)*14,rk(),(rk()-.5)*10-4,rk()*6]);
  const dust=rising(s,200,[0,0.2,-4],10,1.5,0.4,0xe8d0a8,0.3,0.4);
  return {s,update(t,k){dust(t);const shown=Math.floor(N*(0.35+0.65*k));for(let i=0;i<N;i++){const p=P[i];v.set(p[0],i<shown?p[1]:-5,p[2]);q.setFromEuler(new THREE.Euler(p[3]*0.3,p[4],p[5]*0.3));m4.compose(v,q,sc);pile.setMatrixAt(i,m4);}pile.instanceMatrix.needsUpdate=true;
    for(let i=0;i<NF;i++){const d=FD[i];const ph=(d[1]+t*0.9)%1;v.set(d[0],14-ph*14,d[2]);q.setFromEuler(new THREE.Euler(t*3+d[3],t*2+d[3],0));m4.compose(v,q,sc);fall.setMatrixAt(i,m4);}fall.instanceMatrix.needsUpdate=true;}};})();
// ===== レンガの家が地平線まで =====
SC.house=(()=>{const s=sky('#3a7ad8','#d8ecff',400,6000);lights(s,{sky:0xd8ecff,ground:0x6a7a4a,hemi:1.0,sun:0xfff0d8,sunI:2.4,dir:[-300,400,200],sz:300});
  const gp=groundPlane(s,'grass',16000,16000,0,0,0,600);
  const bt=(()=>{const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d');g.fillStyle='#d8cfc0';g.fillRect(0,0,128,128);const rk=mulberry32(2);for(let r=0;r<16;r++)for(let k=-1;k<5;k++){const v=120+rk()*40|0;g.fillStyle=`rgb(${v+40},${v-20},${v-50})`;g.fillRect(k*32+(r%2?16:0)+1,r*8+1,30,6);}
    g.fillStyle='#2a3a4a';g.fillRect(20,50,24,30);g.fillRect(84,50,24,30);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
  const S=12,n=Math.floor(4000/S);const list=[];for(let i=-n;i<n;i++)for(let j=-n;j<n/3;j++){if(Math.abs(i)<1&&Math.abs(j)<1)continue;if(Math.hypot(i,j)*S>3800)continue;list.push([i*S,j*S]);}
  const body=new THREE.InstancedMesh(new THREE.BoxGeometry(8,5.5,7),new THREE.MeshStandardMaterial({map:bt,roughness:0.9}),list.length);const roofG=new THREE.CylinderGeometry(0.01,5.6,3,4,1);roofG.rotateY(Math.PI/4);roofG.scale(1.05,1,0.95);
  const roof=new THREE.InstancedMesh(roofG,MS(0x8a3a2a,{roughness:0.8}),list.length);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(1,1,1),col=new THREE.Color();const rk=mulberry32(8);
  list.forEach((p,i)=>{const ry=(rk()*4|0)*Math.PI/2;q.setFromAxisAngle(new THREE.Vector3(0,1,0),ry);v.set(p[0],2.75,p[1]);m4.compose(v,q,sc);body.setMatrixAt(i,m4);v.set(p[0],7,p[1]);m4.compose(v,q,sc);roof.setMatrixAt(i,m4);col.setHSL(0.02+rk()*0.04,0.45,0.28+rk()*0.12);roof.setColorAt(i,col);});
  body.castShadow=body.receiveShadow=true;roof.castShadow=true;s.add(body,roof);
  const hero=new THREE.Group();at(new THREE.Mesh(new THREE.BoxGeometry(8,5.5,7),new THREE.MeshStandardMaterial({map:bt,roughness:0.9})),0,2.75,0,hero);const hr=new THREE.Mesh(roofG,MS(0xa83a2a));hr.position.y=7;hero.add(hr);shadowAll(hero);s.add(hero);
  return {s,update(t){}};})();
// ===== 年表 =====
SC.time=(()=>{const s=new THREE.Scene();s.background=new THREE.Color(0x0c0f1c);s.fog=new THREE.Fog(0x0c0f1c,60,260);
  s.add(new THREE.HemisphereLight(0x8090c0,0x101018,0.9));const d=new THREE.DirectionalLight(0xffffff,1.6);d.position.set(20,40,30);s.add(d);
  const X=y=>(y+445)/2471*240-20;  // 紀元前445→-20、2026→220
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(600,200),MS(0x161a2a,{roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(100,0,0);s.add(floor);
  const grid=new THREE.GridHelper(600,120,0x2a3050,0x1e2238);grid.position.set(100,0.01,0);s.add(grid);
  const axis=new THREE.Mesh(new THREE.BoxGeometry(X(2026)-X(-445)+10,0.12,0.5),new THREE.MeshBasicMaterial({color:0x7a86a8}));axis.position.set((X(-445)+X(2026))/2,0.1,0);s.add(axis);
  const build=new THREE.Mesh(new THREE.BoxGeometry(X(1644)-X(-445),0.5,2.2),new THREE.MeshBasicMaterial({color:0xff7a2a,toneMapped:false}));build.position.set((X(-445)+X(1644))/2,0.3,0);s.add(build);
  const bglow=new THREE.Mesh(new THREE.BoxGeometry(X(1644)-X(-445),1.2,4),new THREE.MeshBasicMaterial({color:0xff7a2a,transparent:true,opacity:0.18,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));bglow.position.copy(build.position);s.add(bglow);
  const marks=[[-445,'紀元前445年','建設スタート','#ffb05a'],[-215,'紀元前215年','蒙恬が30万の兵で','#ffd27a','（キングダムの武将）'],[1,'西暦1年','','#cfd8ff'],[1000,'西暦1000年','','#cfd8ff'],[1644,'1644年','ついに完成','#ffb05a'],[2026,'2026年','いま','#7fe0ff']];
  marks.forEach((m,i)=>{const x=X(m[0]);const h=m[2]?12:7;const pole=new THREE.Mesh(new THREE.BoxGeometry(0.25,h,0.25),new THREE.MeshBasicMaterial({color:m[3],toneMapped:false}));pole.position.set(x,h/2,0);s.add(pole);
    const ls=[{t:m[1],s:62,y:70,c:m[3]}];if(m[2])ls.push({t:m[2],s:56,y:150,c:'#ffffff'});if(m[4])ls.push({t:m[4],s:40,y:215,c:'#d8d8e8'});const sp=sprite(labelTex(ls,{w:600,h:256,bg:'rgba(10,12,24,.82)'}),15,6.4);sp.position.set(x,h+3.6,0);s.add(sp);});
  // 時代の帯
  const band=[[-445,-221,'戦国'],[-221,-206,''],[-206,220,'漢'],[220,589,'南北朝'],[589,907,'隋・唐'],[907,1368,'宋・元'],[1368,1644,'明']];const bc=[0x5a4a7a,0x8a2a2a,0x3a5a8a,0x4a6a5a,0x7a5a3a,0x3a6a7a,0x8a5a2a];
  band.forEach((b,i)=>{const w=X(b[1])-X(b[0]);const m=new THREE.Mesh(new THREE.BoxGeometry(w-0.2,0.2,3),MS(bc[i]));m.position.set((X(b[0])+X(b[1]))/2,0.12,5.5);s.add(m);if(b[2]){const sp=sprite(labelTex([{t:b[2],s:80,y:64}],{w:256,h:128}),5,2.5);sp.position.set((X(b[0])+X(b[1]))/2,1.6,5.5);s.add(sp);}});
  return {s,X,update(t){}};})();

const CAM=new THREE.PerspectiveCamera(55,W/H,0.05,30000);
// ====== テキスト ======
const L=document.getElementById('layers');
function el(html,cls='ov',style=''){const d=document.createElement('div');d.className=cls;d.style.cssText=style;d.innerHTML=html;L.appendChild(d);return d;}
function show(e,o,tf){e.style.opacity=o;if(tf!==undefined)e.style.transform=tf;e.style.display=o>0.001?'block':'none';}
const SH='text-shadow:0 6px 0 rgba(0,0,0,.35),0 0 24px rgba(0,0,0,.5);';
el('','ov','left:0;top:0;width:1080px;height:780px;background:linear-gradient(rgba(10,8,24,.66),rgba(10,8,24,0))');
el('','ov','left:0;top:1450px;width:1080px;height:470px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.4))');
const TTL=el(`<div style="font-size:34px;font-weight:700;letter-spacing:.5em;color:#ffcf9a">SIMULATION</div><div class="serif" style="margin-top:10px;font-size:78px;font-weight:900;line-height:1.3;${SH}"><span style="color:#ff9a3a;font-size:116px">万里の長城</span>は<br>どうやって作られたのか？</div>`,'ov big','top:150px');
const TTL2=el(`<div class="serif" style="font-size:54px;font-weight:900;${SH}"><span style="color:#ff9a3a">万里の長城</span>はどうやって作られたのか？</div>`,'ov big','top:70px');
const TM=el(`<div style="font-size:30px;font-weight:700;color:#ffd2a8;letter-spacing:.2em;${SH}">建設が始まってから</div>
 <div style="font-size:180px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums;text-shadow:0 0 30px rgba(255,120,40,.9),0 0 80px rgba(255,80,20,.6)"><span id="tmn">0</span><span style="font-size:90px">日</span></div>
 <div style="margin:14px auto 0;width:760px;height:16px;border-radius:8px;background:rgba(255,255,255,.2);overflow:hidden"><div id="tmb" style="width:0%;height:100%;background:linear-gradient(90deg,#ff5a2a,#ffd27a)"></div></div>
 <div style="margin-top:12px;font-size:34px;font-weight:900;${SH}">いま <span id="tme" style="color:#ff9a3a">紀元前445年・戦国時代</span></div>`,'ov big','top:530px;transform-origin:50% 0');
const HOOK=el(`<div style="display:inline-block;font-size:58px;font-weight:900;line-height:1.35;background:rgba(10,5,20,.88);padding:14px 34px;border-radius:20px;color:#fff">人類史上、<span style="color:#ffb05a">最大の建造物</span></div>`,'ov big','top:1730px');
const SKC=el('<div style="font-size:40px;font-weight:900;color:#ffd27a">積んだ本数</div><div id="skn" style="font-size:110px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums;text-shadow:0 4px 0 rgba(0,0,0,.4)">×1</div>','ov','left:540px;top:760px;width:520px;text-align:center;color:#fff');
const HD=el('<div class="serif shadow" id="hdt" style="font-size:84px;font-weight:900;line-height:1.25"></div><div class="shadow" id="sbt" style="margin-top:18px;display:inline-block;font-size:42px;font-weight:900;background:rgba(10,14,22,.66);padding:8px 22px;border-radius:12px"></div>','ov big','top:1180px');
const CUTS=[0,4,10,16,22,28,34,42,48,55,60];
const LINES=[{a:4.3,b:9.9,h:'スカイツリー<br><em style="color:#ffc93c">約3万3千本</em>分',s:'634m × 33,432本'},{a:10.3,b:15.9,h:'地球の<em style="color:#ffc93c">半周</em>以上',s:'全長 21,196km'},
 {a:16.3,b:21.9,h:'端から端まで歩くと<br><em style="color:#ffc93c">約2年</em>',s:'1日30km × 707日'},{a:22.3,b:27.9,h:'レンガに換算すると<br><em style="color:#ffc93c">約375億個</em>',s:'明の長城の壁の体積から推定'},
 {a:28.3,b:33.9,h:'レンガの家<br><em style="color:#ffc93c">約1,400万軒</em>分',s:'1軒＝レンガ約1万個で計算'},{a:34.3,b:41.9,h:'紀元前445年に始まり<br>完成は<em style="color:#ffc93c">1644年</em>',s:''},
 {a:42.3,b:47.9,h:'完成まで<br><em style="color:#ffc93c">約76万日</em>',s:'約2,000年'},{a:48.3,b:54.9,h:'親から子へ<br><em style="color:#ffc93c">約80世代</em>',s:'受け継いで、積み上げた'},{a:55.5,b:60.5,h:'すべて<br><em style="color:#ffc93c">人の手</em>で',s:''}];

// ====== 描画 ======
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
window.renderFrame=function(T){const c=CAM;c.up.set(0,1,0);c.fov=55;c.far=30000;let s;renderer.setClearColor(0x000000,1);renderer.clear();const Ld=SC.land;
  const onLand=T<4||(T>=16&&T<22)||(T>=42&&T<55)||T>=55;
  if(onLand){const S=Ld;S.update(T);s=S.s;const A=S.along;S.setCal(T>=42&&T<48,T);S.setGen(T>=48&&T<55,T);S.trav.visible=(T>=16&&T<22)||T>=55;
    if(T<4){S.look(S.LOOK.dusk,A(560).p,[-500,90,-250],[-2600,200,-2600],{i:2.0,c:0xffa050,d:[-300,20,-400]},250);const C1=A(548+T*0.6,-0.4);c.position.copy(C1.p).add(V3(0,1.2+T*0.05,0));const t=A(700,0).p;c.lookAt(t.x,t.y+16,t.z);}
    else if(T<22){// 歩く：昼と夜が入れ替わる
      const u=(T-16)/6;const cyc=(u*2.5)%1;const k=0.5-0.5*Math.cos(cyc*Math.PI*2);const P=S.lerpLook(S.LOOK.day,S.LOOK.night,k);const P1=A(240+u*6,0.3);S.trav.position.copy(P1.p);S.trav.rotation.y=Math.atan2(P1.t.x,P1.t.z);walkAnim(S.trav,T,5,0.5);
      const sa=cyc*Math.PI*2;S.look(P,P1.p,[Math.cos(sa)*-400,Math.max(40,Math.sin(sa+1.2)*400),200],null,null,160);const C1=A(240+u*6-4.5,0.3);c.position.copy(C1.p).add(V3(0,2.2,0));const t=A(300,0).p;c.lookAt(t.x,t.y+1,t.z);}
    else if(T<48){const u=(T-42)/6;S.look(S.LOOK.gold,A(300).p,[-300,200,200],null,{i:1.2,c:0xffe0c0,d:[0,40,-300]},260);const C1=A(150+u*20,6);c.position.copy(C1.p).add(V3(0,4,0));const t=A(380,0).p;c.lookAt(t.x,t.y+16,t.z);}
    else if(T<55){const u=(T-48)/7;S.look(S.LOOK.gold,A(190).p,[-300,200,200],null,{i:1.2,c:0xffe0c0,d:[0,40,-300]},200);const C1=A(166+u*6,3.0);c.position.copy(C1.p).add(V3(0,1.8,0));const t=A(215,0).p;c.lookAt(t.x,t.y+0.6,t.z);}
    else{const u=clamp((T-55)/5,0,1);S.look(S.LOOK.rise,A(160).p,[-60,90,400],[-260,70,2600],{i:1.8,c:0xffc890,d:[-40,40,300]},220);const P1=A(150,0.4);S.trav.position.copy(P1.p);S.trav.rotation.y=Math.atan2(-P1.t.x,-P1.t.z);standPose(S.trav);
      const C1=A(160+u*60,-0.6);c.position.copy(C1.p).add(V3(0,2.0+u*u*70,0));const t=A(-60,0).p;c.lookAt(t.x,t.y+10-u*24,t.z);}
  }else if(T<10){const S=SC.sky;const u=(T-4)/6;S.update(T,u);s=S.s;c.fov=60;const H0=lerp(330,5200,u*u);c.position.set(-620-u*1600,40+u*700,620+u*1600);c.lookAt(0,H0,0);}
  else if(T<16){const S=SC.earth;const u=(T-10)/6;S.update(T,smooth(0,0.85,u));s=S.s;c.position.set(0,15,32-u*3);c.lookAt(0,2.0,0);}
  else if(T<28){const S=SC.brick;const u=(T-22)/6;S.update(T,u);s=S.s;c.position.set(lerp(11,15,u),lerp(1.6,4,u),lerp(12,16,u));c.lookAt(0,3.6,-4);}
  else if(T<34){const S=SC.house;const u=(T-28)/6;s=S.s;const r=lerp(18,900,u*u);c.position.set(r*0.5,lerp(10,520,u*u),r);c.lookAt(0,0,-lerp(0,400,u));}
  else{const S=SC.time;const u=(T-34)/8;s=S.s;const x=lerp(S.X(-445)-30,S.X(1644)-60,smooth(0,1,u));c.position.set(x,20,34);c.lookAt(x+70,2,-4);}
  c.aspect=W/H;c.updateProjectionMatrix();renderer.setViewport(0,0,W,H);renderer.render(s,c);
  $('flash').style.opacity=0;$('dim').style.opacity=0;
  {const on=T>=4.2&&T<9.9;show(SKC,on?1:0);if(on){const u=(T-4)/6;const n=Math.round(Math.pow(33432,clamp(u/0.9,0,1)));$('skn').textContent='×'+n.toLocaleString('en-US');}}
  const dd=dayOf(T);$('tmn').textContent=Math.floor(dd).toLocaleString('en-US');$('tmb').style.width=(dd/DAYS*100).toFixed(1)+'%';$('tme').textContent=eraOf(dd);
  const q=smooth(3.8,4.4,T);show(TTL,1-q,`translateY(${-q*40}px)`);show(TTL2,q);TM.style.top=lerp(530,170,q)+'px';TM.style.transform=`scale(${lerp(1,0.66,q)})`;
  show(HOOK,clamp((T-0.5)/0.25,0,1)*(1-smooth(3.6,4.0,T)));
  const ln=LINES.find(l=>T>=l.a-0.05&&T<l.b);
  if(ln){$('hdt').innerHTML=ln.h;$('sbt').textContent=ln.s;$('sbt').style.display=ln.s?'inline-block':'none';const lt=T-ln.a;const end=ln.b>=60?1:clamp((ln.b-0.2-T)/0.2,0,1);
    show(HD,Math.min(clamp(lt/0.2,0,1),end),`scale(${0.85+0.15*easeBack(lt/0.35)})`);$('sbt').style.opacity=clamp((lt-0.4)/0.2,0,1);}
  else show(HD,0);
};
window.TOTAL=TOTAL;window.ready=true;
</script></body></html>
