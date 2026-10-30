// ===== 冒頭カット1〜2の完成例（南海トラフ・6秒）。hq-core/hq-city/hq-phone の後に結合 =====
const TOTAL=6;
// ================= 文字レイヤー =================
const L=document.getElementById('layers');function el(html,id,cls='ov'){const d=document.createElement('div');d.id=id;d.className=cls;d.innerHTML=html;L.appendChild(d);return d;}
function show(e,o,tf){e.style.opacity=o;if(tf!==undefined)e.style.transform=tf;e.style.display=o>0.001?'block':'none';}
const VIG=el('','vig'),TOPS=el('','topshade'),BOTS=el('','botshade');
const TTL=el(`<div class="kick"><i></i>SIMULATION<i class="r"></i></div><div class="t1">もしも</div><div class="t2">南海トラフ</div><div class="t3">が発生したら？</div>`,'ttl');
const CD=el(`<div class="cdl" id="cdl">地震発生まで</div><div class="cdn" id="cdn">3.00<small>秒</small></div><div class="bar"><b id="cdb"></b><s id="cds"></s></div>`,'cd');
const TTL2=el(`もしも<span>南海トラフ</span>が発生したら？`,'ttl2');
const CD2=el(`<div class="cdl" style="font-size:26px">地震発生から</div><div class="cdn" id="cd2n" style="font-size:96px">0<small style="font-size:34px">秒</small></div>`,'cd2');CD2.style.cssText='left:0;width:1080px;text-align:center;top:140px';
const HD=el(`<div class="h">スマホが<em>一斉に</em>鳴り<br>地震の発生を伝える</div><div class="s">強い揺れの前に届かないこともある</div>`,'hd');
const NOTE=el('※最大クラスの想定に基づくシミュレーションです','note');
el('もしも南海トラフが発生したら？地震発生まで秒スマホが一斉に鳴り地震の発生を伝える強い揺れの前に届かないこともある※最大クラスの想定に基づくシミュレーションですSIMULATION0123456789.:','pre');
// ================= タイムライン =================
const CAM=new THREE.PerspectiveCamera(55,W/H,0.05,4000);
window.renderFrame=function(T){const S=SC.city;const heroZ=-22+1.38*Math.min(T,3)+ (T>3?0.25*(1-Math.exp(-(T-3)*4)):0);
  const hero=S.hero;hero.position.set(9.4,0.16,heroZ);hero.rotation.y=0;
  if(T<3){walk(hero,T*1.38*4.0,1);hero.visible=true;
    const d=4.5-0.25*T;CAM.position.set(9.75-0.1*T+Math.sin(T*1.3)*0.02,1.95+Math.sin(T*2.6)*0.015,heroZ+d);CAM.up.set(0,1,0);CAM.fov=54;CAM.lookAt(9.2,1.95+12.6,heroZ+d-50);
    S.update(T,heroZ,9.5,heroZ-12);CAM.aspect=W/H;CAM.updateProjectionMatrix();
    PP.render(S.s,CAM,{th:1.6,u:{ex:0.92,bs:0.55,vig:0.65,tm:T,sat:1.12,con:1.12}});}
  else{const u=(T-3)/3;hero.visible=false;S.update(T,heroZ,9.5,heroZ+12);
    const hx=9.4,hy=1.66,hz=heroZ;CAM.position.set(hx+0.2+Math.sin(T*1.7)*0.004,hy-0.05+Math.sin(T*2.3)*0.003,hz-0.1);CAM.up.set(0,1,0);CAM.fov=50;CAM.lookAt(hx-0.05,hy-0.75,hz+2.6);CAM.aspect=W/H;CAM.updateProjectionMatrix();CAM.updateMatrixWorld();
    FG.rig.position.copy(CAM.position);FG.rig.quaternion.copy(CAM.quaternion);
    const pz=lerp(-0.5,-0.37,easeOut(u*1.1)),vib=T<5.7?1:0;const j=Math.sin(T*170)*0.0016*vib,j2=Math.cos(T*143)*0.0012*vib;
    FG.ph.position.set(0.004+j,0.052+j2,pz);FG.ph.rotation.set(-0.16+Math.sin(T*1.4)*0.01,-0.06,0.05+j*4);
    const on=Math.floor(T*4)%2===0;FG.scrM.emissiveMap=FG.tx[on?1:2];FG.scrM.emissiveIntensity=on?1.1:0.9;FG.glow.intensity=on?0.06:0.03;
    PP.render(S.s,CAM,{fg:FG.s,dof:1.0,th:1.9,u:{ex:0.9,bs:0.38,vig:0.7,tm:T,sat:1.06,con:1.1}});}
  // 文字
  const q=smooth(2.72,3.0,T);
  show(VIG,1-q);show(TTL,1-q,`translateY(${-q*30}px) scale(${1+q*0.04})`);show(CD,1-smooth(2.9,3.02,T));
  if(T<3){const r=Math.max(0,3-T);document.getElementById('cdn').innerHTML=r.toFixed(2)+'<small>秒</small>';const k=Math.min(1,T/3);document.getElementById('cdb').style.width=(k*640)+'px';document.getElementById('cds').style.left=(k*640)+'px';
    const f=T%1;CD.style.transform=`scale(${1+0.035*Math.exp(-f*10)*(T>0.05?1:0)})`;}
  show(TTL2,smooth(3.05,3.35,T));show(CD2,smooth(3.05,3.35,T));if(T>=3)document.getElementById('cd2n').innerHTML=Math.floor(T-3)+'<small style="font-size:34px">秒</small>';show(TOPS,smooth(3.0,3.3,T));show(BOTS,smooth(3.0,3.3,T));
  show(NOTE,0.8*smooth(3.2,3.6,T));
  {const lt=T-3.25;show(HD,clamp(lt/0.18,0,1),`scale(${0.86+0.14*easeBack(lt/0.35)})`);HD.querySelector('.s').style.opacity=clamp((lt-0.35)/0.2,0,1);}
  $('flash').style.background='#ff2a1a';$('flash').style.opacity=T>=3&&T<3.18?0.55*(1-(T-3)/0.18):0;
};
(async()=>{const F=['800 80px "Shippori Mincho B1"','600 40px "Shippori Mincho B1"','500 30px "Oswald"','600 100px "Oswald"','500 30px "Zen Kaku Gothic New"','700 30px "Zen Kaku Gothic New"','900 30px "Zen Kaku Gothic New"'];
  const txt='もしも南海トラフが発生したら？地震発生まで秒スマホが一斉に鳴り地震の発生を伝える強い揺れの前に届かないこともある※最大クラスの想定に基づくシミュレーションです緊急速報紀伊半島沖で強い備えてください身の安全を確保この画面は10月25日土曜日メッセージ今日18時に駅前で！17:42SIMULATION0123456789.!';
  await Promise.all(F.map(f=>document.fonts.load(f,txt)));await document.fonts.ready;
  TOD=TODP.evening;SC.city=buildCity();buildFG();window.TOTAL=TOTAL;window.ready=true;})();
</script></body></html>
