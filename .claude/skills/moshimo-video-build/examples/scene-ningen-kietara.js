// ================= もしもこの世から人間が消えたら（約60秒・11カット） =================
const TOTAL=54;
const $=id=>document.getElementById(id);
function dynSky(s){const cv=document.createElement('canvas');cv.width=4;cv.height=256;const g=cv.getContext('2d');const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;s.background=tex;
  return (top,bot)=>{const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,4,256);tex.needsUpdate=true;if(s.fog)s.fog.color.set(bot);};}
function labelTex(lines,o={}){const W2=o.w||512,H2=o.h||256;const c=document.createElement('canvas');c.width=W2;c.height=H2;const g=c.getContext('2d');if(o.bg){g.fillStyle=o.bg;g.beginPath();g.roundRect(4,4,W2-8,H2-8,o.r||28);g.fill();}
  if(o.tail){g.beginPath();g.moveTo(W2/2-26,H2-10);g.lineTo(W2/2,H2+40);g.lineTo(W2/2+26,H2-10);g.fill();}
  lines.forEach(l=>{g.font=`900 ${l.s}px "Noto Sans CJK JP"`;g.fillStyle=l.c||'#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(l.t,W2/2,l.y);});const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function sprite(tex,w,h){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthWrite:false,depthTest:false,toneMapped:false,fog:false}));m.scale.set(w,h,1);m.renderOrder=10;return m;}
function bubble(text,col='#1a1a1a'){const W2=120+text.length*90;const c=document.createElement('canvas');c.width=W2;c.height=200;const g=c.getContext('2d');g.fillStyle='#fff';g.beginPath();g.roundRect(6,6,W2-12,140,40);g.fill();g.beginPath();g.moveTo(W2/2-30,140);g.lineTo(W2/2,194);g.lineTo(W2/2+30,140);g.fill();
  g.strokeStyle=col;g.lineWidth=6;g.beginPath();g.roundRect(6,6,W2-12,140,40);g.stroke();g.font='900 84px "Noto Sans CJK JP"';g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.fillText(text,W2/2,80);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return sprite(t,1.2*W2/200,1.2);}
function crowd(s,n,o={}){const body=new THREE.InstancedMesh(new THREE.BoxGeometry(0.5,1.25,0.32),MS(0xffffff),n),head=new THREE.InstancedMesh(new THREE.SphereGeometry(0.15,8,6),MS(0x2a2420),n);
  const col=new THREE.Color();const C=o.cols||[0x2a2f3a,0xe8e2d8,0x3a5a8a,0x8a3a3a,0x4a4a4a,0xd8c8a8,0x5a6a4a,0x1a1a1a];for(let i=0;i<n;i++){col.set(C[i%C.length]);body.setColorAt(i,col);}body.castShadow=true;body.frustumCulled=head.frustumCulled=false;s.add(body,head);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(1,1,1);
  return {body,head,set(i,x,y,z,ry,bob=0){q.setFromAxisAngle(new THREE.Vector3(0,1,0),ry);v.set(x,y+0.78+bob,z);m4.compose(v,q,sc);body.setMatrixAt(i,m4);v.set(x,y+1.58+bob,z);m4.compose(v,q,sc);head.setMatrixAt(i,m4);},done(){body.instanceMatrix.needsUpdate=head.instanceMatrix.needsUpdate=true;}};}
function glowSign(text,bg,fg,w,h){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.font=`900 ${Math.round(c.height*0.62)}px "Noto Sans CJK JP"`;g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,c.height*0.54);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:1.2,roughness:0.5,toneMapped:false});return new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);}
function vertSign(text,bg,fg,w,h){const c=document.createElement('canvas');c.width=128;c.height=Math.round(128*h/w);const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.font='900 96px "Noto Sans CJK JP"';g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
  [...text].forEach((ch,i)=>g.fillText(ch,64,(i+0.6)*c.height/(text.length+0.2)));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:1.1,toneMapped:false}));}
