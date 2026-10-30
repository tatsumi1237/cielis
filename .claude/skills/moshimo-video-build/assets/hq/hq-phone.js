// ================= hq-phone.js（手元アップ用の前景：スマホ＋右手＋袖。PP.render の fg に渡す） =================
// buildFG() のあと、FG.rig をカメラに追従させ、FG.ph の位置をカメラ座標で決める。画面は FG.tx[0]=ロック画面, [1][2]=警告の点滅
function rrShape(w,h,r){const s=new THREE.Shape();const x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function uvFit(geo,w,h){const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+0.5,p.getY(i)/h+0.5);uv.needsUpdate=true;}
const PW=0.0716,PH=0.1476;
function drawLock(g,w,h){const gr=g.createLinearGradient(0,0,w*0.4,h);gr.addColorStop(0,'#1c2a52');gr.addColorStop(0.5,'#7a4a6a');gr.addColorStop(1,'#f0905a');g.fillStyle=gr;g.fillRect(0,0,w,h);
  const rg=g.createRadialGradient(w*0.7,h*0.75,10,w*0.7,h*0.75,w*0.8);rg.addColorStop(0,'rgba(255,200,140,.55)');rg.addColorStop(1,'rgba(255,200,140,0)');g.fillStyle=rg;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,.92)';g.textAlign='center';g.font='500 40px "Zen Kaku Gothic New"';g.fillText('10月25日 土曜日',w/2,250);g.font='600 250px "Oswald"';g.fillText(typeof PHONE_TIME!=='undefined'?PHONE_TIME:'17:42',w/2,500);
  g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.roundRect(50,1180,w-100,150,36);g.fill();g.fillStyle='#fff';g.textAlign='left';g.font='700 34px "Zen Kaku Gothic New"';g.fillText('メッセージ',90,1240);g.font='500 32px "Zen Kaku Gothic New"';g.fillText('今日 18時に駅前で！',90,1292);
  g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.roundRect(w/2-110,h-40,220,10,5);g.fill();}
function drawAlert(g,w,h,on){const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,on?'#a80c0c':'#6a0606');gr.addColorStop(0.55,on?'#e01e1e':'#8a0a0a');gr.addColorStop(1,'#3a0404');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(0,0,0,.18)';for(let y=0;y<h;y+=6)g.fillRect(0,y,w,2);
  g.fillStyle='#fff';g.textAlign='center';g.font='600 40px "Oswald"';g.fillText(typeof PHONE_TIME!=='undefined'?PHONE_TIME:'17:42',w/2,110);
  // 警告マーク
  const cx=w/2,cy=420;g.save();g.translate(cx,cy);g.fillStyle='#ffd23a';g.beginPath();g.moveTo(0,-150);g.lineTo(165,130);g.lineTo(-165,130);g.closePath();g.lineJoin='round';g.lineWidth=30;g.strokeStyle='#ffd23a';g.stroke();g.fill();
  g.fillStyle='#1a0000';g.font='900 190px "Zen Kaku Gothic New"';g.textBaseline='middle';g.fillText('!',0,40);g.restore();g.textBaseline='alphabetic';
  g.fillStyle='#fff';g.font='900 112px "Zen Kaku Gothic New"';g.fillText('緊急地震速報',w/2,740);
  g.fillStyle='rgba(255,255,255,.9)';g.fillRect(80,790,w-160,4);
  g.font='700 54px "Zen Kaku Gothic New"';g.fillText('紀伊半島沖で地震発生',w/2,900);g.fillText('強い揺れに備えてください',w/2,980);
  g.fillStyle='rgba(255,255,255,.95)';g.beginPath();g.roundRect(70,1120,w-140,140,30);g.fill();g.fillStyle='#b80c0c';g.font='900 56px "Zen Kaku Gothic New"';g.fillText('身の安全を確保',w/2,1212);
  g.fillStyle='rgba(255,255,255,.6)';g.font='500 30px "Zen Kaku Gothic New"';g.fillText('※この画面はシミュレーションです',w/2,1350);
  g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.roundRect(w/2-110,h-40,220,10,5);g.fill();}
