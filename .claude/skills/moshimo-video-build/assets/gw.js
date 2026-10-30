// ===== gw.js：万里の長城モデル（models.js の後に読み込む） =====
// 地形の高さ（z<0 が内陸、z>0 が海）。長城は pathX(z) の尾根に沿う
function gwNoise(seed){const rnd=mulberry32(seed),P=[];for(let i=0;i<1024;i++)P.push(rnd());const h=(x,y)=>P[(((x*73856093)^(y*19349663))>>>0)&1023];
  const n=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);return lerp(lerp(h(xi,yi),h(xi+1,yi),u),lerp(h(xi,yi+1),h(xi+1,yi+1),u),v);};
  return (x,y)=>n(x,y)*0.5+n(x*2.03,y*2.03)*0.25+n(x*4.1,y*4.1)*0.15+n(x*8.3,y*8.3)*0.1;}
const GWN=gwNoise(31);
const pathX=z=>{const d=Math.max(0,-z);return smooth(0,350,d)*(90*Math.sin(d*0.0023)+55*Math.sin(d*0.0071+1.3)+18*Math.sin(d*0.019));};
function terrainH(x,z){const d=-z;if(d<-6)return -6;const coast=smooth(-6,60,d);const amp=coast*(25+Math.min(1,Math.max(0,d-60)/700)*190);
  const dx=x-pathX(z);const ridge=Math.exp(-(dx/170)*(dx/170));const nz=GWN(x/260+50,z/260+50);const nz2=GWN(x/70+9,z/70+9);
  return 1.2+amp*(0.55*ridge*(0.75+0.5*GWN(z/300,7.7))+0.55*nz*nz+0.08*nz2)-(1-coast)*2;}
function terrain(s,o={}){const W2=o.w||3200,D=o.d||3800,sx=o.sx||200,sz=o.sz||240,cz=o.cz||-1800;
  const g=new THREE.PlaneGeometry(W2,D,sx,sz);g.rotateX(-Math.PI/2);const p=g.attributes.position;const col=new Float32Array(p.count*3);
  const cG=new THREE.Color(o.grass||0x5f7f3e),cD=new THREE.Color(o.dry||0x8a7a52),cR=new THREE.Color(o.rock||0x7d746a),cS=new THREE.Color(0xd9cfa8),tmp=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i)+cz;const y=terrainH(x,z);p.setY(i,y);p.setZ(i,z);
    const k=GWN(x/40,z/40);tmp.copy(cG).lerp(cD,clamp(k*1.4-0.3,0,1));if(y>140)tmp.lerp(cR,clamp((y-140)/60,0,0.8));if(y<3)tmp.copy(cS);col[i*3]=tmp.r;col[i*3+1]=tmp.g;col[i*3+2]=tmp.b;}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.95,flatShading:true}));m.receiveShadow=true;m.castShadow=false;s.add(m);
  // 木（尾根の脇に低木を散らす）
  if(o.trees!==false){const rk=mulberry32(5);const N=o.nTrees||2600;const tg=new THREE.ConeGeometry(2.2,6,6);tg.translate(0,3,0);const tm=new THREE.InstancedMesh(tg,MS(0x3f5f2e),N);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3();let n=0;
    for(let i=0;i<N*3&&n<N;i++){const z=-80-rk()*3400,x=pathX(z)+(rk()-.5)*1600;const dx=Math.abs(x-pathX(z));if(dx<45||z>-300)continue;const y=terrainH(x,z);if(y>150)continue;const s2=0.6+rk()*1.1;v.set(x,y-0.5,z);sc.set(s2,s2*(0.8+rk()*0.6),s2);m4.compose(v,q,sc);tm.setMatrixAt(n++,m4);}
    tm.count=n;tm.castShadow=true;s.add(tm);}
  return m;}
