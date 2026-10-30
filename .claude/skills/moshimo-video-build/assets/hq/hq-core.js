// ================= hq-core.js（高品質版の土台 v2：ポスト処理・空・環境光・滑らかな人物） =================
// 結合順：head.html → base.js → models.js → hq-core.js → [hq-city.js] [hq-phone.js] → scene.js
// 描画は必ず PP.render(scene,cam,{...}) を通す（renderer.render を直接呼ばない）
const $=id=>document.getElementById(id);
const SC={};
renderer.toneMapping=THREE.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const RK=mulberry32(20261025);
const SM=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.7,metalness:0},o));
const v3=(x,y,z)=>new THREE.Vector3(x,y,z);
function cv(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function pos(m,x,y,z){m.position.set(x,y,z);return m;}
// ---------- ポスト処理（HDR→ブルーム→ACES→色調・ビネット・粒子・色収差）。被写界深度は背景/前景の2層合成 ----------
const PP=(()=>{const HT={type:THREE.HalfFloatType};
  const rtA=new THREE.WebGLRenderTarget(W,H,Object.assign({samples:4},HT)),rtC=new THREE.WebGLRenderTarget(W,H,Object.assign({samples:4},HT));
  const half=[new THREE.WebGLRenderTarget(W/2,H/2,HT),new THREE.WebGLRenderTarget(W/2,H/2,HT)];
  const lv=[4,8,16,32].map(d=>[new THREE.WebGLRenderTarget(W/d|0,H/d|0,HT),new THREE.WebGLRenderTarget(W/d|0,H/d|0,HT)]);
  const V='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2));const qs=new THREE.Scene();qs.add(q);const qc=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const copy=new THREE.ShaderMaterial({uniforms:{t:{value:null},t2:{value:null},k:{value:0}},vertexShader:V,fragmentShader:'uniform sampler2D t,t2;uniform float k;varying vec2 vUv;void main(){gl_FragColor=vec4(mix(texture2D(t,vUv).rgb,texture2D(t2,vUv).rgb,k),1.);}',depthWrite:false,depthTest:false});
  const bright=new THREE.ShaderMaterial({uniforms:{t:{value:null},th:{value:1.1}},vertexShader:V,fragmentShader:'uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(th,th*2.2,l),1.);}'});
  const blur=new THREE.ShaderMaterial({uniforms:{t:{value:null},dir:{value:new THREE.Vector2()}},vertexShader:V,fragmentShader:'uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 s=texture2D(t,vUv).rgb*0.2270;s+=(texture2D(t,vUv+dir*1.3846).rgb+texture2D(t,vUv-dir*1.3846).rgb)*0.3162;s+=(texture2D(t,vUv+dir*3.2308).rgb+texture2D(t,vUv-dir*3.2308).rgb)*0.0703;gl_FragColor=vec4(s,1.);}'});
  const fin=new THREE.ShaderMaterial({uniforms:{t:{value:null},b1:{value:null},b2:{value:null},b3:{value:null},b4:{value:null},bs:{value:0.6},ex:{value:1.0},tm:{value:0},vig:{value:0.55},gr:{value:0.035},sat:{value:1.08},con:{value:1.06},ca:{value:0.004},lift:{value:new THREE.Vector3(0.02,0.015,0.04)},gain:{value:new THREE.Vector3(1.04,1.0,0.94)}},vertexShader:V,
    fragmentShader:`uniform sampler2D t,b1,b2,b3,b4;uniform float bs,ex,tm,vig,gr,sat,con,ca;uniform vec3 lift,gain;varying vec2 vUv;
    vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.);}
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec2 d=vUv-.5;float r=length(d*vec2(0.5625,1.));vec3 c;c.r=texture2D(t,vUv-d*ca).r;c.g=texture2D(t,vUv).g;c.b=texture2D(t,vUv+d*ca).b;
      c+=(texture2D(b1,vUv).rgb*0.6+texture2D(b2,vUv).rgb*0.8+texture2D(b3,vUv).rgb*1.0+texture2D(b4,vUv).rgb*1.2)*bs;
      c=aces(c*ex);c=pow(c,vec3(1./2.2));float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);c=(c-.5)*con+.5;c=c*gain+lift*(1.-c);
      c*=mix(1.,smoothstep(.62,.12,r),vig);c+=(h(vUv*vec2(1080.,1920.)+fract(tm)*97.)-.5)*gr;gl_FragColor=vec4(clamp(c,0.,1.),1.);}`});
  function pass(mat,target){q.material=mat;renderer.setRenderTarget(target);renderer.render(qs,qc);}
  function blurTo(src,pair,rad){const w=pair[0].width,hh=pair[0].height;blur.uniforms.t.value=src.texture;blur.uniforms.dir.value.set(rad/w,0);pass(blur,pair[1]);blur.uniforms.t.value=pair[1].texture;blur.uniforms.dir.value.set(0,rad/hh);pass(blur,pair[0]);}
  const P={fin,render(scene,cam,o={}){renderer.autoClear=true;
      renderer.setRenderTarget(rtA);renderer.setClearColor(0x000000,1);renderer.clear();renderer.render(scene,cam);let src=rtA;
      if(o.fg){// 背景をぼかす→前景を重ねる
        const k=o.dof||0;if(k>0){blurTo(rtA,half,2.0*k);blurTo(half[0],half,3.0*k);blurTo(half[0],half,4.0*k);}
        copy.uniforms.t.value=rtA.texture;copy.uniforms.t2.value=half[0].texture;copy.uniforms.k.value=k>0?1:0;pass(copy,rtC);
        renderer.autoClear=false;renderer.setRenderTarget(rtC);renderer.clearDepth();renderer.render(o.fg,cam);renderer.autoClear=true;src=rtC;}
      bright.uniforms.th.value=o.th||1.1;bright.uniforms.t.value=src.texture;pass(bright,lv[0][0]);blurTo(lv[0][0],lv[0],1.5);
      for(let i=1;i<4;i++){copy.uniforms.t.value=lv[i-1][0].texture;copy.uniforms.k.value=0;pass(copy,lv[i][0]);blurTo(lv[i][0],lv[i],1.5);}
      Object.assign(fin.uniforms.t,{value:src.texture});fin.uniforms.b1.value=lv[0][0].texture;fin.uniforms.b2.value=lv[1][0].texture;fin.uniforms.b3.value=lv[2][0].texture;fin.uniforms.b4.value=lv[3][0].texture;
      for(const k in o.u||{})if(fin.uniforms[k])fin.uniforms[k].value=o.u[k];
      q.material=fin;renderer.setRenderTarget(null);renderer.setViewport(0,0,W,H);renderer.render(qs,qc);}};return P;})();
// ---------- 空（グラデ・太陽の光輪・雲） ----------
// 時間帯プリセット（街・海の町で共通）。シーンを作る前に TOD=TODP.day などを代入する
const TODP={
 evening:{sun:[-0.14,0.42,-1],top:0x1a3a74,hor:0xb8704e,sunCol:0xff9a50,cloudCol:null,cloud:0.6,fog:0xa87258,fn:160,ff:1000,hemiS:0x9ab4e8,hemiG:0x4a3a2c,hemi:0.42,sunC:0xffc890,sunI:3.4,win:1.3,shop:1.1,
   pp:{th:1.6,ex:0.92,bs:0.55,vig:0.65,sat:1.12,con:1.12}},
 day:{sun:[0.45,1.35,-0.55],top:0x1f6fd8,hor:0xbfe0ff,sunCol:0xfff4e0,cloudCol:0xffffff,cloud:0.45,fog:0xc8def2,fn:260,ff:1600,hemiS:0xd4e8ff,hemiG:0x9a8a6a,hemi:0.95,sunC:0xfff6ea,sunI:3.8,win:0.12,shop:0.55,
   pp:{th:2.4,ex:1.0,bs:0.28,vig:0.32,sat:1.28,con:1.08,lift:new THREE.Vector3(0,0.005,0.015),gain:new THREE.Vector3(1.0,1.0,1.0)}}};
let TOD=TODP.evening;
function skyDome(o){const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{sun:{value:o.sun.clone().normalize()},top:{value:new THREE.Color(o.top)},hor:{value:new THREE.Color(o.hor)},sc:{value:new THREE.Color(o.sunCol)},cl:{value:o.cloud||0.5},ccol:{value:new THREE.Color(o.cloudCol||0)},cw:{value:o.cloudCol?1:0}},
  vertexShader:'varying vec3 vD;void main(){vD=normalize((modelMatrix*vec4(position,0.)).xyz);gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}',
  fragmentShader:`uniform vec3 sun,top,hor,sc,ccol;uniform float cl,cw;varying vec3 vD;
   float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
   float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*ns(p);p*=2.03;a*=.5;}return s;}
   void main(){vec3 d=normalize(vD);float y=max(d.y,0.);vec3 c=mix(hor,top,pow(y,0.55));float sd=max(dot(d,sun),0.);
    c+=sc*(pow(sd,12.)*0.22+pow(sd,90.)*1.2+pow(sd,1500.)*30.);
    if(d.y>0.){vec2 p=d.xz/(d.y+0.12)*1.6;float n=fb(p+vec2(3.,1.));float k=smoothstep(0.55-cl*0.3,0.85,n)*smoothstep(0.0,0.25,d.y);vec3 cc=mix(mix(hor*1.1,sc*1.3,pow(sd,2.)),ccol*(0.85+0.3*n),cw);c=mix(c,cc,k*mix(0.5,0.92,cw));}
    c=mix(c,hor*0.9,smoothstep(0.02,-0.08,d.y));gl_FragColor=vec4(c,1.);}`});
  const s=new THREE.Mesh(new THREE.SphereGeometry(1,48,24),m);s.scale.setScalar(o.r||3000);s.frustumCulled=false;s.renderOrder=-10;return s;}
