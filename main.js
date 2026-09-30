"use strict";
/* Util murni: tanpa DOM, mudah dites manual. */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE=matchMedia("(max-width: 768px)").matches;
const FINE=matchMedia("(pointer: fine)").matches;
const pad2=n=>String(n).padStart(2,"0");
const clampN=(v,a,b)=>Math.min(b,Math.max(a,v));
function parts(ms){ms=Math.max(0,ms);const s=Math.floor(ms/1e3);return{d:Math.floor(s/86400),h:Math.floor(s%86400/36e2),m:Math.floor(s%36e2/60),s:s%60}}
const wrapIdx=(i,n)=>((i%n)+n)%n;
const fmtT=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+":"+pad2(s%60)};

/* ---------- Scene manager: satu aktif, crossfade + scale/blur via CSS ---------- */
let cur=0;
const entered={};
function go(n){
  n=clampN(n,1,7);
  if(n===cur)return;
  if(n>1&&!preview&&CONFIG.terkunci&&!arrived&&target>Date.now())return; /* kunci produksi sampai waktunya */
  $$(".scene").forEach(s=>s.classList.remove("active"));
  $("#scene-"+n).classList.add("active");
  $("#scene-"+n).scrollTop=0;
  cur=n;setMode(n);
  ({4:startLetter,5:renderMem,7:startFinale}[n]||(()=>{}))();
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-go]");
  if(b){go(+b.dataset.go);return;}
  const r=e.target.closest(".btn"); /* ripple hanya umpan balik sentuhan */
  if(r&&!r.disabled){const c=r.getBoundingClientRect(),s=document.createElement("span");s.className="rip";
    const d=Math.max(c.width,c.height);s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-c.left-d/2}px;top:${e.clientY-c.top-d/2}px`;
    r.appendChild(s);setTimeout(()=>s.remove(),650);}
});

/* ---------- Canvas latar: satu loop rAF, object pooling ---------- */
const cv=$("#bg"),ctx=cv.getContext("2d");
const fx=$("#fx"),fctx=fx.getContext("2d");
let G=ctx; /* konteks aktif: latar atau overlay perayaan */
let W=0,H=0,pool=[],alive=0,tickN=0;
let tpx=0,tpy=0,px=0,py=0,sceneMode=1,shootT=0;
const CAP=MOBILE?450:1000;
function rs(){const d=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
  for(const [c,g] of [[cv,ctx],[fx,fctx]]){c.width=W*d;c.height=H*d;c.style.width=W+"px";c.style.height=H+"px";g.setTransform(d,0,0,d,0,0)}}
addEventListener("resize",rs);rs();
function getP(){for(const p of pool)if(!p.on){p.on=true;return p}if(pool.length<CAP){const p={on:true};pool.push(p);return p}return null}
function emit(o){const p=getP();if(p)Object.assign(p,{life:0,max:1e9,a:1,tw:0,vr:0,rot:0},o)}
const R=(a,b)=>a+Math.random()*(b-a);
function seedStars(){const n=RM?25:MOBILE?60:140;for(let i=0;i<n;i++)emit({k:"s",x:R(0,W),y:R(0,H),r:R(.5,1.8),tw:R(0,6),dp:R(.1,1)})}
seedStars();
function setMode(n){sceneMode=n;
  if(n===3&&!RM)for(let i=0;i<5;i++)emit({k:"b",x:R(0,W),y:R(0,H),r:R(60,130),vx:R(-.08,.08),vy:R(-.06,.06),a:R(.1,.22)});
  if(n===8)shootT=40;
}
function burst(){ /* ledakan buka hadiah di overlay: konfeti + hati dari mulut kotak */
  const n=RM?10:MOBILE?80:150;
  for(let i=0;i<n;i++){const a=R(0,6.28),sp=R(2,7.5);
    emit({k:"c",top:true,x:W/2+R(-30,30),y:H*.4,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2.5,r:R(3,6),rot:R(0,6),vr:R(-.2,.2),c:["#e8a0b4","#f3e3b5","#d9738f","#fff"][i%4],max:R(60,120)});}
  for(let i=0;i<(RM?4:24);i++)emit({k:"h",top:true,x:W/2+R(-60,60),y:H*.4,vx:R(-1,1),vy:R(-2.4,-1),r:R(10,20),max:R(70,130)});
}
function rain(n){for(let i=0;i<n;i++)emit({k:"h",x:R(0,W),y:R(-H,-10),vx:R(-.3,.3),vy:R(.8,2),r:R(9,22),max:R(120,220)});}
function ambient(){ /* kelopak & hati pelan mengikuti scene */
  if(RM||tickN%6)return;
  const fall=sceneMode===1||sceneMode===2;
  if(fall&&Math.random()<.5)emit({k:"p",x:R(0,W),y:-12,vx:R(-.3,.3),vy:R(.4,1.1),r:R(3,6),rot:R(0,6),vr:R(-.05,.05),c:Math.random()<.5?"#e8a0b4":"#f3e3b5",max:R(200,420),sw:R(0,6)});
  else if(Math.random()<(sceneMode===8?.06:.015))emit({k:"h",x:R(0,W),y:H+14,vx:R(-.2,.2),vy:R(-.7,-.3),r:R(8,15),max:R(200,400)});
  if((sceneMode===8&&tickN>shootT)||Math.random()<.0012){emit({k:"x",x:R(W*.3,W),y:R(0,H*.3),vx:R(-9,-6),vy:R(3,4.5),max:40});shootT=tickN+R(240,540);}
}
function step(p){
  p.life++;if(p.life>p.max){p.on=false;return}
  const D=DT; /* faktor delta-time: gerak konsisten walau FPS turun */
  if(p.k==="s")return;
  if(p.k==="x"){p.x+=p.vx*D;p.y+=p.vy*D;return}
  if(p.k==="c"){p.vy+=.12*D;p.x+=p.vx*D;p.y+=p.vy*D;p.rot+=p.vr*D;return}
  if(p.k==="r"){p.vy*=1.03;p.x+=p.vx*D;p.y+=p.vy*D; /* roket: melesat lalu meledak */
    if(p.y<=p.ty||p.y<-30){p.on=false;explode(p.x,Math.max(50,p.y),p.c)}return}
  if(p.k==="f"){p.vx*=.986;p.vy=p.vy*.986+.055*D;p.x+=p.vx*D;p.y+=p.vy*D;return} /* pecahan api */
  if(p.k==="l"){p.y+=p.vy*D;p.x+=p.vx*D; /* balon naik, meletus di atas */
    if(p.y<70){p.on=false;if(!RM)popBalloon(p)}return}
  if(p.k==="b"){p.x+=p.vx*D;p.y+=p.vy*D;if(p.x<-150)p.x=W+150;if(p.x>W+150)p.x=-150;if(p.y<-150)p.y=H+150;if(p.y>H+150)p.y=-150;return}
  p.x+=(p.vx+(p.sw?Math.sin((p.life+p.sw*40)/40)*.4:0))*D;p.y+=p.vy*D;p.rot+=p.vr*D;
  if(p.y>H+30||p.y<-40)p.on=false;
}
function draw(p){
  G=p.top?fctx:ctx; /* perayaan di overlay atas kotak, ambien di latar */
  const ox=px*22*(p.dp||.4),oy=py*22*(p.dp||.4);
  if(p.k==="s"){G.globalAlpha=.25+.65*Math.abs(Math.sin(tickN/40+p.tw));G.fillStyle="#f6e9ef";G.fillRect(p.x+ox,p.y+oy,p.r,p.r);}
  else if(p.k==="p"){G.globalAlpha=.75;G.fillStyle=p.c;G.save();G.translate(p.x+ox,p.y+oy);G.rotate(p.rot);G.beginPath();G.ellipse(0,0,p.r,p.r*.55,0,0,6.29);G.fill();G.restore();}
  else if(p.k==="h"){G.globalAlpha=clampN(1.4-p.life/p.max,0,1)*.9;G.fillStyle="#e8a0b4";G.font=p.r+'px serif';G.fillText("♥",p.x+ox,p.y+oy);}
  else if(p.k==="c"){G.globalAlpha=clampN(1.2-p.life/p.max,0,1);G.fillStyle=p.c;G.save();G.translate(p.x,p.y);G.rotate(p.rot);G.fillRect(-p.r/2,-p.r/2,p.r,p.r*.62);G.restore();}
  else if(p.k==="b"){const g=G.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);g.addColorStop(0,`rgba(232,160,180,${p.a})`);g.addColorStop(1,"rgba(232,160,180,0)");G.globalAlpha=1;G.fillStyle=g;G.beginPath();G.arc(p.x,p.y,p.r,0,6.29);G.fill();}
  else if(p.k==="x"){const t=1-p.life/p.max;G.globalAlpha=t;G.strokeStyle="#f3e3b5";G.lineWidth=2;G.beginPath();G.moveTo(p.x,p.y);G.lineTo(p.x-p.vx*8,p.y-p.vy*8);G.stroke();}
  else if(p.k==="r"){G.globalCompositeOperation="lighter"; /* roket menyala */
    G.strokeStyle=p.c;G.lineWidth=2.5;G.beginPath();
    G.moveTo(p.x+ox,p.y+oy);G.lineTo(p.x-p.vx*4+ox,p.y-p.vy*4+oy);G.stroke();
    G.fillStyle="#fff";G.beginPath();G.arc(p.x+ox,p.y+oy,2.4,0,6.29);G.fill();
    G.globalCompositeOperation="source-over";}
  else if(p.k==="f"){const t=1-p.life/p.max; /* pecahan api berkelip */
    G.globalCompositeOperation="lighter";
    G.globalAlpha=t*(.55+.45*Math.sin(p.life*.9));G.fillStyle=p.c;
    G.beginPath();G.arc(p.x+ox,p.y+oy,p.r,0,6.29);G.fill();
    G.globalCompositeOperation="source-over";}
  else if(p.k==="l"){drawBalloon(p,ox,oy);}
  G.globalAlpha=1;
}
function starPath(x,y,r){G.beginPath();
  for(let i=0;i<10;i++){const rr=i%2?r*.45:r,a=-Math.PI/2+i*Math.PI/5;
    const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;i?G.lineTo(px,py):G.moveTo(px,py)}
  G.closePath()}
function drawBalloon(p,ox,oy){ /* 0 bulat 1 lonjong 2 hati 3 bintang + tali */
  G.save();
  G.globalAlpha=Math.min(p.life<30?p.life/30:1,p.y<80?Math.max(0,p.y/80):1);
  const sway=Math.sin((p.life+p.sw*40)/40)*5,x=p.x+sway+ox,y=p.y+oy,r=p.r;
  G.strokeStyle="rgba(246,233,239,.55)";G.lineWidth=1.2;G.beginPath();
  G.moveTo(x,y+r*.9);G.quadraticCurveTo(x+4,y+r*1.5,x-3,y+r*2.1);G.stroke();
  if(p.shape===2){G.fillStyle=p.c;G.font=(r*2.1)+'px serif';G.textAlign="center";G.fillText("♥",x,y+r*.55)}
  else if(p.shape===3){G.fillStyle=p.c;starPath(x,y,r*.85);G.fill();
    G.fillStyle="rgba(255,255,255,.4)";starPath(x-r*.15,y-r*.2,r*.3);G.fill()}
  else{G.save();G.translate(x,y);if(p.shape===1)G.scale(.74,1.08);
    const g=G.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r*1.2);
    g.addColorStop(0,"rgba(255,255,255,.75)");g.addColorStop(.35,p.c);g.addColorStop(1,p.c2);
    G.fillStyle=g;G.beginPath();G.ellipse(0,0,r,r,0,0,6.29);G.fill();
    G.fillStyle=p.c2;G.beginPath(); /* simpul bawah */
    G.moveTo(-r*.16,r*.92);G.lineTo(r*.16,r*.92);G.lineTo(0,r*1.18);G.closePath();G.fill();
    G.restore()}
  G.restore();
}
function popBalloon(p){ /* balon meletus jadi mini-konfeti */
  const n=MOBILE?5:9;
  for(let i=0;i<n;i++){const a=R(0,6.283),sp=R(1,3.5);
    emit({k:"c",top:true,x:p.x+R(-8,8),y:p.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,
      r:R(2,3.5),rot:R(0,6),vr:R(-.3,.3),c:i%2?p.c:"#fff",max:R(40,75)})}
}
function explode(x,y,c){ /* ledakan kembang api + hati */
  const n=RM?0:MOBILE?50:90;
  for(let i=0;i<n;i++){const a=R(0,6.283),sp=R(1.5,6.5);
    emit({k:"f",top:true,x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:R(1.4,2.6),c,max:R(70,130)})}
  for(let i=0;i<6;i++)emit({k:"h",top:true,x:x+R(-20,20),y:y+R(-10,10),vx:R(-1.5,1.5),vy:R(-2,-.5),r:R(9,15),max:R(60,110)});
}
function launchShow(){ /* pesta buka hadiah: konfeti + balon + roket + tulisan */
  burst();
  if(RM)return;
  const bx=W/2,by=H*.44; /* mulut kotak yang terbuka lebar */
  const cols=["#e8a0b4","#f3e3b5","#a78bfa","#67e8f9","#f6e9ef","#d9738f"];
  const dark=["#a14a68","#b08a3e","#5b3fa8","#1e7d96","#b99aa8","#8e3550"];
  const nb=MOBILE?36:72;
  for(let i=0;i<nb;i++){const ci=i%cols.length,side=i%2?1:-1; /* klaster kiri-kanan, koridor tengah lega */
    setTimeout(()=>emit({k:"l",top:true,x:bx+side*R(60,180),y:by+R(-12,12),vx:R(-.25,.25),
      vy:R(-1.5,-.72),r:R(13,22),shape:i%4,c:cols[ci],c2:dark[ci],sw:R(0,6),max:1400}),i*45)}
  const rc=["#f3e3b5","#e8a0b4","#a78bfa","#67e8f9"],nr=MOBILE?10:18;
  for(let i=0;i<nr;i++){const side=i%2?1:-1;
    setTimeout(()=>emit({k:"r",top:true,x:bx+side*R(50,150),y:H*.5,
    vy:R(-7.5,-6),vx:R(-.6,.6),ty:R(H*.12,H*.32),c:rc[i%rc.length],max:300}),250+i*220)}
  showBurstText();
}
let burstTimers=[];
function showBurstText(){ /* HAPPY BIRTHDAY meletus huruf per huruf */
  const box=$("#burst-text");box.innerHTML="";
  ["HAPPY","BIRTHDAY"].forEach(word=>{
    const div=document.createElement("div");div.className="bw";
    [...word].forEach(ch=>{const s=document.createElement("span");s.textContent=ch;div.appendChild(s)});
    box.appendChild(div)});
  box.classList.remove("fade");box.classList.add("show");
  box.querySelectorAll("span").forEach((s,i)=>
    burstTimers.push(setTimeout(()=>s.classList.add("pop"),150+i*70)));
  burstTimers.push(setTimeout(()=>box.classList.add("fade"),4000));
}
function hideBurstText(){burstTimers.forEach(clearTimeout);burstTimers=[];
  const box=$("#burst-text");box.classList.remove("show","fade");box.innerHTML=""}
let DT=1,lastT=0;
function loop(now){requestAnimationFrame(loop);if(document.hidden)return;tickN++;
  DT=lastT?Math.min(2.5,Math.max(.5,(now-lastT)/16.7)):1;lastT=now; /* kompensasi FPS */
  px+=(tpx-px)*.04;py+=(tpy-py)*.04;ambient();miloTick();
  px+=(tpx-px)*.04;py+=(tpy-py)*.04;ambient();miloTick();
  ctx.clearRect(0,0,W,H);fctx.clearRect(0,0,W,H);
  for(const p of pool)if(p.on){step(p);if(p.on)draw(p)}
}
/* loop mulai di akhir file (setelah semua const terinisialisasi) via requestAnimationFrame(loop) */
addEventListener("pointermove",e=>{tpx=e.clientX/W*2-1;tpy=e.clientY/H*2-1;
  const b=$("#bokeh");if(b&&!RM)b.style.transform=`translate3d(${px*-18}px,${py*-14}px,0)`;},{passive:true});
addEventListener("deviceorientation",e=>{if(e.gamma==null||RM)return;tpx=clampN(e.gamma/30,-1,1);tpy=clampN((e.beta-45)/30,-1,1);});

/* ---------- Musik: widget + fade 1.5 dtk ---------- */
let audio=null,mVol=.8;
function initMusic(){if(!CONFIG.musik)return;audio=new Audio(CONFIG.musik);audio.loop=true;audio.volume=0;$("#music").hidden=false}
function fade(v){if(!audio)return;clearInterval(fade.t);const from=audio.volume,d=v-from,t0=performance.now();
  fade.t=setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/1500);audio.volume=from+d*k;if(k>=1)clearInterval(fade.t)},100)}
function musicStart(){if(!audio||!audio.paused)return;audio.play().catch(()=>{});fade(mVol);$("#music").classList.add("playing");$("#music-state").textContent="playing"}
function musicToggle(){if(!audio)return;if(audio.paused)musicStart();else{fade(0);setTimeout(()=>audio.pause(),1600);$("#music").classList.remove("playing");$("#music-state").textContent="paused"}}
$("#music-btn").addEventListener("click",musicToggle);
/* SFX kembang api: bunyi sekali tiap kotak dibuka */
let sfx=null;
function initSfx(){if(!CONFIG.sfx)return;sfx=new Audio(CONFIG.sfx);sfx.volume=.9}
function playSfx(){if(!sfx)return; /* bunyi 6 detik: penuh 4 detik + fade out 2 detik */
  try{sfx.currentTime=0;sfx.volume=.9;sfx.play().catch(()=>{})}catch(_){}
  clearTimeout(playSfx.t);clearInterval(playSfx.f);
  playSfx.t=setTimeout(()=>{
    const t0=performance.now();
    playSfx.f=setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/2000);
      try{sfx.volume=.9*(1-k)}catch(_){}
      if(k>=1){clearInterval(playSfx.f);try{sfx.pause()}catch(_){}}},100);
  },4000)}

/* ---------- Scene 1: countdown ---------- */
const target=Date.parse(CONFIG.tanggalUlangTahun||"");
const preview=new URLSearchParams(location.search).has("preview");
let arrived=!target||isNaN(target)||preview||target<=Date.now();
function setNum(id,v){const el=$(id);v=pad2(v);if(el.textContent!==v){el.textContent=v;if(!RM){el.classList.remove("swap");void el.offsetWidth;el.classList.add("swap")}}}
function cdTick(){
  if(arrived)return;
  const left=target-Date.now();
  if(left<=0){arrived=true;cdArrive();return}
  const p=parts(left);setNum("#cd-d",p.d);setNum("#cd-h",p.h);setNum("#cd-m",p.m);setNum("#cd-s",p.s);
}
function cdArrive(){const n=$("#cd-note");n.hidden=false;n.textContent="Hari ini adalah hari spesialnya!";$("#btn-gift").disabled=false;
  ["#cd-d","#cd-h","#cd-m","#cd-s"].forEach(s=>setNum(s,0))}
if(arrived)cdArrive();else{setInterval(cdTick,1000);cdTick()}
if(!CONFIG.terkunci)$("#btn-gift").disabled=false; /* mode develop: tombol selalu aktif */
if(arrived)cdArrive();else{setInterval(cdTick,1000);cdTick()}
$("#btn-gift").addEventListener("click",()=>go(2));

/* ---------- Scene 2: hadiah 3D ---------- */
let opened=false;
const gift=$("#gift"),gfloat=$("#gift-float");
if(FINE&&!RM)$("#gift-stage").addEventListener("pointermove",e=>{ /* miring maks 15 derajat */
  const r=e.currentTarget.getBoundingClientRect();
  gift.style.transform=`rotateY(${((e.clientX-r.left)/r.width-.5)*30}deg) rotateX(${((e.clientY-r.top)/r.height-.5)*-30}deg)`});
$("#gift-stage").addEventListener("pointerleave",()=>gift.style.transform="");
function openGift(){
  if(opened||(CONFIG.terkunci&&!arrived))return;opened=true;musicStart();
  try{navigator.vibrate&&navigator.vibrate(30)}catch(_){}
  if(RM){gift.classList.add("open");launchShow();playSfx();setTimeout(()=>go(3),900);return}
  gift.classList.add("shake");
  setTimeout(()=>{gift.classList.remove("shake");gift.classList.add("open");launchShow();playSfx();
    try{navigator.vibrate&&navigator.vibrate([30,50,30])}catch(_){}
    setTimeout(()=>go(3),4800)},1600);
}
gift.addEventListener("click",openGift);
gift.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openGift()}});

/* ---------- Scene 4: surat mengetik ---------- */
$("#letter-title").textContent=CONFIG.suratJudul||"Happy Birthday";
let letterRun=false,letterDone=false,letterStop=false;
function startLetter(){if(letterRun)return;letterRun=true;
  const body=$("#letter-body");body.innerHTML="";letterStop=false;
  const paras=CONFIG.suratIsi&&CONFIG.suratIsi.length?CONFIG.suratIsi:["[ISI DI SINI]"];
  if(RM){body.innerHTML=paras.map(p=>`<p>${p}</p>`).join("");finishLetter();return}
  let pi=0,ci=0,pel=null;
  $("#letter-caret").style.display="";
  (function type(){
    if(letterStop){body.innerHTML=paras.map(p=>`<p>${p}</p>`).join("");finishLetter();return}
    if(pi>=paras.length){finishLetter();return}
    if(!pel){pel=document.createElement("p");body.appendChild(pel)}
    const t=paras[pi];
    if(ci<=t.length){pel.textContent=t.slice(0,ci++);
      const ch=t[ci-2]; /* jeda napas di koma dan titik */
      setTimeout(type,/[,;]/.test(ch)?160:/[.!?…]/.test(ch)?320:28+Math.random()*12);
    }else{pi++;ci=0;pel=null;setTimeout(type,260)}
  })();
}
function finishLetter(){$("#letter-caret").style.display="none";letterDone=true;$("#letter-hint").style.display="none";$("#letter-done").classList.add("show")}
$("#letter-card").addEventListener("click",()=>{if(letterRun&&!letterDone)letterStop=true});

/* ---------- Scene 5: memories + lightbox ---------- */
let lbIdx=0,lbList=[];
function memData(){return CONFIG.foto&&CONFIG.foto.length?CONFIG.foto:Array.from({length:6},(_,i)=>({src:"",caption:"[Foto "+(i+1)+"]"}))}
function renderMem(){if(entered[5])return;entered[5]=1;
  const g=$("#mem-grid");
  g.innerHTML=memData().map((f,i)=>`<div class="mem" style="--rot:${(i*37%13-6).toFixed(1)}deg"><figure tabindex="0" data-i="${i}" role="button" aria-label="Buka foto ${i+1}">${f.src?`<img src="${f.src}" alt="${f.caption||"Foto "+(i+1)}" loading="lazy">`:`<div class="ph">♥</div>`}<figcaption>${f.caption||"[Foto "+(i+1)+"]"}</figcaption></figure></div>`).join("");
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.style.transitionDelay=(+e.target.querySelector("figure").dataset.i*70)+"ms";e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.15});
  $$("#mem-grid .mem").forEach(m=>io.observe(m));
  if(FINE&&!RM)g.addEventListener("pointermove",e=>{ /* tilt 3D halus di desktop */
    const f=e.target.closest("figure");if(!f)return;const r=f.getBoundingClientRect();
    f.style.transform=`rotateX(${((e.clientY-r.top)/r.height-.5)*-10}deg) rotateY(${((e.clientX-r.left)/r.width-.5)*10}deg) scale(1.08)`});
  g.addEventListener("pointerout",e=>{const f=e.target.closest("figure");if(f)f.style.transform=""});
  g.addEventListener("click",e=>{const f=e.target.closest("figure");if(f)openLB(+f.dataset.i)});
  g.addEventListener("keydown",e=>{const f=e.target.closest("figure");if(f&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openLB(+f.dataset.i)}});
}
function openLB(i){lbList=memData();lbIdx=wrapIdx(i,lbList.length);showLB();$("#lightbox").hidden=false;$("#lb-close").focus()}
function showLB(){const f=lbList[lbIdx],img=$("#lb-img");
  if(f.src){img.src=f.src;img.alt=f.caption||"Foto kenangan"}else{img.removeAttribute("src");img.alt="Placeholder foto"}
  $("#lb-cap").textContent=f.caption||"[Foto "+(lbIdx+1)+"]"}
function closeLB(){$("#lightbox").hidden=true}
$("#lb-close").addEventListener("click",closeLB);
$("#lb-prev").addEventListener("click",()=>{lbIdx=wrapIdx(lbIdx-1,lbList.length);showLB()});
$("#lb-next").addEventListener("click",()=>{lbIdx=wrapIdx(lbIdx+1,lbList.length);showLB()});
$("#lightbox").addEventListener("click",e=>{if(e.target.id==="lightbox")closeLB()});
let lbX=0;$("#lightbox").addEventListener("touchstart",e=>lbX=e.touches[0].clientX,{passive:true});
$("#lightbox").addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-lbX; /* geser ganti foto */
  if(Math.abs(dx)>50){lbIdx=wrapIdx(lbIdx+(dx<0?1:-1),lbList.length);showLB()}},{passive:true});

/* ---------- Scene 6: video kustom ---------- */
const v=$("#video");let ducked=false;
if(CONFIG.video&&CONFIG.video.src){v.src=CONFIG.video.src;if(CONFIG.video.poster)v.poster=CONFIG.video.poster}
else{$("#video-empty").hidden=false;$("#v-controls").style.display="none";v.style.display="none"}
function vDuck(on){if(!audio)return; /* musik turun ke 20 persen saat video bunyi */
  if(on&&!ducked){ducked=true;fade(mVol*.2)}else if(!on&&ducked){ducked=false;fade(mVol)}}
$("#v-play").addEventListener("click",()=>v.paused?v.play():v.pause());
v.addEventListener("play",()=>{$("#v-play").textContent="⏸";vDuck(true)});
const vStop=()=>{$("#v-play").textContent="▶";vDuck(false)};
v.addEventListener("pause",vStop);v.addEventListener("ended",vStop);
v.addEventListener("timeupdate",()=>{const k=v.duration?v.currentTime/v.duration*100:0;
  $("#v-fill").style.width=k+"%";$("#v-prog").setAttribute("aria-valuenow",Math.round(k));
  $("#v-time").textContent=fmtT(v.currentTime)+" / "+fmtT(v.duration)});
function vSeek(clientX){const r=$("#v-prog").getBoundingClientRect();
  if(v.duration)v.currentTime=clampN((clientX-r.left)/r.width,0,1)*v.duration}
let seeking=false;
$("#v-prog").addEventListener("pointerdown",e=>{seeking=true;$("#v-prog").setPointerCapture(e.pointerId);vSeek(e.clientX)});
$("#v-prog").addEventListener("pointermove",e=>seeking&&vSeek(e.clientX));
$("#v-prog").addEventListener("pointerup",()=>seeking=false);
$("#v-prog").addEventListener("keydown",e=>{if(!v.duration)return;
  if(e.key==="ArrowRight")v.currentTime=Math.min(v.duration,v.currentTime+5);
  if(e.key==="ArrowLeft")v.currentTime=Math.max(0,v.currentTime-5)});
$("#v-mute").addEventListener("click",()=>{v.muted=!v.muted;$("#v-mute").textContent=v.muted?"✕":"♪"});
$("#v-full").addEventListener("click",()=>{const f=$("#video-frame");document.fullscreenElement?document.exitFullscreen():f.requestFullscreen&&f.requestFullscreen()});

/* ---------- Scene 7: penutup + replay bersih ---------- */
let finalRun=false;
function startFinale(){if(finalRun)return;finalRun=true;
  const t="With All My Love,",el=$("#final-title");$("#final-caret").style.display="";
  const lines=CONFIG.penutup&&CONFIG.penutup.length?CONFIG.penutup:["[ISI DI SINI]"];
  const box=$("#final-lines");box.innerHTML="";
  const showLines=()=>{box.innerHTML=lines.map(l=>`<p>${l}</p>`).join("");
    [...box.children].forEach((p,i)=>setTimeout(()=>p.classList.add("show"),RM?0:500*(i+1)));
    $("#final-caret").style.display="none"};
  if(RM){el.textContent=t;showLines();return}
  let i=0;(function type(){if(i<=t.length){el.textContent=t.slice(0,i++);setTimeout(type,70)}else setTimeout(showLines,400)})();
}
function resetAll(){ /* replay: semua state kembali murni */
  opened=false;hideBurstText();gift.classList.remove("open","shake");gift.style.transform="";
  letterRun=false;letterDone=false;$("#letter-body").innerHTML="";$("#letter-done").classList.remove("show");
  $("#letter-hint").style.display="";entered[5]=0;finalRun=false;
  $("#final-title").textContent="";$("#final-lines").innerHTML="";
  try{v.pause()}catch(_){}
}
$("#btn-replay").addEventListener("click",()=>{resetAll();go(2)});

/* ---------- Navigasi global: keyboard + swipe ---------- */
document.addEventListener("keydown",e=>{
  if(!$("#lightbox").hidden){ /* lightbox punya navigasi sendiri */
    if(e.key==="Escape")closeLB();
    if(e.key==="ArrowRight"){lbIdx=wrapIdx(lbIdx+1,lbList.length);showLB()}
    if(e.key==="ArrowLeft"){lbIdx=wrapIdx(lbIdx-1,lbList.length);showLB()}
    return}
  if(e.target.closest("button,input,video,[role=button],[role=slider]")){if(e.key==="m"||e.key==="M")musicToggle();return}
  if(e.key==="Enter"||e.key===" "||e.key==="ArrowRight"){if(cur===2&&e.key!=="ArrowRight"){openGift();return}e.preventDefault();go(cur+1)}
  else if(e.key==="ArrowLeft")go(cur-1);
  else if(e.key==="m"||e.key==="M")musicToggle();
  else if(e.key==="h"||e.key==="H")rain(RM?8:60);
});
let swX=0,swY=0;
document.addEventListener("touchstart",e=>{swX=e.touches[0].clientX;swY=e.touches[0].clientY},{passive:true});
document.addEventListener("touchend",e=>{ /* geser horizontal pindah scene, vertikal tetap scroll */
  if(!$("#lightbox").hidden||e.target.closest("video,.v-prog,.letter"))return;
  const dx=e.changedTouches[0].clientX-swX,dy=e.changedTouches[0].clientY-swY;
  if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)go(cur+(dx<0?1:-1))},{passive:true});
$$("[data-egg]").forEach(b=>b.addEventListener("click",()=>rain(RM?8:60)));

/* ---------- Milo pixel-art ala Comnyang: eye-follow, mochi-drag, hunt, purr, knead, peek ---------- */
const miloEl=$("#milo"),MILO_ON=!!(CONFIG.kucing&&CONFIG.kucing.aktif);
const milo={x:0,y:0,tx:0,ty:0,mode:"wander",speed:.035,holdUntil:0,sleep:false,blink:0,lastReact:0,scene:0,hunting:false};
let huntUntil=0,lastStretch=0,lastKnead=0,lastScrollReact=0,purring=false;
const lastP={x:0,y:0,t:0};
/* Peta pixel 16x16: O outline S belang C krem W mata N hidung E telinga F bulu */
const PX=["................","..OO........OO..","..OEO......OEO..","...OOOOOOOOOO...","..OFSSFFFFSSFO..","..OFWWWFFWWWFO..","..OFWWWFFWWWFO..","..OFFCCNNCCFFO..","..OFFCCOOCCFFO..","...OFFFFFFFFO...","...OFSFFFFSFO...","...OFFFFFFFFO...","...OFFFFFFFFO...","...OFFFFFFFFO...","...OFFFFFFFFO...","...OOFFFFFFOO..."];
const PXC={O:"#5a3a22",F:"#e89b3f",S:"#b26a24",C:"#f6d9a8",W:"#ffffff",N:"#e87a8a",E:"#f2a3b5"};
function pxRender(){ /* bangun 200-an rect sekali saja saat init */
  const g=$("#px-base"),NS="http://www.w3.org/2000/svg";
  PX.forEach((row,y)=>{[...row].forEach((ch,x)=>{if(ch===".")return;
    const r=document.createElementNS(NS,"rect");
    r.setAttribute("x",x);r.setAttribute("y",y);r.setAttribute("width",1);r.setAttribute("height",1);
    r.setAttribute("fill",PXC[ch]);g.appendChild(r)})});
}
function setSay(t,ms){ /* bubble teks Milo */
  const s=$("#milo-say");s.textContent=t||"";
  miloEl.classList.toggle("say",!!t);
  clearTimeout(setSay.t);if(t&&ms)setSay.t=setTimeout(()=>miloEl.classList.remove("say"),ms);
}
function miloHearts(n){ /* hati beterbangan dari posisi Milo */
  const r=$("#milo-svg").getBoundingClientRect();
  for(let i=0;i<n;i++){const s=document.createElement("span");s.className="mini-heart";s.textContent="♥";
    s.style.left=r.left+R(-10,50)+"px";s.style.top=r.top+"px";s.style.fontSize=R(13,22)+"px";
    document.body.appendChild(s);setTimeout(()=>s.remove(),1700)}
}
function miloPoint(){ /* titik acak dengan margin agar tak menutup tombol */
  return [60+Math.random()*Math.max(80,W-120),110+Math.random()*Math.max(80,H-200)];
}
function miloGo(x,y,fast){ /* dipanggil saat user klik: berlari ke sana */
  milo.tx=Math.min(W-60,Math.max(60,x));milo.ty=Math.min(H-90,Math.max(110,y));
  milo.mode=fast?"run":"wander";milo.speed=fast?.11:.035;
  milo.sleep=false;miloEl.classList.remove("sleep","groom");
}
function miloReact(){ /* reaksi acak ala kucing: lompat, jilat-jilat, tidur, ngibrit */
  const now=performance.now();
  if(now-milo.lastReact<1500)return; /* anti spam */
  milo.lastReact=now;
  miloEl.classList.remove("jump","groom","walk","dash");
  const r=Math.random();
  if(r<.3){milo.mode="busy";milo.holdUntil=now+600;
    void miloEl.offsetWidth;miloEl.classList.add("jump");
  }else if(r<.58){milo.mode="busy";milo.holdUntil=now+3000;miloEl.classList.add("groom");
  }else if(r<.8){milo.mode="sleep";milo.sleep=true;miloEl.classList.add("sleep");
    milo.holdUntil=now+5000+Math.random()*4000;
  }else{const p=miloPoint();milo.tx=p[0];milo.ty=p[1];milo.mode="dash";milo.speed=.14;
    milo.sleep=false;miloEl.classList.remove("sleep")}
}
function miloTick(){
  if(!MILO_ON||RM)return;
  const now=performance.now();
  if(milo.scene!==cur){ /* pindah scene: jelajah baru + lompat gembira bila maju */
    const fwd=cur>milo.scene&&milo.scene>=1;milo.scene=cur;
    miloEl.classList.remove("peek");
    if(milo.mode==="wander"||milo.mode==="peek"){const p=miloPoint();milo.tx=p[0];milo.ty=p[1];milo.mode="wander";milo.speed=.035}
    if(fwd){miloEl.classList.remove("jump");void miloEl.offsetWidth;miloEl.classList.add("jump");setSay("Miaw! ♥",1200)}
  }
  if(cur===6&&milo.mode==="wander"&&now>=milo.holdUntil){ /* peek mode: mengintip dari tepi saat video */
    milo.mode="peek";milo.tx=W-64;milo.ty=H+30;milo.speed=.06;miloEl.classList.add("peek");
  }else if(cur!==6&&milo.mode==="peek"){milo.mode="wander";miloEl.classList.remove("peek")}
  const hunting=now<huntUntil&&(milo.mode==="wander"||milo.mode==="run"); /* mouse hunt */
  if(hunting){milo.tx=Math.min(W-60,Math.max(60,lastP.x));milo.ty=Math.min(H-90,Math.max(110,lastP.y+10));
    milo.speed=.13;miloEl.classList.add("hunt");setSay("!")}
  else if(milo.hunting){milo.hunting=false;miloEl.classList.remove("hunt");miloEl.classList.remove("say");milo.speed=.035}
  milo.hunting=hunting;
  if(milo.mode==="held"){/* dipegang: posisi diatur drag, hanya render */}
  else if(milo.mode==="busy"||milo.mode==="sleep"){
    if(now>=milo.holdUntil){milo.mode="wander";milo.sleep=false;
      miloEl.classList.remove("sleep","groom","jump");
      const p=miloPoint();milo.tx=p[0];milo.ty=p[1];milo.speed=.035}
  }else{
    const dx=milo.tx-milo.x,dy=milo.ty-milo.y,d=Math.hypot(dx,dy);
    if(d<12){ /* sampai: jeda sebentar atau bereaksi */
      miloEl.classList.remove("walk","dash");
      if(milo.mode==="peek"){/* tetap mengintip di tepi */}
      else if(milo.mode==="dash"){milo.mode="wander";if(Math.random()<.4)miloReact();else{milo.mode="busy";milo.holdUntil=now+1200}}
      else if(milo.mode==="run"){milo.mode="wander";miloReact()}
      else{milo.mode="busy";milo.holdUntil=now+800+Math.random()*2200;
        const p=miloPoint();milo.tx=p[0];milo.ty=p[1]}
    }else{milo.x+=dx*milo.speed;milo.y+=dy*milo.speed;
      if(dx>6)miloEl.classList.remove("flip");else if(dx<-6)miloEl.classList.add("flip");
      miloEl.classList.toggle("walk",d>14);miloEl.classList.toggle("dash",milo.mode==="dash")}
  }
  miloEl.style.transform=`translate3d(${milo.x-38}px,${milo.y-60}px,0)`;
  if(!milo.sleep&&now>milo.blink){milo.blink=now+3000+Math.random()*2000; /* kedip */
    miloEl.classList.add("blink");setTimeout(()=>miloEl.classList.remove("blink"),180)}
  if(now-lastStretch>90000){lastStretch=now; /* meregang sesekali */
    miloEl.classList.add("stretch");setSay("Santai dulu ♥",2600);
    setTimeout(()=>miloEl.classList.remove("stretch"),2600)}
}
function petMilo(){ /* disapa langsung: lompat + hati */
  if(!MILO_ON||RM)return;
  const now=performance.now();milo.lastReact=now;
  milo.mode="busy";milo.holdUntil=now+1300;milo.sleep=false;
  miloEl.classList.remove("sleep","groom","walk","dash","jump","hunt");
  void miloEl.offsetWidth;miloEl.classList.add("jump");setSay("Miaw! ♥",1300);
  miloHearts(5);
}
function purr(){ /* dielus: mata bahagia + dengkur */
  if(purring||!MILO_ON||RM)return;purring=true;
  miloEl.classList.add("purr");setSay("Purrr… ♥",2600);miloHearts(3);
  setTimeout(()=>{miloEl.classList.remove("purr");purring=false},2600);
}
if(MILO_ON){
  $("#milo-name").textContent=(CONFIG.kucing.nama||"Milo")+" ♥";
  miloEl.hidden=false;
  pxRender();
  if(RM){miloEl.classList.add("sleep");miloEl.style.transform=`translate3d(${W-116}px,${H-150}px,0)`}
  else{
    milo.x=W*.8;milo.y=H*.55;const p=miloPoint();milo.tx=p[0];milo.ty=p[1];
    lastStretch=performance.now();
    const svg=$("#milo-svg"),pupils=$("#px-pupils");
    document.addEventListener("pointermove",e=>{ /* pupil ikut arah pointer + deteksi berburu */
      const now=performance.now();
      if(pupils)pupils.setAttribute("transform",
        `translate(${e.clientX>=milo.x?1:0} ${e.clientY>=milo.y-10?1:0})`);
      const dt=now-lastP.t,dd=Math.hypot(e.clientX-lastP.x,e.clientY-lastP.y);
      if(dt>0&&dd>30&&dd/dt>1.2)huntUntil=now+2000; /* gerak cepat: diburu! */
      lastP.x=e.clientX;lastP.y=e.clientY;lastP.t=now;
    },{passive:true});
    document.addEventListener("click",e=>{ /* klik apa pun: Milo berlari ke sana */
      if(!$("#lightbox").hidden||e.target.closest("#milo"))return;
      miloGo(e.clientX,e.clientY+10,true);
    });
    let lastScrollReact=0; /* scroll: kadang bereaksi di tempat */
    document.addEventListener("scroll",()=>{
      const now=performance.now();
      if(now-lastScrollReact>2500&&Math.random()<.5){lastScrollReact=now;miloReact()}
    },true);
    document.addEventListener("keydown",e=>{ /* mengetik: menguleni */
      if(e.repeat||!$("#lightbox").hidden)return;
      const now=performance.now();if(now-lastKnead<4000)return;lastKnead=now;
      miloEl.classList.add("knead");setTimeout(()=>miloEl.classList.remove("knead"),1100);
    });
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)lastStretch=performance.now()});
    let drag=null,petHist=[]; /* mochi-drag: angkat, melar, goyang */
    svg.addEventListener("pointerdown",e=>{
      drag={x0:e.clientX,y0:e.clientY,moved:false,shakes:0,lastDir:0,lastT:0};
      try{svg.setPointerCapture(e.pointerId)}catch(_){}
      milo.mode="held";miloEl.classList.remove("walk","dash","hunt");
      e.stopPropagation();e.preventDefault();
    });
    svg.addEventListener("pointermove",e=>{
      const now=performance.now();
      if(drag){const dx=e.clientX-drag.x0,dy=e.clientY-drag.y0;
        if(Math.hypot(dx,dy)>8)drag.moved=true;
        const sx=Math.min(1.35,1+Math.abs(dx)/220),sy=Math.max(.7,1-Math.abs(dy)/300);
        svg.style.transform=`scaleX(${(miloEl.classList.contains("flip")?-1:1)*sx}) scaleY(${sy})`;
        milo.x=e.clientX;milo.y=e.clientY+20;
        const dir=dx===0?drag.lastDir:Math.sign(dx);
        if(dir!==drag.lastDir&&now-drag.lastT<250){drag.shakes++;drag.lastT=now;drag.lastDir=dir;
          if(drag.shakes>=4){drag.shakes=0;miloEl.classList.add("wobble");
            setTimeout(()=>miloEl.classList.remove("wobble"),1000)}}
        return}
      petHist.push({x:e.clientX,t:now}); /* elus mondar-mandir: mendengkur */
      petHist=petHist.filter(h=>now-h.t<1200);
      let rev=0,prev=0;
      for(let i=1;i<petHist.length;i++){const d=petHist[i].x-petHist[i-1].x;
        if(Math.abs(d)>6){const s=Math.sign(d);if(prev&&s!==prev)rev++;prev=s}}
      if(rev>=3){petHist=[];purr()}
    });
    const endDrag=()=>{if(!drag)return;const wasMoved=drag.moved;drag=null;svg.style.transform="";
      if(wasMoved){milo.lastReact=performance.now();miloReact()}else petMilo()};
    svg.addEventListener("pointerup",endDrag);
    svg.addEventListener("pointercancel",()=>{drag=null;svg.style.transform="";milo.mode="wander"});
    miloEl.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();petMilo()}});
  }
}

/* ---------- Sparkle kursor: desktop saja ---------- */
if(FINE&&!RM){let last=0;
  addEventListener("pointermove",e=>{const n=performance.now();if(n-last<70)return;last=n;
    const s=document.createElement("span");s.className="spark";s.textContent=Math.random()<.5?"✦":"♥";
    s.style.left=e.clientX+"px";s.style.top=e.clientY+"px";s.style.fontSize=(8+Math.random()*8)+"px";
    document.body.appendChild(s);
    s.animate([{transform:"translateY(0)",opacity:1},{transform:"translateY(-34px)",opacity:0}],{duration:900,easing:"cubic-bezier(.16,1,.3,1)"}).onfinish=()=>s.remove()},{passive:true})}

/* ---------- Preloader: hati berdenyut sampai font siap ---------- */
initMusic();
initSfx();
musicStart(); /* coba langsung terputar saat web dibuka */
const unlock=()=>{musicStart(); /* sentuhan/ketikan pertama = izin browser, musik menyala */
  removeEventListener("pointerdown",unlock,true);removeEventListener("touchend",unlock,true);removeEventListener("keydown",unlock,true)};
addEventListener("pointerdown",unlock,true);addEventListener("touchend",unlock,true,{passive:true});addEventListener("keydown",unlock,true);
requestAnimationFrame(loop); /* frame pertama jalan setelah seluruh script dievaluasi */
const t0=performance.now();
Promise.race([document.fonts?document.fonts.ready:Promise.resolve(),new Promise(r=>setTimeout(r,3500))]).then(()=>{
  const wait=Math.max(0,600-(performance.now()-t0));
  setTimeout(()=>{$("#preloader").classList.add("gone");window.__booted=true;go(1)},wait);
});