// レンガのテクスチャ
function brickTex(o={}){const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');const rk=mulberry32(o.seed||3);
  g.fillStyle=o.mortar||'#8d887d';g.fillRect(0,0,256,256);const bw=32,bh=14;
  for(let r=0;r*bh<256;r++)for(let k=-1;k*bw<256;k++){const x=k*bw+(r%2?bw/2:0),y=r*bh;const v=150+rk()*40|0;const w=o.warm?[v+18,v+6,v-12]:[v,v-4,v-12];
    g.fillStyle=`rgb(${w[0]},${w[1]},${w[2]})`;g.fillRect(x+1.5,y+1.5,bw-3,bh-3);if(rk()<0.15){g.fillStyle='rgba(40,40,30,.18)';g.fillRect(x+1.5,y+1.5,bw-3,bh-3);}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
const GW_BT=brickTex(),GW_BTW=brickTex({warm:true,seed:8});
const _BM={};function brickMat(u,v,warm){const k=u+'_'+v+'_'+!!warm;if(_BM[k])return _BM[k];const t=(warm?GW_BTW:GW_BT).clone();t.needsUpdate=true;t.repeat.set(u,v);return _BM[k]=new THREE.MeshStandardMaterial({map:t,roughness:0.9,color:0xffffff});}
// 寸法に合わせてUVを伸ばした箱（レンガが引き伸ばされないように）。tu,tv＝テクスチャ1枚の実寸[m]
function boxUV(w,h,d,tu=2.6,tv=1.4){const g=new THREE.BoxGeometry(w,h,d);const uv=g.attributes.uv;const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*dims[f][0]/tu,uv.getY(i)*dims[f][1]/tv);}return g;}
function mergeGeo(list){let nv=0,ni=0;list.forEach(g=>{nv+=g.attributes.position.count;ni+=g.index.count;});const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),uv=new Float32Array(nv*2),idx=new Uint32Array(ni);let o=0,oi=0;
  list.forEach(g=>{const p=g.attributes.position.array,n=g.attributes.normal.array,u=g.attributes.uv.array,ix=g.index.array;pos.set(p,o*3);nor.set(n,o*3);uv.set(u,o*2);for(let i=0;i<ix.length;i++)idx[oi+i]=ix[i]+o;o+=g.attributes.position.count;oi+=ix.length;g.dispose();});
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(pos,3));m.setAttribute('normal',new THREE.BufferAttribute(nor,3));m.setAttribute('uv',new THREE.BufferAttribute(uv,2));m.setIndex(new THREE.BufferAttribute(idx,1));return m;}
// 長城本体：z0（海側の端）から内陸へ len[m]。step ごとに区切って地形の高さに沿わせる
function greatWall(s,o={}){const z0=o.z0??30,len=o.len||3400,step=o.step||8,H=o.h||7,Wd=o.w||6.2;const g=new THREE.Group();
  const pts=[];for(let d=0;d<=len;d+=step){const z=z0-d;const x=pathX(z);const y=Math.max(2.0,terrainH(x,z));pts.push(new THREE.Vector3(x,y,z));}
  const bodyM=brickMat(1,1,o.warm),topM=new THREE.MeshStandardMaterial({map:(()=>{const t=GW_BT.clone();t.needsUpdate=true;return t;})(),roughness:0.95,color:0xc9c2b4});
  const N=pts.length-1;const BG=[],FG=[];
  const mer=[];const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),e=new THREE.Euler(),mid=new THREE.Vector3();
  for(let i=0;i<N;i++){const a=pts[i],b=pts[i+1];const L=a.distanceTo(b);mid.addVectors(a,b).multiplyScalar(0.5);const yaw=Math.atan2(b.x-a.x,b.z-a.z),pitch=-Math.atan2(b.y-a.y,Math.hypot(b.x-a.x,b.z-a.z));
    e.set(pitch,yaw,0,'YXZ');q.setFromEuler(e);const base=Math.min(a.y,b.y)-6;const top=mid.y+H;
    {const gg=boxUV(Wd+0.6,top-base,L+0.4);gg.applyMatrix4(m4.compose(new THREE.Vector3(mid.x,(top+base)/2,mid.z),q,sc.set(1,1,1)));BG.push(gg);}
    {const gg=boxUV(Wd-0.6,0.3,L+0.4,1.6,1.6);gg.applyMatrix4(m4.compose(new THREE.Vector3(mid.x,top+0.05,mid.z),q,sc.set(1,1,1)));FG.push(gg);}
    for(let t=0.08;t<1;t+=1.7/L){const p=new THREE.Vector3().lerpVectors(a,b,t);for(const sd of[-1,1]){const off=new THREE.Vector3(sd*(Wd/2),0,0).applyEuler(new THREE.Euler(0,yaw,0));mer.push([p.x+off.x,p.y+H+(sd>0?0.9:0.55),p.z+off.z,yaw,sd>0?1.8:1.1]);}}}
  const body=new THREE.Mesh(mergeGeo(BG),bodyM),floor=new THREE.Mesh(mergeGeo(FG),topM);body.castShadow=body.receiveShadow=true;floor.receiveShadow=true;g.add(body,floor);
  const MG=mer.map(m=>{const gg=boxUV(1.0,m[4],0.55,2.6,1.4);q.setFromEuler(e.set(0,m[3],0));gg.applyMatrix4(m4.compose(new THREE.Vector3(m[0],m[1],m[2]),q,sc.set(1,1,1)));return gg;});const mm=new THREE.Mesh(mergeGeo(MG),brickMat(1,1,o.warm));
  mm.castShadow=true;mm.receiveShadow=true;g.add(mm);
  // 見張り台
  const towers=[];const ev=o.towerEvery||45;for(let i=o.towerFirst||0;i<pts.length;i+=ev){const p=pts[i];const n=pts[Math.min(i+1,N)];const yaw=Math.atan2(n.x-p.x,n.z-p.z);const tw=watchtower(o.warm);tw.position.set(p.x,p.y+H-7,p.z);tw.rotation.y=yaw;g.add(tw);towers.push(tw);}
  s.add(g);return {g,pts,towers,yAt:z=>{const i=clamp(Math.round((z0-z)/step),0,N);return pts[i].y+H+0.2;},xAt:z=>pathX(z)};}