// 夜の窓（点灯）
function litWinTex(seed,dens=0.55){const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');const rk=mulberry32(seed);g.fillStyle='#000';g.fillRect(0,0,64,128);
  for(let y=4;y<128;y+=10)for(let x=3;x<64;x+=8)if(rk()<dens){g.fillStyle=rk()<0.75?'#ffe2a8':'#d8ecff';g.fillRect(x,y,5,6);}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
function tower(w,h,d,col,lit){const tex=WT.clone();tex.needsUpdate=true;tex.repeat.set(Math.max(1,w/6),Math.max(1,h/10));const em=lit.clone();em.needsUpdate=true;em.repeat.copy(tex.repeat);
  const m=new THREE.MeshStandardMaterial({color:col,map:tex,roughness:0.7,emissive:0xffffff,emissiveMap:em,emissiveIntensity:0});const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.y=h/2;b.castShadow=b.receiveShadow=true;return b;}
const LITS=[litWinTex(1),litWinTex(2),litWinTex(3,0.7)];
// 草・木（インスタンス）
function grassField(s,n,area,seed,o={}){const rk=mulberry32(seed);const g=new THREE.ConeGeometry((o.r||0.35)*0.45,(o.h||0.9)*0.7,4);g.translate(0,(o.h||0.9)*0.35,0);const m=new THREE.InstancedMesh(g,MS(o.col||0x5a8a3a),n);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(),c=new THREE.Color();
  for(let i=0;i<n;i++){const p=area(rk);v.set(p[0],p[1]||0,p[2]);const k=0.5+rk()*1.2;sc.set(k,k*(0.6+rk()*0.9),k);q.setFromAxisAngle(new THREE.Vector3(0,1,0),rk()*6);m4.compose(v,q,sc);m.setMatrixAt(i,m4);c.setHSL(0.24+rk()*0.08,0.45,0.25+rk()*0.15);m.setColorAt(i,c);}m.castShadow=!!o.shadow;s.add(m);return m;}
function trees(s,n,area,seed,o={}){const rk=mulberry32(seed);const tg=new THREE.IcosahedronGeometry(1,0);const trunk=new THREE.CylinderGeometry(0.15,0.25,1,5);trunk.translate(0,0.5,0);
  const L=new THREE.InstancedMesh(tg,MS(0x3f6a2e),n),T=new THREE.InstancedMesh(trunk,MS(0x4a3424),n);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(),c=new THREE.Color();
  for(let i=0;i<n;i++){const p=area(rk);const h=(o.h||6)*(0.6+rk()*0.8);v.set(p[0],p[1]||0,p[2]);sc.set(1,h*0.5,1);m4.compose(v,q,sc);T.setMatrixAt(i,m4);v.y+=h*0.65;const r=h*0.38*(0.8+rk()*0.5);sc.set(r,r*0.9,r);m4.compose(v,q,sc);L.setMatrixAt(i,m4);c.setHSL(0.25+rk()*0.08,0.42,0.2+rk()*0.14);L.setColorAt(i,c);}
  L.castShadow=true;s.add(L,T);return L;}
// イノシシ・タヌキ
function boarM(){const g=new THREE.Group();const c=MS(0x4a3a2e,{roughness:1});at(box(1.3,0.62,0.6,c),0,0.72,0,g);at(box(0.55,0.5,0.5,c),0.82,0.7,0,g);at(box(0.22,0.22,0.3,MS(0x6a5040)),1.15,0.6,0,g);
  for(const z of[0.12,-0.12])at(cyl(0.02,0.03,0.18,MS(0xf0e8d8),4),1.15,0.72,z,g).rotation.z=-1;at(box(1.0,0.2,0.08,MS(0x2a2018)),0,1.08,0,g);
  const legs=[];for(const [x,z] of[[0.45,0.2],[0.45,-0.2],[-0.45,0.2],[-0.45,-0.2]]){const L=new THREE.Group();L.position.set(x,0.45,z);at(box(0.13,0.45,0.13,c),0,-0.22,0,L);g.add(L);legs.push(L);}g.userData.legs=legs;shadowAll(g);return g;}
function tanukiM(){const g=new THREE.Group();const c=MS(0x7a6a5a,{roughness:1}),d=MS(0x2a2420);at(new THREE.Mesh(new THREE.SphereGeometry(0.32,12,10),c),0,0.42,0,g).scale.set(1.4,0.9,1);at(new THREE.Mesh(new THREE.SphereGeometry(0.2,12,10),c),0.42,0.55,0,g);
  at(box(0.18,0.1,0.32,d),0.5,0.58,0,g);at(new THREE.Mesh(new THREE.ConeGeometry(0.1,0.32,6),d),-0.5,0.4,0,g).rotation.z=1.9;for(const z of[0.1,-0.1])at(box(0.07,0.2,0.07,d),0.16,0.12,z,g);for(const z of[0.1,-0.1])at(box(0.07,0.2,0.07,d),-0.2,0.12,z,g);shadowAll(g);return g;}
function walkLegs(a,t,sp=8){if(a.userData.legs)a.userData.legs.forEach((L,i)=>L.rotation.z=Math.sin(t*sp+(i%2?Math.PI:0)+(i<2?0:Math.PI/2))*0.5);}
// 鎌倉の大仏（青銅・緑青）
function daibutsu(){const g=new THREE.Group();const br=MS(0x6a8a74,{roughness:0.5,metalness:0.45,flatShading:false}),dk=MS(0x2a3a32,{roughness:0.7,metalness:0.4,flatShading:false});
  const ped=new THREE.Mesh(new THREE.CylinderGeometry(7.5,8.5,1.6,32),MS(0x6a665e,{roughness:1}));ped.position.y=0.8;g.add(ped);
  for(let i=0;i<24;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(1.1,10,8),br);const a=i/24*Math.PI*2;p.position.set(Math.cos(a)*6.6,2.0,Math.sin(a)*6.6);p.scale.set(0.6,0.5,1.2);p.rotation.y=-a;g.add(p);}
  const lap=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),br);lap.scale.set(6.6,1.7,4.4);lap.position.set(0,2.9,0.6);g.add(lap);
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),br);body.scale.set(3.9,4.6,2.9);body.position.set(0,6.2,-0.3);body.rotation.x=0.12;g.add(body);
  const sh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),br);sh.scale.set(4.6,1.6,2.8);sh.position.set(0,8.4,0.1);g.add(sh);
  for(const sx of[-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(0.9,3.4,8,12),br);arm.position.set(sx*3.7,6.0,0.9);arm.rotation.set(0.35,0,sx*0.12);g.add(arm);}
  const hands=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),br);hands.scale.set(2.0,0.7,1.2);hands.position.set(0,4.2,2.6);g.add(hands);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.6,1.2,20),br);neck.position.set(0,9.4,0.4);g.add(neck);
  const head=new THREE.Group();head.position.set(0,11.2,0.9);head.rotation.x=0.15;g.add(head);
  const hd=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),br);hd.scale.set(1.75,2.05,1.85);head.add(hd);
  const ush=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),br);ush.scale.set(1.15,0.9,1.15);ush.position.set(0,1.75,-0.15);head.add(ush);
  const curl=new THREE.InstancedMesh(new THREE.SphereGeometry(0.17,8,6),br,420);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(1,1,1);let n=0;
  for(let i=0;i<600&&n<420;i++){const u=Math.random?((i*0.618)%1):0;const th=Math.acos(1-2*((i+0.5)/600));const ph=i*2.399;const x=Math.sin(th)*Math.cos(ph),y=Math.cos(th),z=Math.sin(th)*Math.sin(ph);if(y<0.15||(z>0.55&&y<0.75))continue;
    v.set(x*1.78,y*2.05+0.05,z*1.88);m4.compose(v,q,sc);curl.setMatrixAt(n++,m4);}curl.count=n;head.add(curl);
  for(const sx of[-1,1]){const ear=new THREE.Mesh(new THREE.CapsuleGeometry(0.35,2.2,6,10),br);ear.position.set(sx*1.85,-0.5,0.0);ear.rotation.z=sx*0.08;head.add(ear);
    const eye=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.08,0.1),dk);eye.position.set(sx*0.62,0.15,1.78);eye.rotation.z=sx*-0.12;head.add(eye);
    const brow=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.06,6,16,Math.PI),br);brow.position.set(sx*0.62,0.42,1.74);head.add(brow);}
  const nose=new THREE.Mesh(new THREE.ConeGeometry(0.28,0.7,8),br);nose.position.set(0,-0.25,1.95);nose.rotation.x=0.3;head.add(nose);
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.07,0.1),dk);mouth.position.set(0,-0.95,1.76);head.add(mouth);at(new THREE.Mesh(new THREE.SphereGeometry(0.12,8,6),br),0,0.55,1.85,head);
  shadowAll(g);return g;}
// 石垣（反りのある石積み）
function ishigaki(len=80,h=14,seed=3){const rk=mulberry32(seed);const g=new THREE.Group();const geo=new THREE.BoxGeometry(1,1,1);const N=Math.floor(len/1.3)*Math.floor(h/0.9);const m=new THREE.InstancedMesh(geo,MS(0xffffff,{roughness:1}),N);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(),c=new THREE.Color();let n=0;
  for(let r=0;r*0.9<h;r++){const y=r*0.9;const back=-Math.pow(y/h,1.8)*h*0.55;for(let k=0;k*1.3<len&&n<N;k++){const x=k*1.3+(r%2?0.65:0)-len/2;v.set(x,y+0.45,back);sc.set(1.25-rk()*0.2,0.85-rk()*0.15,1.2);q.setFromEuler(new THREE.Euler(-0.5*y/h,0,(rk()-.5)*0.05));m4.compose(v,q,sc);m.setMatrixAt(n,m4);
    c.setHSL(0.1+rk()*0.08,0.08+rk()*0.08,0.32+rk()*0.16);if(rk()<0.35)c.lerp(new THREE.Color(0x4a6a3a),0.5);m.setColorAt(n,c);n++;}}m.count=n;m.castShadow=m.receiveShadow=true;g.add(m);return g;}