let FG=null;
function buildFG(){const s=new THREE.Scene();s.environment=SC.city.s.environment;s.add(new THREE.HemisphereLight(0xdfe8ff,0x6a5a4a,0.6));
  const key=new THREE.DirectionalLight(0xffd8b0,1.6);key.position.set(0.6,1.2,1.4);s.add(key);const rim=new THREE.DirectionalLight(0xffb070,2.0);rim.position.set(-1,0.6,-1.2);s.add(rim);
  const rig=new THREE.Group();s.add(rig);const ph=new THREE.Group();rig.add(ph);
  const body=new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(PW-0.002,PH-0.002,0.011),{depth:0.0062,bevelEnabled:true,bevelThickness:0.0009,bevelSize:0.001,bevelSegments:4,curveSegments:16}),SM(0x4a4c52,{metalness:0.85,roughness:0.28}));body.position.z=-0.0031-0.0009;ph.add(body);
  const sg=new THREE.ShapeGeometry(rrShape(PW-0.0042,PH-0.0042,0.0095),16);uvFit(sg,PW-0.0042,PH-0.0042);
  const W1=720,H1=1484;const c1=document.createElement('canvas');c1.width=W1;c1.height=H1;drawLock(c1.getContext('2d'),W1,H1);const c2=document.createElement('canvas');c2.width=W1;c2.height=H1;drawAlert(c2.getContext('2d'),W1,H1,true);const c3=document.createElement('canvas');c3.width=W1;c3.height=H1;drawAlert(c3.getContext('2d'),W1,H1,false);
  const tx=[c1,c2,c3].map(c=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;});
  const scrM=new THREE.MeshStandardMaterial({color:0x000000,emissive:0xffffff,emissiveMap:tx[0],emissiveIntensity:1.0,roughness:0.12,metalness:0.0});const scr=new THREE.Mesh(sg,scrM);scr.position.z=0.0042;ph.add(scr);
  const isl=new THREE.Mesh(new THREE.CapsuleGeometry(0.0034,0.011,4,10),SM(0x000000,{roughness:0.2}));isl.rotation.z=Math.PI/2;isl.position.set(0,PH/2-0.008,0.0044);ph.add(isl);
  const glow=new THREE.PointLight(0xff3020,0,0.6,1.5);glow.position.set(0,0,0.06);ph.add(glow);
  // 右手（親指は右側面の手前、ほかの指は背面から左側面に回り込む）
  const skin=SM(0xc89678,{roughness:0.55});const hand=new THREE.Group();ph.add(hand);
  const cap=(r,l)=>new THREE.Mesh(new THREE.CapsuleGeometry(r,l,6,14),skin);
  const palm=new THREE.Mesh(new THREE.SphereGeometry(0.05,24,18),skin);palm.scale.set(0.8,1.0,0.36);palm.position.set(0.014,-0.05,-0.026);hand.add(palm);
  [[-0.004,0.016],[ -0.026,0.018],[-0.048,0.016],[-0.068,0.013]].forEach(([y,len],i)=>{const f1=cap(0.0082-i*0.0006,len);f1.rotation.z=Math.PI/2;f1.position.set(0.0,y,-0.0085);hand.add(f1);const f2=cap(0.0076-i*0.0006,0.009);f2.position.set(-PW/2-0.003,y,-0.002);f2.rotation.x=0.4;hand.add(f2);});
  const th1=cap(0.0105,0.03);th1.position.set(PW/2+0.004,-0.07,0.0);th1.rotation.z=-0.35;hand.add(th1);const th2=cap(0.0095,0.022);th2.position.set(PW/2-0.002,-0.042,0.006);th2.rotation.z=0.55;hand.add(th2);
  const wr=cap(0.026,0.16);wr.position.set(0.05,-0.15,-0.035);wr.rotation.z=0.55;wr.rotation.x=0.25;hand.add(wr);
  const sl=new THREE.Mesh(new THREE.CylinderGeometry(0.042,0.05,0.26,20),SM(0x9a7c58,{roughness:0.9}));sl.position.set(0.11,-0.27,-0.07);sl.rotation.z=0.55;sl.rotation.x=0.25;hand.add(sl);
  const cuff=new THREE.Mesh(new THREE.TorusGeometry(0.04,0.006,8,24),SM(0xb8966a));cuff.position.set(0.072,-0.2,-0.05);cuff.rotation.set(Math.PI/2+0.25,0,0.55);hand.add(cuff);
  FG={s,rig,ph,scrM,tx,glow};}