function watchtower(warm){const g=new THREE.Group();const W2=11,Hh=12;at(new THREE.Mesh(boxUV(W2,Hh+6,W2),brickMat(1,1,warm)),0,(Hh-6)/2,0,g);
  const dark=new THREE.MeshStandardMaterial({color:0x14100c,roughness:1});
  for(const r of[0,1,2,3]){const a=r*Math.PI/2;for(const k of[-1,0,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(1.1,2.0,0.4),dark);const off=new THREE.Vector3(k*3.2,Hh-3.2,W2/2+0.05).applyAxisAngle(new THREE.Vector3(0,1,0),a);w.position.copy(off);w.rotation.y=a;g.add(w);
    const arch=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.4,12,1,false,0,Math.PI),dark);arch.rotation.set(Math.PI/2,0,Math.PI/2);arch.position.copy(off).add(new THREE.Vector3(0,1.0,0));arch.rotation.y=a;g.add(arch);}}
  at(new THREE.Mesh(boxUV(W2+0.8,0.6,W2+0.8),brickMat(1,1,warm)),0,Hh,0,g);
  for(let k=0;k<4;k++){const a=k*Math.PI/2;for(let i=-4;i<=4;i+=2){const m=new THREE.Mesh(boxUV(1.1,1.2,0.6),brickMat(1,1,warm));const off=new THREE.Vector3(i*1.25,Hh+0.9,W2/2+0.1).applyAxisAngle(new THREE.Vector3(0,1,0),a);m.position.copy(off);m.rotation.y=a;g.add(m);}}
  shadowAll(g);return g;}
function pavilion(){const g=new THREE.Group();const red=MS(0xa8322a,{roughness:0.7}),tile=MS(0x3a4a42,{roughness:0.6});
  for(const x of[-3.6,-1.2,1.2,3.6])for(const z of[-2.6,2.6])at(cyl(0.25,0.25,4.2,red,10),x,2.1,z,g);
  at(box(8.4,0.5,6.4,MS(0x6a5a4a)),0,4.3,0,g);const r1=hipRoof(10.5,8.2,2.2,0x3a4a42);r1.position.y=4.5;g.add(r1);
  at(box(6.5,2.2,4.6,red),0,5.9,0,g);const r2=hipRoof(8.5,6.6,2.0,0x3a4a42);r2.position.y=7.0;g.add(r2);shadowAll(g);return g;}
// 海に突き出す端（老龍頭）の土台
function seaHead(s,z0,x0,y){const g=new THREE.Group();const st=MS(0x8a8478,{roughness:0.95});at(box(16,8,30,st),x0,y-4.5,z0-6,g);
  const rk=mulberry32(9);for(let i=0;i<40;i++){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(1+rk()*2.2,0),MS(0x6e6a62));m.position.set(x0+(rk()-.5)*26,-0.6+rk()*0.8,z0-6+(rk()-.3)*36);m.rotation.set(rk()*3,rk()*3,0);g.add(m);}
  shadowAll(g);s.add(g);return g;}