const SC={};
// ===== カット1・2・6：渋谷のようなスクランブル交差点 =====
SC.cross=(()=>{const s=new THREE.Scene();s.fog=new THREE.Fog(0x0a0e1a,60,500);const setSky=dynSky(s);
  const hemi=new THREE.HemisphereLight(0x6a7aa8,0x1a1a22,0.5);s.add(hemi);const sun=new THREE.DirectionalLight(0xffffff,0.3);sun.position.set(-60,90,40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-80;sc.right=80;sc.top=80;sc.bottom=-80;s.add(sun);
  const asphalt=MS(0x2a2c30,{roughness:0.85});const gnd=at(box(400,1,400,asphalt),0,-0.5,0,s);gnd.receiveShadow=true;
  const walkM=MS(0xb8bab8,{roughness:0.9});for(const [x,z,w,d] of[[-36,-36,40,40],[36,-36,40,40],[-36,36,40,40],[36,36,40,40]])at(box(w,0.18,d,walkM),x,0.09,z,s).receiveShadow=true;
  const stripe=MS(0xe8e8e2,{roughness:0.6});const stripes=new THREE.Group();s.add(stripes);
  const zebra=(cx,cz,rot,len)=>{for(let i=-5;i<=5;i++){const b=box(0.5,0.03,len,stripe);b.position.set(cx+Math.cos(rot)*i*1.0,0.02,cz-Math.sin(rot)*i*1.0);b.rotation.y=rot;stripes.add(b);}};
  zebra(0,-13,Math.PI/2,7);zebra(0,13,Math.PI/2,7);zebra(-13,0,0,7);zebra(13,0,0,7);for(const r of[Math.PI/4,-Math.PI/4])for(let i=-9;i<=9;i++){const b=box(0.5,0.025,6,stripe);b.position.set(Math.cos(r)*i*1.0,0.025,-Math.sin(r)*i*1.0);b.rotation.y=r;stripes.add(b);}
  // ビル・大型ビジョン・ネオン
  const blds=[],signs=[];const rk=mulberry32(7);const corners=[[-1,-1],[1,-1],[-1,1],[1,1]];
  corners.forEach(([sx,sz],ci)=>{for(let k=0;k<5;k++){const w=10+rk()*10,d=10+rk()*8,h=22+rk()*55;const b=tower(w,h,d,[0x8a8e96,0xa8a49c,0x6a7078,0xc8c2b8][k%4],LITS[k%3]);const x=sx*(26+(k%3)*14+rk()*4),z=sz*(26+Math.floor(k/3)*16+rk()*4);b.position.x=x;b.position.z=z;s.add(b);blds.push(b);
    if(k<3){const txt=['NEWS','SALE','LIVE','MUSIC','CAFE','24H','NEW','SHOP','GAME','PHOTO','FILM','TOKYO'][ci*3+k];const sg=glowSign(txt,['#1a3a8a','#c81e5a','#0a8a6a','#e86a1a'][(ci+k)%4],'#ffffff',w*0.8,w*0.45);sg.position.set(x-sx*0,h*0.55,z-sz*(d/2+0.15));sg.rotation.y=sz>0?Math.PI:0;s.add(sg);signs.push(sg);
      const vs=vertSign(['カラオケ','ラーメン','ドラッグ','居酒屋','書店','靴','服','電器'][(ci*2+k)%8],['#ff3a6a','#ffcf2a','#3ad8ff','#ff8a2a'][(ci+k)%4],'#1a0a14',1.6,8);vs.position.set(x-sx*(w/2+0.4),h*0.3,z-sz*(d/2-2));vs.rotation.y=sx>0?-Math.PI/2:Math.PI/2;s.add(vs);signs.push(vs);}}});
  // 信号機
  for(const [x,z] of[[-10,-10],[10,-10],[-10,10],[10,10]]){const g=new THREE.Group();at(cyl(0.12,0.12,5,MS(0x6a6a6a),6),0,2.5,0,g);at(box(1.6,0.5,0.4,MS(0x2a2a2a)),0.6,4.8,0,g);const l=at(new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),new THREE.MeshBasicMaterial({color:0x2aff8a,toneMapped:false})),0.1,4.8,0.22,g);g.userData.l=l;g.position.set(x,0,z);s.add(g);signs.push(l);}
  // 車（止まっている）
  const cars=[];[[-22,-3,Math.PI/2,0xd8d8d8,'suv'],[-30,3,-Math.PI/2,0x2a2a2a,'kei'],[22,3,-Math.PI/2,0xc83a3a,'suv'],[3,-24,0,0x2f6db0,'kei'],[-3,26,Math.PI,0xe8e0c8,'truck'],[30,-3,Math.PI/2,0x4a4a4a,'suv']].forEach(c=>{const v=vehicle(c[4],c[3]);v.position.set(c[0],0,c[1]);v.rotation.y=c[2];s.add(v);cars.push(v);});
  // 群衆
  const N=170;const cr=crowd(s,N);const P=[];for(let i=0;i<N;i++){const mode=rk();let x0,z0,dx,dz;if(mode<0.3){x0=-16+rk()*32;z0=(rk()<.5?-1:1)*(10+rk()*6);dx=0;dz=-Math.sign(z0)*1;}else if(mode<0.6){z0=-16+rk()*32;x0=(rk()<.5?-1:1)*(10+rk()*6);dz=0;dx=-Math.sign(x0)*1;}
    else if(mode<0.85){const a=(rk()<.5?1:-1)*Math.PI/4+(rk()<.5?0:Math.PI);x0=Math.cos(a)*14*(rk()*.6+.4);z0=Math.sin(a)*14*(rk()*.6+.4);dx=-Math.cos(a);dz=-Math.sin(a);}else{x0=(rk()<.5?-1:1)*(18+rk()*14);z0=(rk()<.5?-1:1)*(18+rk()*14);dx=(rk()-.5);dz=(rk()-.5);}
    P.push([x0,z0,dx,dz,0.9+rk()*0.6,rk()*6]);}
  // 手前を歩く人（手足付き）
  const walkers=[];const WC=[0x2a2f3a,0xe8e2d8,0x3a5a8a,0x8a3a3a,0x4a4a4a,0xd8c8a8,0x5a6a4a,0xc8a0b8,0x2a5a6a,0xb85a2a];
  for(let i=0;i<34;i++){const p=human({hd:true,coat:WC[i%WC.length],pants:[0x2a2a30,0x3a4a6a,0x5a4a3a,0x1a1a1a][i%4],style:i%3?'short':'long',shoes:[0xeeeeee,0x2a2a2a][i%2]});
    const dir=i%4,lane=(rk()-.5)*6;let x0,z0,dx,dz;if(dir<2){x0=-14+rk()*28;z0=dir?-4+lane:4+lane;dx=dir?1:-1;dz=0;}else{z0=-14+rk()*28;x0=dir===2?-3+lane:3+lane;dz=dir===2?1:-1;dx=0;}
    if(i%5===0){x0=(rk()-.5)*10;z0=(rk()-.5)*10;const a=rk()*6.28;dx=Math.cos(a);dz=Math.sin(a);}
    p.userData.w=[x0,z0,dx,dz,1.1+rk()*0.5,rk()*6];s.add(p);walkers.push(p);}
  // 10年後用：草・ひび・苔
  const grass=grassField(s,9000,rk=>{const x=(rk()-.5)*90,z=(rk()-.5)*90;return [x,0.0,z];},11,{r:0.45,h:1.0});const bush=trees(s,40,rk=>{let x,z;do{x=(rk()-.5)*90;z=(rk()-.5)*90;}while(Math.abs(x)<16&&Math.abs(z)<16);return [x,0,z];},12,{h:3.5});
  const crack=new THREE.Group();s.add(crack);const rk2=mulberry32(5);for(let i=0;i<60;i++){const b=box(0.18,0.03,2+rk2()*6,MS(0x3a4a2a));b.position.set((rk2()-.5)*30,0.04,(rk2()-.5)*30);b.rotation.y=rk2()*3;crack.add(b);}
  const fl=floaters(s,200,[0,6,0],50,14,0xffffff,0.08,0.5);
  function setMode(m){const night=false;const ruin=m==='ruin';grass.visible=bush.visible=crack.visible=ruin;cr.body.visible=cr.head.visible=!ruin;walkers.forEach(p=>p.visible=!ruin);
    if(night){setSky('#0a1028','#2a3a6a');s.fog.color.set(0x1a2448);s.fog.near=80;s.fog.far=600;hemi.color.set(0x9aa8d8);hemi.groundColor.set(0x4a4038);hemi.intensity=1.1;sun.intensity=0.5;}else{setSky('#5a8ac8','#dce8e0');s.fog.near=80;s.fog.far=600;hemi.color.set(0xdfeeff);hemi.groundColor.set(0x4a5a3a);hemi.intensity=0.95;sun.intensity=2.2;}
    blds.forEach(b=>{b.material.emissiveIntensity=night?1.0:0;b.material.color.set(night?0xffffff:0x9a9890);});signs.forEach(sg=>{if(sg.material.emissiveIntensity!==undefined)sg.material.emissiveIntensity=night?1.2:0.0;sg.material.color&&sg.material.color.set(night?0xffffff:0x6a6a62);});
    stripes.children.forEach(b=>b.material.color.set(ruin?0x9a9a8e:0xf2f2ec));if(!ruin){signs.forEach(sg=>{if(sg.material.emissiveIntensity!==undefined)sg.material.emissiveIntensity=0.55;sg.material.color&&sg.material.color.set(0xffffff);});}cars.forEach(c=>c.traverse(o=>{if(o.isMesh&&ruin&&!o.userData.rusted&&o.material.metalness>0.2&&(o.userData.rusted=1)){o.material=o.material.clone();o.material.color.lerp(new THREE.Color(0x7a4a2a),0.55);o.material.metalness=0.1;o.material.roughness=0.95;}}));}
  return {s,cr,P,setMode,update(t,gone){fl(t);walkers.forEach(p=>{const w=p.userData.w;const x=w[0]+w[2]*t*w[4],z=w[1]+w[3]*t*w[4];p.visible=!gone&&p.visible;if(gone)p.visible=false;p.position.set(x,0.18,z);p.rotation.y=Math.atan2(w[2],w[3]);walkAnim(p,t+w[5],7*w[4],0.5);});for(let i=0;i<N;i++){const p=P[i];const tt=t*p[4];const x=p[0]+p[2]*tt,z=p[1]+p[3]*tt;const near=Math.abs(x)<9&&Math.abs(z)<9;cr.set(i,gone||near?9999:x,0,z,Math.atan2(p[2],p[3]),Math.abs(Math.sin(tt*6+p[5]))*0.05);}cr.done();}};})();
