// ================= hq-shelter.js（体育館の避難所：明るい木の床・高窓の光の帯・段ボールの仕切り・色とりどりの毛布・座る人） =================
// 使い方：SC.gym=buildGym(); SC.gym.update(T)
function sitPose2(p,k=1){const u=p.userData;u.legs.forEach((l,i)=>{l.rotation.x=-1.45*k;u.kn[i].rotation.x=1.5*k;u.ft[i].rotation.x=0;});u.hip.position.y=lerp(0.94,0.2,k);u.arms.forEach(a=>{a.rotation.x=-0.35*k;});u.elb.forEach(e=>e.rotation.x=-0.9*k);}
function lyingPose(p){const u=p.userData;p.rotation.x=-Math.PI/2;u.hip.position.y=0.94;}
function buildGym(){const s=new THREE.Scene();s.background=new THREE.Color(0xf4efe6);
  const dome=skyDome({sun:v3(0.4,1,0.3),top:0x4a8ae0,hor:0xdcecff,sunCol:0xfff4e0,cloudCol:0xffffff,cloud:0.4});s.environment=envFrom(dome);
  s.add(new THREE.HemisphereLight(0xfff8f0,0xb08a60,1.25));const sun=new THREE.DirectionalLight(0xfff2dc,3.0);sun.position.set(-18,26,14);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);const sc=sun.shadow.camera;sc.left=-30;sc.right=30;sc.top=30;sc.bottom=-30;s.add(sun);
  const pl=new THREE.PointLight(0xfff0d8,40,60,1.2);pl.position.set(0,10,0);s.add(pl);
  const wood=cv(512,512,(g,w,h)=>{const r=mulberry32(5);for(let x=0;x<w;x+=32){const c=200+r()*30|0;g.fillStyle=`rgb(${c},${c*0.72|0},${c*0.45|0})`;g.fillRect(x,0,32,h);g.fillStyle='rgba(60,30,10,.25)';g.fillRect(x,0,2,h);for(let y=(r()*200)|0;y<h;y+=180+r()*120)g.fillRect(x,y,32,2);}
    g.strokeStyle='rgba(230,60,40,.9)';g.lineWidth=6;g.beginPath();g.arc(w/2,h/2,120,0,7);g.stroke();g.strokeStyle='rgba(40,110,220,.85)';g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();});
  wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(3,2);const fl=new THREE.Mesh(new THREE.PlaneGeometry(48,34).rotateX(-Math.PI/2),SM(0xffffff,{map:wood,roughness:0.35,envMapIntensity:0.6}));fl.receiveShadow=true;s.add(fl);
  const wm=SM(0xf2ede2,{roughness:0.9});const wb=SM(0x2f6db0,{roughness:0.8});
  const wl=(w,h,x,y,z,ry,m=wm)=>{const p=new THREE.Mesh(new THREE.BoxGeometry(w,h,0.4),m);p.position.set(x,y,z);p.rotation.y=ry;p.receiveShadow=true;p.castShadow=true;s.add(p);};
  wl(48,2.2,0,1.1,-17,0,wb);wl(48,2.2,0,1.1,17,0,wb);wl(34,2.2,-24,1.1,0,Math.PI/2,wb);wl(34,2.2,24,1.1,0,Math.PI/2,wb);
  for(const z of[-17,17]){for(let i=-5;i<=5;i++){wl(1.0,8,i*4.6,6.2,z,0);}const gl=new THREE.Mesh(new THREE.PlaneGeometry(48,5.5),new THREE.MeshStandardMaterial({color:0x000000,emissive:0xd6eaff,emissiveIntensity:0.9}));gl.position.set(0,6.5,z*0.995);gl.rotation.y=z>0?Math.PI:0;s.add(gl);}
  wl(34,8,-24,6.2,0,Math.PI/2);wl(34,8,24,6.2,0,Math.PI/2);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(48,0.4,34),SM(0xdcd8d0));roof.position.y=10.4;s.add(roof);for(let i=-5;i<=5;i++){const t=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.9,34),SM(0x8a96a4,{metalness:0.4,roughness:0.5}));t.position.set(i*4.6,9.8,0);s.add(t);}
  // 光の帯（窓から差し込む）
  const beamT=cv(64,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,248,230,.55)');gr.addColorStop(1,'rgba(255,248,230,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
  for(let i=-4;i<=4;i++){const b=new THREE.Mesh(new THREE.PlaneGeometry(2.6,14),new THREE.MeshBasicMaterial({map:beamT,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,opacity:0.5}));b.position.set(i*4.6-1.5,5.2,-10);b.rotation.set(-0.7,0,0.25);s.add(b);}
  for(const x of[-23.4,23.4]){const hp=new THREE.Group();hp.add(pos(new THREE.Mesh(new THREE.BoxGeometry(0.1,1.2,1.8),SM(0xffffff)),0,7,0));const rim=new THREE.Mesh(new THREE.TorusGeometry(0.23,0.02,8,20),SM(0xff5a1a));rim.rotation.x=Math.PI/2;rim.position.set(x>0?-0.35:0.35,6.6,0);hp.add(rim);hp.position.x=x;s.add(hp);}
  // 寝床
  const BL=[0x2f7fd8,0x3aa860,0xf08a2a,0xe8506a,0x8a5ad8,0x20b0b8,0xf2c230];const card=SM(0xc89a62,{roughness:0.9});
  for(let r=0;r<5;r++)for(let c=0;c<8;c++){const x=-17+c*4.8,z=-11+r*5.4;const g=new THREE.Group();
    g.add(pos(new THREE.Mesh(new THREE.BoxGeometry(2.2,0.14,3.2),SM(0xe8dcc0,{roughness:0.9})),0,0.07,0));const bk=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.18,2.4),SM(BL[(r*3+c)%7],{roughness:0.95}));bk.position.set(0,0.22,0.2);bk.rotation.y=(RK()-.5)*0.1;g.add(bk);
    g.add(pos(new THREE.Mesh(new THREE.BoxGeometry(0.06,1.0,3.2),card),-1.12,0.5,0));g.add(pos(new THREE.Mesh(new THREE.BoxGeometry(2.24,1.0,0.06),card),0,0.5,-1.6));
    g.add(pos(new THREE.Mesh(new THREE.BoxGeometry(0.6,0.16,0.4),SM(0xffffff)),0,0.36,-1.2));if(RK()<0.7)g.add(pos(new THREE.Mesh(new THREE.BoxGeometry(0.45,0.4,0.3),SM([0x2a2a2a,0xc83a3a,0x3a5a8a][(RK()*3)|0])),0.7,0.34,1.1));
    g.position.set(x,0,z);g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});s.add(g);}
  const P=[];const TOPS=[0xe8506a,0x2f7fd8,0xf2c230,0x3aa860,0xf4f0e8,0x8a5ad8,0xf08a2a,0x20b0b8,0xd8d0c8,0x3a4a5a];
  for(let i=0;i<34;i++){const p=person2({top:TOPS[i%10],pants:[0x2a3550,0x4a4a52,0x6a5a4a][i%3],hair:[0x1c1612,0x3a2a1e,0xd8d8d8][i%3],long:i%3===1,h:i%7===3?0.62:(0.92+RK()*0.12),skin:SKIN[i%4]});const c=(i*3)%8,r=(i*5+(i>>3))%5;
    if(i<26){sitPose2(p,1);p.position.set(-17+c*4.8+(RK()-.5)*0.6,0.2,-11+r*5.4+0.3);p.rotation.y=(RK()-.5)*2.5;P.push({p,sit:true});}else{p.position.set(-14+(i-26)*4,0.0,13.5-(i%2)*1.2);P.push({p,sit:false,x0:-14+(i-26)*4,i});}s.add(p);}
  const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(Array.from({length:900},()=>(RK()-.5)*30)),3)),new THREE.PointsMaterial({color:0xfff2d8,size:0.05,map:DOT,transparent:true,opacity:0.7,blending:THREE.AdditiveBlending,depthWrite:false}));dust.position.y=5;s.add(dust);
  return {s,update(T){dust.rotation.y=T*0.02;P.forEach(o=>{if(!o.sit){o.p.position.x=o.x0+T*0.9;o.p.rotation.y=Math.PI/2;walk(o.p,T*4+o.i,0.8);}});}};}
