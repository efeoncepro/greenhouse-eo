// CMP-003 · Kit de piezas aisladas (texto, UI, logos) — PNG transparentes a 2x.
// Uso (desde la raíz del repo): node ai-generations/2026-09-23_cmp003-sky-video/kit/src/render-kit.mjs
// Cada pieza es determinística: tipografía real (Poppins/Bricolage de AXIS), logos oficiales, favicon vectorizado.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const KIT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-23_cmp003-sky-video/kit'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-23_cmp003-sky-video/seedance/v9/refs'
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


import {spawn,execFileSync} from 'node:child_process';import {once} from 'node:events';
const V=path.dirname(OUT),skyB64=fs.readFileSync(path.join(KIT,'..','cielo','C1-b.png')).toString('base64');
const citation=`<span id="citation" style="display:inline-flex;align-items:center;gap:14px;background:${C.skyPurple};color:white;border-radius:99px;padding:14px 24px;font:600 36px/1 Poppins">${favicon(48)}SKY Airline</span>`;
const eo=svg('logo-negative.svg'),sk=svg('sky-white.svg');
const style=`${BASE_CSS}html,body{width:100%;height:100%;overflow:hidden;background:${C.midnight}}#stage{position:absolute;width:1080px;height:1920px;transform:scale(var(--scale,.6666666667));transform-origin:0 0;overflow:hidden;perspective:1800px}#sky{position:absolute;inset:-60px;background:url(data:image/png;base64,${skyB64}) center/cover}#camera{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:540px 830px}.panel{position:absolute;left:72px;width:936px}.hidden{display:none}#search{top:660px;height:126px;border-radius:63px;background:#fff;box-shadow:0 16px 0 #adc3dd66,0 30px 65px #022a4e55;display:flex;align-items:center;gap:20px;padding:0 35px}#searchText{font:500 38px/1.15 Poppins;white-space:nowrap;color:${C.ink}}#cursor{height:44px;width:3px;background:${C.ink};margin-left:4px}#enter{position:absolute;right:27px;color:#701c74;font:500 32px Poppins;opacity:0}#results{top:620px;display:grid;gap:25px}.result{transform-style:preserve-3d}#user{top:430px}#answer{top:610px;background:#fff;border-radius:40px;padding:38px 42px;box-shadow:0 13px 0 #abc2dc55,0 35px 60px #022a4e44;overflow:hidden}#answerHead{display:flex;align-items:center;gap:15px;font:600 28px/1.2 Poppins;color:#6d6b77;margin-bottom:24px}#answerCopy{font:400 43px/1.42 Poppins;color:${C.ink}}#answerCopy>div{margin-bottom:10px}#answerCopy b{font-weight:600}#citationWrap{margin-top:28px}.title{position:absolute;left:72px;width:936px;top:590px;color:white;text-align:center;font-family:Bricolage;transform-style:preserve-3d;text-shadow:0 3px 0 #b8cadd,0 7px 0 #7794b0,0 12px 0 #355b80,12px 20px 32px #001c3766}#yearTop{font:700 118px/1.05 Bricolage}#yearBottom{font:800 170px/1.1 Bricolage}#proof{top:510px}#proofLine{display:flex;justify-content:center;align-items:center;gap:23px}#plus{display:flex;transform-origin:center}#number{font:800 234px/1 Bricolage}#pieces{font:800 214px/1.12 Bricolage}#news{top:540px}#intro{font:600 66px/1.15 Bricolage;margin-bottom:40px}#agency{font:800 160px/1.05 Bricolage}#seo{font:800 190px/1.09 Bricolage}#thanks{top:670px;font:800 148px/1.1 Bricolage}#flash{position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse at 50% 46%,white 0%,#fff4db 28%,#b345ce77 60%,transparent 78%);pointer-events:none}#closing{position:absolute;inset:0;background:${C.midnight};display:none}#brandrow{position:absolute;left:138px;top:880px;width:804px;display:flex;align-items:center;gap:42px}#eo{width:470px}#sk{width:250px}#bar{height:142px;width:5px;background:white;flex:none}#brandrow svg{display:block;width:100%;height:auto}#eo .cls-1{fill:white}#url{position:absolute;top:1235px;left:310px;width:460px;height:100px;border:3px solid white;border-radius:50px;color:white;display:flex;align-items:center;justify-content:center;font:500 42px/1 Poppins;background:#ffffff12}`;
const html=`<!doctype html><meta charset="utf-8"><style>${style}</style><div id="stage"><div id="sky"></div><div id="camera"><div class="panel" id="search">${magnifier(36,C.inkSoft)}<span id="searchText"></span><i id="cursor"></i><span id="enter">↵</span></div><div class="panel" id="results">${RESULTS.map((r,i)=>`<div class="result" id="result${i}">${resultCard(r)}</div>`).join('')}</div><div class="panel" id="user">${userBubble()}</div><div class="panel" id="answer"><div id="answerHead">${sparkle(38,C.skyPurple)}Respuesta con IA</div><div id="answerCopy"><div id="phrase1">Tres ideas: <b>Camboriú</b>, por sus playas;</div><div id="phrase2"><b>Mendoza</b>, por sus bodegas;</div><div id="phrase3">y <b>Puerto Fuy</b>, por sus lagos y volcanes.</div></div><div id="citationWrap">${citation}</div></div><div class="title" id="year"><div id="yearTop">Un año creando</div><div id="yearBottom">con SKY.</div></div><div class="title" id="proof"><div id="proofLine"><span id="plus">${plusIcon(138)}</span><span id="number">2.000</span></div><div id="pieces">piezas.</div></div><div class="title" id="news"><div id="intro">Y ahora nos eligió como</div><div id="agency">su agencia</div><div id="seo">SEO/AEO.</div></div><div class="title" id="thanks">¡Gracias, SKY!</div></div><div id="closing"><div id="brandrow"><div id="eo">${eo}</div><div id="bar"></div><div id="sk">${sk}</div></div><div id="url">efeoncepro.com</div></div><div id="flash"></div></div>`;
fs.writeFileSync(path.join(V,'guide.html'),html);
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1});
await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
await page.evaluate(()=>{
const $=id=>document.getElementById(id),c=x=>Math.max(0,Math.min(1,x)),ease=x=>1-(1-c(x))**3,smooth=x=>{x=c(x);return x*x*(3-2*x)},show=(id,on)=>$(id).style.display=on?'':'none';
const Q='¿A dónde viajar en Sudamérica?',h=$('answer').offsetHeight;
const reveal=(id,t,start,d=.3,y=30)=>{const p=ease((t-start)/d);$(id).style.opacity=c((t-start)/.1);$(id).style.transform=`translateY(${y*(1-p)}px)`;};
window.frame=t=>{
for(const id of ['search','results','user','answer','year','proof','news','thanks'])show(id,false);
$('closing').style.display='none';$('flash').style.opacity=0;$('camera').style.transform='none';$('camera').style.transformOrigin='540px 830px';
$('sky').style.transform=`scale(1.025) translate(${8-t*.4}px,${t*.25}px)`;
if(t<4.3){
 show('search',true);$('search').style.display='flex';const typed=Math.floor(c((t-.20)/1.42)*Q.length);$('searchText').textContent=Q.slice(0,typed);$('cursor').style.opacity=t<1.75?1:0;
 $('enter').style.opacity=t>=1.7&&t<2.0?1:0;
 $('search').style.top=`${660-245*smooth((t-1.9)/.35)}px`;const b=1-ease(t/1.5);
 $('camera').style.transform=`translateX(${-32*b}px) rotateY(${-12*b}deg) scale(.96)`;
 if(t>=2){show('results',true);const a=smooth((t-2)/.45);$('camera').style.transform=`rotateY(${-9*a*(1-smooth((t-3.2)/.45))}deg) rotateX(${5*a}deg) scale(.94)`;
 for(let i=0;i<3;i++){reveal('result'+i,t,2.05+i*.25,.32,60);$('result'+i).style.opacity*=1-smooth((t-3.65-i*.05)/.25);}
 }
 if(t>=3.85){$('search').style.opacity=1-smooth((t-3.85)/.25);show('user',true);$('user').style.opacity=smooth((t-3.9)/.25);$('user').style.transform='none';$('user').style.top='430px';}else $('search').style.opacity=1;
}else if(t<10){
 show('user',true);$('user').style.opacity=1;$('user').style.top=`${430-75*smooth((t-4.3)/.55)}px`;
 show('answer',true);$('answer').style.opacity=c((t-4.3)/.15);$('answer').style.height=`${125+(h-125)*smooth((t-4.3)/1.25)}px`;
 reveal('phrase1',t,4.45,.35,24);reveal('phrase2',t,4.85,.35,24);reveal('phrase3',t,5.25,.4,24);reveal('citationWrap',t,5.75,.3,16);
 const settle=1-ease((t-4.3)/1.3);$('camera').style.transform=`rotateY(${-5*settle}deg) translateY(${-20*(1-settle)}px)`;
 $('citation').style.transform='none';$('citation').style.boxShadow='none';
 if(t>=8.65){const press=c((t-8.65)/.2);$('citation').style.transform=`scale(${1-.045*Math.sin(press*Math.PI)})`;$('citation').style.boxShadow=`0 0 ${28*press}px #26de00aa,0 0 ${75*press}px #ac47ca88`;}
 if(t>=8.9){const p=smooth((t-8.9)/1.0);$('camera').style.transformOrigin='272px 982px';$('camera').style.transform=`translate(${268*p}px,${-125*p}px) scale(${1+3.8*p*p})`;$('flash').style.opacity=smooth((t-9.48)/.52);}
}else if(t>=15.75&&t<26){
 let u=t-15.75;
 if(t<18.25){show('year',true);const p=ease(u/.55);$('camera').style.transform=`translateX(${-70*(1-p)}px) rotateY(${-16*(1-p)}deg)`;reveal('yearTop',u,0,.38);reveal('yearBottom',u,.16,.38);}
 else if(t<20.75){u=t-18.25;show('proof',true);const p=ease(u/.3);$('plus').style.opacity=c(u/.07);$('plus').style.transform=`translate3d(${-210*(1-p)}px,${-70*(1-p)}px,${180*(1-p)}px) rotateY(${-55*(1-p)}deg) rotateZ(${-24*(1-p)}deg) scale(${1+.5*(1-p)})`;reveal('number',u,.3,.25,10);reveal('pieces',u,.52,.25,35);}
 else if(t<24.25){u=t-20.75;show('news',true);const p=ease(u/.8);$('camera').style.transform=`rotateY(${14*(1-p)}deg) rotateX(${-5*(1-p)}deg) translateX(${-30*(1-p)}px)`;reveal('intro',u,0,.3,22);reveal('agency',u,.33,.32,40);reveal('seo',u,.65,.35,44);}
 else{u=t-24.25;show('thanks',true);const p=ease(u/.42);$('thanks').style.opacity=c(u/.12);$('camera').style.transform=`scale(${1.07-.07*p-.015*u}) translateY(${30*(1-p)}px)`;}
}else if(t>=26){$('closing').style.display='block';const p=smooth((t-27.5)/1);$('closing').style.background=`rgb(${[2,42,78].map((x,i)=>Math.round(x+([112,28,116][i]-x)*p)).join(',')})`;}
};
});
const refs=[['01-search',0],['02-results',3.1],['03-user',4.2],['04-answer-opening',4.95],['05-answer-complete',6.5],['06-citation-focus',8.82],['07-year',17],['09-proof',19.2],['10-agency-intro',21.0],['11-agency-complete',22.1],['12-thanks',25.1],['13-close-blue',26.8],['14-close-purple',29]];
await page.setViewportSize({width:1080,height:1920});await page.evaluate(()=>document.documentElement.style.setProperty('--scale','1'));
for(const [name,t] of refs){await page.evaluate(t=>window.frame(t),t);await page.screenshot({path:path.join(OUT,name+'.png')});}
const pluspage=await browser.newPage({viewport:{width:500,height:500}});await pluspage.setContent(`<style>body{margin:0;display:grid;place-items:center;width:500px;height:500px;background:transparent}</style>${plusIcon(260)}`);await pluspage.screenshot({path:path.join(OUT,'08-plus-isolated.png'),omitBackground:true});await pluspage.close();
await page.setViewportSize({width:720,height:1280});await page.evaluate(()=>document.documentElement.style.setProperty('--scale','.6666666667'));
for(const [name,start,duration] of [['intro',0,10],['tail',15.75,14.25]]){
const enc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','24','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',path.join(V,name+'-guide.mp4')],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<duration*24;i++){await page.evaluate(t=>window.frame(t),start+i/24);const b=await page.screenshot({type:'jpeg',quality:96});if(!enc.stdin.write(b))await once(enc.stdin,'drain');}
enc.stdin.end();await once(enc,'close');console.log(name,'rendered');
}
await browser.close();
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss','10','-i',path.join(V,'../v8/sky-v8-native.mp4'),'-t','5.75','-an','-vf','fps=24,setsar=1','-c:v','libx264','-crf','17','-preset','fast',path.join(V,'flight-guide.mp4')]);
const list=['intro-guide.mp4','flight-guide.mp4','tail-guide.mp4'].map(f=>`file '${f}'`).join('\n');fs.writeFileSync(path.join(V,'guide-concat.txt'),list);
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',path.join(V,'guide-concat.txt'),'-an','-c:v','libx264','-crf','17','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',path.join(V,'sky-v9-guide-silent.mp4')]);console.log('30-second guide ready');