// ===== カット3：東京の夜景が消えていく =====
SC.night=(()=>{const s=new THREE.Scene();s.fog=new THREE.Fog(0x0a1020,400,4200);const setSky=dynSky(s);setSky('#020410','#1a2444');
  s.add(new THREE.HemisphereLight(0x3a4a7a,0x050508,0.35));const gnd=at(box(9000,1,9000,MS(0x0c0e14)),0,-0.5,0,s);
  const rk=mulberry32(9);const B=[];const lit=[litWinTex(21,0.6),litWinTex(22,0.5),litWinTex(23,0.75)];
  for(let i=0;i<1400;i++){const r=Math.sqrt(rk())*2600,a=rk()*6.283;const x=Math.cos(a)*r,z=Math.sin(a)*r-600;const h=(r<700?30+rk()*rk()*150:8+rk()*rk()*40);const w=10+rk()*18;const b=tower(w,h,w*(0.7+rk()*0.6),0x3a3e48,lit[i%3]);b.position.set(x,0,z);b.material.emissiveIntensity=1.6;b.material.color.set(0x1a1c24);s.add(b);B.push([b,x,z]);}
  // 道路の明かり（点）
  const N=6000,pos=new Float32Array(N*3);for(let i=0;i<N;i++){const r=Math.sqrt(rk())*2800,a=rk()*6.283;const g=rk()<0.5;pos[i*3]=g?Math.round(Math.cos(a)*r/60)*60:Math.cos(a)*r;pos[i*3+1]=1;pos[i*3+2]=(g?Math.sin(a)*r:Math.round(Math.sin(a)*r/60)*60)-600;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));const pm=new THREE.PointsMaterial({color:0xffc070,size:9,map:DOT,transparent:true,depthWrite:false,toneMapped:false,fog:false});s.add(new THREE.Points(geo,pm));
  const tt=tokyoTower(false);tt.scale.setScalar(2.4);tt.position.set(120,0,-500);s.add(tt);const tl=new THREE.PointLight(0xff8a3a,0,600);tl.position.set(120,120,-460);s.add(tl);
  const stars=(()=>{const n=1200,p=new Float32Array(n*3);for(let i=0;i<n;i++){const a=rk()*6.283,u=0.05+rk()*0.9;p[i*3]=Math.cos(a)*4000;p[i*3+1]=u*3000;p[i*3+2]=Math.sin(a)*4000;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const m=new THREE.PointsMaterial({color:0xffffff,size:6,map:DOT,transparent:true,opacity:0,depthWrite:false,fog:false});s.add(new THREE.Points(g,m));return m;})();
  return {s,update(t,k){// k：消灯の進み 0→1（西から東へ波のように）
    B.forEach(([b,x,z])=>{const off=clamp((k*3400-(x+1700)-((z+600)*0.2))/300,0,1);b.material.emissiveIntensity=1.6*(1-off);});pm.opacity=1-clamp(k*1.3,0,1);tl.intensity=(1-clamp(k*1.6,0,1))*3;
    tt.traverse(o=>{if(o.isMesh)o.material.emissive&&o.material.emissive.set(0xff5a1a),o.material.emissiveIntensity=(1-clamp(k*1.6,0,1))*0.6;});stars.opacity=clamp((k-0.4)*1.8,0,1);}};})();
