import fs from 'node:fs';
const S=process.argv[2];const ID="'Bricolage Grotesque', system-ui, sans-serif", ST="'Poppins', system-ui, sans-serif";
const BUB='file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const A='/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-06_brochure-creativo/assets';const O='#ff6500';
const CAPS=[['paleta','Squad creativo','Managed Creative Capacity','Capacidad recurrente y priorizada, con responsabilidad de entrega.'],['pincel','Brand systems','Estrategia e identidad','Posicionamiento, identidad verbal y visual, y un sistema que se usa.'],['megafono','Campañas','Plataforma creativa','Idea, key visual, mensajes y toolkit multicanal.'],['like','Contenido y social','Content &amp; Social Ops','Pilares, calendario, producción, comunidad y reporte.'],['pelicula','Audiovisual','Video, motion y audio','Producción, edición, motion y finishing por formato.'],['camara','Run &amp; Gun','Captura ágil','Entrevistas, b-roll, reels y testimonios en una jornada.']];
const cw=300,ch=368,gx=28,gy=52,x0=820,y0=160;
const cards=CAPS.map(([ic,t,l,d],i)=>{const x=x0+(i%3)*(cw+gx),y=y0+Math.floor(i/3)*(ch+gy);return `<div style="position:absolute;left:${x}px;top:${y}px;width:${cw}px;height:${ch}px;border-radius:26px;background:linear-gradient(160deg,rgba(255,255,255,0.10),rgba(255,255,255,0.025) 55%,rgba(255,101,0,0.06));border:1px solid rgba(255,170,110,0.28);box-shadow:0 30px 70px rgba(0,8,20,0.55),inset 0 1px 0 rgba(255,255,255,0.18);box-sizing:border-box;padding:118px 26px 24px">
<div style="position:absolute;left:14px;top:-58px;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle,rgba(255,101,0,0.55),rgba(255,101,0,0) 68%)"></div>
<img src="file://${A}/ico-${ic}.png" style="position:absolute;left:10px;top:-62px;width:176px;height:176px;filter:drop-shadow(0 18px 24px rgba(0,8,20,0.55))">
<div style="position:absolute;right:24px;top:22px;font-family:${ID};font-size:44px;font-weight:300;color:rgba(255,170,110,0.75)">0${i+1}</div>
<div style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#ffb27a">${l}</div>
<div style="margin-top:10px;font-family:${ID};font-size:36px;font-weight:760;letter-spacing:-0.025em;line-height:1;color:#fff">${t}</div>
<div style="margin-top:12px;font-family:${ST};font-size:18px;font-weight:300;line-height:1.42;color:#d9e6f5">${d}</div></div>`}).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33">
<div style="position:absolute;inset:0;background:radial-gradient(ellipse 900px 620px at 1330px 560px,rgba(255,101,0,0.30),rgba(255,101,0,0.08) 50%,rgba(0,26,51,0) 78%),radial-gradient(ellipse 1200px 700px at 1300px 1150px,rgba(3,60,120,0.6),rgba(0,26,51,0) 70%)"></div>
<svg width="1920" height="1080" style="position:absolute;inset:0"><ellipse cx="1330" cy="560" rx="620" ry="430" fill="none" stroke="#ffb27a" stroke-opacity="0.16" stroke-width="2"/><ellipse cx="1330" cy="560" rx="760" ry="520" fill="none" stroke="#ffb27a" stroke-opacity="0.08" stroke-width="1.5" stroke-dasharray="3 12"/></svg>
${cards}
<div style="position:absolute;left:140px;top:120px;width:600px;display:flex;flex-direction:column">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">02 · Te recuerdan · Brand</div>
<div style="margin-top:64px;font-family:${ID};font-size:104px;font-weight:760;letter-spacing:-0.045em;line-height:0.92;color:#fff">Seis<br>capacidades,<br>un solo<br>equipo<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${O};margin-left:0.04em"></span></div>
<div style="margin-top:40px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:520px">Estrategia, craft y producción en un mismo squad, con <b>un solo</b> interlocutor.</div>
<div style="margin-top:56px;font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#ffb27a">Cómo crece la relación</div>
<div style="margin-top:12px;display:flex;gap:12px;align-items:center;font-family:${ST};font-size:21px;font-weight:500;color:#fff">Diagnóstico<span style="color:${O}">→</span>Instalar<span style="color:${O}">→</span>Operar<span style="color:${O}">→</span>Expandir</div></div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px"></div></body></html>`;
fs.writeFileSync(S+'/v9/html/K13b.html',html);console.log('ok');
