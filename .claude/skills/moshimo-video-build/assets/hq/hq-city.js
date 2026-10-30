// ================= hq-city.js（夕方の大通り：ビル・店舗・看板・街路樹・車・群衆・主人公） =================
// SC.city.update(T,heroZ,影の中心x,影の中心z)。SUNを書き換えると時間帯が変わる
let SUN=v3(-0.14,0.42,-1).normalize();
function noiseTex(w,h,base,amt,seed,extra){return cv(w,h,(g)=>{g.fillStyle=base;g.fillRect(0,0,w,h);const r=mulberry32(seed);const id=g.getImageData(0,0,w,h),d=id.data;for(let i=0;i<d.length;i+=4){const n=(r()-.5)*amt;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}g.putImageData(id,0,0);extra&&extra(g,w,h,r);});}
function facade(w,h,seed,side){const P=14;const cw=Math.round(w*P),ch=Math.round(h*P);const r=mulberry32(seed);const st=r();
  const wall=st<0.4?['#d9d2c4','#c9c0b0','#e6e0d4'][seed%3]:(st<0.7?['#7a8794','#5e6b78','#8c99a6'][seed%3]:['#8a5a44','#a0705a','#6e4a3a'][seed%3]);
  const lit=[];const fl=3.4,shop=4.6;
  const map=cv(cw,ch,(g)=>{g.fillStyle=wall;g.fillRect(0,0,cw,ch);
    const nf=Math.floor((h-shop)/fl);
    if(st>=0.4&&st<0.7){// ガラスのカーテンウォール
      const gr=g.createLinearGradient(0,0,0,ch);gr.addColorStop(0,'#3a5878');gr.addColorStop(1,'#1e3046');g.fillStyle=gr;g.fillRect(0,0,cw,ch-shop*P);
      for(let f=0;f<nf;f++){const y=ch-(shop+(f+1)*fl)*P;g.fillStyle='rgba(200,215,230,.9)';g.fillRect(0,y,cw,4);for(let x=0;x<cw;x+=1.5*P){g.fillStyle='rgba(30,40,52,.9)';g.fillRect(x,y,3,fl*P);if(r()<0.22)lit.push([x+3,y+4,1.5*P-3,fl*P-4]);}}}
    else{const bay=st<0.4?2.6:3.2;const ww=st<0.4?1.5:1.7,wh=1.8;
      for(let f=0;f<nf;f++){const y=ch-(shop+f*fl+0.8+wh)*P;for(let x=0.6;x+ww<w;x+=bay){g.fillStyle='#24303c';g.fillRect(x*P,y,ww*P,wh*P);const gr=g.createLinearGradient(0,y,0,y+wh*P);gr.addColorStop(0,'rgba(170,190,210,.55)');gr.addColorStop(1,'rgba(40,52,64,.2)');g.fillStyle=gr;g.fillRect(x*P,y,ww*P,wh*P);
        g.strokeStyle=st<0.4?'#f4f2ee':'#d8d0c4';g.lineWidth=3;g.strokeRect(x*P,y,ww*P,wh*P);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x*P-2,y+wh*P,ww*P+4,5);if(r()<0.3)lit.push([x*P+2,y+2,ww*P-4,wh*P-4]);}}
      for(let f=0;f<=nf;f++){g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,ch-(shop+f*fl)*P-2,cw,3);}}
    g.fillStyle='#2a2622';g.fillRect(0,ch-shop*P,cw,shop*P);
    const id=g.getImageData(0,0,cw,ch),d=id.data;for(let i=0;i<d.length;i+=4){const n=(r()-.5)*10;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}g.putImageData(id,0,0);
    for(const L of lit){g.fillStyle=r()<0.5?'#ffd9a0':'#fff0d8';g.fillRect(...L);}});
  const emi=cv(cw,ch,(g)=>{g.fillStyle='#000';g.fillRect(0,0,cw,ch);for(const L of lit){g.fillStyle=r()<0.6?'#ffb760':'#ffe2b8';g.globalAlpha=0.35+r()*0.35;g.fillRect(...L);}g.globalAlpha=1;});
  return {map,emi,glass:st>=0.4&&st<0.7};}