// ===== カット4：地下鉄のホームが水に沈む =====
SC.sub=(()=>{const s=new THREE.Scene();s.background=new THREE.Color(0x05080c);s.fog=new THREE.Fog(0x0a1218,20,120);s.add(new THREE.HemisphereLight(0xe8f0f8,0x50585c,2.0));
  platformJ(s,{sign:'しぶや'});at(box(14,0.4,160,MS(0x3a3a3a)),6,-1.2,0,s);for(const x of[3.6,8.4])at(box(0.12,0.16,160,MS(0x8a8a8a,{metalness:0.6})),x,-0.92,0,s);
  at(box(1,9,160,MS(0x5a5e62)),13.5,3,0,s);at(box(30,1,160,MS(0x6a6e72)),0,7.6,0,s);at(box(1,9,160,MS(0xd8d4cc)),-11.5,3,0,s);
  const lamps=[];for(let z=-70;z<=70;z+=8){const l=new THREE.Mesh(new THREE.BoxGeometry(3,0.12,0.3),new THREE.MeshBasicMaterial({color:0xeaf6ff,toneMapped:false}));l.position.set(-5,7.0,z);s.add(l);lamps.push(l);}
  const pl=new THREE.PointLight(0xffe0c0,60,60);pl.position.set(-4,6,-6);s.add(pl);const red=new THREE.PointLight(0xff3a2a,0,30);red.position.set(-4,6,6);s.add(red);
  const train=new THREE.Group();const body=MS(0xd8dce0,{roughness:0.35,metalness:0.5,flatShading:false}),line=MS(0xf08a1a,{roughness:0.5}),win=MS(0x1a2430,{roughness:0.1,metalness:0.6}),dr=MS(0xb8bcc2,{metalness:0.5});
  for(let k=0;k<4;k++){const z=-8-k*20.5;const car=new THREE.Group();at(box(2.9,3.4,20,body),0,1.7,0,car);at(box(2.95,0.35,20,line),0,2.55,0,car);at(box(2.95,0.12,20,line),0,0.55,0,car);
    for(let j=-3;j<=3;j++){at(box(2.96,1.0,1.6,win),0,2.0,j*2.7,car);}for(const j of[-7.2,-2.4,2.4,7.2]){at(box(2.97,2.3,1.3,dr),0,1.35,j,car);at(box(2.98,0.9,0.5,win),0,2.0,j,car);}
    at(box(2.6,0.3,19.6,MS(0x3a3a3a)),0,3.5,0,car);car.position.set(6,-0.75,z);train.add(car);}
  const front=new THREE.Group();at(box(2.9,3.4,0.3,body),0,1.7,0,front);at(box(2.4,1.2,0.32,win),0,2.3,0,front);for(const x of[-0.9,0.9])at(new THREE.Mesh(new THREE.CircleGeometry(0.18,12),new THREE.MeshBasicMaterial({color:0xfff2c8,toneMapped:false})),x,1.0,0.17,front);
  at(box(1.4,0.35,0.33,MS(0x1a1a1a)),0,3.05,0,front);front.position.set(6,-0.75,2.2);train.add(front);shadowAll(train);s.add(train);
  const w=waterPlane(40,170,60,0x1f4a5a);w.mesh.material.transparent=true;w.mesh.material.opacity=0.85;s.add(w.mesh);
  // 置き去りの物（傘・カバン）
  at(box(0.4,0.3,0.15,MS(0x3a2a1a)),-3.5,1.25,-4,s);const umb=at(cyl(0.02,0.02,0.9,MS(0x2a2a2a),4),-4.4,1.55,-1.5,s);umb.rotation.z=0.4;
  const vend=vending(true,false);vend.position.set(-10.4,1.1,-12);vend.rotation.y=Math.PI/2;s.add(vend);
  return {s,update(t,k){const lv=lerp(-1.3,3.9,k);w.update(t,0.05+0.1*k);w.mesh.position.y=lv;lamps.forEach((l,i)=>l.visible=!(k>0.35&&(i%3===0))&&!(k>0.7&&i%2===0));pl.intensity=60*(1-k*0.5)*(0.85+0.15*Math.sin(t*37));red.intensity=k>0.3?12*(0.5+0.5*Math.sin(t*6)):0;}};})();
// ===== カット5：大通りに動物 =====
SC.street=(()=>{const s=sky('#7aa8d8','#e8f0e0',60,500);lights(s,Object.assign({},WARM,{sz:40,dir:[-50,70,30]}));
  const gnd=at(box(400,1,400,MS(0x4a4c50)),0,-0.5,0,s);gnd.receiveShadow=true;for(const x of[-11,11])at(box(6,0.2,400,MS(0xa8a49c)),x,0.1,0,s);
  const rk=mulberry32(31);for(const sx of[-1,1])for(let z=-160;z<40;z+=16){const h=18+rk()*40;const b=building(12,h,14,[0xd8d2c8,0xb8bcc2,0xc8c0b0][(z/16+3)%3|0]);b.position.set(sx*21,0,z);s.add(b);}
  grassField(s,5000,rk=>{const ax=rk()<0.6?(rk()<.5?-1:1)*(7.5+rk()*6):(rk()-.5)*15;return [ax,0,-120+rk()*118];},4,{r:0.3,h:0.8});
  const cars=[];[[-3,-6,0.1,0xd0d0d0,'suv'],[3.2,-18,3.1,0x2a4a7a,'kei'],[-3.5,-34,0.05,0xa83a2a,'suv'],[3,-50,3.2,0xe8e0c8,'truck']].forEach(c=>{const v=vehicle(c[4],c[3]);v.position.set(c[0],0,c[1]);v.rotation.y=c[2];s.add(v);cars.push(v);});
  // ツタ（車とビルに緑の塊）
  const vine=trees(s,50,rk=>{const c=cars[(rk()*cars.length)|0];return [c.position.x+(rk()-.5)*2,0.5+rk()*1.2,c.position.z+(rk()-.5)*4];},6,{h:1.4});
  const deer=deerM();deer.position.set(-1.0,0,-9);deer.rotation.y=-Math.PI/2+0.3;s.add(deer);const deer2=deerM();deer2.position.set(1.5,0,-15);deer2.rotation.y=-Math.PI/2-0.2;deer2.scale.setScalar(0.9);s.add(deer2);
  const boar=boarM();boar.position.set(2.2,0,-6);boar.rotation.y=Math.PI*0.75;s.add(boar);const tanuki=tanukiM();tanuki.position.set(-4.6,0,-3.5);tanuki.rotation.y=-0.5;s.add(tanuki);
  const b1=bubble('シカ','#8a4a1a');s.add(b1);const b2=bubble('イノシシ','#3a2a1a');s.add(b2);const b3=bubble('タヌキ','#5a4a3a');s.add(b3);
  const birds=[];for(let i=0;i<5;i++){const b=bird(0x2a2a2a,1.0);s.add(b);birds.push(b);}
  return {s,update(t){deerAnim(deer,t,0);deerAnim(deer2,t,1);walkLegs(boar,t);deer.position.z=-9+t*0.4;boar.position.x=2.2-t*0.25;
    b1.position.set(deer.position.x+0.5,3.4,deer.position.z);b2.position.set(boar.position.x,1.9,boar.position.z);b3.position.set(tanuki.position.x,1.5,tanuki.position.z);
    birds.forEach((b,i)=>{birdAnim(b,t,i);b.position.set(-10+i*5+t*2,16+i,-40-i*6);});}};})();
// ===== カット7：住宅街がくずれる =====
SC.house=(()=>{const s=sky('#8aa0b8','#e0e4dc',40,400);lights(s,Object.assign({},WARM,{sunI:1.8,sz:50,dir:[-40,60,50]}));
  const gnd=at(box(400,1,400,MS(0x5a6a3a)),0,-0.5,0,s);gnd.receiveShadow=true;at(box(6,0.08,400,MS(0x4a4a44)),0,0.04,0,s);
  const H=[];const rk=mulberry32(41);for(const sx of[-1,1])for(let z=-120;z<30;z+=14){const h=houseM({});h.position.set(sx*(10+rk()*2),0,z);h.rotation.y=sx>0?-Math.PI/2:Math.PI/2;s.add(h);H.push([h,rk()*0.6,rk(),sx]);}
  grassField(s,6000,rk=>[(rk()-.5)*60,0,-130+rk()*140],8,{r:0.4,h:1.4});trees(s,120,rk=>[(rk()<.5?-1:1)*(4+rk()*30),0,-130+rk()*160],9,{h:7});
  return {s,update(t,k){H.forEach(([h,d,r,sx])=>{const c=clamp((k-d)*2.2,0,1);const roof=h.children[1];if(roof){roof.position.y=lerp(roof.userData.y0??(roof.userData.y0=roof.position.y),roof.userData.y0*0.35,c);roof.rotation.z=c*0.35*(r-.5);}
      const body=h.children[0];if(body){body.scale.y=1-c*0.55;body.position.y=(body.userData.y0??(body.userData.y0=body.position.y))*(1-c*0.55);body.rotation.z=c*0.08*(r-.5);}});}};})();
