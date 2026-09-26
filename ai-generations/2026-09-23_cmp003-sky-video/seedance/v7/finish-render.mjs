// CMP-003 · Kit de piezas aisladas (texto, UI, logos) — PNG transparentes a 2x.
// Uso (desde la raíz del repo): node ai-generations/2026-09-23_cmp003-sky-video/kit/src/render-kit.mjs
// Cada pieza es determinística: tipografía real (Poppins/Bricolage de AXIS), logos oficiales, favicon vectorizado.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const KIT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-23_cmp003-sky-video/kit'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-23_cmp003-sky-video/seedance/v7/finish'
const REFS = path.join(KIT, 'refs')
const FONTS = '/Users/jreye/Documents/axis-design-system/apps/lab/dist/fonts'
fs.mkdirSync(OUT, { recursive: true })

const C = {
  midnight: '#022A4E', // navy institucional Efeonce (DESIGN.md)
  skyPurple: '#701C74',
  favPurple: '#671E75', // favicon oficial SKY (muestreado)
  skyLime: '#26DE00',
  ink: '#2F2B3D',
  inkSoft: '#6D6B77',
  paper: '#FFFFFF',
  line: '#E6E4EC'
}
const svg = f => fs.readFileSync(path.join(REFS, f), 'utf8')
const CHEVRON = 'M69.7741 53.262H50.8117L73.8243 84.4465L50.8117 115.631H69.7741L92.7866 84.4465L69.7741 53.262Z'
// Favicon SKY reconstruido en vector (cuadrado morado + chevrón lima), fiel al .ico oficial de skyairline.com
const favicon = (size, r = 0.22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><rect width="32" height="32" rx="${32 * r}" fill="${C.favPurple}"/><g transform="translate(9.2 6.2) scale(0.4)"><path d="${CHEVRON}" transform="translate(-50.8 -53.26)" fill="${C.skyLime}"/></g></svg>`
const magnifier = (s, col) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>`
const sparkle = (s, col) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 2 C12.6 7.5 16.5 11.4 22 12 C16.5 12.6 12.6 16.5 12 22 C11.4 16.5 7.5 12.6 2 12 C7.5 11.4 11.4 7.5 12 2Z" fill="${col}"/></svg>`

const font64 = f => `url(data:font/ttf;base64,${fs.readFileSync(path.join(FONTS, f)).toString('base64')}) format("truetype")`
const BASE_CSS = `
@font-face{font-family:Poppins;src:${font64('Poppins-400.ttf')};font-weight:400}
@font-face{font-family:Poppins;src:${font64('Poppins-500.ttf')};font-weight:500}
@font-face{font-family:Poppins;src:${font64('Poppins-600.ttf')};font-weight:600}
@font-face{font-family:Poppins;src:${font64('Poppins-700.ttf')};font-weight:700}
@font-face{font-family:Bricolage;src:${font64('BricolageGrotesque-Variable.ttf')};font-weight:200 800}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:transparent}
#p{display:inline-block;padding:40px} /* aire para sombras y brillos */
`

const W = 936 // ancho útil de UI en un lienzo de 1080 (86,7 %)
const Q = '¿A dónde viajar en Sudamérica?'
const RESULTS = [
  { title: 'Balneário Camboriú: qué hacer, cómo llegar y por qué enamora a los chilenos', url: 'skyairline.com › blog › camboriu', short: 'Balneário Camboriú: qué hacer, cómo llegar…' },
  { title: '¿Cuáles son las mejores bodegas en Mendoza?', url: 'skyairline.com › blog › bodegas-en-mendoza', short: '¿Cuáles son las mejores bodegas en Mendoza?' },
  { title: 'Puerto Fuy, un destino escondido en el corazón de los Andes', url: 'skyairline.com › blog › puerto-fuy', short: 'Puerto Fuy, un destino escondido en el corazón…' }
]
const shadow = 'box-shadow:0 18px 50px rgba(2,42,78,.18),0 4px 12px rgba(2,42,78,.10)'

const searchBox = ({ text = '', cursor = true, ai = false } = {}) => `
<div style="width:${W}px;height:128px;border-radius:64px;background:${C.paper};${shadow};display:flex;align-items:center;gap:26px;padding:0 44px;${ai ? 'outline:4px solid transparent;background:linear-gradient(#fff,#fff) padding-box,conic-gradient(from 200deg,#4F8CFF,#9B5CFF,#FF5CA8,#FFB84D,#26DE00,#4F8CFF) border-box;border:5px solid transparent' : ''}">
  ${ai ? sparkle(44, C.skyPurple) : magnifier(44, C.inkSoft)}
  <div style="font:500 46px/1 Poppins;color:${text ? C.ink : C.inkSoft};white-space:nowrap;display:flex;align-items:center">${text}${cursor ? `<span style="display:inline-block;width:4px;height:48px;background:${C.ink};margin-left:6px;border-radius:2px"></span>` : ''}</div>
</div>`

const resultCard = (r, glow = 0) => `
<div style="width:${W}px;border-radius:36px;background:${C.paper};${shadow};padding:34px 40px;display:flex;gap:28px;align-items:center;${glow ? `box-shadow:0 0 0 3px ${C.skyLime}55,0 0 40px ${C.skyPurple}55,0 18px 50px rgba(2,42,78,.18)` : ''}">
  <div style="flex:none">${favicon(76)}</div>
  <div style="min-width:0">
    <div style="font:600 30px/1.2 Poppins;color:${C.skyPurple}">SKY Airline</div>
    <div style="font:600 40px/1.25 Poppins;color:${C.midnight};margin-top:8px">${r.short}</div>
  </div>
</div>`

const userBubble = () => `
<div style="width:${W}px;display:flex;justify-content:flex-end"><div style="max-width:900px;background:#EEF1F6;border-radius:40px;padding:26px 38px;font:500 44px/1.3 Poppins;color:${C.ink};${shadow}">${Q}</div></div>`

const chip = (lit = false) => `
<span style="display:inline-flex;align-items:center;gap:12px;padding:8px 20px 8px 10px;border-radius:999px;vertical-align:middle;font:600 32px/1 Poppins;color:${lit ? '#fff' : C.ink};
 ${lit ? `background:linear-gradient(${C.skyPurple},${C.skyPurple}) padding-box,conic-gradient(from 0deg,${C.skyLime},#4F8CFF,#9B5CFF,${C.skyPurple},#FF5CA8,${C.skyLime}) border-box;border:4px solid transparent;box-shadow:0 0 28px ${C.skyLime}88,0 0 70px ${C.skyPurple}aa` : `background:#EEF1F6;border:4px solid transparent`}">
 ${favicon(48, 0.5)}SKY Airline</span>`

const answer = ({ lit = false, chips = 'three' } = {}) => {
  const c = chips === 'three' ? chip(false) : ''
  return `
<div style="width:${W}px;border-radius:40px;background:${C.paper};${shadow};padding:40px 44px">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">${sparkle(40, C.skyPurple)}<span style="font:600 26px/1 Poppins;color:${C.inkSoft}">Respuesta con IA</span></div>
  <div style="font:400 42px/1.5 Poppins;color:${C.ink}">Tres ideas: <b style="font-weight:600">Camboriú</b>, por sus playas${c ? ' ' + c : ''}; <b style="font-weight:600">Mendoza</b>, por sus bodegas${c ? ' ' + c : ''}; y <b style="font-weight:600">Puerto Fuy</b>, por sus lagos y volcanes ${chips === 'one' ? chip(lit) : c}.</div>
</div>`
}

const sparkles = () => `
<div style="position:relative;width:520px;height:220px;display:flex;align-items:center;justify-content:center">
  <div style="transform:scale(1.7)">${chip(true)}</div>
  ${[[30, 40, 44, C.skyLime], [470, 30, 36, '#9B5CFF'], [60, 170, 30, '#4F8CFF'], [455, 175, 48, C.skyLime], [250, 8, 26, '#FF5CA8'], [262, 196, 22, C.skyPurple]]
    .map(([x, y, s, c]) => `<div style="position:absolute;left:${x}px;top:${y}px;filter:drop-shadow(0 0 10px ${c})">${sparkle(s, c)}</div>`).join('')}
</div>`

const label = () => `<div style="font:500 22px/1 Poppins;color:#fff;opacity:.85;letter-spacing:.02em">Interfaz ilustrativa</div>`

// Textos del relato (Bricolage entrada/dominante; blanco sobre cielo). Escala = receta 9:16 × 1080/1152.
const k = 1080 / 1152
const txt = (t, size, weight = 700, fam = 'Bricolage', col = '#fff', ls = '-0.02em') =>
  `<div style="font:${weight} ${Math.round(size * k)}px/1.02 ${fam};color:${col};letter-spacing:${ls};white-space:nowrap">${t}</div>`
const plusIcon = s => `<svg width="${s}" height="${s}" viewBox="0 0 10 10"><path d="M4 0h2v4h4v2H6v4H4V6H0V4h4z" fill="${C.skyLime}"/></svg>`

const PIECES = {
  'T01a-caja-vacia-cursor': searchBox({ text: '', cursor: true }),
  'T01b-caja-pregunta': searchBox({ text: Q, cursor: true }),
  'T01c-caja-pregunta-ia': searchBox({ text: Q, cursor: false, ai: true }),
  'T02-pregunta-texto': `<div style="font:500 40px/1 Poppins;color:${C.ink};white-space:nowrap">${Q}</div>`,
  'T03a-resultado-camboriu': resultCard(RESULTS[0]),
  'T03b-resultado-mendoza': resultCard(RESULTS[1]),
  'T03c-resultado-puerto-fuy': resultCard(RESULTS[2]),
  'T03-resultados-lista': `<div style="display:flex;flex-direction:column;gap:22px">${RESULTS.map(r => resultCard(r, 1)).join('')}</div>`,
  'T04-burbuja-pregunta': userBubble(),
  'T05a-respuesta-tres-chips': answer({ chips: 'three' }),
  'T05b-respuesta-un-chip': answer({ chips: 'one', lit: false }),
  'T05c-respuesta-chip-encendido': answer({ chips: 'one', lit: true }),
  'T06a-chip-reposo': chip(false),
  'T06b-chip-encendido': chip(true),
  'T06c-chip-destellos': sparkles(),
  'T08-un-ano-creando-con-sky': txt('Un año creando con SKY.', 64, 600),
  'T09-mas-2000-piezas': `<div><div style="display:flex;align-items:center;gap:${Math.round(14 * k)}px">${plusIcon(Math.round(140 * k))}${txt('2.000', 190, 800)}</div>${txt('piezas.', 190, 800)}</div>`,
  'T10a-y-ahora-nos-eligio-como': txt('Y ahora nos eligió como', 64, 600),
  'T10b-su-agencia-seo-aeo': txt('su agencia<br>SEO/AEO.', 190, 800),
  'T11-gracias-sky': txt('¡Gracias, SKY!', 166, 800),
  'L01-logo-efeonce-negativo': `<div style="width:700px">${svg('logo-negative.svg').replace('<svg', '<svg width="700"')}</div>`,
  'L02-logo-sky-blanco': `<div style="width:420px">${svg('sky-white.svg').replace(/width="178" height="68"/, 'width="420" height="160"')}</div>`,
  'L03-separador': `<div style="width:6px;height:170px;background:#fff;border-radius:3px"></div>`,
  'L05-favicon-sky': favicon(256)
}


import {spawn} from 'node:child_process';
import {once} from 'node:events';
const skyB64=fs.readFileSync(path.join(KIT,'..','cielo','C1-b.png')).toString('base64');
const citation=chip(false).replace('background:#EEF1F6','background:#701C74').replace('color:#2F2B3D','color:#ffffff').replace('<span ','<span id="citation" ');
const response=`<div id="answerCard"><div id="answerHead">${sparkle(36,C.skyPurple)}<span>Respuesta con IA</span></div><div id="answerCopy"><span id="phrase1">Tres ideas: <b>Camboriú</b>, por sus playas;</span><span id="phrase2"><b>Mendoza</b>, por sus bodegas;</span><span id="phrase3">y <b>Puerto Fuy</b>, por sus lagos y volcanes.</span></div><div id="citationWrap">${citation}</div></div>`;
const style=`${BASE_CSS}
html,body{width:720px;height:1280px;overflow:hidden;background:#022A4E}
#stage{position:absolute;width:1080px;height:1920px;transform:scale(.6666666667);transform-origin:0 0;overflow:hidden;background:#022A4E;perspective:1400px}
#sky{position:absolute;inset:-80px;background:url(data:image/png;base64,${skyB64}) center/cover}
#camera{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:540px 850px}
#user{position:absolute;left:72px;top:440px;width:936px;filter:drop-shadow(0 10px 2px #a4bdcc55)}
#answer{position:absolute;left:72px;top:550px;width:936px;filter:drop-shadow(0 10px 2px #a4bdcc55)}
#answerCard{width:936px;overflow:hidden;border-radius:40px;background:white;box-shadow:0 18px 50px #022a4e2e,0 4px 12px #022a4e1a;padding:36px 44px}
#answerHead{display:flex;gap:14px;align-items:center;margin-bottom:22px;color:#6d6b77;font:600 26px/1 Poppins}
#answerCopy{font:400 42px/1.4 Poppins;color:#2f2b3d}#answerCopy b{font-weight:600}#answerCopy>span{display:block;margin-bottom:7px}
#citationWrap{margin-top:18px;transform-origin:left center}#citation{transform-origin:center}
.title{position:absolute;left:72px;top:570px;width:936px;text-align:center;color:white;transform-style:preserve-3d;text-shadow:0 2px 0 #c4d5e5,0 5px 0 #819ebc,0 9px 0 #536f91,0 12px 0 #234769,12px 23px 30px #001c3770}
.title *{white-space:normal!important}#proof{top:460px}#news{top:450px}#thanks{top:650px}
#plus{display:inline-flex;flex:none;transform-origin:center;filter:drop-shadow(7px 12px 8px #123e4c55)}
#proofline{display:flex;justify-content:center;align-items:center;gap:20px}#number{font:800 235px/.95 Bricolage}#pieces{font:800 218px/1.1 Bricolage}
#flare{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 44%,#fff 0%,#fff9d6 17%,#ffd9f499 35%,#8d2db644 63%,transparent 80%);mix-blend-mode:screen;opacity:0}
#blue{position:absolute;inset:0;background:#022A4E;opacity:0}`;
const html=`<!doctype html><meta charset="utf-8"><style>${style}</style><div id="stage"><div id="sky"></div><div id="camera"><div id="user">${userBubble()}</div><div id="answer">${response}</div><div class="title" id="year"><div id="yearTop" style="font:700 120px/1.03 Bricolage">Un año creando</div><div id="yearBottom" style="font:800 166px/1.07 Bricolage">con SKY.</div></div><div class="title" id="proof"><div style="font:600 64px/1.1 Bricolage;margin-bottom:65px">Un año creando con SKY.</div><div id="proofline"><span id="plus">${plusIcon(135)}</span><span id="number">2.000</span></div><div id="pieces">piezas.</div></div><div class="title" id="news"><div id="intro" style="font:600 67px/1.13 Bricolage;margin-bottom:45px">Y ahora nos eligió como</div><div id="agency" style="font:800 158px/1.05 Bricolage">su agencia</div><div id="seo" style="font:800 190px/1.08 Bricolage">SEO/AEO.</div></div><div class="title" id="thanks"><div style="font:800 150px/1.1 Bricolage">¡Gracias, SKY!</div></div></div><div id="blue"></div><div id="flare"></div></div>`;
fs.writeFileSync(path.join(OUT,'composition.html'),html);
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});
await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
await page.evaluate(()=>{
 const el=id=>document.getElementById(id),clamp=x=>Math.min(1,Math.max(0,x)),ease=x=>1-(1-clamp(x))**3,smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
 const reveal=(id,t,start,duration,y=40)=>{const p=ease((t-start)/duration);el(id).style.opacity=clamp((t-start)/.12);el(id).style.transform=`translateY(${y*(1-p)}px)`;return p};
 const cardHeight=el('answerCard').offsetHeight;
 const r=el('citation').getBoundingClientRect(),citeCenter=[(r.x+r.width/2)*1.5,(r.y+r.height/2)*1.5];
 window.frame=(time,kind)=>{
  for(const id of ['user','answer','year','proof','news','thanks'])el(id).style.display='none';
  el('flare').style.opacity=0;el('blue').style.opacity=0;el('camera').style.transformOrigin='540px 850px';el('camera').style.transform='none';
  el('sky').style.transform=`scale(1.06) translate3d(${12-time*2.5}px,${time*.8}px,0)`;
  if(kind==='chat'){
   el('user').style.display='block';const shift=smooth((time-.88)/.42);el('user').style.top=`${440-80*shift}px`;
   const establish=ease(time/.8);el('camera').style.transform=`translateX(${45*(1-establish)}px) rotateY(${-12*(1-establish)}deg)`;
   if(time>=1.1){
    el('answer').style.display='block';const t=time-1.1,p=ease(t/.65);
    el('answer').style.opacity=clamp(t/.14);el('answer').style.transform=`translateY(${40*(1-p)}px)`;
    el('answerCard').style.height=`${135+(cardHeight-135)*smooth(t/.95)}px`;
    reveal('phrase1',t,.10,.34,22);reveal('phrase2',t,.32,.34,22);reveal('phrase3',t,.55,.37,22);reveal('citationWrap',t,.91,.32,15);
    el('camera').style.transform=`translateY(${-22*p}px) rotateY(${8*(1-p)}deg) rotateX(${-3*(1-p)}deg)`;
   }
   const focus=clamp((time-4.04)/.2);el('citation').style.transform=`scale(${1-.045*Math.sin(Math.PI*focus)})`;
   el('citation').style.boxShadow=`0 0 ${30*focus}px #26de0066,0 0 ${65*focus}px #ad39ea88`;
   if(time>=4.25){const p=ease((time-4.25)/1.3),[cx,cy]=citeCenter;el('camera').style.transformOrigin=`${cx}px ${cy}px`;el('camera').style.transform=`translate(${(540-cx)*p}px,${(820-cy)*p}px) scale(${1+4*p*p})`;el('citation').style.boxShadow=`0 0 ${30+100*p}px #26de00,0 0 ${80+220*p}px #ad39ea,0 0 ${140+360*p}px #ffe4ab`;el('flare').style.opacity=clamp((time-5)/.65);}
  }else{
   let id,t;
   if(time<2.5){id='year';t=time;const a=ease(t/.55);el('camera').style.transform=`translateX(${-120*(1-a)}px) rotateY(${-19*(1-a)}deg) scale(${.94+.045*a})`;reveal('yearTop',t,0,.38,35);reveal('yearBottom',t,.12,.38,48);}
   else if(time<5){id='proof';t=time-2.5;const a=ease(t/.5);el('camera').style.transform=`rotateY(${7*(1-a)}deg) scale(${.965+.025*a})`;
    const p=ease(t/.3),bounce=t<.3?0:Math.sin((t-.3)*25)*Math.exp(-(t-.3)*13);
    el('plus').style.opacity=clamp(t/.06);el('plus').style.transform=`translate3d(${-165*(1-p)}px,${-60*(1-p)-8*bounce}px,${320*(1-p)}px) rotateY(${-55*(1-p)}deg) rotateZ(${-16*(1-p)}deg) scale(${1+.65*(1-p)+.04*bounce})`;
    const n=ease((t-.22)/.25);el('number').style.clipPath=`inset(0 ${(1-n)*100}% 0 0)`;el('number').style.transform=`translateX(${28*(1-n)}px)`;reveal('pieces',t,.36,.23,36);
   }else if(time<7.5){id='news';t=time-5;const a=ease(t/.65);el('camera').style.transform=`translateX(${-40*(1-a)}px) rotateY(${22*(1-a)}deg) rotateX(${-5*(1-a)}deg) scale(.94)`;reveal('intro',t,0,.32,18);reveal('agency',t,.14,.34,40);reveal('seo',t,.3,.34,50);}
   else{id='thanks';t=time-7.5;const a=ease(t/.5);el('camera').style.transform=`translateY(${30*(1-a)-20*t}px) rotateX(${-5*(1-a)}deg) scale(${.95+.05*a})`;el(id).style.opacity=clamp(t/.18);el('blue').style.opacity=smooth((t-1)/1);}
   el(id).style.display='block';
  }
 };
});
for(const [kind,seconds] of [['chat',5.75],['titles',9.5]]){
 const enc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','24','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',path.join(OUT,kind+'.mp4')],{stdio:['pipe','inherit','inherit']});
 for(let i=0;i<Math.round(seconds*24);i++){await page.evaluate(({time,kind})=>window.frame(time,kind),{time:i/24,kind});if(i%12===0)await page.screenshot({path:path.join(OUT,`${kind}-${String(i).padStart(3,'0')}.jpg`),type:'jpeg',quality:90});const b=await page.screenshot({type:'jpeg',quality:96});if(!enc.stdin.write(b))await once(enc.stdin,'drain');}
 enc.stdin.end();await once(enc,'close');console.log(kind+' rendered');
}
await browser.close();