function signTex(text,bg,fg,vert,w,h,font){return cv(w,h,(g)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=6;g.strokeRect(6,6,w-12,h-12);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
  if(vert){const n=text.length;const fs=Math.min(w*0.7,(h-40)/n*0.9);g.font=`900 ${fs}px ${font||'"Zen Kaku Gothic New"'}`;[...text].forEach((c,i)=>g.fillText(c,w/2,20+(h-40)*(i+0.5)/n));}
  else{g.font=`900 ${h*0.55}px ${font||'"Zen Kaku Gothic New"'}`;g.fillText(text,w/2,h*0.54);}});}
const SHOPN=[['珈琲 さくら','#2a1a12','#ffe6c0'],['まるや書店','#0e2a4a','#ffffff'],['ドラッグ ひかり','#d8261c','#ffffff'],['らーめん 一番','#1a1a1a','#ffcc33'],['BAKERY','#f2e8d8','#6a3a1a'],['花と緑','#2e5a34','#ffffff'],['CAFE','#101418','#ffffff'],['みどり不動産','#ffffff','#2e7d32'],['めがね','#e8eef4','#0e3a6a'],['和菓子 つる屋','#4a2a1a','#ffe6a0']];
const VSIGN=[['居酒屋','#c81e1e','#fff'],['整骨院','#1a5aa8','#fff'],['歯科','#ffffff','#1a6a3a'],['カラオケ','#ffcc00','#1a1a1a'],['焼肉','#1a1a1a','#ff4a2a'],['英会話','#ffffff','#c81e1e'],['質','#1a1a1a','#ffd27a'],['美容室','#f4e6ea','#8a2a4a']];
function tree2(){const g=new THREE.Group();const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.2,3.4,10),SM(0x4a3a2c,{roughness:0.9}));tr.position.y=1.7;g.add(tr);
  const cols=[0x3e6a2e,0x4a7a34,0x557f38,0x345e28];for(let i=0;i<16;i++){const r=0.6+RK()*0.6;const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,2),SM(cols[i%4],{roughness:0.85}));m.position.set((RK()-.5)*2.2,3.6+RK()*2.2,(RK()-.5)*2.2);m.scale.y=0.8;g.add(m);}
  g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});return g;}
function lamp(){const g=new THREE.Group();const m=SM(0x3a3e44,{metalness:0.6,roughness:0.4});const p=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.1,7,10),m);p.position.y=3.5;g.add(p);const a=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.6,8),m);a.rotation.z=Math.PI/2;a.position.set(-0.8,6.9,0);g.add(a);
  const hd=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.12,0.3),m);hd.position.set(-1.5,6.85,0);g.add(hd);const lt=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.03,0.24),new THREE.MeshStandardMaterial({color:0x000000,emissive:0xffe8c0,emissiveIntensity:2.5}));lt.position.set(-1.5,6.78,0);g.add(lt);g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;}