function envFrom(dome){const sc=new THREE.Scene();const d=dome.clone();d.scale.setScalar(50);sc.add(d);const pm=new THREE.PMREMGenerator(renderer);const rt=pm.fromScene(sc,0.02,0.1,200);return rt.texture;}
// ---------- 人物（滑らかなモデル・関節付き） ----------
const SKIN=[0xe8bfa0,0xdcae8c,0xf0cbb0,0xc8946e];
function person2(o={}){const g=new THREE.Group();const k=o.h||1;
  const skin=SM(o.skin||SKIN[0],{roughness:0.55}),top=SM(o.top||0x2a3a5a,{roughness:0.8}),pant=SM(o.pants||0x22252c,{roughness:0.85}),shoe=SM(o.shoe||0xf2f2f2,{roughness:0.5}),hair=SM(o.hair||0x1c1612,{roughness:0.6});
  const cap=(r,l,m,seg=12)=>new THREE.Mesh(new THREE.CapsuleGeometry(r,l,6,seg),m);
  const hip=new THREE.Group();hip.position.y=0.94*k;g.add(hip);
  const pel=cap(0.135,0.06,pant);pel.rotation.z=Math.PI/2;pel.scale.set(1,1,0.75);hip.add(pel);
  const torso=new THREE.Group();torso.position.y=0.05;hip.add(torso);
  const ch=cap(0.165,0.3,top,16);ch.position.y=0.28;ch.scale.set(1.18,1,0.72);torso.add(ch);
  if(o.coat){const cl=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,0.62,18,1,true),SM(o.top,{roughness:0.8,side:THREE.DoubleSide}));cl.position.y=-0.05;cl.scale.z=0.75;torso.add(cl);
    const col=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.035,8,18),top);col.rotation.x=Math.PI/2;col.position.set(0,0.52,0);col.scale.set(1.2,1,1);torso.add(col);}
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(0.048,0.055,0.12,12),skin);nk.position.y=0.6;torso.add(nk);
  const head=new THREE.Group();head.position.y=0.74;torso.add(head);
  const hd=new THREE.Mesh(new THREE.SphereGeometry(0.105,28,20),skin);hd.scale.set(0.88,1.08,0.98);head.add(hd);
  const hr=new THREE.Mesh(new THREE.SphereGeometry(0.112,28,20,0,Math.PI*2,0,o.long?Math.PI*0.72:Math.PI*0.5),hair);hr.scale.set(0.92,1.06,1.02);hr.position.set(0,0.012,-0.008);hr.rotation.x=-0.28;head.add(hr);
  if(o.long){const lh=cap(0.085,0.16,hair);lh.position.set(0,-0.08,-0.05);lh.scale.set(1.25,1,0.7);head.add(lh);}
  for(const sx of[-1,1]){const ear=new THREE.Mesh(new THREE.SphereGeometry(0.022,10,8),skin);ear.scale.set(0.5,1,0.8);ear.position.set(sx*0.093,0,0);head.add(ear);}
  for(const sx of[-1,1]){const ey=new THREE.Mesh(new THREE.SphereGeometry(0.011,10,8),SM(0x16110e,{roughness:0.3}));ey.scale.set(1,0.8,0.5);ey.position.set(sx*0.034,0.018,0.095);head.add(ey);const bw=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.006,0.008),hair);bw.position.set(sx*0.035,0.042,0.097);bw.rotation.z=-sx*0.12;head.add(bw);}
  const nose=new THREE.Mesh(new THREE.SphereGeometry(0.016,10,8),skin);nose.scale.set(0.8,1.1,1.2);nose.position.set(0,-0.01,0.1);head.add(nose);
  if(o.cap){const cp=new THREE.Mesh(new THREE.SphereGeometry(0.118,24,12,0,Math.PI*2,0,Math.PI*0.5),SM(o.cap));cp.position.y=0.02;head.add(cp);const br=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.01,20,1,false,-0.9,1.8),SM(o.cap));br.position.set(0,0.02,0.07);head.add(br);}
  const arms=[],elb=[],legs=[],kn=[],ft=[];
  for(const sx of[-1,1]){const sh=new THREE.Group();sh.position.set(sx*0.205,0.48,0);torso.add(sh);
    const ua=cap(0.052,0.24,top);ua.position.y=-0.15;sh.add(ua);const el=new THREE.Group();el.position.y=-0.3;sh.add(el);
    const fa=cap(0.044,0.22,o.short?skin:top);fa.position.y=-0.13;el.add(fa);const hand=new THREE.Mesh(new THREE.SphereGeometry(0.05,12,10),skin);hand.scale.set(0.7,1.25,0.45);hand.position.y=-0.3;el.add(hand);
    sh.rotation.z=sx*0.06;arms.push(sh);elb.push(el);
    const lg=new THREE.Group();lg.position.set(sx*0.095,-0.02,0);hip.add(lg);const th=cap(0.072,0.34,pant);th.position.y=-0.22;lg.add(th);
    const knee=new THREE.Group();knee.position.y=-0.43;lg.add(knee);const sn=cap(0.058,0.34,pant);sn.position.y=-0.2;knee.add(sn);
    const foot=new THREE.Group();foot.position.y=-0.43;knee.add(foot);const sh2=cap(0.045,0.17,shoe);sh2.rotation.x=Math.PI/2;sh2.position.set(0,-0.025,0.05);sh2.scale.set(1.15,1,1);foot.add(sh2);
    legs.push(lg);kn.push(knee);ft.push(foot);}
  if(o.bag){const b=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.38,0.14),SM(o.bag,{roughness:0.7}));b.position.set(0,0.3,-0.17);torso.add(b);}
  if(o.tote){const b=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.32,0.3),SM(o.tote));b.position.set(0,-0.42,0.02);elb[1].add(b);}
  g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});
  g.userData={hip,torso,head,arms,elb,legs,kn,ft,k};g.scale.setScalar(k);return g;}
