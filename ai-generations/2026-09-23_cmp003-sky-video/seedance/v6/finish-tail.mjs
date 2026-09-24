import {spawn} from 'node:child_process';
import {once} from 'node:events';
const skyB64=fs.readFileSync(path.join(KIT,'..','cielo','C1-b.png')).toString('base64');
const purpleChip=chip(false).replace('background:#EEF1F6','background:#701C74').replace('color:#2F2B3D','color:#ffffff').replace('<span ','<span id="citation" ');
const response=answer({chips:'one'}).replace(chip(false),purpleChip);
const style=`${BASE_CSS}
html,body{width:720px;height:1280px;overflow:hidden;background:#022A4E}
#stage{position:absolute;width:1080px;height:1920px;transform:scale(.6666666667);transform-origin:0 0;overflow:hidden;background:#022A4E;perspective:1400px}
#sky{position:absolute;inset:-80px;background:url(data:image/png;base64,${skyB64}) center/cover;will-change:transform}
#camera{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:540px 850px}
#user{position:absolute;left:72px;top:370px;width:936px;filter:drop-shadow(0 10px 2px #a4bdcc55)}
#answer{position:absolute;left:72px;top:570px;width:936px;filter:drop-shadow(0 10px 2px #a4bdcc55)}
.title{position:absolute;left:72px;top:570px;width:936px;text-align:center;color:white;transform-style:preserve-3d;text-shadow:0 2px 0 #c4d5e5,0 5px 0 #819ebc,0 9px 0 #536f91,0 12px 0 #234769,12px 23px 30px #001c3770}
.title *{white-space:normal!important}
#proof{top:460px}#news{top:450px}#thanks{top:650px}
#flare{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 44%,#fff 0%,#fff9d6 17%,#ffd9f499 35%,#8d2db644 63%,transparent 80%);mix-blend-mode:screen;opacity:0}
#blue{position:absolute;inset:0;background:#022A4E;opacity:0}
`;
const year=`<div style="font:700 120px/1.03 Bricolage">Un año creando</div><div style="font:800 166px/1.07 Bricolage">con SKY.</div>`;
const proof=`<div style="font:600 64px/1.1 Bricolage;margin-bottom:65px">Un año creando con SKY.</div><div style="display:flex;justify-content:center;align-items:center;gap:20px">${plusIcon(135)}<span style="font:800 235px/.95 Bricolage">2.000</span></div><div style="font:800 218px/1.1 Bricolage">piezas.</div>`;
const news=`<div style="font:600 67px/1.13 Bricolage;margin-bottom:45px">Y ahora nos eligió como</div><div style="font:800 158px/1.05 Bricolage">su agencia</div><div style="font:800 190px/1.08 Bricolage">SEO/AEO.</div>`;
const html=`<!doctype html><meta charset="utf-8"><style>${style}</style><div id="stage"><div id="sky"></div><div id="camera"><div id="user">${userBubble()}</div><div id="answer">${response}</div><div class="title" id="year">${year}</div><div class="title" id="proof">${proof}</div><div class="title" id="news">${news}</div><div class="title" id="thanks"><div style="font:800 150px/1.1 Bricolage">¡Gracias, SKY!</div></div></div><div id="blue"></div><div id="flare"></div></div>`;
fs.writeFileSync(path.join(OUT,'composition.html'),html);
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});
await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
await page.evaluate(()=>{
 const r=document.getElementById('citation').getBoundingClientRect();window.citeCenter=[(r.x+r.width/2)*1.5,(r.y+r.height/2)*1.5];
 window.frame=(time,kind)=>{
  const el=id=>document.getElementById(id),clamp=x=>Math.min(1,Math.max(0,x)),ease=x=>1-(1-clamp(x))**3;
  for(const id of ['user','answer','year','proof','news','thanks'])el(id).style.display='none';
  el('flare').style.opacity=0;el('blue').style.opacity=0;el('camera').style.transformOrigin='540px 850px';
  el('camera').style.transform='none';el('sky').style.transform=`scale(1.06) translate3d(${12-time*2.5}px,${time*.8}px,0)`;
  if(kind==='chat'){
   el('user').style.display='block';el('user').style.transform='none';
   if(time<1.1){const p=ease(time/.8);el('camera').style.transform=`translateX(${45*(1-p)}px) rotateY(${-12*(1-p)}deg)`;el('user').style.top='440px';}
   else{
    el('user').style.top='370px';el('answer').style.display='block';const a=ease((time-1.1)/.35);el('answer').style.opacity=a;el('answer').style.transform=`translateY(${50*(1-a)}px)`;
    const p=ease((time-1.1)/.8);el('camera').style.transform=`rotateY(${10*(1-p)}deg) rotateX(${-3*(1-p)}deg)`;
   }
   if(time>=4.25){
    const p=ease((time-4.25)/1.3),[cx,cy]=window.citeCenter;
    el('camera').style.transformOrigin=`${cx}px ${cy}px`;
    el('camera').style.transform=`translate(${(540-cx)*p}px,${(820-cy)*p}px) scale(${1+4*p*p})`;
    el('citation').style.boxShadow=`0 0 ${30+100*p}px #26de00,0 0 ${80+220*p}px #ad39ea,0 0 ${140+360*p}px #ffe4ab`;
    el('flare').style.opacity=clamp((time-5.0)/.65);
   }else el('citation').style.boxShadow='none';
  }else{
   let id,p;
   if(time<2.5){id='year';p=time/2.5;const a=ease(time/.6);el('camera').style.transform=`translateX(${-100+130*a}px) rotateY(${-22+24*a}deg) scale(${.94+.04*p})`;}
   else if(time<5){id='proof';p=(time-2.5)/2.5;const a=ease(p/.25);el('camera').style.transform=`translateZ(${(-190)*(1-a)}px) rotateY(${8*(1-a)}deg) scale(${.92+.07*a})`;}
   else if(time<7.5){id='news';p=(time-5)/2.5;const a=ease(p/.3);el('camera').style.transform=`translateX(${-40*(1-a)}px) rotateY(${26*(1-a)}deg) rotateX(${-6*(1-a)}deg) scale(.94)`;}
   else{id='thanks';p=(time-7.5)/2;el('camera').style.transform=`translateY(${35-90*p}px) rotateX(${-5+5*p}deg)`;el('blue').style.opacity=clamp((p-.5)/.5);}
   el(id).style.display='block';
  }
 };
});
for(const [kind,seconds] of [['chat',5.75],['titles',9.5]]){
 const out=path.join(OUT,kind+'.mp4');
 const enc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','24','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
 for(let i=0;i<Math.round(seconds*24);i++){
  await page.evaluate(({time,kind})=>window.frame(time,kind),{time:i/24,kind});
  if(i%24===0)await page.screenshot({path:path.join(OUT,`${kind}-${String(i/24).padStart(2,'0')}.jpg`),type:'jpeg',quality:90});
  const b=await page.screenshot({type:'jpeg',quality:96});if(!enc.stdin.write(b))await once(enc.stdin,'drain');
 }
 enc.stdin.end();await once(enc,'close');console.log(out);
}
await browser.close();