// 使い方：TOD=TODP.day; SC.city=buildCity();（時間帯を決めてから作る）
function buildCity(){SUN=v3(...TOD.sun).normalize();const s=new THREE.Scene();const vsigns=[];
  const dome=skyDome({sun:SUN,top:TOD.top,hor:TOD.hor,sunCol:TOD.sunCol,cloudCol:TOD.cloudCol,cloud:TOD.cloud});s.add(dome);s.environment=envFrom(dome);s.fog=new THREE.Fog(TOD.fog,TOD.fn,TOD.ff);
  s.add(new THREE.HemisphereLight(TOD.hemiS,TOD.hemiG,TOD.hemi));
  const sun=new THREE.DirectionalLight(TOD.sunC,TOD.sunI);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);const sc=sun.shadow.camera;sc.left=-34;sc.right=34;sc.top=40;sc.bottom=-40;sc.near=1;sc.far=400;sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.03;s.add(sun,sun.target);
  // 道路・歩道
  const road=new THREE.Mesh(new THREE.PlaneGeometry(14,520).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:noiseTex(256,512,'#3c3e44',26,3,(g,w,h)=>{g.fillStyle='#e8e8e2';for(let y=0;y<h;y+=40){g.fillRect(w*0.25-2,y,4,22);g.fillRect(w*0.75-2,y,4,22);}g.fillStyle='#e8c84a';g.fillRect(w/2-5,0,3,h);g.fillRect(w/2+2,0,3,h);}),roughness:0.82,metalness:0.0}));
  road.material.map.wrapT=THREE.RepeatWrapping;road.material.map.repeat.set(1,12);road.position.set(0,0,-200);road.receiveShadow=true;s.add(road);
  const cw=new THREE.Mesh(new THREE.PlaneGeometry(14,5).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:cv(256,92,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#f0f0ea';for(let x=6;x<w;x+=26)g.fillRect(x,0,14,h);}),transparent:true,roughness:0.7}));cw.position.set(0,0.012,-62);cw.receiveShadow=true;s.add(cw);
  const tile=noiseTex(256,256,'#a69888',18,5,(g,w,h)=>{g.strokeStyle='rgba(80,72,64,.35)';g.lineWidth=2;for(let y=0;y<=h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}for(let y=0;y<h;y+=32)for(let x=(y/32%2)*32;x<=w;x+=64){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+32);g.stroke();}});tile.wrapS=tile.wrapT=THREE.RepeatWrapping;tile.repeat.set(3,260);
  for(const sx of[-1,1]){const sw=new THREE.Mesh(new THREE.BoxGeometry(6,0.16,520),new THREE.MeshStandardMaterial({map:tile,roughness:0.88}));sw.position.set(sx*10,0.08,-200);sw.receiveShadow=true;s.add(sw);
    const cb=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.2,520),SM(0xcac6be,{roughness:0.8}));cb.position.set(sx*7.05,0.1,-200);cb.receiveShadow=true;s.add(cb);
    for(let z=20;z>-420;z-=2.2){const b=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.8,8),SM(0xf0f0f0,{roughness:0.4,metalness:0.3}));b.position.set(sx*7.35,0.56,z);s.add(b);}
    const rl=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,440,8),SM(0xf0f0f0,{roughness:0.4,metalness:0.3}));rl.rotation.x=Math.PI/2;rl.position.set(sx*7.35,0.95,-200);s.add(rl);}
  // 建物
  let seed=11;for(const sx of[-1,1]){let z=30;while(z>-440){const w=9+RK()*15,h=(z>-80?14+RK()*26:20+RK()*55),d=22;const f=facade(w,h,seed++,sx);
      const fm=new THREE.MeshStandardMaterial({map:f.map,emissive:0xffffff,emissiveMap:f.emi,emissiveIntensity:TOD.win,roughness:f.glass?0.18:0.82,metalness:f.glass?0.55:0.02,envMapIntensity:f.glass?1.2:0.4});
      const side=SM(0x8a8278,{roughness:0.9});const mats=[side,side,SM(0x6a645c),side,side,side];mats[sx>0?1:0]=fm;
      const b=new THREE.Mesh(new THREE.BoxGeometry(d,h,w),mats);
      // テクスチャの向き：街路側の面に正しく貼る（UVはBoxGeometryの±x面がz方向に横長になる）
      b.position.set(sx*(13+d/2),h/2,z-w/2);b.castShadow=b.receiveShadow=true;s.add(b);
      // 1階の店舗
      const si=seed%SHOPN.length,sh=SHOPN[si];const glass=new THREE.Mesh(new THREE.PlaneGeometry(w-1.2,3.2),new THREE.MeshStandardMaterial({map:cv(256,96,(g,W2,H2)=>{const gr=g.createLinearGradient(0,0,0,H2);gr.addColorStop(0,'#ffe4b8');gr.addColorStop(1,'#c08850');g.fillStyle=gr;g.fillRect(0,0,W2,H2);const r=mulberry32(seed);for(let i=0;i<10;i++){g.fillStyle=`rgba(60,40,24,${0.3+r()*0.4})`;g.fillRect(r()*W2,H2*0.35+r()*H2*0.4,10+r()*40,H2);}g.fillStyle='rgba(40,30,20,.7)';for(let x=0;x<W2;x+=W2/4)g.fillRect(x,0,3,H2);}),emissive:0xffffff,emissiveMap:null,emissiveIntensity:0.0,roughness:0.15,metalness:0.2}));
      glass.material.emissiveMap=glass.material.map;glass.material.emissiveIntensity=TOD.shop;glass.position.set(sx*12.96,1.9,z-w/2);glass.rotation.y=-sx*Math.PI/2;s.add(glass);
      const bd=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-1.5,8),1.0),new THREE.MeshStandardMaterial({map:signTex(sh[0],sh[1],sh[2],false,512,64),emissive:0xffffff,emissiveIntensity:0.9,roughness:0.5}));bd.material.emissiveMap=bd.material.map;bd.position.set(sx*12.9,4.0,z-w/2);bd.rotation.y=-sx*Math.PI/2;s.add(bd);
      const aw=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.08,w-1.4),SM([0xb83a2a,0x2a5a8a,0x3a6a3a,0xe8e2d4,0x5a3a2a][seed%5],{roughness:0.8}));aw.position.set(sx*12.35,3.45,z-w/2);aw.rotation.z=sx*0.35;aw.castShadow=true;s.add(aw);
      if(seed%2===0&&z<0){const v=VSIGN[seed%VSIGN.length];const vs=new THREE.Mesh(new THREE.BoxGeometry(0.25,4.6,1.15),[SM(0x222222),SM(0x222222),SM(0x222222),SM(0x222222),new THREE.MeshStandardMaterial({map:signTex(v[0],v[1],v[2],true,96,384),emissive:0xffffff,emissiveIntensity:1.6}),new THREE.MeshStandardMaterial({map:signTex(v[0],v[1],v[2],true,96,384),emissive:0xffffff,emissiveIntensity:1.6})]);
        vs.material[4].emissiveMap=vs.material[4].map;vs.material[5].emissiveMap=vs.material[5].map;vs.position.set(sx*12.3,8+RK()*4,z-w*0.3);vs.castShadow=true;s.add(vs);vsigns.push(vs);}
      z-=w+0.3;}}
  // 街路樹・街灯・信号・自販機
  for(const sx of[-1,1])for(let z=12;z>-300;z-=11){if(Math.abs(z+62)<6||(sx>0&&z>-36))continue;const t=tree2();t.position.set(sx*7.9,0.16,z+(sx>0?0:5));t.scale.setScalar(0.85+RK()*0.3);s.add(t);}
  for(const sx of[-1,1])for(let z=6;z>-300;z-=33){const l=lamp();l.position.set(sx*7.6,0.16,z);l.rotation.y=sx>0?0:Math.PI;s.add(l);}
  for(const sx of[-1,1]){const sg=new THREE.Group();const m=SM(0x4a4e54,{metalness:0.5,roughness:0.4});sg.add(pos(new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,6,10),m),0,3,0));sg.add(pos(new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,4),m),0,5.6,0));
    const hd=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.45,1.3),SM(0x2a2e34));hd.position.set(0,5.6,-1.6);sg.add(hd);[0x1aff6a,0x332a00,0x330a00].forEach((c,i)=>{const l=new THREE.Mesh(new THREE.CircleGeometry(0.13,16),new THREE.MeshStandardMaterial({color:0,emissive:c,emissiveIntensity:i?0.2:3}));l.position.set(0,5.6,-1.6-0.4+i*0.4);l.rotation.y=0;l.position.x=0.18;l.rotation.y=Math.PI/2;sg.add(l);});
    sg.position.set(sx*7.6,0.16,-58);sg.rotation.y=sx>0?Math.PI:0;s.add(sg);}
  for(const z of[-6,-29,-47]){const v=vending(true,false);v.position.set(12.45,0.16,z);v.rotation.y=-Math.PI/2;s.add(v);}
  // 車
  const cars=[];const cc=[0xf2f2f0,0x1a1c20,0xb8bcc2,0x8a1a1a,0x2a4a7a,0xe8e4dc,0x3a3e44];
  for(let i=0;i<22;i++){const lane=[-5.2,-1.8,1.8,5.2][i%4];const v=vehicle(i%5===0?'kei':(i%7===3?'truck':'suv'),cc[i%7]);v.rotation.y=lane>0?0:Math.PI;s.add(v);v.traverse(o=>{if(o.isMesh){o.castShadow=true;if(o.material&&o.material.metalness>0.2)o.material.envMapIntensity=1.4;}});
    cars.push({v,lane,z0:20-i*19-RK()*8,sp:(lane>0?1:-1)*(7+RK()*4)});}
  // 人
  const crowd=[];const TOPS=[0x2a3550,0x1c1c20,0xe8e4dc,0x5a6a4a,0x8a3a3a,0x6a5a7a,0xc8b8a0,0x3a4a5a,0xa86a4a,0x4a4a52,0xd8d0c8,0x22303a];
  for(let i=0;i<54;i++){const far=i>=38;const x=far?-10+(RK()-.5)*4.4:(RK()<0.5?8.1+RK()*0.7:10.6+RK()*1.4);let z=far?-20-RK()*120:(i<22?-14-RK()*28:-42-RK()*60);const dir=RK()<0.5?1:-1;
    if(!far&&i<6){z=-6+i*4.0;}
    const p=person2({top:TOPS[i%12],pants:[0x22252c,0x3a4256,0x4a3e34,0x1a1a1a,0x6a6a70][i%5],shoe:[0xf2f2f2,0x2a2a2a,0x8a6a4a][i%3],hair:[0x1c1612,0x2a1e16,0x3a2a1e,0x101010][i%4],long:i%3===1,bag:i%5===2?0x2a2a2a:null,tote:i%6===4?0xd8c8a8:null,coat:i%4===0,h:0.94+RK()*0.12,skin:SKIN[i%4]});
    const ph=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.15,0.01),new THREE.MeshStandardMaterial({color:0x111111,emissive:0xff2a1a,emissiveIntensity:0}));ph.position.set(0,-0.33,0.05);ph.rotation.x=-1.0;p.userData.elb[1].add(ph);p.userData.ph=ph;
    s.add(p);crowd.push({p,x,z0:z,dir:(i<6?-1:dir),sp:1.15+RK()*0.4,ph0:RK()*6.28,stop:3.15+RK()*0.6});}
  // 主人公
  const hero=person2({top:0xc6a47a,coat:true,pants:0x1e2128,shoe:0xf4f4f2,hair:0x1a130e,bag:0x2c2c30,h:1.02,skin:0xe8c0a2});s.add(hero);
  // 光の粒
  const n=420,pp=new Float32Array(n*3),base=[];for(let i=0;i<n;i++)base.push([(RK()-.5)*12,RK()*6,-RK()*30,RK()*10]);const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0xffd9a8,size:0.035,map:DOT,transparent:true,opacity:0.8,depthWrite:false,blending:THREE.AdditiveBlending}));s.add(pts);
  return {s,sun,hero,crowd,vsigns,cars,update(T,heroZ,cx,cz){
      sun.position.set(cx+SUN.x*150,SUN.y*150,cz+SUN.z*150);sun.target.position.set(cx,0,cz);
      cars.forEach(o=>{let z=o.z0+o.sp*T;o.v.position.set(o.lane,0.02,z);vehicleAnim(o.v,T,o.sp*0.9,0);});
      crowd.forEach((o,i)=>{const stopK=T<o.stop?0:smooth(o.stop,o.stop+0.5,T);const tt=Math.min(T,o.stop)+(T>o.stop?0.4*(1-Math.exp(-(T-o.stop)*3)):0);
        o.p.position.set(o.x,0.16,o.z0+o.dir*o.sp*tt);o.p.rotation.y=o.dir>0?0:Math.PI;walk(o.p,o.ph0+tt*o.sp*4.2,1-stopK);if(stopK>0){phonePose(o.p,stopK,T);o.p.userData.ph.material.emissiveIntensity=stopK*(2.2+1.2*Math.sin(T*25+i));}else o.p.userData.ph.material.emissiveIntensity=0;});
      for(let i=0;i<n;i++){const b=base[i];pp[i*3]=cx+b[0]+Math.sin(T*0.5+b[3])*0.4;pp[i*3+1]=0.5+((b[1]+T*0.15+Math.sin(T*0.7+b[3])*0.2)%6);pp[i*3+2]=cz+b[2]+Math.cos(T*0.4+b[3])*0.4;}pg.attributes.position.needsUpdate=true;}};}