// ===== カット8：さびた東京タワーが倒れる =====
SC.tower=(()=>{const s=sky('#7a8a9a','#d8d4c8',80,700);lights(s,Object.assign({},WARM,{sunI:1.8,sz:120,dir:[-80,100,60]}));
  const gnd=at(box(1000,1,1000,MS(0x4a5a34)),0,-0.5,0,s);gnd.receiveShadow=true;
  const tt=tokyoTower(false);tt.traverse(o=>{if(o.isMesh){o.material=o.material.clone();const c=o.material.color;o.material.color.set(c.r>0.8&&c.g<0.5?0x8a3a1a:0x9a8a78);o.material.roughness=1;}});
  const pivot=new THREE.Group();pivot.position.set(0,0,0);pivot.add(tt);tt.scale.setScalar(1.2);s.add(pivot);
  const rk=mulberry32(51);for(let i=0;i<60;i++){const r=40+rk()*260,a=rk()*6.283;const h=10+rk()*30;const b=building(10+rk()*10,h,10+rk()*10,0x8a8a84);b.position.set(Math.cos(a)*r,-rk()*h*0.4,Math.sin(a)*r);b.rotation.z=(rk()-.5)*0.1;s.add(b);}
  trees(s,700,rk=>{const r=20+rk()*400,a=rk()*6.283;return [Math.cos(a)*r,0,Math.sin(a)*r];},52,{h:12});
  const dust=rising(s,300,[40,0,0],80,10,2.5,0xd8c8a8,0.35,0.6);
  return {s,update(t,k){dust(t);pivot.rotation.z=Math.pow(clamp(k,0,1),2.4)*1.35;}};})();
// ===== カット9：森になった東京と崩れた橋 =====
SC.forest=(()=>{const s=sky('#4a7ac0','#cfe0d8',600,4200);lights(s,Object.assign({},WARM,{sz:600,dir:[-300,400,200]}));
  const gnd=at(box(6000,1,6000,MS(0x3a5a2a)),0,-0.5,0,s);const sea=waterPlane(4000,1600,40,0x2a6a8a);sea.mesh.position.set(0,0.3,900);s.add(sea.mesh);
  const rk=mulberry32(61);for(let i=0;i<260;i++){const r=Math.sqrt(rk())*1100,a=rk()*Math.PI-Math.PI;const x=Math.cos(a)*r,z=Math.sin(a)*r*0.8-100;const h=20+rk()*rk()*140;const b=building(14+rk()*16,h*(0.5+rk()*0.5),14+rk()*14,[0x8a8a84,0x7a7e78,0x9a968a][i%3]);b.position.set(x,0,z);b.rotation.set((rk()-.5)*0.06,0,(rk()-.5)*0.06);s.add(b);}
  trees(s,5200,rk=>{const r=Math.sqrt(rk())*1400,a=rk()*Math.PI-Math.PI;return [Math.cos(a)*r,0,Math.sin(a)*r*0.8-100];},62,{h:22});
  // レインボーブリッジ風の吊り橋（崩れていく）
  const br=new THREE.Group();const wm=MS(0xf2f0ea,{roughness:0.6}),dk=MS(0xb8b8b0,{roughness:0.7});const parts=[];
  for(const x of[-140,140]){const t=new THREE.Group();for(const z of[-11,11])at(box(7,126,5,wm),0,63,z,t);for(const y of[40,85,120])at(box(7,6,27,wm),0,y,0,t);t.position.x=x;br.add(t);parts.push([t,x<0?0.35:0.7,x<0?0.25:-0.3,'tower']);}
  const seg=24;for(let i=0;i<seg;i++){const x0=-300+i*25;const d=new THREE.Group();at(box(25.5,3,26,dk),0,0,0,d);at(box(25.5,2.5,22,wm),0,-7,0,d);for(const z of[-12,12])at(box(25.5,1.2,0.6,MS(0xd8d8d0)),0,1.8,z,d);d.position.set(x0+12.5,48,0);br.add(d);
    const mid=Math.abs(x0+12.5);parts.push([d,0.1+clamp(1-mid/300,0,1)*0.45+((i*37)%10)/40,((i*53)%7-3)*0.06,'deck']);}
  const cab=(z)=>{const pts=[];for(let i=0;i<=60;i++){const x=-300+i*10;const ax=Math.abs(x);const y=ax<140?126-110*(1-Math.pow(ax/140,2)):126-(ax-140)/160*76;pts.push(new THREE.Vector3(x,Math.max(50,ax<140?16+ax*ax/140/140*110:y),z));}
    const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),120,0.9,6,false),wm);br.add(m);parts.push([m,0.3,0,'cable']);};cab(-12);cab(12);
  br.traverse(o=>o.isMesh&&(o.castShadow=true));br.position.set(60,0,620);br.rotation.y=-0.25;s.add(br);parts.forEach(p=>{p[4]=p[0].position.clone();p[5]=p[0].rotation.clone();});
  const splash=rising(s,300,[60,2,620],260,20,4,0xffffff,0.5,2.0);
  const birds=[];for(let i=0;i<8;i++){const b=bird(0xffffff,3);s.add(b);birds.push(b);}
  return {s,update(t,k){sea.update(t,0.3);splash(t);birds.forEach((b,i)=>{birdAnim(b,t,i);b.position.set(-200+i*60+t*8,180+i*10,200+i*20);});
    parts.forEach(([o,d,r,kind,p0,r0])=>{const f=clamp((k-d)/0.35,0,1),e=f*f;if(kind==='deck'){o.position.y=p0.y-e*50;o.rotation.z=r0.z+r*e*6;o.rotation.x=e*0.3*(r>0?1:-1);}else if(kind==='tower'){o.rotation.z=r*e;o.position.y=p0.y-e*10;}else{o.position.y=p0.y-e*40;o.visible=f<0.95;}});}};})();
// ===== カット10c：万里の長城 =====
SC.wall=(()=>{const s=sky('#4a7ac8','#ffe0b0',300,4200);s.add(new THREE.HemisphereLight(0xffe0c0,0x5a5a40,1.0));const sun=new THREE.DirectionalLight(0xffd8a0,2.6);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.bias=-0.0004;s.add(sun,sun.target);
  terrain(s,{});const GW=greatWall(s,{z0:28,len:3000,step:8,towerEvery:40,towerFirst:0});skyline(s,'hills',4200,0x9a9ab0,40,[Math.PI*1.15,Math.PI*1.85]);
  const f=new THREE.Vector3(pathX(-700),GW.yAt(-700),-700);sun.position.copy(f).add(new THREE.Vector3(-300,200,200));sun.target.position.copy(f);const c=sun.shadow.camera;c.left=-400;c.right=400;c.top=400;c.bottom=-400;c.far=2000;
  return {s,GW,update(t){}};})();