// 歩行（p＝位相）。sp＝歩幅の大きさ
function walk(pp,p,sp=1){const u=pp.userData;const s=Math.sin(p),c=Math.cos(p);
  for(let i=0;i<2;i++){const ph=i?Math.PI:0;const si=Math.sin(p+ph),co=Math.cos(p+ph);
    u.legs[i].rotation.x=-0.42*si*sp;u.kn[i].rotation.x=(0.08+0.95*Math.pow(Math.max(0,co),2))*sp;u.ft[i].rotation.x=-(u.legs[i].rotation.x+u.kn[i].rotation.x)*0.7+0.1*Math.max(0,si)*sp;
    u.arms[i].rotation.x=0.38*si*sp;u.elb[i].rotation.x=-(0.25+0.25*Math.max(0,-si))*sp;}
  u.hip.position.y=0.94+0.022*Math.cos(2*p)*sp;u.hip.rotation.y=-0.07*s*sp;u.torso.rotation.y=0.12*s*sp;u.torso.rotation.x=0.04;u.hip.rotation.z=0.03*Math.sin(p)*sp;u.head.rotation.y=-0.06*s*sp;}
// スマホを見る姿勢（右手で持つ）
function phonePose(pp,k,t){const u=pp.userData;const a=u.arms[1],e=u.elb[1];a.rotation.x=lerp(a.rotation.x,-0.45,k);a.rotation.z=lerp(a.rotation.z,-0.25,k);e.rotation.x=lerp(e.rotation.x,-1.75,k);u.head.rotation.x=lerp(0,0.32,k);
  u.legs.forEach((l,i)=>{l.rotation.x=lerp(l.rotation.x,0,k);u.kn[i].rotation.x=lerp(u.kn[i].rotation.x,0.05,k);u.ft[i].rotation.x=lerp(u.ft[i].rotation.x,0,k);});u.arms[0].rotation.x=lerp(u.arms[0].rotation.x,0.05,k);}