// ===== カット10a：ピラミッド =====
SC.pyr=(()=>{const s=sky('#3a7ad8','#f0dcb0',400,4000);lights(s,Object.assign({},WARM,{sunI:2.6,sz:200,dir:[-200,160,120]}));const g=at(box(8000,1,8000,MS(0xd8b880)),0,-0.5,0,s);g.receiveShadow=true;
  const pm=MS(0xd8c090,{roughness:0.95});const P=(h,b)=>{const m=new THREE.Mesh(new THREE.ConeGeometry(b*0.7071,h,4,1),pm);m.rotation.y=Math.PI/4;m.position.y=h/2;m.castShadow=m.receiveShadow=true;return m;};
  const p1=P(139,230);s.add(p1);const p2=P(136,215);p2.position.set(-360,68,-300);s.add(p2);const p3=P(62,103);p3.position.set(-620,31,-560);s.add(p3);
  skyline(s,'hills',3000,0xe0c898,30,[Math.PI*1.1,Math.PI*1.9]);const dust=rising(s,200,[0,2,120],300,10,3,0xf0d8a8,0.3,1.0);return {s,update(t){dust(t);}};})();
// ===== カット10：森に残る石垣 =====
SC.stone=(()=>{const s=sky('#6a8a7a','#d8e0c8',40,300);lights(s,Object.assign({},WARM,{sunI:1.6,sz:60,dir:[-40,60,60]}));
  const gnd=at(box(600,1,600,MS(0x3a4a28)),0,-0.5,0,s);const moat=waterPlane(200,30,40,0x2a4a3a);moat.mesh.position.set(0,0.2,14);s.add(moat.mesh);
  const w=ishigaki(110,15,3);w.position.set(0,0,0);s.add(w);const top=at(box(110,1,30,MS(0x3a5a2a)),0,15.2,-20,s);
  trees(s,300,rk=>[(rk()-.5)*160,15.5,-12-rk()*80],71,{h:12});trees(s,160,rk=>[(rk()-.5)*200,0,32+rk()*60],72,{h:10});
  grassField(s,1600,rk=>[(rk()-.5)*110,rk()*14,-(rk()*14)*0.4],73,{r:0.3,h:0.7});
  const fl=floaters(s,200,[0,6,8],60,10,0xfff0c0,0.1,0.5);return {s,update(t){moat.update(t,0.08);fl(t);}};})();
// ===== カット11：星空の下の大仏 =====
SC.buddha=(()=>{const s=new THREE.Scene();s.fog=new THREE.Fog(0x0a1424,40,260);const setSky=dynSky(s);setSky('#02040e','#14284a');
  s.add(new THREE.HemisphereLight(0x8aa8d8,0x1a2018,0.7));const moon=new THREE.DirectionalLight(0xdfe8ff,2.6);moon.position.set(-30,50,40);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);const c=moon.shadow.camera;c.left=-30;c.right=30;c.top=30;c.bottom=-30;s.add(moon);
  const rim=new THREE.DirectionalLight(0x8ab8ff,1.2);rim.position.set(20,20,-40);s.add(rim);
  const gnd=at(box(400,1,400,MS(0x1e2a1a)),0,-0.5,0,s);gnd.receiveShadow=true;const B=daibutsu();s.add(B);
  trees(s,260,rk=>{const a=rk()*Math.PI*1.2+Math.PI*0.9,r=18+rk()*60;return [Math.cos(a)*r,0,Math.sin(a)*r-5];},81,{h:5});grassField(s,1500,rk=>{const a=rk()*6.283,r=9+rk()*30;return [Math.cos(a)*r,0,Math.sin(a)*r];},82,{r:0.4,h:1.0});
  const n=2000,p=new Float32Array(n*3);const rk=mulberry32(83);for(let i=0;i<n;i++){const a=rk()*6.283,u=0.08+rk()*0.9;p[i*3]=Math.cos(a)*600;p[i*3+1]=u*500;p[i*3+2]=Math.sin(a)*600;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));s.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2.2,map:DOT,transparent:true,depthWrite:false,fog:false})));
  const ff=floaters(s,120,[0,2,8],30,5,0xd8ff8a,0.12,0.9);return {s,B,update(t){ff(t);}};})();

const CAM=new THREE.PerspectiveCamera(55,W/H,0.1,12000);
// ===== 時間 =====
const CUTS=[0,3,5,11,17,23,29,35,41,47,53,60];
const YR=31557600;
const KEY=[[3,0],[5,40],[11,24*3600],[17,2*86400],[23,YR],[29,10*YR],[35,50*YR],[41,100*YR],[47,300*YR],[47.6,1e4*YR]];
function secOf(T){if(T<=3)return 0;if(T>=47.6)return 1e4*YR;for(let i=1;i<KEY.length;i++)if(T<KEY[i][0]){const a=KEY[i-1],b=KEY[i];const k=(T-a[0])/(b[0]-a[0]);if(a[1]<=0)return b[1]*k*k;return Math.exp(Math.log(a[1])+(Math.log(b[1])-Math.log(a[1]))*k);}return 1e7*YR;}
function fmt(sec){if(sec<86400){const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s2=Math.floor(sec%60);return [h,m,s2].map(x=>String(x).padStart(2,'0')).join(':');}
  if(sec<YR)return Math.floor(sec/86400)+'<span class="u">日</span>';const y=sec/YR;if(y<1e4)return Math.floor(y).toLocaleString('en-US')+'<span class="u">年</span>';return Math.floor(y/1e4).toLocaleString('en-US')+'<span class="u">万年</span>';}
// ===== テキスト =====
const L=document.getElementById('layers');
function el(html,cls='ov',style=''){const d=document.createElement('div');d.className=cls;d.style.cssText=style;d.innerHTML=html;L.appendChild(d);return d;}
function show(e,o,tf){e.style.opacity=o;if(tf!==undefined)e.style.transform=tf;e.style.display=o>0.001?'block':'none';}
const SH='text-shadow:0 6px 0 rgba(0,0,0,.35),0 0 24px rgba(0,0,0,.5);';
el('<style>.u{font-size:.5em}</style>','ov','');
el('','ov','left:0;top:0;width:1080px;height:780px;background:linear-gradient(rgba(6,8,20,.66),rgba(6,8,20,0))');
el('','ov','left:0;top:1450px;width:1080px;height:470px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.4))');
const TTL=el(`<div style="font-size:34px;font-weight:700;letter-spacing:.5em;color:#ffcf9a">SIMULATION</div><div class="serif" style="margin-top:10px;font-size:82px;font-weight:900;line-height:1.3;${SH}">もしもこの世から<br><span style="color:#ff9a3a;font-size:116px">人間</span>が消えたら？</div>`,'ov big','top:150px');
const TTL2=el(`<div class="serif" style="font-size:54px;font-weight:900;${SH}">もしもこの世から<span style="color:#ff9a3a">人間</span>が消えたら？</div>`,'ov big','top:70px');
const TM=el(`<div id="tml" style="font-size:30px;font-weight:700;color:#ffd2a8;letter-spacing:.2em;${SH}">人間が消えるまで</div>
 <div id="tmn" style="font-size:180px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums;text-shadow:0 0 30px rgba(255,120,40,.9),0 0 80px rgba(255,80,20,.6)">0:03.00</div>
 <div style="margin:14px auto 0;width:760px;height:16px;border-radius:8px;background:rgba(255,255,255,.2);overflow:hidden"><div id="tmb" style="width:0%;height:100%;background:linear-gradient(90deg,#ff5a2a,#ffd27a)"></div></div>`,'ov big','top:520px;transform-origin:50% 0');
const CTA=el(`<div style="font-size:40px;font-weight:700;color:#ffd2a8;letter-spacing:.2em">この動画が面白かったら</div>
 <div class="serif" style="margin-top:20px;font-size:80px;font-weight:900;line-height:1.35;${SH}"><span style="color:#ff9a3a">フォロー</span>で<br>次の「もしも」が届きます</div>
 <div style="margin:60px auto 0;display:inline-block;background:#ff6a2a;color:#fff;font-size:64px;font-weight:900;padding:22px 64px;border-radius:80px;box-shadow:0 10px 0 #b8400e">＋ フォローする</div>
 <div style="margin-top:80px;font-size:50px;font-weight:900;line-height:1.5;${SH}">コメント欄の<span style="color:#ffd27a">2択</span>にも<br>答えてね👇</div>`,'ov big','top:600px');
const HD=el('<div class="serif shadow" id="hdt" style="font-size:84px;font-weight:900;line-height:1.25"></div><div class="shadow" id="sbt" style="margin-top:18px;display:inline-block;font-size:42px;font-weight:900;background:rgba(10,14,22,.66);padding:8px 22px;border-radius:12px"></div>','ov big','top:1180px');
const LINES=[{a:3.2,b:4.9,h:'世界から<br><em style="color:#ffc93c">人間</em>が消える',s:''},{a:5.3,b:10.9,h:'<em style="color:#ffc93c">24時間</em>で<br>東京が真っ暗に',s:'発電所が止まる'},{a:11.3,b:16.9,h:'<em style="color:#ffc93c">2日後</em><br>地下鉄が水に沈む',s:'排水ポンプが止まる'},
 {a:17.3,b:22.9,h:'<em style="color:#ffc93c">1年後</em><br>街に動物が戻る',s:''},{a:23.3,b:28.9,h:'<em style="color:#ffc93c">10年後</em><br>道路が草におおわれる',s:''},{a:29.3,b:34.9,h:'<em style="color:#ffc93c">50年後</em><br>ほとんどの家がくずれる',s:''},
 {a:35.3,b:40.9,h:'<em style="color:#ffc93c">100年後</em><br>さびた東京タワーが倒れる',s:''},{a:41.3,b:46.9,h:'<em style="color:#ffc93c">300年後</em><br>東京は森になる',s:'世界の橋の多くが落ちる'},{a:47.2,b:52.0,h:'<em style="color:#ffc93c">1万年後</em><br>残るのは<br>石や銅でできたものだけ',s:''}];
// ===== 描画 =====
window.renderFrame=function(T){const c=CAM;c.up.set(0,1,0);c.fov=55;let s;renderer.setClearColor(0x000000,1);renderer.clear();
  if(T<5){const S=SC.cross;S.setMode('day');S.update(T,T>=3);s=S.s;c.position.set(-7+T*0.35,3.6-T*0.1,9.5-T*0.2);c.lookAt(6,1.6,-10);}
  else if(T<11){const S=SC.night;const u=(T-5)/6;S.update(T,smooth(0.05,0.95,u));s=S.s;c.fov=55;c.position.set(-200+u*120,380-u*40,500);c.lookAt(80,0,-700);}
  else if(T<17){const S=SC.sub;const u=(T-11)/6;S.update(T,smooth(0.0,0.92,u));s=S.s;c.position.set(-2.0,5.9,18);c.lookAt(4.5,1.0,-30);}
  else if(T<23){const S=SC.street;const u=(T-17)/6;S.update(T-17);s=S.s;c.position.set(lerp(-1,1,u),3.2,8-u*1.5);c.lookAt(0,1.6,-14);}
  else if(T<29){const S=SC.cross;S.setMode('ruin');S.update(T,true);s=S.s;const u=(T-23)/6;c.position.set(-12+u*3,16-u*2,14-u*2);c.lookAt(10,3,-14);}
  else if(T<35){const S=SC.house;const u=(T-29)/6;S.update(T,u);s=S.s;c.position.set(5,7+u*1,12-u*3);c.lookAt(-10,2,-26);}
  else if(T<41){const S=SC.tower;const u=(T-35)/6;S.update(T,smooth(0.1,0.95,u));s=S.s;c.position.set(30,28,170);c.lookAt(-10,50-u*22,0);}
  else if(T<47){const S=SC.forest;const u=(T-41)/6;S.update(T,smooth(0.05,0.95,u));s=S.s;c.fov=55;c.position.set(-260+u*60,140-u*20,1050);c.lookAt(60,40,620);}
  else if(T<48.5){const S=SC.pyr;const u=(T-47)/1.5;S.update(T);s=S.s;c.position.set(430-u*40,36+u*8,620);c.lookAt(-160,55,-220);}
  else if(T<50){const S=SC.buddha;const u=(T-48.5)/1.5;S.update(T);s=S.s;c.position.set(lerp(-9,-6,u),1.6,lerp(20,18,u));c.lookAt(0,9.5,0);}
  else{const S=SC.wall;const u=clamp((T-50)/2,0,1);s=S.s;const z=-300-u*30;const p=new THREE.Vector3(pathX(z)+40,S.GW.yAt(z)+60,z+120);c.position.copy(p);const t=new THREE.Vector3(pathX(-900),S.GW.yAt(-900)+40,-900);c.lookAt(t);}
  c.aspect=W/H;c.updateProjectionMatrix();renderer.setViewport(0,0,W,H);renderer.render(s,c);
  $('flash').style.opacity=T>=3&&T<3.25?1-(T-3)/0.25:0;$('dim').style.opacity=0.82*smooth(51.6,52.2,T)+0.18*smooth(53.4,54,T);
  if(T<3){$('tml').textContent='人間が消えるまで';$('tmn').textContent='0:'+(3-T).toFixed(2).padStart(5,'0');$('tmb').style.width=((T/3)*100).toFixed(1)+'%';}
  else{const sec=secOf(T);$('tml').textContent='人間が消えてから';$('tmn').innerHTML=fmt(sec);$('tmb').style.width=(Math.log10(1+sec)/Math.log10(1e4*YR)*100).toFixed(1)+'%';}
  const q=smooth(2.6,3.4,T);show(TTL,1-q,`translateY(${-q*40}px)`);show(TTL2,q);TM.style.top=lerp(520,170,q)+'px';TM.style.transform=`scale(${lerp(1,0.7,q)})`;
  {const k=clamp((T-52.1)/0.3,0,1);show(CTA,k,`scale(${0.9+0.1*easeBack(k)})`);}
  const ln=LINES.find(l=>T>=l.a-0.05&&T<l.b);
  if(ln){$('hdt').innerHTML=ln.h;$('sbt').textContent=ln.s;$('sbt').style.display=ln.s?'inline-block':'none';const lt=T-ln.a;const end=ln.b>=60?1:clamp((ln.b-0.2-T)/0.2,0,1);
    show(HD,Math.min(clamp(lt/0.2,0,1),end),`scale(${0.85+0.15*easeBack(lt/0.35)})`);$('sbt').style.opacity=clamp((lt-0.4)/0.2,0,1);}else show(HD,0);
};
window.TOTAL=TOTAL;window.ready=true;
</script></body></html>
